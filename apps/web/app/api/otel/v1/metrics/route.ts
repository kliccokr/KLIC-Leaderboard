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
  const auth = await authenticate(req);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("json")) {
    return Response.json({ error: "Only application/json is supported" }, { status: 415 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });

  const metrics = extractMetrics(body).filter((m) => ACCEPTED_METRICS.has(m.name));
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

  if (rows.length > 0) await db.insert(otelMetricPoints).values(rows);
  return Response.json({ partialSuccess: {} });
}
