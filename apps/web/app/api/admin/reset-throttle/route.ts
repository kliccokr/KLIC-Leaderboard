export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { db, users } from "@klic/db";
import { isNotNull } from "drizzle-orm";

export async function POST(): Promise<Response> {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await db
    .update(users)
    .set({ lastSubmissionAt: null })
    .where(isNotNull(users.lastSubmissionAt))
    .returning({ id: users.id });

  return Response.json({ success: true, count: result.length });
}
