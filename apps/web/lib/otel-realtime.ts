import { db, otelEvents } from "@klic/db";
import { and, eq, gte, sql } from "drizzle-orm";

export interface RealtimeStats {
  apiCalls24h: number;
  apiErrors24h: number;
  prompts24h: number;
  cost24h: number;
  activeSessions: number;
  toolAcceptRate: number | null;
  avgDurationMs: number | null;
  fastPct: number | null;
  hourlyBuckets: Array<{ hour: string; requests: number; errors: number }>;
  modelCosts: Array<{ model: string; cost: number; calls: number }>;
  languageBreakdown: Array<{ language: string; accept: number; reject: number; total: number }>;
  hasData: boolean;
}

export async function loadRealtimeStats(userId: string): Promise<RealtimeStats> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const otelRows = await db.query.otelEvents.findMany({
    where: and(eq(otelEvents.userId, userId), gte(otelEvents.observedAt, since24h)),
    orderBy: (e, { asc }) => [asc(e.observedAt)],
  });

  const hourlyBuckets = Array.from({ length: 24 }, (_, i) => ({
    hour: String(i).padStart(2, "0"),
    requests: 0,
    errors: 0,
  }));
  const modelAgg = new Map<string, { cost: number; calls: number }>();
  const countsByEvent = new Map<string, number>();
  let cost24h = 0;
  let toolAccepts = 0;
  let toolRejects = 0;
  let durationSum = 0;
  let durationCount = 0;
  let fastCount = 0;
  let normalCount = 0;

  for (const ev of otelRows) {
    countsByEvent.set(ev.eventName, (countsByEvent.get(ev.eventName) ?? 0) + 1);
    const attrs = (ev.attrs ?? {}) as Record<string, unknown>;
    const kstHour = new Date(ev.observedAt.getTime() + 9 * 60 * 60 * 1000).getUTCHours();

    if (ev.eventName === "api_request") {
      hourlyBuckets[kstHour].requests++;
      const costUsd = typeof attrs.cost_usd === "number" ? attrs.cost_usd : 0;
      cost24h += costUsd;
      const model = typeof attrs.model === "string" ? attrs.model : "unknown";
      const agg = modelAgg.get(model) ?? { cost: 0, calls: 0 };
      agg.cost += costUsd;
      agg.calls += 1;
      modelAgg.set(model, agg);

      const dur = typeof attrs.duration_ms === "number" ? attrs.duration_ms : null;
      if (dur != null) {
        durationSum += dur;
        durationCount++;
      }
      if (attrs.speed === "fast") fastCount++;
      else if (attrs.speed === "normal") normalCount++;
    } else if (ev.eventName === "api_error") {
      hourlyBuckets[kstHour].errors++;
    } else if (ev.eventName === "tool_decision") {
      if (attrs.decision === "accept") toolAccepts++;
      else if (attrs.decision === "reject") toolRejects++;
    }
  }

  const toolDecisions = toolAccepts + toolRejects;
  const speedTotal = fastCount + normalCount;
  const modelCosts = [...modelAgg.entries()]
    .map(([model, v]) => ({ model, cost: v.cost, calls: v.calls }))
    .sort((a, b) => b.cost - a.cost);

  // Language edit breakdown (metric points)
  const langRows = await db.execute<{ language: string; decision: string; count: string }>(sql`
    SELECT
      coalesce(attrs->>'language', 'unknown') AS language,
      coalesce(attrs->>'decision', 'unknown') AS decision,
      sum(value::numeric) AS count
    FROM otel_metric_points
    WHERE user_id = ${userId}
      AND metric_name = 'claude_code.code_edit_tool.decision'
      AND observed_at >= now() - interval '24 hours'
    GROUP BY 1, 2
  `);
  const langMap = new Map<string, { accept: number; reject: number }>();
  for (const r of langRows) {
    const cur = langMap.get(r.language) ?? { accept: 0, reject: 0 };
    const count = Number(r.count);
    if (r.decision === "accept") cur.accept += count;
    else if (r.decision === "reject") cur.reject += count;
    langMap.set(r.language, cur);
  }
  const languageBreakdown = [...langMap.entries()]
    .map(([language, v]) => ({ language, accept: v.accept, reject: v.reject, total: v.accept + v.reject }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return {
    apiCalls24h: countsByEvent.get("api_request") ?? 0,
    apiErrors24h: countsByEvent.get("api_error") ?? 0,
    prompts24h: countsByEvent.get("user_prompt") ?? 0,
    cost24h,
    activeSessions: new Set(otelRows.map((e) => e.sessionId).filter(Boolean)).size,
    toolAcceptRate: toolDecisions > 0 ? toolAccepts / toolDecisions : null,
    avgDurationMs: durationCount > 0 ? durationSum / durationCount : null,
    fastPct: speedTotal > 0 ? (fastCount / speedTotal) * 100 : null,
    hourlyBuckets,
    modelCosts,
    languageBreakdown,
    hasData: otelRows.length > 0 || langRows.length > 0,
  };
}

export interface RecentApiError {
  observedAt: Date;
  model: string | null;
  statusCode: string | null;
  error: string | null;
  durationMs: number | null;
  attempt: number | null;
}

export async function loadRecentApiErrors(userId: string, limit = 20): Promise<RecentApiError[]> {
  const rows = await db.query.otelEvents.findMany({
    where: and(eq(otelEvents.userId, userId), eq(otelEvents.eventName, "api_error")),
    orderBy: (e, { desc }) => [desc(e.observedAt)],
    limit,
  });
  return rows.map((r) => {
    const a = (r.attrs ?? {}) as Record<string, unknown>;
    return {
      observedAt: r.observedAt,
      model: typeof a.model === "string" ? a.model : null,
      statusCode: typeof a.status_code === "string" ? a.status_code : (typeof a.status_code === "number" ? String(a.status_code) : null),
      error: typeof a.error === "string" ? a.error : null,
      durationMs: typeof a.duration_ms === "number" ? a.duration_ms : null,
      attempt: typeof a.attempt === "number" ? a.attempt : null,
    };
  });
}
