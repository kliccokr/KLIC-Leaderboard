export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { db, otelEvents } from "@klic/db";
import {
  authenticate,
  extractEvents,
  normalizeOrgEmail,
  resolveEmailsToUserIds,
} from "../../_lib";

const ACCEPTED_EVENTS = new Set([
  "user_prompt",
  "tool_result",
  "api_request",
  "api_error",
  "tool_decision",
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

  const events = extractEvents(body).filter((e) => ACCEPTED_EVENTS.has(e.name));
  if (events.length === 0) return Response.json({ partialSuccess: {} });

  const rows: {
    userId: string;
    eventName: string;
    observedAt: Date;
    promptId: string | null;
    sessionId: string | null;
    attrs: Record<string, unknown>;
  }[] = [];

  if (auth.kind === "user") {
    for (const e of events) {
      rows.push({
        userId: auth.userId,
        eventName: e.name,
        observedAt: e.observedAt,
        promptId: e.promptId,
        sessionId: e.sessionId,
        attrs: e.attrs,
      });
    }
  } else {
    const emails = events
      .map((e) => normalizeOrgEmail(e.attrs["user.email"]))
      .filter((v): v is string => v !== null);
    const emailToUserId = await resolveEmailsToUserIds(emails);
    for (const e of events) {
      const email = normalizeOrgEmail(e.attrs["user.email"]);
      if (!email) continue;
      const userId = emailToUserId.get(email);
      if (!userId) continue;
      rows.push({
        userId,
        eventName: e.name,
        observedAt: e.observedAt,
        promptId: e.promptId,
        sessionId: e.sessionId,
        attrs: e.attrs,
      });
    }
  }

  if (rows.length > 0) await db.insert(otelEvents).values(rows);
  return Response.json({ partialSuccess: {} });
}
