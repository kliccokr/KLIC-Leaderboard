import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db, users, submissions, userSessions } from "@klic/db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { calculateLevel, calculateTeamLevel } from "@klic/shared";
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
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default async function TeamProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; teamName: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { lang, teamName } = await params;
  const { period = "30d" } = await searchParams;
  const t = await getTranslations({ locale: lang, namespace: "team" });
  const decodedTeamName = decodeURIComponent(teamName);

  const teamMembers = await db.query.users.findMany({
    where: eq(users.team, decodedTeamName),
  });

  if (teamMembers.length === 0) notFound();

  // Period range
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;
  if (period !== "all") {
    const days = period === "1d" ? 1 : period === "3d" ? 3 : period === "5d" ? 5 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
    rangeStart = new Date(Date.now() - days * 86_400_000);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date();
  }

  const memberIds = teamMembers.map((m) => m.id);

  // Fetch all submissions for team members
  const allSubmissions = rangeStart
    ? await db.query.submissions.findMany({
        where: and(
          inArray(submissions.userId, memberIds),
          gte(submissions.dateRangeEnd, rangeStart.toISOString().slice(0, 10)),
          lte(submissions.dateRangeStart, rangeEnd!.toISOString().slice(0, 10)),
        ),
      })
    : await db.query.submissions.findMany({
        where: inArray(submissions.userId, memberIds),
      });

  // Fetch all sessions for team members
  const allSessions = rangeStart
    ? await db.query.userSessions.findMany({
        where: and(
          inArray(userSessions.userId, memberIds),
          gte(userSessions.sessionStart, rangeStart)
        ),
      })
    : await db.query.userSessions.findMany({
        where: inArray(userSessions.userId, memberIds),
      });

  // Date strings for period filtering
  const rangeStartStr = rangeStart ? rangeStart.toISOString().slice(0, 10) : null;
  const rangeEndStr = rangeEnd ? rangeEnd.toISOString().slice(0, 10) : null;

  // Aggregate daily breakdown (filtered by period)
  const dailyMap = new Map<string, DailyBreakdown>();
  for (const s of allSubmissions) {
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

  const totalActiveTimeSecs = allSubmissions.reduce((s, r) => s + (r.activeTimeSecs ?? 0), 0);
  const totalCommits = allSubmissions.reduce((s, r) => s + (r.commitsCount ?? 0), 0);
  const totalPRs = allSubmissions.reduce((s, r) => s + (r.pullRequestsCount ?? 0), 0);
  const totalLinesAdded = allSubmissions.reduce((s, r) => s + (r.linesAdded ?? 0), 0);

  // Model breakdown (from filtered daily data)
  const modelMap = new Map<string, number>();
  for (const d of dailyData) {
    for (const m of d.modelsUsed) {
      modelMap.set(m, (modelMap.get(m) ?? 0) + d.totalTokens);
    }
  }
  const modelData = [...modelMap.entries()].map(([name, value]) => ({ name, value }));

  // Per-member stats (from filtered daily data)
  const memberDailyMap = new Map<string, Map<string, DailyBreakdown>>();
  for (const s of allSubmissions) {
    for (const d of s.dailyBreakdown as DailyBreakdown[]) {
      if (rangeStartStr && d.date < rangeStartStr) continue;
      if (rangeEndStr && d.date > rangeEndStr) continue;
      let userMap = memberDailyMap.get(s.userId);
      if (!userMap) { userMap = new Map(); memberDailyMap.set(s.userId, userMap); }
      const existing = userMap.get(d.date);
      if (existing) {
        existing.totalTokens += d.totalTokens;
        existing.totalCost += d.totalCost;
      } else {
        userMap.set(d.date, { ...d });
      }
    }
  }
  const memberSubMap = new Map<string, number>();
  const memberCostMap = new Map<string, number>();
  for (const [userId, userMap] of memberDailyMap) {
    let tokens = 0;
    let cost = 0;
    for (const d of userMap.values()) {
      tokens += d.totalTokens;
      cost += d.totalCost;
    }
    memberSubMap.set(userId, tokens);
    memberCostMap.set(userId, cost);
  }
  const memberStats = teamMembers
    .map((m) => ({
      id: m.id,
      name: m.name ?? m.email,
      email: m.email,
      image: m.image,
      totalTokens: memberSubMap.get(m.id) ?? 0,
      totalCost: memberCostMap.get(m.id) ?? 0,
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens);

  // Sessions & projects
  const totalSessionsCount = allSessions.length;
  const totalTurns = allSessions.reduce((s, r) => s + r.turnsCount, 0);

  const projectMap = new Map<string, { totalTokens: number; totalCost: number; sessionsCount: number }>();
  for (const s of allSessions) {
    const existing = projectMap.get(s.projectName) ?? { totalTokens: 0, totalCost: 0, sessionsCount: 0 };
    existing.totalTokens += s.totalTokens;
    existing.totalCost += Number(s.totalCost);
    existing.sessionsCount++;
    projectMap.set(s.projectName, existing);
  }
  const projects = [...projectMap.entries()]
    .map(([projectName, stats]) => ({ projectName, ...stats }))
    .sort((a, b) => b.totalTokens - a.totalTokens);

  const sessionTableData = allSessions.map((s) => ({
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
  for (const s of allSessions) {
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
    { label: t("stats.totalTokens"), value: fmtTokens(totalTokens) },
    { label: t("stats.totalCost"), value: `$${totalCost.toFixed(2)}` },
    { label: t("stats.sessions"), value: totalSessionsCount.toLocaleString() },
    { label: t("stats.turns"), value: totalTurns.toLocaleString() },
    { label: t("stats.activeDays"), value: `${activeDays}일` },
    { label: t("stats.activeTime"), value: totalActiveTimeSecs > 0 ? fmtTime(totalActiveTimeSecs) : "-" },
    { label: t("stats.commits"), value: totalCommits > 0 ? totalCommits.toLocaleString() : "-" },
    { label: t("stats.pullRequests"), value: totalPRs > 0 ? totalPRs.toLocaleString() : "-" },
    { label: t("stats.linesAdded"), value: totalLinesAdded > 0 ? `+${totalLinesAdded.toLocaleString()}` : "-" },
  ];

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Team header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
          🏢
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{decodedTeamName}</h1>
          <p className="text-muted-foreground text-sm">{t("memberCount", { count: teamMembers.length })}</p>
        </div>
        <div className="ml-auto">
          <LevelProgress totalTokens={totalTokens} locale={lang} isTeam />
        </div>
      </div>

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
            {p === "all" ? (lang === "ko" ? "전체" : "All") : p === "30d" ? (lang === "ko" ? "30일" : "30d") : p === "7d" ? (lang === "ko" ? "7일" : "7d") : p === "5d" ? (lang === "ko" ? "5일" : "5d") : p === "3d" ? (lang === "ko" ? "3일" : "3d") : (lang === "ko" ? "1일" : "1d")}
          </a>
        ))}
      </div>

      {/* Member list */}
      <div className="space-y-2">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">{t("members")}</h2>

        {/* Mobile: cards */}
        <div className="md:hidden space-y-3">
          {memberStats.map((m, i) => {
            const level = calculateLevel(m.totalTokens);
            return (
              <a
                key={m.id}
                href={`/${lang}/profile/${m.email.split("@")[0]}`}
                className="block rounded-lg border border-border p-4 space-y-2 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-muted-foreground">
                    {i + 1 <= 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                  </span>
                  {m.image && <img src={m.image} alt="" className="w-8 h-8 rounded-full" />}
                  <span className="font-semibold text-foreground">{m.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{level.info.nameKo}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">{t("memberColumns.tokens")}</span>
                    <p className="font-mono text-foreground">{fmtTokens(m.totalTokens)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">{t("memberColumns.cost")}</span>
                    <p className="font-mono text-foreground">${m.totalCost.toFixed(2)}</p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t("memberColumns.rank")}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t("memberColumns.name")}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{t("memberColumns.level")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t("memberColumns.tokens")}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{t("memberColumns.cost")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {memberStats.map((m, i) => {
                const level = calculateLevel(m.totalTokens);
                return (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-bold text-muted-foreground">
                      {i + 1 <= 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/${lang}/profile/${m.email.split("@")[0]}`} className="flex items-center gap-2 hover:underline">
                        {m.image && <img src={m.image} alt="" className="w-6 h-6 rounded-full" />}
                        <span className="text-foreground">{m.name}</span>
                      </a>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{level.info.nameKo}</td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">{fmtTokens(m.totalTokens)}</td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">${m.totalCost.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
