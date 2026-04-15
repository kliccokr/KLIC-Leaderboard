export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { db, users } from "@klic/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const linkAccountSchema = z.object({
  email: z.string().email(),
  githubUsername: z.string().max(39).regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/),
});

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = linkAccountSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { email, githubUsername } = parsed.data;

  const result = await db
    .update(users)
    .set({ githubUsername })
    .where(eq(users.email, email));

  if (!result.length) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
