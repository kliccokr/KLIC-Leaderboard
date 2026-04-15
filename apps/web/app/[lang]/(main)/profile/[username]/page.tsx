import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db, users, submissions, userBadges, badges, userSessions } from "@klic/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { ModelPieChart } from "@/components/profile/ModelPieChart";
import { LevelProgress } from "@/components/profile/LevelProgress";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import type { DailyBreakdown } from "@klic/shared";

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
  const { period = "30d" } = await searchParams;
  const t = await getTranslations({ locale: lang, namespace: "profile" });

  const user = await db.query.users.findFirst({
    where: eq(users.email, `${username}@${process.env.AUTH_GOOGLE_DOMAIN}`),
  });
  if (!user) notFound();

  // Period range
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;
  if (period !== "all") {
    const days = period === "1d" ? 1 : period === "3d" ? 3 : period === "5d" ? 5 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
    rangeStart = new Date(Date.now() - days * 86_400_000);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date();
  }

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

  // Aggregate daily breakdown (filtered by period)
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
      } else {
        dailyMap.set(d.date, { ...d });
      }
    }
  }
  const dailyData = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Totals from filtered daily data
  const totalTokens = dailyData.reduce((sum, d) => sum + d.totalTokens, 0);
  const totalCost = dailyData.reduce((sum, d) => sum + d.totalCost, 0);

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
    </div>
  );
}
