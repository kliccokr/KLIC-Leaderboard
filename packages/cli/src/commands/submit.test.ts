import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config", () => ({ readConfig: vi.fn() }));
vi.mock("../lib/pricing", () => ({ initPricing: vi.fn() }));
vi.mock("../lib/scanner", () => ({
  scanAllProjects: vi.fn(),
  getSessionPathDebugInfo: vi.fn(),
}));

describe("submitCommand", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("submits payload to backend", async () => {
    const { readConfig } = await import("../config");
    const { scanAllProjects } = await import("../lib/scanner");
    vi.mocked(readConfig).mockReturnValue({
      apiKey: "klic_test",
      serverUrl: "http://localhost:3000",
    });
    vi.mocked(scanAllProjects).mockReturnValue({
      totalTokens: 1000,
      totalCost: 0.05,
      inputTokens: 800,
      outputTokens: 200,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      modelsUsed: ["claude-sonnet-4-5-20250514"],
      dailyBreakdown: [
        {
          date: "2026-04-10",
          inputTokens: 800,
          outputTokens: 200,
          cacheCreationTokens: 0,
          cacheReadTokens: 0,
          totalTokens: 1000,
          totalCost: 0.05,
          modelsUsed: ["claude-sonnet-4-5-20250514"],
        },
      ],
      dateRange: { start: "2026-04-10", end: "2026-04-10" },
    });
    vi.mocked(fetch as typeof fetch).mockResolvedValue(
      new Response(JSON.stringify({ level: 2 }), { status: 200 }),
    );

    const { submitCommand } = await import("./submit");
    await submitCommand();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/submit",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("exits when no scan data found", async () => {
    const { readConfig } = await import("../config");
    const { scanAllProjects } = await import("../lib/scanner");
    const { getSessionPathDebugInfo } = await import("../lib/scanner");
    vi.mocked(readConfig).mockReturnValue({
      apiKey: "klic_test",
      serverUrl: "http://localhost:3000",
    });
    vi.mocked(scanAllProjects).mockReturnValue(null);
    vi.mocked(getSessionPathDebugInfo).mockReturnValue({
      searchedPaths: [{ path: "/tmp/test", exists: false }],
      platform: "linux",
    });

    const { submitCommand } = await import("./submit");
    await expect(submitCommand()).rejects.toThrow();
  });
});
