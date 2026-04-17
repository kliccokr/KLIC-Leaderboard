import { getTranslations } from "next-intl/server";
import { db, users, submissions } from "@klic/db";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ResetThrottleButton } from "./ResetThrottleButton";
import Link from "next/link";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const session = await auth();
  if (session?.user?.role !== "admin") redirect(`/${lang}`);

  const t = await getTranslations({ locale: lang, namespace: "admin" });

  const stats = await db
    .select({
      department: users.department,
      orgUnit: users.team,
      userCount: sql<number>`count(distinct ${users.id})`,
      totalTokens: sql<number>`coalesce(sum(${submissions.totalTokens}), 0)`,
      totalCost: sql<number>`coalesce(sum(${submissions.totalCost}::numeric), 0)`,
    })
    .from(users)
    .leftJoin(submissions, sql`${submissions.userId} = ${users.id}`)
    .groupBy(users.department, users.team)  // DB column is `team`, stores orgUnit value
    .orderBy(sql`sum(${submissions.totalCost}::numeric) DESC NULLS LAST`);

  const currentMonth = new Date().toISOString().slice(0, 7);

  // ── Realtime OTel stats (org-wide) ──
  const realtime = await db.execute<{
    active_users_5m: string;
    api_calls_1h: string;
    api_calls_24h: string;
    api_errors_24h: string;
    cost_24h: string;
    prompts_24h: string;
    sending_users: string;
  }>(sql`
    SELECT
      count(DISTINCT user_id) FILTER (WHERE observed_at >= now() - interval '5 minutes') AS active_users_5m,
      count(*) FILTER (WHERE event_name = 'api_request' AND observed_at >= now() - interval '1 hour') AS api_calls_1h,
      count(*) FILTER (WHERE event_name = 'api_request' AND observed_at >= now() - interval '24 hours') AS api_calls_24h,
      count(*) FILTER (WHERE event_name = 'api_error' AND observed_at >= now() - interval '24 hours') AS api_errors_24h,
      coalesce(sum((attrs->>'cost_usd')::numeric) FILTER (WHERE event_name = 'api_request' AND observed_at >= now() - interval '24 hours'), 0) AS cost_24h,
      count(*) FILTER (WHERE event_name = 'user_prompt' AND observed_at >= now() - interval '24 hours') AS prompts_24h,
      count(DISTINCT user_id) FILTER (WHERE observed_at >= now() - interval '24 hours') AS sending_users
    FROM otel_events
  `);
  const rt = realtime[0];

  const modelCosts = await db.execute<{ model: string; cost: string; calls: string }>(sql`
    SELECT
      coalesce(attrs->>'model', 'unknown') AS model,
      sum((attrs->>'cost_usd')::numeric) AS cost,
      count(*) AS calls
    FROM otel_events
    WHERE event_name = 'api_request'
      AND observed_at >= now() - interval '24 hours'
    GROUP BY 1
    ORDER BY cost DESC NULLS LAST
    LIMIT 5
  `);

  const topUsers = await db.execute<{
    user_id: string;
    name: string | null;
    email: string;
    calls: string;
    errors: string;
    cost: string;
  }>(sql`
    SELECT
      u.id AS user_id,
      u.name,
      u.email,
      count(*) FILTER (WHERE e.event_name = 'api_request') AS calls,
      count(*) FILTER (WHERE e.event_name = 'api_error') AS errors,
      coalesce(sum((e.attrs->>'cost_usd')::numeric) FILTER (WHERE e.event_name = 'api_request'), 0) AS cost
    FROM otel_events e
    JOIN users u ON u.id = e.user_id
    WHERE e.observed_at >= now() - interval '24 hours'
    GROUP BY u.id, u.name, u.email
    ORDER BY calls DESC
    LIMIT 10
  `);

  const apiCalls24h = Number(rt?.api_calls_24h ?? 0);
  const apiErrors24h = Number(rt?.api_errors_24h ?? 0);
  const errorRate24h = apiCalls24h > 0 ? (apiErrors24h / apiCalls24h) * 100 : 0;

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
        <div className="flex gap-2">
          <form action="/api/admin/sync-directory" method="POST">
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-sm font-medium text-neutral-300 hover:bg-neutral-700"
            >
              {t("syncDirectory")}
            </button>
          </form>
          <ResetThrottleButton label={t("resetThrottle")} />
          <a
            href={`/api/admin/cost-report?month=${currentMonth}`}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-500"
          >
            {t("downloadReport")}
          </a>
        </div>
      </div>

      {/* ── Realtime (OTel) ── */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-white">실시간 (OTel)</h2>
          <span className="text-xs text-neutral-400">Claude Code에서 직접 수신 · {Number(rt?.sending_users ?? 0)}명 전송 중 (24h)</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-lg border border-neutral-800 p-4">
            <div className="text-xs text-neutral-400">활성 사용자</div>
            <div className="mt-1 font-mono text-lg text-white">{Number(rt?.active_users_5m ?? 0)}</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">최근 5분</div>
          </div>
          <div className="rounded-lg border border-neutral-800 p-4">
            <div className="text-xs text-neutral-400">API 호출 (1h)</div>
            <div className="mt-1 font-mono text-lg text-white">{Number(rt?.api_calls_1h ?? 0).toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-neutral-800 p-4">
            <div className="text-xs text-neutral-400">에러율 (24h)</div>
            <div className="mt-1 font-mono text-lg text-white">{errorRate24h.toFixed(1)}%</div>
            <div className="text-[11px] text-neutral-500 mt-0.5">{apiErrors24h}/{apiCalls24h.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-neutral-800 p-4">
            <div className="text-xs text-neutral-400">실시간 비용 (24h)</div>
            <div className="mt-1 font-mono text-lg text-white">${Number(rt?.cost_24h ?? 0).toFixed(2)}</div>
          </div>
          <div className="rounded-lg border border-neutral-800 p-4">
            <div className="text-xs text-neutral-400">프롬프트 (24h)</div>
            <div className="mt-1 font-mono text-lg text-white">{Number(rt?.prompts_24h ?? 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-neutral-800 p-4 space-y-2">
            <h3 className="text-sm font-medium text-neutral-300">모델별 비용 (24h)</h3>
            {modelCosts.length === 0 ? (
              <p className="text-xs text-neutral-500">데이터 없음</p>
            ) : (
              <div className="divide-y divide-neutral-800">
                {modelCosts.map((m) => (
                  <div key={m.model} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-neutral-200">{m.model}</span>
                    <span className="font-mono text-neutral-400">
                      ${Number(m.cost).toFixed(2)} · {Number(m.calls).toLocaleString()}회
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-neutral-800 p-4 space-y-2">
            <h3 className="text-sm font-medium text-neutral-300">상위 활동 유저 (24h)</h3>
            {topUsers.length === 0 ? (
              <p className="text-xs text-neutral-500">데이터 없음</p>
            ) : (
              <div className="divide-y divide-neutral-800">
                {topUsers.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/${lang}/profile/${u.email.split("@")[0]}`} className="text-neutral-200 hover:underline truncate">
                      {u.name ?? u.email}
                    </Link>
                    <span className="font-mono text-neutral-400 whitespace-nowrap">
                      {Number(u.calls).toLocaleString()}회 · ${Number(u.cost).toFixed(2)}
                      {Number(u.errors) > 0 && (
                        <span className="text-red-400 ml-1">({Number(u.errors)}에러)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="rounded-lg border border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-neutral-300">부서</th>
              <th className="px-4 py-3 text-left text-neutral-300">팀</th>
              <th className="px-4 py-3 text-right text-neutral-300">인원</th>
              <th className="px-4 py-3 text-right text-neutral-300">총 토큰</th>
              <th className="px-4 py-3 text-right text-neutral-300">총 비용</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {stats.map((s, i) => (
              <tr key={i} className="hover:bg-neutral-800/30">
                <td className="px-4 py-3 text-neutral-300">{s.department ?? "-"}</td>
                <td className="px-4 py-3 text-neutral-300">{s.orgUnit ?? "-"}</td>
                <td className="px-4 py-3 text-right text-neutral-300">{s.userCount}</td>
                <td className="px-4 py-3 text-right font-mono text-neutral-300">
                  {(Number(s.totalTokens) / 1_000_000).toFixed(2)}M
                </td>
                <td className="px-4 py-3 text-right font-mono text-neutral-300">
                  ${Number(s.totalCost).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
