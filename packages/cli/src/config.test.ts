import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("os", () => ({ default: { homedir: () => "/tmp/klic-test" }, homedir: () => "/tmp/klic-test" }));

describe("cli config", async () => {
  const { rmSync, existsSync } = await import("fs");
  const { readConfig, writeConfig, CONFIG_PATH } = await import("./config");

  afterEach(() => {
    rmSync("/tmp/klic-test/.klic/leaderboard", { recursive: true, force: true });
  });

  it("returns null when config is missing", () => {
    expect(readConfig()).toBeNull();
  });

  it("writes and reads config", () => {
    writeConfig({ apiKey: "klic_test", serverUrl: "http://localhost:3000" });
    expect(existsSync(CONFIG_PATH)).toBe(true);
    expect(readConfig()).toEqual({ apiKey: "klic_test", serverUrl: "http://localhost:3000" });
  });
});
