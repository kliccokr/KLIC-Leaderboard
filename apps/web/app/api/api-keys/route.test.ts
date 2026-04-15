import { createHash } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findFirstMock = vi.fn();
const deleteWhereMock = vi.fn();
const deleteMock = vi.fn(() => ({ where: deleteWhereMock }));
const insertValuesMock = vi.fn();
const insertMock = vi.fn(() => ({ values: insertValuesMock }));
const transactionMock = vi.fn(
  async (callback: (tx: {
    delete: typeof deleteMock;
    insert: typeof insertMock;
    query: { apiKeys: { findFirst: typeof findFirstMock } };
  }) => Promise<unknown>) =>
    callback({
      delete: deleteMock,
      insert: insertMock,
      query: { apiKeys: { findFirst: findFirstMock } },
    }),
);

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@klic/db", () => ({
  db: {
    query: { apiKeys: { findFirst: findFirstMock } },
    delete: deleteMock,
    insert: insertMock,
    transaction: transactionMock,
  },
  apiKeys: {
    userId: "userId",
    keyHash: "keyHash",
  },
}));
vi.mock("drizzle-orm", () => ({ eq: (...args: unknown[]) => args }));

describe("api-keys route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.DATABASE_URL = "postgres://test";
  });

  it("returns 401 for GET without session", async () => {
    authMock.mockResolvedValue(null);
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/api-keys"));
    expect(res.status).toBe(401);
  });

  it("returns key presence for CLI bearer GET", async () => {
    const rawKey = "klic_cli_test_key";
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    findFirstMock.mockResolvedValue({ lastUsedAt: "2026-04-10T00:00:00Z" });
    const { GET } = await import("./route");
    const res = await GET(
      new Request("http://localhost/api/api-keys", {
        headers: { Authorization: `Bearer ${rawKey}` },
      }),
    );
    expect(findFirstMock).toHaveBeenCalledWith({ where: ["keyHash", keyHash] });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      hasKey: true,
      lastUsedAt: "2026-04-10T00:00:00Z",
    });
  });

  it("returns key presence for web session GET", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    findFirstMock.mockResolvedValue({ lastUsedAt: "2026-04-10T00:00:00Z" });
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/api-keys"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      hasKey: true,
      lastUsedAt: "2026-04-10T00:00:00Z",
    });
  });

  it("returns controlled 500 and uses a transaction when POST insert fails", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    insertValuesMock.mockRejectedValueOnce(new Error("duplicate key value violates unique constraint"));
    const { POST } = await import("./route");
    const res = await POST();
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "Failed to create API key" });
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("does not inherit lastUsedAt when regenerating an API key", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const previousLastUsedAt = "2026-04-10T12:00:00Z";
    findFirstMock.mockResolvedValueOnce({ lastUsedAt: previousLastUsedAt });
    const { POST } = await import("./route");
    const res = await POST();
    expect(res.status).toBe(201);
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(findFirstMock).toHaveBeenCalledWith({ where: ["userId", "u1"] });
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        name: "default",
        lastUsedAt: null,
      }),
    );
  });

  it("returns 201 and raw key for POST with session", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    const { POST } = await import("./route");
    const res = await POST();
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.key.startsWith("klic_")).toBe(true);
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });
});
