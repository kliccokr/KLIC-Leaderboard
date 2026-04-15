export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { db, apiKeys } from "@klic/db";
import { eq } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";

export async function GET(req: Request): Promise<Response> {
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const authHeader = req.headers.get("Authorization");

  // CLI status flow: Bearer API key validation
  if (authHeader?.startsWith("Bearer ")) {
    const rawKey = authHeader.slice(7);
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const key = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.keyHash, keyHash),
    });

    if (!key) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Response.json({ hasKey: true, lastUsedAt: key.lastUsedAt ?? null });
  }

  // Web session flow
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.userId, session.user.id),
  });

  return Response.json({
    hasKey: !!keys,
    lastUsedAt: keys?.lastUsedAt ?? null,
    key: keys?.keyValue ?? null,
  });
}

export async function POST(): Promise<Response> {
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rawKey = `klic_${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  try {
    await db.transaction(async (tx) => {
      const existingKey = await tx.query.apiKeys.findFirst({
        where: eq(apiKeys.userId, session.user.id),
      });

      await tx.delete(apiKeys).where(eq(apiKeys.userId, session.user.id));
      await tx.insert(apiKeys).values({
        userId: session.user.id,
        keyHash,
        keyValue: rawKey,
        name: "default",
        lastUsedAt: null,
      });
    });
  } catch {
    return Response.json({ error: "Failed to create API key" }, { status: 500 });
  }

  return Response.json({ key: rawKey }, { status: 201 });
}
