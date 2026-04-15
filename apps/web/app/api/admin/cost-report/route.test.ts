import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const orderByMock = vi.fn();
const groupByMock = vi.fn(() => ({ orderBy: orderByMock }));
const leftJoinMock = vi.fn(() => ({ groupBy: groupByMock }));
const fromMock = vi.fn(() => ({ leftJoin: leftJoinMock }));
const selectMock = vi.fn(() => ({ from: fromMock }));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@klic/db", () => ({
  db: { select: selectMock },
  users: {
    id: "id",
    name: "name",
    email: "email",
    department: "department",
    team: "team",
  },
  submissions: {
    userId: "userId",
    dateRangeStart: "dateRangeStart",
    dateRangeEnd: "dateRangeEnd",
    totalTokens: "totalTokens",
    totalCost: "totalCost",
  },
}));
vi.mock("drizzle-orm", () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
}));

describe("admin cost report route", () => {
  const header = "Name,Email,Department,Team,Total Tokens,Total Cost (USD)";

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.DATABASE_URL = "postgres://test";
    authMock.mockResolvedValue({ user: { role: "admin" } });
  });

  it("neutralizes formula-like values at the start of a cell", async () => {
    orderByMock.mockResolvedValue([
      {
        name: "=SUM(1,1)",
        email: "+user@example.com",
        department: "-Finance",
        team: "@Ops",
        totalTokens: 42,
        totalCost: 1.25,
      },
    ]);

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/admin/cost-report?month=2026-04"));
    const csv = await res.text();
    const lines = csv.split("\n");

    expect(res.status).toBe(200);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(header);
    expect(lines[1]).toBe("\"'=SUM(1,1)\",\"'+user@example.com\",\"'-Finance\",\"'@Ops\",42,1.2500");
  });

  it("escapes embedded quotes in quoted CSV cells", async () => {
    orderByMock.mockResolvedValue([
      {
        name: 'Jane "JJ" Doe',
        email: 'jane"ops"@example.com',
        department: 'Finance "A"',
        team: 'Team "North"',
        totalTokens: 12,
        totalCost: 3.5,
      },
    ]);

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/admin/cost-report?month=2026-04"));
    const csv = await res.text();
    const lines = csv.split("\n");

    expect(res.status).toBe(200);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(header);
    expect(lines[1]).toBe('"Jane ""JJ"" Doe","jane""ops""@example.com","Finance ""A""","Team ""North""",12,3.5000');
  });

  it("preserves multiline text as valid quoted CSV content", async () => {
    orderByMock.mockResolvedValue([
      {
        name: "Alex",
        email: "alex@example.com",
        department: "Platform\nEngineering",
        team: "Blue\nTeam",
        totalTokens: 99,
        totalCost: 4,
      },
    ]);

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/admin/cost-report?month=2026-04"));
    const csv = await res.text();

    expect(res.status).toBe(200);
    expect(csv).toBe(`${header}\n"Alex","alex@example.com","Platform\nEngineering","Blue\nTeam",99,4.0000`);
  });

  it("renders null and undefined optional fields as empty quoted cells", async () => {
    orderByMock.mockResolvedValue([
      {
        name: "Morgan",
        email: "morgan@example.com",
        department: null,
        team: undefined,
        totalTokens: 7,
        totalCost: 0.5,
      },
    ]);

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/admin/cost-report?month=2026-04"));
    const csv = await res.text();
    const lines = csv.split("\n");

    expect(res.status).toBe(200);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(header);
    expect(lines[1]).toBe('"Morgan","morgan@example.com","","",7,0.5000');
  });

  it("neutralizes dangerous values that also contain quotes and newlines", async () => {
    orderByMock.mockResolvedValue([
      {
        name: '  =cmd|"calc"\nnext',
        email: "safe@example.com",
        department: '"Quoted"\nLine',
        team: "@Ops\nBlue",
        totalTokens: 15,
        totalCost: 2.75,
      },
    ]);

    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/admin/cost-report?month=2026-04"));
    const csv = await res.text();

    expect(res.status).toBe(200);
    expect(csv).toBe(
      `${header}\n"'  =cmd|""calc""\nnext","safe@example.com","""Quoted""\nLine","'@Ops\nBlue",15,2.7500`
    );
  });
});
