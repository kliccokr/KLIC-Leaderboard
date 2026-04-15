import { getTranslations } from "next-intl/server";
import { db, users, submissions } from "@klic/db";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

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
          <a
            href={`/api/admin/cost-report?month=${currentMonth}`}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-500"
          >
            {t("downloadReport")}
          </a>
        </div>
      </div>

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
