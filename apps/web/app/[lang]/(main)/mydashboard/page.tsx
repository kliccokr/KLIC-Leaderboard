import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db, users, submissions, userSessions, otelEvents, otelMetricPoints } from "@klic/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { DashboardPeriodFilter } from "@/components/dashboard/DashboardPeriodFilter";
import { RefreshButton } from "@/components/dashboard/RefreshButton";
import { RealtimeSection } from "@/components/dashboard/RealtimeSection";
import type { DailyBreakdown } from "@klic/shared";
import { backfillDailyActivity, getPeriodRange } from "@/lib/dashboard-helpers";

export const dynamic = "force-dynamic";

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

  const { period = "1d" } = await searchParams;
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
  const dailyData = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Backfill activity data for old submissions that lack per-day fields
  backfillDailyActivity(dailyData, userSubmissions, rangeStart, rangeEnd);

  // Totals from filtered daily data (matches leaderboard calculation)
  const totalTokens = dailyData.reduce((s, d) => s + d.totalTokens, 0);
  const totalCost = dailyData.reduce((s, d) => s + d.totalCost, 0);

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

  // Count registered PCs (distinct sources)
  const pcCount = new Set(userSubmissions.map((s) => s.source)).size;

  // --- Real-time OTel stats (last 24h, KST buckets) ---
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const otelRows = await db.query.otelEvents.findMany({
    where: and(eq(otelEvents.userId, user.id), gte(otelEvents.observedAt, since24h)),
    orderBy: (e, { asc }) => [asc(e.observedAt)],
  });

  const countsByEvent = new Map<string, number>();
  const hourBuckets: Array<{ hour: string; requests: number; errors: number }> = Array.from(
    { length: 24 },
    (_, i) => ({ hour: String(i).padStart(2, "0"), requests: 0, errors: 0 }),
  );
  const modelAgg = new Map<string, { cost: number; calls: number }>();
  let cost24h = 0;
  let toolAccepts = 0;
  let toolRejects = 0;

  for (const ev of otelRows) {
    countsByEvent.set(ev.eventName, (countsByEvent.get(ev.eventName) ?? 0) + 1);
    const attrs = (ev.attrs ?? {}) as Record<string, unknown>;
    const kstHour = new Date(ev.observedAt.getTime() + 9 * 60 * 60 * 1000).getUTCHours();

    if (ev.eventName === "api_request") {
      hourBuckets[kstHour].requests++;
      const costUsd = typeof attrs.cost_usd === "number" ? attrs.cost_usd : 0;
      cost24h += costUsd;
      const model = typeof attrs.model === "string" ? attrs.model : "unknown";
      const agg = modelAgg.get(model) ?? { cost: 0, calls: 0 };
      agg.cost += costUsd;
      agg.calls += 1;
      modelAgg.set(model, agg);
    } else if (ev.eventName === "api_error") {
      hourBuckets[kstHour].errors++;
    } else if (ev.eventName === "tool_decision") {
      const decision = attrs.decision;
      if (decision === "accept") toolAccepts++;
      else if (decision === "reject") toolRejects++;
    }
  }

  const apiCalls24h = countsByEvent.get("api_request") ?? 0;
  const apiErrors24h = countsByEvent.get("api_error") ?? 0;
  const prompts24h = countsByEvent.get("user_prompt") ?? 0;
  const toolDecisions = toolAccepts + toolRejects;
  const toolAcceptRate = toolDecisions > 0 ? toolAccepts / toolDecisions : null;
  const activeSessions = new Set(otelRows.map((e) => e.sessionId).filter(Boolean)).size;
  const modelCosts = [...modelAgg.entries()]
    .map(([model, v]) => ({ model, cost: v.cost, calls: v.calls }))
    .sort((a, b) => b.cost - a.cost);

  const otelHasData = otelRows.length > 0;

  // api_request duration + speed aggregates
  let durationSum = 0;
  let durationCount = 0;
  let fastCount = 0;
  let normalCount = 0;
  for (const ev of otelRows) {
    if (ev.eventName !== "api_request") continue;
    const attrs = (ev.attrs ?? {}) as Record<string, unknown>;
    const dur = typeof attrs.duration_ms === "number" ? attrs.duration_ms : null;
    if (dur != null) {
      durationSum += dur;
      durationCount++;
    }
    const speed = attrs.speed;
    if (speed === "fast") fastCount++;
    else if (speed === "normal") normalCount++;
  }
  const avgDurationMs = durationCount > 0 ? durationSum / durationCount : null;
  const speedTotal = fastCount + normalCount;
  const fastPct = speedTotal > 0 ? (fastCount / speedTotal) * 100 : null;

  // Language edit breakdown from code_edit_tool.decision metric (24h)
  const langRows = await db.execute<{ language: string; decision: string; count: string }>(sql`
    SELECT
      coalesce(attrs->>'language', 'unknown') AS language,
      coalesce(attrs->>'decision', 'unknown') AS decision,
      sum(value::numeric) AS count
    FROM otel_metric_points
    WHERE user_id = ${user.id}
      AND metric_name = 'claude_code.code_edit_tool.decision'
      AND observed_at >= now() - interval '24 hours'
    GROUP BY 1, 2
  `);
  const langMap = new Map<string, { accept: number; reject: number }>();
  for (const r of langRows) {
    const cur = langMap.get(r.language) ?? { accept: 0, reject: 0 };
    const count = Number(r.count);
    if (r.decision === "accept") cur.accept += count;
    else if (r.decision === "reject") cur.reject += count;
    langMap.set(r.language, cur);
  }
  const languageBreakdown = [...langMap.entries()]
    .map(([language, v]) => ({ language, accept: v.accept, reject: v.reject, total: v.accept + v.reject }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

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

      <RealtimeSection
        apiCalls24h={apiCalls24h}
        apiErrors24h={apiErrors24h}
        prompts24h={prompts24h}
        cost24h={cost24h}
        activeSessions={activeSessions}
        toolAcceptRate={toolAcceptRate}
        hourlyBuckets={hourBuckets}
        modelCosts={modelCosts}
        avgDurationMs={avgDurationMs}
        fastPct={fastPct}
        languageBreakdown={languageBreakdown}
        hasData={otelHasData}
      />
    </div>
  );
}
