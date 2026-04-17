import { db } from "@klic/db";
import { sql } from "drizzle-orm";

export interface OtelDailyUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  totalCost: number;
  modelsUsed: string[];
}

/**
 * Aggregates OTel `api_request` events into per-day token/cost totals for a
 * single user. Returns a Map keyed by ISO date (YYYY-MM-DD) so callers can
 * override per-day JSONL data where OTel is present.
 *
 * Dates are UTC to match the format CLI scanner writes to `daily_breakdown`.
 */
export async function getOtelDailyForUser(
  userId: string,
  range?: { startDate: string; endDate: string } | null,
): Promise<Map<string, OtelDailyUsage>> {
  const rows = await db.execute<{
    day: string;
    input_tokens: string;
    output_tokens: string;
    cache_creation_tokens: string;
    cache_read_tokens: string;
    cost: string;
    models_used: string[] | null;
  }>(sql`
    SELECT
      to_char(observed_at::date, 'YYYY-MM-DD') AS day,
      COALESCE(SUM((attrs->>'input_tokens')::bigint), 0)::text AS input_tokens,
      COALESCE(SUM((attrs->>'output_tokens')::bigint), 0)::text AS output_tokens,
      COALESCE(SUM((attrs->>'cache_creation_tokens')::bigint), 0)::text AS cache_creation_tokens,
      COALESCE(SUM((attrs->>'cache_read_tokens')::bigint), 0)::text AS cache_read_tokens,
      COALESCE(SUM((attrs->>'cost_usd')::numeric), 0)::text AS cost,
      array_agg(DISTINCT attrs->>'model') FILTER (WHERE attrs->>'model' IS NOT NULL) AS models_used
    FROM otel_events
    WHERE user_id = ${userId}
      AND event_name = 'api_request'
      ${range
        ? sql`AND observed_at::date BETWEEN ${range.startDate}::date AND ${range.endDate}::date`
        : sql``}
    GROUP BY observed_at::date
  `);

  const map = new Map<string, OtelDailyUsage>();
  for (const r of rows) {
    const input = Number(r.input_tokens);
    const output = Number(r.output_tokens);
    const cacheC = Number(r.cache_creation_tokens);
    const cacheR = Number(r.cache_read_tokens);
    map.set(r.day, {
      inputTokens: input,
      outputTokens: output,
      cacheCreationTokens: cacheC,
      cacheReadTokens: cacheR,
      totalTokens: input + output + cacheC + cacheR,
      totalCost: Number(r.cost),
      modelsUsed: r.models_used ?? [],
    });
  }
  return map;
}
