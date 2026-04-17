export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { db, otelMetricPoints } from "@klic/db";
import {
  authenticate,
  extractMetrics,
  normalizeOrgEmail,
  resolveEmailsToUserIds,
} from "../../_lib";

const ACCEPTED_METRICS = new Set([
  "claude_code.session.count",
  "claude_code.lines_of_code.count",
  "claude_code.pull_request.count",
  "claude_code.commit.count",
  "claude_code.cost.usage",
  "claude_code.token.usage",
  "claude_code.code_edit_tool.decision",
  "claude_code.active_time.total",
]);

export async function POST(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization") ?? "";
  const ua = req.headers.get("user-agent") ?? "";
  const ct = req.headers.get("content-type") ?? "";
  console.log("[OTEL/metrics] incoming", {
    authPresent: !!authHeader,
    authLen: authHeader.length,
    ua,
    ct,
  });

  const auth = await authenticate(req);
  if (!auth) {
    console.log("[OTEL/metrics] 401 unauthorized");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ct.includes("json")) {
    console.log("[OTEL/metrics] 415 bad content-type", ct);
    return Response.json({ error: "Only application/json is supported" }, { status: 415 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    console.log("[OTEL/metrics] 400 invalid json");
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const allMetrics = extractMetrics(body);
  const metrics = allMetrics.filter((m) => ACCEPTED_METRICS.has(m.name));
  console.log("[OTEL/metrics] extracted", {
    kind: auth.kind,
    total: allMetrics.length,
    accepted: metrics.length,
    names: [...new Set(allMetrics.map((m) => m.name))],
    sampleAttrs: allMetrics[0]?.attrs,
  });
  if (metrics.length === 0) return Response.json({ partialSuccess: {} });

  const rows: {
    userId: string;
    metricName: string;
    value: string;
    observedAt: Date;
    attrs: Record<string, unknown>;
  }[] = [];

  if (auth.kind === "user") {
    for (const m of metrics) {
      rows.push({
        userId: auth.userId,
        metricName: m.name,
        value: String(m.value),
        observedAt: m.observedAt,
        attrs: m.attrs,
      });
    }
  } else {
    const emails = metrics
      .map((m) => normalizeOrgEmail(m.attrs["user.email"]))
      .filter((e): e is string => e !== null);
    const emailToUserId = await resolveEmailsToUserIds(emails);
    for (const m of metrics) {
      const email = normalizeOrgEmail(m.attrs["user.email"]);
      if (!email) continue;
      const userId = emailToUserId.get(email);
      if (!userId) continue;
      rows.push({
        userId,
        metricName: m.name,
        value: String(m.value),
        observedAt: m.observedAt,
        attrs: m.attrs,
      });
    }
  }

  console.log("[OTEL/metrics] inserting", { rows: rows.length });
  if (rows.length > 0) await db.insert(otelMetricPoints).values(rows);
  return Response.json({ partialSuccess: {} });
}
