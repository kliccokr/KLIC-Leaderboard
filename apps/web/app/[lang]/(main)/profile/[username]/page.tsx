import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db, users, submissions, userBadges, badges, userSessions } from "@klic/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { LevelProgress } from "@/components/profile/LevelProgress";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { RealtimeSection } from "@/components/dashboard/RealtimeSection";
import { ApiErrorsTable } from "@/components/dashboard/ApiErrorsTable";
import type { DailyBreakdown } from "@klic/shared";
import { backfillDailyActivity, getPeriodRange } from "@/lib/dashboard-helpers";
import { loadRealtimeStats, loadRecentApiErrors } from "@/lib/otel-realtime";
import { getOtelDailyForUser } from "@/lib/hybrid-daily";

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; username: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { lang, username } = await params;
  const { period = "1d" } = await searchParams;
  const t = await getTranslations({ locale: lang, namespace: "profile" });

  const user = await db.query.users.findFirst({
    where: eq(users.email, `${username}@${process.env.AUTH_GOOGLE_DOMAIN}`),
  });
  if (!user) notFound();

  // Period range (UTC-based to match dailyBreakdown dates)
  const periodRange = getPeriodRange(period);
  let rangeStart: Date | null = periodRange?.start ?? null;
  let rangeEnd: Date | null = periodRange?.end ?? null;

  const userSubmissions = rangeStart
    ? await db.query.submissions.findMany({
        where: and(
          eq(submissions.userId, user.id),
          gte(submissions.dateRangeEnd, rangeStart.toISOString().slice(0, 10)),
          lte(submissions.dateRangeStart, rangeEnd!.toISOString().slice(0, 10)),
        ),
        orderBy: (s, { asc }) => [asc(s.dateRangeStart)],
      })
    : await db.query.submissions.findMany({
        where: eq(submissions.userId, user.id),
        orderBy: (s, { asc }) => [asc(s.dateRangeStart)],
      });

  // Date strings for period filtering
  const rangeStartStr = rangeStart ? rangeStart.toISOString().slice(0, 10) : null;
  const rangeEndStr = rangeEnd ? rangeEnd.toISOString().slice(0, 10) : null;

  // OTel daily override (hybrid): tokens/cost/models come from OTel api_request
  // events where present, activity fields stay on JSONL.
  const otelDaily = await getOtelDailyForUser(
    user.id,
    rangeStartStr && rangeEndStr ? { startDate: rangeStartStr, endDate: rangeEndStr } : null,
  );

  // Aggregate daily breakdown (SUM — each PC has its own sessions, no overlap)
  const dailyMap = new Map<string, DailyBreakdown>();
  for (const s of userSubmissions) {
    for (const d of s.dailyBreakdown as DailyBreakdown[]) {
      if (rangeStartStr && d.date < rangeStartStr) continue;
      if (rangeEndStr && d.date > rangeEndStr) continue;
      const existing = dailyMap.get(d.date);
      if (existing) {
        existing.inputTokens += d.inputTokens;
        existing.outputTokens += d.outputTokens;
        existing.cacheCreationTokens += d.cacheCreationTokens;
        existing.cacheReadTokens += d.cacheReadTokens;
        existing.totalTokens += d.totalTokens;
        existing.totalCost += d.totalCost;
        existing.linesAdded = (existing.linesAdded ?? 0) + (d.linesAdded ?? 0);
        existing.linesRemoved = (existing.linesRemoved ?? 0) + (d.linesRemoved ?? 0);
        existing.commitsCount = (existing.commitsCount ?? 0) + (d.commitsCount ?? 0);
        existing.pullRequestsCount = (existing.pullRequestsCount ?? 0) + (d.pullRequestsCount ?? 0);
        existing.activeTimeSecs = (existing.activeTimeSecs ?? 0) + (d.activeTimeSecs ?? 0);
      } else {
        dailyMap.set(d.date, { ...d });
      }
    }
  }

  for (const [date, otel] of otelDaily) {
    if (rangeStartStr && date < rangeStartStr) continue;
    if (rangeEndStr && date > rangeEndStr) continue;
    const existing = dailyMap.get(date);
    if (!existing || otel.totalTokens > existing.totalTokens) {
      const activity = existing
        ? {
            linesAdded: existing.linesAdded,
            linesRemoved: existing.linesRemoved,
            commitsCount: existing.commitsCount,
            pullRequestsCount: existing.pullRequestsCount,
            activeTimeSecs: existing.activeTimeSecs,
          }
        : {};
      dailyMap.set(date, {
        date,
        inputTokens: otel.inputTokens,
        outputTokens: otel.outputTokens,
        cacheCreationTokens: otel.cacheCreationTokens,
        cacheReadTokens: otel.cacheReadTokens,
        totalTokens: otel.totalTokens,
        totalCost: otel.totalCost,
        modelsUsed: otel.modelsUsed.length > 0 ? otel.modelsUsed : (existing?.modelsUsed ?? []),
        ...activity,
      });
    }
  }

  const dailyData = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Backfill activity data for old submissions that lack per-day fields
  backfillDailyActivity(dailyData, userSubmissions, rangeStartStr, rangeEndStr);

  // Totals from filtered daily data
  const totalTokens = dailyData.reduce((sum, d) => sum + d.totalTokens, 0);
  const totalCost = dailyData.reduce((sum, d) => sum + d.totalCost, 0);

  // Activity stats from filtered daily breakdown (not submission-level totals)
  const totalActiveTimeSecs = dailyData.reduce((s, d) => s + (d.activeTimeSecs ?? 0), 0);
  const totalCommits = dailyData.reduce((s, d) => s + (d.commitsCount ?? 0), 0);
  const totalPRs = dailyData.reduce((s, d) => s + (d.pullRequestsCount ?? 0), 0);
  const totalLinesAdded = dailyData.reduce((s, d) => s + (d.linesAdded ?? 0), 0);

  // Model breakdown (from filtered daily data)
  const modelMap = new Map<string, number>();
  for (const d of dailyData) {
    for (const m of d.modelsUsed) {
      modelMap.set(m, (modelMap.get(m) ?? 0) + d.totalTokens);
    }
  }
  const modelData = [...modelMap.entries()].map(([name, value]) => ({ name, value }));

  // Sessions
  const sessionRows = rangeStart
    ? await db.query.userSessions.findMany({
        where: and(
          eq(userSessions.userId, user.id),
          gte(userSessions.sessionStart, rangeStart)
        ),
        orderBy: (s, { desc }) => [desc(s.sessionStart)],
      })
    : await db.query.userSessions.findMany({
        where: eq(userSessions.userId, user.id),
        orderBy: (s, { desc }) => [desc(s.sessionStart)],
      });

  const totalSessions = sessionRows.length;
  const totalTurns = sessionRows.reduce((s, r) => s + r.turnsCount, 0);

  // Projects
  const projectMap = new Map<string, { totalTokens: number; totalCost: number; sessionsCount: number }>();
  for (const s of sessionRows) {
    const existing = projectMap.get(s.projectName) ?? { totalTokens: 0, totalCost: 0, sessionsCount: 0 };
    existing.totalTokens += s.totalTokens;
    existing.totalCost += Number(s.totalCost);
    existing.sessionsCount++;
    projectMap.set(s.projectName, existing);
  }
  const projects = [...projectMap.entries()]
    .map(([projectName, stats]) => ({ projectName, ...stats }))
    .sort((a, b) => b.totalTokens - a.totalTokens);

  const sessionTableData = sessionRows.map((s) => ({
    sessionId: s.sessionId,
    projectName: s.projectName,
    totalTokens: s.totalTokens,
    totalCost: Number(s.totalCost),
    turnsCount: s.turnsCount,
    modelsUsed: s.modelsUsed as string[],
    sessionStart: s.sessionStart,
    sessionEnd: s.sessionEnd,
    source: s.source ?? "default",
    hostname: s.hostname ?? null,
  }));

  // Tool usage aggregation (from filtered sessions)
  const toolMap = new Map<string, number>();
  const taskMap = new Map<string, number>();
  for (const s of sessionRows) {
    const tc = s.toolCounts as Record<string, number> | null;
    if (tc) {
      for (const [tool, count] of Object.entries(tc)) {
        toolMap.set(tool, (toolMap.get(tool) ?? 0) + count);
      }
    }
    const tg = s.taskCategories as Record<string, number> | null;
    if (tg) {
      for (const [cat, count] of Object.entries(tg)) {
        taskMap.set(cat, (taskMap.get(cat) ?? 0) + count);
      }
    }
  }
  const toolData = [...toolMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  const taskData = [...taskMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const activeDays = dailyData.filter((d) => d.totalTokens > 0).length;

  // Badges
  const earnedBadges = await db
    .select({ name: badges.name, icon: badges.icon })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.userId, user.id));

  // Count registered PCs (distinct sources)
  const pcCount = new Set(userSubmissions.map((s) => s.source)).size;

  // Viewer can see cost if they're the owner or admin
  const session = await auth();
  const isOwner = session?.user?.email === user.email;
  const isAdmin = session?.user?.role === "admin";
  const canSeeCost = isOwner || isAdmin;

  const realtimeStats = await loadRealtimeStats(user.id);
  const recentErrors = canSeeCost ? await loadRecentApiErrors(user.id, 20) : [];

  const stats = [
    { label: "총 토큰", value: fmtTokens(totalTokens) },
    { label: "총 비용", value: `$${totalCost.toFixed(2)}`, tooltip: "API 비용 추정치 (토큰 단가 기준)" },
    { label: "등록 PC", value: `${pcCount}대` },
    { label: "세션 수", value: totalSessions.toLocaleString() },
    { label: "총 턴", value: totalTurns.toLocaleString() },
    { label: "활성 일수", value: `${activeDays}일` },
    { label: "활성 시간", value: totalActiveTimeSecs > 0 ? fmtTime(totalActiveTimeSecs) : "-" },
    { label: "커밋", value: totalCommits > 0 ? totalCommits.toLocaleString() : "-" },
    { label: "PR", value: totalPRs > 0 ? totalPRs.toLocaleString() : "-" },
    { label: "추가 라인", value: totalLinesAdded > 0 ? `+${totalLinesAdded.toLocaleString()}` : "-" },
  ];

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* User header */}
      <div className="flex items-center gap-4">
        {user.image && (
          <img src={user.image} alt={user.name ?? ""} className="w-14 h-14 rounded-full" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
          <p className="text-muted-foreground text-sm">
            {[user.department, user.team].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="ml-auto">
          <LevelProgress totalTokens={totalTokens} locale={lang} />
        </div>
      </div>

      {/* Badges */}
      {earnedBadges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {earnedBadges.map((b) => (
            <span key={b.name} className="flex items-center gap-1 bg-muted rounded-full px-3 py-1 text-sm text-foreground">
              <span>{b.icon}</span>
              <span>{b.name}</span>
            </span>
          ))}
        </div>
      )}

      {/* Period filter */}
      <div className="flex gap-1">
        {(["1d", "3d", "5d", "7d", "30d", "all"] as const).map((p) => (
          <a
            key={p}
            href={`?period=${p}`}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              period === p
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {p === "all" ? "전체" : p === "30d" ? "30일" : p === "7d" ? "7일" : p === "5d" ? "5일" : p === "3d" ? "3일" : "1일"}
          </a>
        ))}
      </div>

      {/* Dashboard tabs */}
      <DashboardTabs
        stats={stats}
        dailyData={dailyData}
        modelData={modelData}
        toolData={toolData}
        taskData={taskData}
        projects={projects}
        sessions={sessionTableData}
      />

      <RealtimeSection {...realtimeStats} hideCost={!canSeeCost} />
      {canSeeCost && <ApiErrorsTable errors={recentErrors} />}
    </div>
  );
}
