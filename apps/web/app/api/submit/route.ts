export const dynamic = "force-dynamic";

import { db, apiKeys, submissions, users, userBadges, userSessions } from "@klic/db";
import { eq, and, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { calculateLevel } from "@klic/shared";
import { z } from "zod";

const dailyBreakdownSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  inputTokens: z.number().nonnegative(),
  outputTokens: z.number().nonnegative(),
  cacheCreationTokens: z.number().nonnegative(),
  cacheReadTokens: z.number().nonnegative(),
  totalTokens: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  modelsUsed: z.array(z.string()),
});

const sessionDataSchema = z.object({
  sessionId: z.string(),
  projectName: z.string(),
  totalTokens: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  inputTokens: z.number().nonnegative(),
  outputTokens: z.number().nonnegative(),
  cacheCreationTokens: z.number().nonnegative(),
  cacheReadTokens: z.number().nonnegative(),
  modelsUsed: z.array(z.string()),
  turnsCount: z.number().int().nonnegative(),
  sessionStart: z.string().nullable(),
  sessionEnd: z.string().nullable(),
  toolCounts: z.record(z.string(), z.number()).optional().default({}),
  taskCategories: z.record(z.string(), z.number()).optional().default({}),
});

const rateLimitsSchema = z.object({
  fiveHourUsedPct: z.number().nullable().default(null),
  sevenDayUsedPct: z.number().nullable().default(null),
  updatedAt: z.string().nullable().default(null),
}).optional();

const activitySchema = z.object({
  sessionsCount: z.number().int().nonnegative(),
  linesAdded: z.number().int().nonnegative(),
  linesRemoved: z.number().int().nonnegative(),
  commitsCount: z.number().int().nonnegative(),
  pullRequestsCount: z.number().int().nonnegative(),
  activeTimeSecs: z.number().int().nonnegative(),
}).optional();

const submissionPayloadSchema = z.object({
  totalTokens: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  inputTokens: z.number().nonnegative(),
  outputTokens: z.number().nonnegative(),
  cacheCreationTokens: z.number().nonnegative(),
  cacheReadTokens: z.number().nonnegative(),
  modelsUsed: z.array(z.string()),
  dailyBreakdown: z.array(dailyBreakdownSchema),
  dateRange: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  source: z.string().max(64).default("default"),
  hostname: z.string().max(255).optional(),
  activity: activitySchema,
  sessions: z.array(sessionDataSchema).optional(),
  rateLimits: rateLimitsSchema,
}).refine((payload) => payload.dateRange.start <= payload.dateRange.end, {
  message: "dateRange.start must be before or equal to dateRange.end",
  path: ["dateRange"],
});

