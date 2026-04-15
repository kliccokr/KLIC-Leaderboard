export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { db, users, submissions } from "@klic/db";
import { sql } from "drizzle-orm";

function encodeCsvCell(value: string | null | undefined): string {
  if (value == null) {
    return "\"\"";
  }

  const escapedValue = value.replaceAll("\"", "\"\"");
  const needsFormulaNeutralization = /^[=+\-@]/.test(value.trim());
  const safeValue = needsFormulaNeutralization ? `'${escapedValue}` : escapedValue;

  return `"${safeValue}"`;
}

export async function GET(req: Request): Promise<Response> {
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  const session = await auth();
  if (session?.user?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ?? new Date().toISOString().slice(0, 7);
  const start = `${month}-01`;
  const lastDay = new Date(new Date(`${month}-01`).getFullYear(), new Date(`${month}-01`).getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  const end = lastDay;

  const rows = await db
    .select({
      name: users.name,
      email: users.email,
      department: users.department,
      orgUnit: users.team,
      totalTokens: sql<number>`coalesce(sum(${submissions.totalTokens}), 0)`,
      totalCost: sql<number>`coalesce(sum(${submissions.totalCost}::numeric), 0)`,
    })
    .from(users)
    .leftJoin(
      submissions,
      sql`${submissions.userId} = ${users.id} AND ${submissions.dateRangeStart} <= ${end} AND ${submissions.dateRangeEnd} >= ${start}`
    )
    .groupBy(users.id)
    .orderBy(sql`sum(${submissions.totalCost}::numeric) DESC NULLS LAST`);

  const csv = [
    "Name,Email,Department,Team,Total Tokens,Total Cost (USD)",
    ...rows.map(
      (r) =>
        `${encodeCsvCell(r.name)},${encodeCsvCell(r.email)},${encodeCsvCell(r.department)},${encodeCsvCell(r.orgUnit)},${r.totalTokens},${Number(r.totalCost).toFixed(4)}`
    ),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="klic-cost-report-${month}.csv"`,
    },
  });
}
