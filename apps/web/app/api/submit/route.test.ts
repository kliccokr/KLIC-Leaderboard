import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiKeysTable = { keyHash: "keyHash", id: "id", lastUsedAt: "lastUsedAt", userId: "userId" };
const submissionsTable = { userId: "userId", dateRangeStart: "dateRangeStart", dateRangeEnd: "dateRangeEnd", id: "id", totalTokens: "totalTokens" };
const usersTable = { id: "id", lastSubmissionAt: "lastSubmissionAt" };
const badgesTable = { id: "id" };
const userBadgesTable = { userId: "userId", badgeId: "badgeId" };

const findApiKeyMock = vi.fn();
const findSubmissionMock = vi.fn();
const findOverlappingSubmissionsMock = vi.fn();
const findBadgesMock = vi.fn();
const findUserBadgeMock = vi.fn();
const updateWhereMock = vi.fn();
const updateSetMock = vi.fn(() => ({ where: updateWhereMock }));
const updateMock = vi.fn(() => ({ set: updateSetMock }));
const txUserThrottleReturningMock = vi.fn();
const txUserThrottleWhereMock = vi.fn(() => ({ returning: txUserThrottleReturningMock }));
const txUserThrottleSetMock = vi.fn(() => ({ where: txUserThrottleWhereMock }));
const txUpdateWhereMock = vi.fn();
const txUpdateSetMock = vi.fn(() => ({ where: txUpdateWhereMock }));
const txUpdateMock = vi.fn((table: unknown) => {
  if (table === usersTable) {
    return { set: txUserThrottleSetMock };
  }

  if (table === apiKeysTable) {
    return { set: txUpdateSetMock };
  }

  return { set: txUpdateSetMock };
});
const insertValuesMock = vi.fn();
const insertMock = vi.fn(() => ({ values: insertValuesMock }));
const txInsertValuesMock = vi.fn();
const txInsertMock = vi.fn(() => ({ values: txInsertValuesMock }));
const txDeleteWhereMock = vi.fn();
const txDeleteMock = vi.fn(() => ({ where: txDeleteWhereMock }));
const selectWhereMock = vi.fn();
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }));
const selectMock = vi.fn(() => ({ from: selectFromMock }));
const txSelectWhereMock = vi.fn();
const txSelectFromMock = vi.fn(() => ({ where: txSelectWhereMock }));
const txSelectMock = vi.fn(() => ({ from: txSelectFromMock }));
const transactionMock = vi.fn();

const validPayload = {
  totalTokens: 150000,
  totalCost: 1.2,
  inputTokens: 100000,
  outputTokens: 30000,
  cacheCreationTokens: 10000,
  cacheReadTokens: 10000,
  modelsUsed: ["claude-sonnet-4-6"],
  dailyBreakdown: [{
    date: "2026-04-10",
    inputTokens: 100000,
    outputTokens: 30000,
    cacheCreationTokens: 10000,
    cacheReadTokens: 10000,
    totalTokens: 150000,
    totalCost: 1.2,
    modelsUsed: ["claude-sonnet-4-6"],
  }],
  dateRange: { start: "2026-04-10", end: "2026-04-10" },
};

function createRequest(body: unknown = validPayload): Request {
  return new Request("http://localhost/api/submit", {
    method: "POST",
    headers: { Authorization: "Bearer klic_test" },
    body: JSON.stringify(body),
  });
}

function mockThrottleApproval(approved: boolean): void {
  txUserThrottleReturningMock.mockResolvedValue(approved ? [{ id: "u1" }] : []);
}

function expectThrottleBlocked(res: Response): void {
  expect(res.status).toBe(429);
  expect(findSubmissionMock).not.toHaveBeenCalled();
  expect(findBadgesMock).not.toHaveBeenCalled();
  expect(txInsertValuesMock).not.toHaveBeenCalled();
}

