import { createHash } from "crypto";
import { db, apiKeys } from "@klic/db";
import { eq } from "drizzle-orm";

// ─── Authentication ──────────────────────────────────────────────────────────

export async function authenticateBearer(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null;
  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) return null;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const found = await db.query.apiKeys.findFirst({ where: eq(apiKeys.keyHash, keyHash) });
  if (!found) return null;
  return { userId: found.userId };
}

// ─── OTLP JSON primitives ────────────────────────────────────────────────────
// Proto-JSON spec: https://opentelemetry.io/docs/specs/otlp/#otlphttp

type AnyValue = {
  stringValue?: string;
  intValue?: string | number;
  doubleValue?: number;
  boolValue?: boolean;
  arrayValue?: { values: AnyValue[] };
};

type KV = { key: string; value: AnyValue };

export function flattenAttrs(kvs: KV[] | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!kvs) return out;
  for (const kv of kvs) {
    out[kv.key] = extractValue(kv.value);
  }
  return out;
}

function extractValue(v: AnyValue | undefined): unknown {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.intValue !== undefined) return Number(v.intValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.boolValue !== undefined) return v.boolValue;
  if (v.arrayValue) return v.arrayValue.values.map(extractValue);
  return null;
}

export function nanosToDate(ns: string | number | undefined): Date {
  if (ns == null) return new Date();
  const n = typeof ns === "string" ? Number(ns) : ns;
  if (!Number.isFinite(n) || n <= 0) return new Date();
  return new Date(Math.floor(n / 1_000_000));
}

// ─── Metric extraction ───────────────────────────────────────────────────────

type MetricDataPoint = {
  timeUnixNano?: string | number;
  startTimeUnixNano?: string | number;
  asInt?: string | number;
  asDouble?: number;
  attributes?: KV[];
};

type MetricEntry = {
  name: string;
  sum?: { dataPoints: MetricDataPoint[] };
  gauge?: { dataPoints: MetricDataPoint[] };
};

type ResourceMetrics = {
  resource?: { attributes?: KV[] };
  scopeMetrics?: { metrics?: MetricEntry[] }[];
};

export type ExtractedMetric = {
  name: string;
  value: number;
  observedAt: Date;
  attrs: Record<string, unknown>;
};

export function extractMetrics(body: { resourceMetrics?: ResourceMetrics[] }): ExtractedMetric[] {
  const out: ExtractedMetric[] = [];
  for (const rm of body.resourceMetrics ?? []) {
    const resourceAttrs = flattenAttrs(rm.resource?.attributes);
    for (const sm of rm.scopeMetrics ?? []) {
      for (const m of sm.metrics ?? []) {
        const points = m.sum?.dataPoints ?? m.gauge?.dataPoints ?? [];
        for (const p of points) {
          const value = p.asInt !== undefined ? Number(p.asInt) : p.asDouble ?? 0;
          const attrs = { ...resourceAttrs, ...flattenAttrs(p.attributes) };
          out.push({ name: m.name, value, observedAt: nanosToDate(p.timeUnixNano), attrs });
        }
      }
    }
  }
  return out;
}

// ─── Log/event extraction ────────────────────────────────────────────────────

type LogRecord = {
  timeUnixNano?: string | number;
  observedTimeUnixNano?: string | number;
  attributes?: KV[];
  body?: AnyValue;
};

type ResourceLogs = {
  resource?: { attributes?: KV[] };
  scopeLogs?: { logRecords?: LogRecord[] }[];
};

export type ExtractedEvent = {
  name: string;
  observedAt: Date;
  attrs: Record<string, unknown>;
  promptId: string | null;
  sessionId: string | null;
};

export function extractEvents(body: { resourceLogs?: ResourceLogs[] }): ExtractedEvent[] {
  const out: ExtractedEvent[] = [];
  for (const rl of body.resourceLogs ?? []) {
    const resourceAttrs = flattenAttrs(rl.resource?.attributes);
    for (const sl of rl.scopeLogs ?? []) {
      for (const rec of sl.logRecords ?? []) {
        const logAttrs = flattenAttrs(rec.attributes);
        const name = typeof logAttrs["event.name"] === "string" ? logAttrs["event.name"] : null;
        if (!name) continue;
        const observedAt = nanosToDate(rec.timeUnixNano ?? rec.observedTimeUnixNano);
        const attrs = { ...resourceAttrs, ...logAttrs };
        out.push({
          name,
          observedAt,
          attrs,
          promptId: typeof attrs["prompt.id"] === "string" ? (attrs["prompt.id"] as string) : null,
          sessionId: typeof attrs["session.id"] === "string" ? (attrs["session.id"] as string) : null,
        });
      }
    }
  }
  return out;
}
