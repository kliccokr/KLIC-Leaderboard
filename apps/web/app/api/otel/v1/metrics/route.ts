export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { db, otelMetricPoints } from "@klic/db";
import { authenticateBearer, extractMetrics } from "../../_lib";

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
  const auth = await authenticateBearer(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("json")) {
    return Response.json({ error: "Only application/json is supported" }, { status: 415 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });

  const metrics = extractMetrics(body).filter((m) => ACCEPTED_METRICS.has(m.name));
  if (metrics.length === 0) return Response.json({ partialSuccess: {} });

  const rows = metrics.map((m) => ({
    userId: auth.userId,
    metricName: m.name,
    value: String(m.value),
    observedAt: m.observedAt,
    attrs: m.attrs,
  }));

  await db.insert(otelMetricPoints).values(rows);
  return Response.json({ partialSuccess: {} });
}