vi.mock("@klic/db", () => ({
  db: {
    query: {
      apiKeys: { findFirst: findApiKeyMock },
      submissions: { findFirst: findSubmissionMock, findMany: findOverlappingSubmissionsMock },
      badges: { findMany: findBadgesMock },
      userBadges: { findFirst: findUserBadgeMock },
    },
    update: updateMock,
    insert: insertMock,
    select: selectMock,
    transaction: transactionMock,
  },
  apiKeys: apiKeysTable,
  submissions: submissionsTable,
  users: usersTable,
  badges: badgesTable,
  userBadges: userBadgesTable,
}));
vi.mock("drizzle-orm", () => ({
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args,
  gte: (...args: unknown[]) => args,
  lte: (...args: unknown[]) => args,
  sql: (...args: unknown[]) => args,
}));
vi.mock("@klic/shared", () => ({ calculateLevel: vi.fn(() => ({ level: 3 })) }));

describe("submit route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    process.env.DATABASE_URL = "postgres://test";
    findSubmissionMock.mockResolvedValue(null);
    findOverlappingSubmissionsMock.mockResolvedValue([]);
    selectWhereMock.mockResolvedValue([{ total: 150000 }]);
    txSelectWhereMock.mockResolvedValue([{ total: 150000 }]);
    findBadgesMock.mockResolvedValue([
      { id: "badge-150k", condition: { type: "tokens", threshold: 150000 } },
      { id: "badge-200k", condition: { type: "tokens", threshold: 200000 } },
      { id: "badge-streak", condition: { type: "streak", threshold: 7 } },
    ]);
    findUserBadgeMock.mockResolvedValue(null);
    transactionMock.mockImplementation(async (callback: (tx: {
      query: {
        submissions: { findFirst: typeof findSubmissionMock; findMany: typeof findOverlappingSubmissionsMock };
        badges: { findMany: typeof findBadgesMock };
        userBadges: { findFirst: typeof findUserBadgeMock };
      };
      update: typeof txUpdateMock;
      insert: typeof txInsertMock;
      delete: typeof txDeleteMock;
      select: typeof txSelectMock;
    }) => Promise<unknown>) => callback({
      query: {
        submissions: { findFirst: findSubmissionMock, findMany: findOverlappingSubmissionsMock },
        badges: { findMany: findBadgesMock },
        userBadges: { findFirst: findUserBadgeMock },
      },
      update: txUpdateMock,
      insert: txInsertMock,
      delete: txDeleteMock,
      select: txSelectMock,
    }));
    mockThrottleApproval(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 401 without bearer token", async () => {
    const { POST } = await import("./route");
    const res = await POST(new Request("http://localhost/api/submit", { method: "POST" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid payload", async () => {
    const { POST } = await import("./route");
    const res = await POST(createRequest({ bad: true }));
    expect(res.status).toBe(400);
  });

  it.each([
    { description: "when the API key has never been used", lastUsedAt: null },
    { description: "when the API key was last used more than one hour ago", lastUsedAt: new Date("2026-04-10T10:00:00.000Z") },
  ])("returns 200 for the first valid submission $description", async ({ lastUsedAt }) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"));
    findApiKeyMock.mockResolvedValue({ userId: "u1", id: "k1", lastUsedAt });

    const { POST } = await import("./route");
    const res = await POST(createRequest());

    expect(res.status).toBe(200);
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled();
    expect(txUserThrottleSetMock).toHaveBeenCalledWith({
      lastSubmissionAt: new Date("2026-04-10T12:00:00.000Z"),
    });
    expect(txUserThrottleReturningMock).toHaveBeenCalledTimes(1);
    expect(txUpdateMock).toHaveBeenCalledWith(apiKeysTable);
  });

  it("uses the transaction object for user-scoped throttle approval and downstream writes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"));
    findApiKeyMock.mockResolvedValue({
      userId: "u1",
      id: "k1",
      lastUsedAt: new Date("2026-04-10T10:00:00.000Z"),
    });

    const { POST } = await import("./route");
    const res = await POST(createRequest());

    expect(res.status).toBe(200);
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(txUserThrottleReturningMock).toHaveBeenCalledTimes(1);
    expect(txInsertValuesMock).toHaveBeenCalled();
    expect(txUpdateMock).toHaveBeenCalledWith(usersTable);
    expect(txUpdateMock).toHaveBeenCalledWith(apiKeysTable);
    expect(updateMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    expect(selectMock).not.toHaveBeenCalled();
  });

  it("allows submission when the current key row was used recently but the user cooldown has expired", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"));
    findApiKeyMock.mockResolvedValue({
      userId: "u1",
      id: "k2",
      lastUsedAt: new Date("2026-04-10T11:55:00.000Z"),
    });

    const { POST } = await import("./route");
    const res = await POST(createRequest());

    expect(res.status).toBe(200);
    expect(txUserThrottleSetMock).toHaveBeenCalledWith({
      lastSubmissionAt: new Date("2026-04-10T12:00:00.000Z"),
    });
    expect(txUpdateMock).toHaveBeenCalledWith(apiKeysTable);
  });

  it("returns 429 when atomic user throttle approval does not update the user row", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"));
    findApiKeyMock.mockResolvedValue({
      userId: "u1",
      id: "k1",
      lastUsedAt: new Date("2026-04-10T10:00:00.000Z"),
    });
    mockThrottleApproval(false);

    const { POST } = await import("./route");
    const res = await POST(createRequest());

    expectThrottleBlocked(res);
    expect(txUserThrottleReturningMock).toHaveBeenCalledTimes(1);
  });

  it("returns 429 for a second submission within one hour even after key regeneration", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"));
    findApiKeyMock.mockResolvedValue({
      userId: "u1",
      id: "k2",
      lastUsedAt: null,
    });
    mockThrottleApproval(false);

    const { POST } = await import("./route");
    const res = await POST(createRequest());

    expectThrottleBlocked(res);
    expect(txUpdateMock).not.toHaveBeenCalledWith(apiKeysTable);
  });

  it("replaces all overlapping submissions with one normalized row", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"));
    findApiKeyMock.mockResolvedValue({ userId: "u1", id: "k1", lastUsedAt: null });
    findOverlappingSubmissionsMock.mockResolvedValue([
      { id: "s1" },
      { id: "s2" },
    ]);

    const { POST } = await import("./route");
    const res = await POST(createRequest({
      ...validPayload,
      totalTokens: 200000,
      totalCost: 2.5,
      inputTokens: 120000,
      outputTokens: 40000,
      cacheCreationTokens: 20000,
      cacheReadTokens: 20000,
      dateRange: { start: "2026-04-09", end: "2026-04-10" },
    }));

    expect(res.status).toBe(200);
    expect(findOverlappingSubmissionsMock).toHaveBeenCalledTimes(1);
    expect(txDeleteMock).toHaveBeenCalledWith(submissionsTable);
    expect(txDeleteWhereMock).toHaveBeenCalledTimes(1);
    expect(txUpdateMock).not.toHaveBeenCalledWith(submissionsTable);
    expect(txInsertValuesMock).toHaveBeenCalledWith(expect.objectContaining({
      userId: "u1",
      totalTokens: 200000,
      totalCost: "2.5",
      dateRangeStart: "2026-04-09",
      dateRangeEnd: "2026-04-10",
    }));
  });

  it("awards eligible token badges for a valid payload", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"));
    findApiKeyMock.mockResolvedValue({ userId: "u1", id: "k1", lastUsedAt: null });

    const { POST } = await import("./route");
    const res = await POST(createRequest());

    expect(res.status).toBe(200);
    expect(findBadgesMock).toHaveBeenCalledTimes(1);
    expect(findUserBadgeMock).toHaveBeenCalledTimes(1);
    expect(txInsertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        badgeId: "badge-150k",
      })
    );
  });
});
