export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { db, users } from "@klic/db";
import { eq } from "drizzle-orm";
import { getDirectoryUsers } from "@/lib/google-directory";

export async function POST(): Promise<Response> {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const directoryUsers = await getDirectoryUsers().catch((e) => {
    console.error("Google Directory sync failed:", e);
    return null;
  });

  if (!directoryUsers) {
    return Response.json({ error: "Google Directory sync failed" }, { status: 500 });
  }

  let updated = 0;
  for (const du of directoryUsers) {
    if (!du.email) continue;
    const result = await db
      .update(users)
      .set({ department: du.department, team: du.orgUnit })
      .where(eq(users.email, du.email));
    if (result.length) updated++;
  }

  return Response.json({ success: true, updated });
}
