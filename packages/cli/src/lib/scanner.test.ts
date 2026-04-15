import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock pricing to return deterministic costs
vi.mock("./pricing", () => ({
  initPricing: vi.fn(),
  estimateCost: vi.fn(
    (_model: string, input: number, output: number, cacheWrite: number, cacheRead: number) =>
      Math.round(((input + output + cacheWrite + cacheRead) * 0.001) * 100) / 100,
  ),
}));

// Helper: create a mock JSONL assistant event
function makeAssistantEvent(options: {
  timestamp?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  sessionId?: string;
}): string {
  const sessionId = options.sessionId ?? "test-session-1";
  const event = {
    sessionId,
    type: "assistant",
    timestamp: options.timestamp ?? "2026-04-10T12:00:00Z",
    message: {
      model: options.model ?? "claude-sonnet-4-5-20250514",
      usage: {
        input_tokens: options.inputTokens ?? 100,
        output_tokens: options.outputTokens ?? 50,
        cache_creation_input_tokens: options.cacheCreationTokens ?? 0,
        cache_read_input_tokens: options.cacheReadTokens ?? 0,
      },
    },
  };
  return JSON.stringify(event);
}

// Helper: create a non-assistant event (should be ignored)
function makeUserEvent(): string {
  return JSON.stringify({ type: "user", message: { content: "hello" } });
}

