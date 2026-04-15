import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config", () => ({ readConfig: vi.fn() }));

describe("statusCommand", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("checks api key status via backend", async () => {
    const { readConfig } = await import("../config");
    vi.mocked(readConfig).mockReturnValue({ apiKey: "klic_test", serverUrl: "http://localhost:3000" });
    vi.mocked(fetch as typeof fetch).mockResolvedValue(
      new Response(JSON.stringify({ hasKey: true, lastUsedAt: null }), { status: 200 })
    );

    const { statusCommand } = await import("./status");
    await statusCommand();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/api-keys",
      expect.objectContaining({ headers: { Authorization: "Bearer klic_test" } })
    );
  });
});
