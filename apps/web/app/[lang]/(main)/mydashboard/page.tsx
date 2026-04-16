import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db, users, submissions, userSessions } from "@klic/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { DashboardPeriodFilter } from "@/components/dashboard/DashboardPeriodFilter";
import { RefreshButton } from "@/components/dashboard/RefreshButton";
import type { DailyBreakdown } from "@klic/shared";

export const dynamic = "force-dynamic";

function getPeriodRange(period: string): { start: Date; end: Date } | null {
  if (period === "all") return null;
  const days = period === "1d" ? 1 : period === "3d" ? 3 : period === "5d" ? 5 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const end = new Date();
  const start = new Date(Date.now() - days * 86_400_000);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

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

export default async function MyDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/ko/login");

  const { period = "30d" } = await searchParams;
  const range = getPeriodRange(period);

  const user = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
  });
  if (!user) notFound();

  // --- Submissions data (daily breakdown) ---
  const userSubmissions = await db.query.submissions.findMany({
    where: and(
      eq(submissions.userId, user.id),
      ...(range
        ? [
            lte(submissions.dateRangeStart, range.end.toISOString().slice(0, 10)),
            gte(submissions.dateRangeEnd, range.start.toISOString().slice(0, 10)),
          ]
        : [])
    ),
    orderBy: (s, { asc }) => [asc(s.dateRangeStart)],
  });

  // Build date strings for period filtering
  const rangeStart = range ? range.start.toISOString().slice(0, 10) : null;
  const rangeEnd = range ? range.end.toISOString().slice(0, 10) : null;

  // Aggregate daily breakdown (SUM — each PC has its own sessions, no overlap)
  const dailyMap = new Map<string, DailyBreakdown>();
  for (const sub of userSubmissions) {
    for (const d of sub.dailyBreakdown as DailyBreakdown[]) {
      if (rangeStart && d.date < rangeStart) continue;
      if (rangeEnd && d.date > rangeEnd) continue;
      const existing = dailyMap.get(d.date);
      if (existing) {
        existing.inputTokens += d.inputTokens;
        existing.outputTokens += d.outputTokens;
        existing.cacheCreationTokens += d.cacheCreationTokens;
        existing.cacheReadTokens += d.cacheReadTokens;
        existing.totalTokens += d.totalTokens;
        existing.totalCost += d.totalCost;
      } else {
        dailyMap.set(d.date, { ...d });
      }
    }
  }
  const dailyData = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Totals from filtered daily data (matches leaderboard calculation)
  const totalTokens = dailyData.reduce((s, d) => s + d.totalTokens, 0);
  const totalCost = dailyData.reduce((s, d) => s + d.totalCost, 0);

  // Activity stats from submission-level (proportional to filtered days)
  const totalActiveTimeSecs = userSubmissions.reduce((s, r) => s + (r.activeTimeSecs ?? 0), 0);
  const totalCommits = userSubmissions.reduce((s, r) => s + (r.commitsCount ?? 0), 0);
  const totalPRs = userSubmissions.reduce((s, r) => s + (r.pullRequestsCount ?? 0), 0);
  const totalLinesAdded = userSubmissions.reduce((s, r) => s + (r.linesAdded ?? 0), 0);

  // Model breakdown (from filtered daily data)
  const modelMap = new Map<string, number>();
  for (const d of dailyData) {
    for (const m of d.modelsUsed) {
      modelMap.set(m, (modelMap.get(m) ?? 0) + d.totalTokens);
    }
  }
  const modelData = [...modelMap.entries()].map(([name, value]) => ({ name, value }));

  // --- Sessions data ---
  const sessionRows = await db.query.userSessions.findMany({
    where: and(
      eq(userSessions.userId, user.id),
      ...(range
        ? [gte(userSessions.sessionStart, range.start)]
        : [])
    ),
    orderBy: (s, { desc }) => [desc(s.sessionStart)],
  });

  const totalSessions = sessionRows.length;
  const totalTurns = sessionRows.reduce((s, r) => s + r.turnsCount, 0);

  // Project aggregation
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
    source: s.source,
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

  const stats = [
    { label: "총 토큰", value: fmtTokens(totalTokens) },
    { label: "총 비용", value: `$${totalCost.toFixed(2)}` },
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
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">내 대시보드</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {session.user.name ?? session.user.email} · 내 Claude Code 사용 현황
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DashboardPeriodFilter current={period} />
          <RefreshButton />
        </div>
      </div>

      {/* Tabs: 개요 / 세션 / 프로젝트 */}
      <DashboardTabs
        stats={stats}
        dailyData={dailyData}
        modelData={modelData}
        toolData={toolData}
        taskData={taskData}
        projects={projects}
        sessions={sessionTableData}
      />
    </div>
  );
}
