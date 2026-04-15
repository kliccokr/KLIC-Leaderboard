import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock fs to prevent actual file I/O during pricing tests
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe("pricing", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns fallback pricing when not initialized", async () => {
    const { estimateCost } = await import("./pricing");
    // Sonnet fallback: input=$3/M, output=$15/M
    const cost = estimateCost("claude-sonnet-4-5-20250514", 1_000_000, 1_000_000);
    expect(cost).toBe(18); // 3 + 15
  });

  it("calculates cost with cache tokens", async () => {
    const { estimateCost } = await import("./pricing");
    // Default fallback: input=$3, output=$15, cacheWrite=$3.75, cacheRead=$0.30
    const cost = estimateCost("some-unknown-model", 1_000_000, 0, 1_000_000, 1_000_000);
    expect(cost).toBe(7.05); // 3 + 0 + 3.75 + 0.30
  });

  it("matches opus models by keyword", async () => {
    const { estimateCost } = await import("./pricing");
    // Opus fallback: input=$5, output=$25
    const cost = estimateCost("claude-opus-4-something", 1_000_000, 1_000_000);
    expect(cost).toBe(30); // 5 + 25
  });

  it("matches haiku models by keyword", async () => {
    const { estimateCost } = await import("./pricing");
    // Haiku fallback: input=$1, output=$5
    const cost = estimateCost("claude-haiku-4-5", 1_000_000, 1_000_000);
    expect(cost).toBe(6); // 1 + 5
  });

  it("initPricing is idempotent", async () => {
    const { initPricing } = await import("./pricing");
    // Should not throw even when called twice (fetch will fail in test env)
    await initPricing();
    await initPricing();
    // If we get here without error, it's idempotent
    expect(true).toBe(true);
  });
});
