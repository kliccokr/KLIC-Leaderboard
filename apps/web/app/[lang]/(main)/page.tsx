import { getTranslations } from "next-intl/server";
import { db, users } from "@klic/db";
import { sql } from "drizzle-orm";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { TeamLeaderboard } from "@/components/leaderboard/TeamLeaderboard";
import { PeriodFilter } from "@/components/leaderboard/PeriodFilter";
import type { LeaderboardEntry } from "@klic/shared";

function getPeriodDays(period: string): number | null {
  if (period === "all") return null;
  const map: Record<string, number> = { "1d": 1, "3d": 3, "5d": 5, "7d": 7, "30d": 30 };
  return map[period] ?? 30;
}

function getPeriodRange(period: string): { start: string; end: string } | null {
  const days = getPeriodDays(period);
  if (days === null) return null;
  const end = new Date();
  const start = new Date(Date.now() - days * 86400_000);
  start.setHours(0, 0, 0, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ period?: string; q?: string }>;
}) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "leaderboard" });
  const { period = "30d", q } = await searchParams;
  const range = getPeriodRange(period);
  const searchTerm = q?.trim();

  // Daily-level dedup: for each (user, date), take the MAX totalTokens and totalCost
  // across all submissions. This correctly handles overlapping data from multiple PCs.
  const periodFilter = range
    ? sql`(day->>'date')::date BETWEEN ${range.start}::date AND ${range.end}::date`
    : sql`1=1`;
  const submissionFilter = range
    ? sql`date_range_start <= ${range.end} AND date_range_end >= ${range.start}`
    : sql`1=1`;

  const rows = await db.execute<{
    userId: string;
    name: string;
    email: string;
    image: string | null;
    githubUsername: string | null;
    department: string | null;
    orgUnit: string | null;
    level: number | null;
    totalTokens: string;
    totalCost: string;
    submittedAt: string | null;
    fiveHourUsedPct: number | null;
    sevenDayUsedPct: number | null;
    rateLimitUpdatedAt: Date | null;
  }>(sql`
    WITH deduped_daily AS (
      SELECT
        s.user_id,
        (day->>'date')::date AS day_date,
        MAX((day->>'totalTokens')::bigint) AS day_tokens,
        MAX((day->>'totalCost')::numeric) AS day_cost
      FROM submissions s,
           jsonb_array_elements(s.daily_breakdown) AS day
      WHERE ${submissionFilter}
        AND ${periodFilter}
      GROUP BY s.user_id, (day->>'date')::date
    ),
    aggregated AS (
      SELECT
        user_id,
        SUM(day_tokens) AS total_tokens,
        SUM(day_cost) AS total_cost
      FROM deduped_daily
      GROUP BY user_id
    ),
    ranked AS (
      SELECT user_id, submitted_at,
             row_number() OVER (PARTITION BY user_id ORDER BY submitted_at DESC) AS rn
      FROM submissions
    ),
    latest AS (
      SELECT user_id, submitted_at FROM ranked WHERE rn = 1
    )
    SELECT
      u.id AS "userId",
      coalesce(u.name, u.email) AS name,
      u.email,
      u.image,
      u.github_username AS "githubUsername",
      u.department,
      u.team AS "orgUnit",
      u.level,
      coalesce(a.total_tokens, '0') AS "totalTokens",
      coalesce(a.total_cost, '0') AS "totalCost",
      l.submitted_at AS "submittedAt",
      u.five_hour_used_pct AS "fiveHourUsedPct",
      u.seven_day_used_pct AS "sevenDayUsedPct",
      u.rate_limit_updated_at AS "rateLimitUpdatedAt"
    FROM users u
    LEFT JOIN aggregated a ON a.user_id = u.id
    LEFT JOIN latest l ON l.user_id = u.id
    ${searchTerm
      ? sql`WHERE (u.name ILIKE '%' || ${searchTerm} || '%' OR u.email ILIKE '%' || ${searchTerm} || '%' OR u.team ILIKE '%' || ${searchTerm} || '%')`
      : sql``}
    ORDER BY CAST(coalesce(a.total_tokens, '0') AS bigint) DESC
    LIMIT ${searchTerm ? 200 : 100}
  `);

  const entries: LeaderboardEntry[] = rows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    name: r.name,
    email: r.email,
    image: r.image,
    githubUsername: r.githubUsername,
    department: r.department,
    orgUnit: r.orgUnit,
    level: r.level ?? 0,
    totalTokens: Number(r.totalTokens),
    totalCost: Number(r.totalCost),
    submittedAt: r.submittedAt ? new Date(r.submittedAt).toISOString() : "",
    fiveHourUsedPct: r.fiveHourUsedPct != null ? Number(r.fiveHourUsedPct) : null,
    sevenDayUsedPct: r.sevenDayUsedPct != null ? Number(r.sevenDayUsedPct) : null,
    rateLimitUpdatedAt: r.rateLimitUpdatedAt ? new Date(r.rateLimitUpdatedAt).toISOString() : null,
  }));

  const teamMap = new Map<string, { totalTokens: number; totalCost: number; members: number }>();
  for (const entry of entries) {
    const team = entry.orgUnit ?? "Unassigned";
    const current = teamMap.get(team) ?? { totalTokens: 0, totalCost: 0, members: 0 };
    current.totalTokens += entry.totalTokens;
    current.totalCost += Number(entry.totalCost);
    current.members += 1;
    teamMap.set(team, current);
  }
  const teamEntries = [...teamMap.entries()]
    .map(([team, stats]) => ({ orgUnit: team, ...stats }))
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .map((entry, index) => ({ rank: index + 1, ...entry }));

  return (
    <div className="container max-w-4xl mx-auto py-4 sm:py-8 px-4 sm:px-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>
      <PeriodFilter />
      <div className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">{t("tabs.individual")}</h2>
        <LeaderboardTable entries={entries} locale={lang} totalCount={rows.length} />
      </div>
      <div className="space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">{t("tabs.team")}</h2>
        <TeamLeaderboard entries={teamEntries} locale={lang} />
      </div>
    </div>
  );
}
