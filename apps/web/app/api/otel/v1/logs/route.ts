export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { db, otelEvents } from "@klic/db";
import { authenticateBearer, extractEvents } from "../../_lib";

const ACCEPTED_EVENTS = new Set([
  "user_prompt",
  "tool_result",
  "api_request",
  "api_error",
  "tool_decision",
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

  const events = extractEvents(body).filter((e) => ACCEPTED_EVENTS.has(e.name));
  if (events.length === 0) return Response.json({ partialSuccess: {} });

  const rows = events.map((e) => ({
    userId: auth.userId,
    eventName: e.name,
    observedAt: e.observedAt,
    promptId: e.promptId,
    sessionId: e.sessionId,
    attrs: e.attrs,
  }));

  await db.insert(otelEvents).values(rows);
  return Response.json({ partialSuccess: {} });
}