export async function POST(req: Request): Promise<Response> {
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawKey = authHeader.slice(7);
    const body = await req.json().catch(() => null);
    const parsedPayload = submissionPayloadSchema.safeParse(body);

    if (!parsedPayload.success) {
      return Response.json(
        { error: "Invalid payload", details: parsedPayload.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsedPayload.data;

    // API key verification: SHA-256 hash then lookup
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const foundKey = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.keyHash, keyHash),
    });

    if (!foundKey) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }

    const { level, totalTokens } = await db.transaction(async (tx) => {
      await tx.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, foundKey.id));

      // Save rate limits to user row
      if (payload.rateLimits) {
        await tx.update(users).set({
          fiveHourUsedPct: payload.rateLimits.fiveHourUsedPct != null ? String(payload.rateLimits.fiveHourUsedPct) : null,
          sevenDayUsedPct: payload.rateLimits.sevenDayUsedPct != null ? String(payload.rateLimits.sevenDayUsedPct) : null,
          rateLimitUpdatedAt: payload.rateLimits.updatedAt ? new Date(payload.rateLimits.updatedAt) : new Date(),
        }).where(eq(users.id, foundKey.userId));
      }

      // Replace only submissions from the same source (same computer)
      // Submissions from other computers are kept intact
      await tx.delete(submissions).where(
        and(
          eq(submissions.userId, foundKey.userId),
          eq(submissions.source, payload.source)
        )
      );

      await tx.insert(submissions).values({
        userId: foundKey.userId,
        source: payload.source,
        totalTokens: payload.totalTokens,
        totalCost: String(payload.totalCost),
        inputTokens: payload.inputTokens,
        outputTokens: payload.outputTokens,
        cacheCreationTokens: payload.cacheCreationTokens ?? 0,
        cacheReadTokens: payload.cacheReadTokens ?? 0,
        modelsUsed: payload.modelsUsed,
        dailyBreakdown: payload.dailyBreakdown,
        dateRangeStart: payload.dateRange.start,
        dateRangeEnd: payload.dateRange.end,
        sessionsCount: payload.activity?.sessionsCount ?? null,
        linesAdded: payload.activity?.linesAdded ?? null,
        linesRemoved: payload.activity?.linesRemoved ?? null,
        commitsCount: payload.activity?.commitsCount ?? null,
        pullRequestsCount: payload.activity?.pullRequestsCount ?? null,
        activeTimeSecs: payload.activity?.activeTimeSecs ?? null,
      });

      // Upsert sessions (ON CONFLICT on userId+sessionId -> update)
      if (payload.sessions && payload.sessions.length > 0) {
        for (const s of payload.sessions) {
          await tx
            .insert(userSessions)
            .values({
              userId: foundKey.userId,
              sessionId: s.sessionId,
              projectName: s.projectName,
              totalTokens: s.totalTokens,
              totalCost: String(s.totalCost),
              inputTokens: s.inputTokens,
              outputTokens: s.outputTokens,
              cacheCreationTokens: s.cacheCreationTokens,
              cacheReadTokens: s.cacheReadTokens,
              modelsUsed: s.modelsUsed,
              turnsCount: s.turnsCount,
              sessionStart: s.sessionStart ? new Date(s.sessionStart) : null,
              sessionEnd: s.sessionEnd ? new Date(s.sessionEnd) : null,
              source: payload.source,
              hostname: payload.hostname ?? null,
              toolCounts: s.toolCounts ?? {},
              taskCategories: s.taskCategories ?? {},
            })
            .onConflictDoUpdate({
              target: [userSessions.userId, userSessions.sessionId],
              set: {
                projectName: s.projectName,
                totalTokens: s.totalTokens,
                totalCost: String(s.totalCost),
                inputTokens: s.inputTokens,
                outputTokens: s.outputTokens,
                cacheCreationTokens: s.cacheCreationTokens,
                cacheReadTokens: s.cacheReadTokens,
                modelsUsed: s.modelsUsed,
                turnsCount: s.turnsCount,
                sessionStart: s.sessionStart ? new Date(s.sessionStart) : null,
                sessionEnd: s.sessionEnd ? new Date(s.sessionEnd) : null,
                source: payload.source,
                hostname: payload.hostname ?? null,
                toolCounts: s.toolCounts ?? {},
                taskCategories: s.taskCategories ?? {},
              },
            });
        }
      }

      const [result] = await tx
        .select({ total: sql<number>`coalesce(sum(${submissions.totalTokens}), 0)` })
        .from(submissions)
        .where(eq(submissions.userId, foundKey.userId));
      const totalTokens = Number(result?.total ?? 0);
      const { level } = calculateLevel(totalTokens);

      await tx.update(users).set({ level }).where(eq(users.id, foundKey.userId));

      const tokenBadges = await tx.query.badges.findMany();
      for (const badge of tokenBadges) {
        const condition = badge.condition as { type?: string; threshold?: number };
        if (condition.type !== "tokens" || typeof condition.threshold !== "number") continue;
        if (totalTokens < condition.threshold) continue;

        const existingBadge = await tx.query.userBadges.findFirst({
          where: and(eq(userBadges.userId, foundKey.userId), eq(userBadges.badgeId, badge.id)),
        });

        if (!existingBadge) {
          await tx.insert(userBadges).values({
            userId: foundKey.userId,
            badgeId: badge.id,
          });
        }
      }

      return { level, totalTokens };
    });

    return Response.json({ success: true, level, totalTokens }, { status: 200 });
  } catch (err) {
    console.error("Submit error:", err instanceof Error ? err.stack : err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