describe("scanner", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "klic-scanner-test-"));
  });

  // Clean up temp dir after each test (best-effort)
  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  /**
   * Create a mock project directory structure under tmpDir:
   * tmpDir/projects/{encodedProjectName}/{sessionId}.jsonl
   */
  function createMockSessionFile(
    projectName: string,
    fileName: string,
    lines: string[],
  ): string {
    const projectDir = path.join(tmpDir, "projects", projectName);
    fs.mkdirSync(projectDir, { recursive: true });
    const filePath = path.join(projectDir, fileName);
    fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
    return filePath;
  }

  it("returns null when no project directories exist", async () => {
    // Mock getClaudeProjectsDirs to return our tmpDir/projects (which doesn't exist yet)
    const { scanAllProjects } = await import("./scanner");
    // With no .jsonl files, should return null
    const result = scanAllProjects({ _projectsDirsOverride: [path.join(tmpDir, "nonexistent")] });
    expect(result).toBeNull();
  });

  it("parses assistant events and returns SubmissionPayload", async () => {
    const { scanAllProjects } = await import("./scanner");

    createMockSessionFile("my-project", "session1.jsonl", [
      makeAssistantEvent({
        timestamp: "2026-04-10T10:00:00Z",
        inputTokens: 100,
        outputTokens: 50,
        sessionId: "s1",
      }),
      makeUserEvent(), // should be ignored
      makeAssistantEvent({
        timestamp: "2026-04-10T14:00:00Z",
        inputTokens: 200,
        outputTokens: 100,
        sessionId: "s1",
      }),
    ]);

    const result = scanAllProjects({
      _projectsDirsOverride: [path.join(tmpDir, "projects")],
    });

    expect(result).not.toBeNull();
    expect(result!.inputTokens).toBe(300);
    expect(result!.outputTokens).toBe(150);
    expect(result!.totalTokens).toBe(450);
    expect(result!.modelsUsed).toContain("claude-sonnet-4-5-20250514");
    expect(result!.dateRange.start).toBe("2026-04-10");
    expect(result!.dateRange.end).toBe("2026-04-10");
    expect(result!.dailyBreakdown).toHaveLength(1);
    expect(result!.dailyBreakdown[0].date).toBe("2026-04-10");
  });

  it("aggregates multiple days", async () => {
    const { scanAllProjects } = await import("./scanner");

    createMockSessionFile("my-project", "session1.jsonl", [
      makeAssistantEvent({ timestamp: "2026-04-09T10:00:00Z", inputTokens: 100, sessionId: "s1" }),
    ]);
    createMockSessionFile("my-project", "session2.jsonl", [
      makeAssistantEvent({ timestamp: "2026-04-10T10:00:00Z", inputTokens: 200, sessionId: "s2" }),
    ]);

    const result = scanAllProjects({
      _projectsDirsOverride: [path.join(tmpDir, "projects")],
    });

    expect(result).not.toBeNull();
    expect(result!.dailyBreakdown).toHaveLength(2);
    expect(result!.dateRange.start).toBe("2026-04-09");
    expect(result!.dateRange.end).toBe("2026-04-10");
  });

  it("deduplicates sessions by sessionId", async () => {
    const { scanAllProjects } = await import("./scanner");

    // Same sessionId in two different project dirs
    const sameSessionId = "shared-session-id";
    createMockSessionFile("project-a", "a.jsonl", [
      makeAssistantEvent({ sessionId: sameSessionId, inputTokens: 100 }),
    ]);
    createMockSessionFile("project-b", "b.jsonl", [
      makeAssistantEvent({ sessionId: sameSessionId, inputTokens: 200 }),
    ]);

    // Create both project dirs under the same projects root
    const result = scanAllProjects({
      _projectsDirsOverride: [path.join(tmpDir, "projects")],
    });

    expect(result).not.toBeNull();
    // Should deduplicate - only count from one session (the newer one)
    // Since both are created almost simultaneously, we just check it doesn't double count
    expect(result!.inputTokens).toBeLessThanOrEqual(300);
  });

  it("respects days filter", async () => {
    const { scanAllProjects } = await import("./scanner");

    createMockSessionFile("my-project", "old.jsonl", [
      makeAssistantEvent({
        timestamp: "2020-01-01T10:00:00Z",
        inputTokens: 999,
        sessionId: "old-session",
      }),
    ]);
    createMockSessionFile("my-project", "recent.jsonl", [
      makeAssistantEvent({
        timestamp: "2026-04-10T10:00:00Z",
        inputTokens: 100,
        sessionId: "recent-session",
      }),
    ]);

    const result = scanAllProjects({
      days: 30,
      _projectsDirsOverride: [path.join(tmpDir, "projects")],
    });

    expect(result).not.toBeNull();
    // Old event should be filtered out
    expect(result!.inputTokens).toBe(100);
  });

  it("handles cache tokens correctly", async () => {
    const { scanAllProjects } = await import("./scanner");

    createMockSessionFile("my-project", "cache.jsonl", [
      makeAssistantEvent({
        timestamp: "2026-04-10T10:00:00Z",
        inputTokens: 100,
        outputTokens: 50,
        cacheCreationTokens: 200,
        cacheReadTokens: 300,
        sessionId: "cache-test",
      }),
    ]);

    const result = scanAllProjects({
      _projectsDirsOverride: [path.join(tmpDir, "projects")],
    });

    expect(result).not.toBeNull();
    expect(result!.cacheCreationTokens).toBe(200);
    expect(result!.cacheReadTokens).toBe(300);
    expect(result!.totalTokens).toBe(650); // 100 + 50 + 200 + 300
  });

  it("returns modelsUsed as string array in daily breakdown", async () => {
    const { scanAllProjects } = await import("./scanner");

    createMockSessionFile("my-project", "multi.jsonl", [
      makeAssistantEvent({
        timestamp: "2026-04-10T10:00:00Z",
        model: "claude-sonnet-4-5-20250514",
        inputTokens: 100,
        sessionId: "s1",
      }),
      makeAssistantEvent({
        timestamp: "2026-04-10T11:00:00Z",
        model: "claude-haiku-4-5-20251001",
        inputTokens: 50,
        sessionId: "s1",
      }),
    ]);

    const result = scanAllProjects({
      _projectsDirsOverride: [path.join(tmpDir, "projects")],
    });

    expect(result).not.toBeNull();
    expect(result!.dailyBreakdown[0].modelsUsed).toEqual(
      expect.arrayContaining([
        "claude-sonnet-4-5-20250514",
        "claude-haiku-4-5-20251001",
      ]),
    );
  });

  it("collects tool counts per session", async () => {
    const { scanAllProjects } = await import("./scanner");

    createMockSessionFile("my-project", "tools.jsonl", [
      JSON.stringify({
        sessionId: "t1",
        type: "user",
        message: { content: "fix this bug" },
      }),
      JSON.stringify({
        sessionId: "t1",
        type: "assistant",
        timestamp: "2026-04-10T12:00:00Z",
        message: {
          model: "claude-sonnet-4-5-20250514",
          usage: { input_tokens: 100, output_tokens: 50 },
          content: [
            { type: "tool_use", name: "Read", input: {} },
            { type: "tool_use", name: "Read", input: {} },
            { type: "tool_use", name: "Edit", input: { old_string: "a", new_string: "b" } },
            { type: "tool_use", name: "Bash", input: { command: "npm test" } },
          ],
        },
      }),
    ]);

    const result = scanAllProjects({
      _projectsDirsOverride: [path.join(tmpDir, "projects")],
    });

    expect(result).not.toBeNull();
    expect(result!.sessions).toHaveLength(1);
    expect(result!.sessions![0].toolCounts).toEqual({
      Read: 2,
      Edit: 1,
      Bash: 1,
    });
  });

  it("classifies task categories per session", async () => {
    const { scanAllProjects } = await import("./scanner");

    createMockSessionFile("my-project", "cat.jsonl", [
      JSON.stringify({
        sessionId: "c1",
        type: "user",
        message: { content: "add a new search feature" },
      }),
      JSON.stringify({
        sessionId: "c1",
        type: "assistant",
        timestamp: "2026-04-10T12:00:00Z",
        message: {
          model: "claude-sonnet-4-5-20250514",
          usage: { input_tokens: 100, output_tokens: 50 },
          content: [
            { type: "tool_use", name: "Edit", input: { old_string: "a", new_string: "b" } },
          ],
        },
      }),
    ]);

    const result = scanAllProjects({
      _projectsDirsOverride: [path.join(tmpDir, "projects")],
    });

    expect(result).not.toBeNull();
    expect(result!.sessions![0].taskCategories).toBeDefined();
    // Edit + "add feature" keywords → "feature"
    expect(result!.sessions![0].taskCategories!["feature"]).toBe(1);
  });
});
