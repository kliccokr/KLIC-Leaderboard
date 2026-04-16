import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import type { ActivityMetrics, DailyBreakdown, RateLimits, SessionData, SubmissionPayload } from "@klic/shared";
import { classifyTurn } from "@klic/shared";
import { estimateCost } from "./pricing";

/** Format a Date as KST (UTC+9) date string YYYY-MM-DD */
function kstDateStr(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}-${String(kst.getUTCDate()).padStart(2, "0")}`;
}

export interface ScanOptions {
  days?: number; // Number of days to include (0 = all time, default)
  onProgress?: (current: number, total: number) => void;
  /** @internal Override project dirs for testing */
  _projectsDirsOverride?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Claude Projects Directory Discovery
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all possible Claude Code projects directories.
 * Supports CLAUDE_CONFIG_DIR env, XDG path, Windows APPDATA, and legacy path.
 */
function getClaudeProjectsDirs(): string[] {
  const dirs: string[] = [];
  const home = os.homedir();

  // 1. CLAUDE_CONFIG_DIR environment variable (highest priority)
  const configDir = process.env.CLAUDE_CONFIG_DIR;
  if (configDir) {
    dirs.push(path.join(configDir, "projects"));
  }

  // 2. XDG path (Claude Code v1.0.30+)
  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    if (appData) {
      dirs.push(path.join(appData, "claude", "projects"));
    }
  }
  dirs.push(path.join(home, ".config", "claude", "projects"));

  // 3. Legacy path (Claude Code < v1.0.30)
  dirs.push(path.join(home, ".claude", "projects"));

  // Return only unique paths that exist
  return [...new Set(dirs)].filter((dir) => fs.existsSync(dir));
}

// ═══════════════════════════════════════════════════════════════════════════
// JSONL File Discovery & Deduplication
// ═══════════════════════════════════════════════════════════════════════════

/** Recursively find all .jsonl files under a directory */
function findJsonlFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findJsonlFiles(fullPath));
      } else if (entry.name.endsWith(".jsonl")) {
        files.push(fullPath);
      }
    }
  } catch {
    // Ignore permission errors
  }
  return files;
}

/**
 * Extract sessionId from the first line of a jsonl file.
 * Falls back to SHA256 content hash when sessionId field is absent.
 * Returns null for empty/unreadable files.
 */
function extractSessionId(filePath: string): string | null {
  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(4096);
    const bytesRead = fs.readSync(fd, buf, 0, 4096, 0);

    if (bytesRead === 0) return null;

    const firstLine = buf.toString("utf-8", 0, bytesRead).split("\n")[0];
    if (!firstLine.trim()) return null;

    const event = JSON.parse(firstLine);
    if (event.sessionId) return event.sessionId;

    return crypto.createHash("sha256").update(firstLine).digest("hex");
  } catch {
    return null;
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Source ID (unique per machine)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get or create a unique source ID for this machine.
 * Stored in ~/.claude/klic-source-id so it persists across runs.
 */
function getOrCreateSourceId(): string {
  const filePath = path.join(os.homedir(), ".claude", "klic-source-id");
  try {
    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath, "utf-8").trim();
      if (existing.length > 0) return existing;
    }
  } catch { /* fall through to create */ }

  const id = crypto.randomUUID();
  try {
    fs.writeFileSync(filePath, id, "utf-8", { mode: 0o600 });
  } catch { /* ignore write errors */ }
  return id;
}

// ═══════════════════════════════════════════════════════════════════════════
// Rate Limits Reader (from statusline-command.sh cache)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Read rate limits cached by statusline-command.sh.
 * The statusline script writes ~/.claude/rate-limits.json on each update.
 */
function readRateLimits(): RateLimits | null {
  const filePath = path.join(os.homedir(), ".claude", "rate-limits.json");
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    const fiveHourPct = data?.rate_limits?.five_hour?.used_percentage ?? null;
    const sevenDayPct = data?.rate_limits?.seven_day?.used_percentage ?? null;
    const timestamp = data?.timestamp ?? null;

    if (fiveHourPct === null && sevenDayPct === null) return null;

    return {
      fiveHourUsedPct: fiveHourPct !== null ? Number(fiveHourPct) : null,
      sevenDayUsedPct: sevenDayPct !== null ? Number(sevenDayPct) : null,
      updatedAt: timestamp,
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Debug Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Get debug info about session paths for error messages */
export function getSessionPathDebugInfo(): {
  searchedPaths: Array<{ path: string; exists: boolean }>;
  platform: string;
} {
  const home = os.homedir();
  const pathsToCheck = [
    path.join(home, ".config", "claude", "projects"),
    path.join(home, ".claude", "projects"),
  ];

  if (process.env.CLAUDE_CONFIG_DIR) {
    pathsToCheck.unshift(path.join(process.env.CLAUDE_CONFIG_DIR, "projects"));
  }
  if (process.platform === "win32" && process.env.APPDATA) {
    pathsToCheck.unshift(path.join(process.env.APPDATA, "claude", "projects"));
  }

  return {
    searchedPaths: pathsToCheck.map((p) => ({ path: p, exists: fs.existsSync(p) })),
    platform: process.platform,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Scanner
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if any Claude Code sessions exist across all project directories.
 */
export function hasAnySessions(): boolean {
  const dirs = getClaudeProjectsDirs();
  for (const dir of dirs) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
        if (findJsonlFiles(path.join(dir, entry.name)).length > 0) return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

/**
 * Scan ALL Claude Code projects and return a SubmissionPayload.
 *
 * Reads .jsonl session files from all known Claude Code project directories,
 * parses assistant events for token usage, estimates cost via pricing module,
 * and aggregates into the shape expected by the /api/submit endpoint.
 */
export function scanAllProjects(options: ScanOptions = {}): SubmissionPayload | null {
  const projectsDirs = options._projectsDirsOverride ?? getClaudeProjectsDirs();
  if (projectsDirs.length === 0) return null;

  // Cutoff date (default: 0 = all time)
  const days = options.days ?? 0;
  let cutoffDate: string | null = null;
  if (days > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
    cutoffDate = cutoff.toISOString();
  }

  // Accumulators
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheCreation = 0;
  let totalCacheRead = 0;
  let totalCost = 0;
  const models: Record<string, number> = {};
  const dailyData: Record<
    string,
    {
      inputTokens: number;
      outputTokens: number;
      cacheCreationTokens: number;
      cacheReadTokens: number;
      totalTokens: number;
      cost: number;
      models: Record<string, number>;
      linesAdded: number;
      linesRemoved: number;
      commitsCount: number;
      pullRequestsCount: number;
      activeTimeSecs: number;
    }
  > = {};
  let firstTimestamp: string | null = null;
  let lastTimestamp: string | null = null;

  // Activity accumulators
  let totalLinesAdded = 0;
  let totalLinesRemoved = 0;
  let totalCommits = 0;
  let totalPRs = 0;
  let totalActiveTimeSecs = 0;

  // Session-level data
  const sessionsList: SessionData[] = [];

  // Collect & deduplicate all JSONL files across all project directories
  // Also track which project dir each file belongs to (for project name extraction)
  // Directories to skip (plugin/observer internals, not real user sessions)
  const SKIP_DIR_PATTERNS = ["claude-mem", "observer-session"];

  const rawJsonlFiles: Array<{ filePath: string; projectDirName: string }> = [];
  for (const projectsDir of projectsDirs) {
    try {
      const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
        // Skip plugin/observer directories (check raw dir name before dash-to-slash decode)
        if (SKIP_DIR_PATTERNS.some((p) => entry.name.includes(p.replace(/\//g, "-")))) continue;
        const files = findJsonlFiles(path.join(projectsDir, entry.name));
        for (const f of files) rawJsonlFiles.push({ filePath: f, projectDirName: entry.name });
      }
    } catch {
      continue;
    }
  }

  // Deduplicate by session id (keep path + projectDirName of most recent)
  const sessionFileMap = new Map<string, { filePath: string; projectDirName: string; mtimeMs: number }>();
  const noIdFiles: Array<{ filePath: string; projectDirName: string }> = [];
  for (const { filePath, projectDirName } of rawJsonlFiles) {
    const sessionId = extractSessionId(filePath);
    if (!sessionId) { noIdFiles.push({ filePath, projectDirName }); continue; }
    let mtimeMs = 0;
    try { mtimeMs = fs.statSync(filePath).mtimeMs; } catch { /* treat as oldest */ }
    const existing = sessionFileMap.get(sessionId);
    if (!existing || mtimeMs > existing.mtimeMs) {
      sessionFileMap.set(sessionId, { filePath, projectDirName, mtimeMs });
    }
  }
  const allJsonlEntries: Array<{ filePath: string; projectDirName: string }> = [
    ...Array.from(sessionFileMap.entries()).map(([, v]) => ({ filePath: v.filePath, projectDirName: v.projectDirName })),
    ...noIdFiles,
  ];

  if (allJsonlEntries.length === 0) return null;

  const { onProgress } = options;

  for (let i = 0; i < allJsonlEntries.length; i++) {
    const { filePath, projectDirName } = allJsonlEntries[i];

    // Decode project name from directory name (dashes replace slashes in path encoding)
    // e.g. "-Users-user-DEV-MyProject" → "MyProject"
    const decodedPath = projectDirName.replace(/^-/, "/").replace(/-/g, "/");
    const projectName = decodedPath.split("/").filter(Boolean).pop() ?? projectDirName;

    // Session ID from file path map
    const sessionId = extractSessionId(filePath) ?? path.basename(filePath, ".jsonl");

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());

      // Per-session accumulators
      let sesInputTokens = 0;
      let sesOutputTokens = 0;
      let sesCacheCreation = 0;
      let sesCacheRead = 0;
      let sesCost = 0;
      let sesTurns = 0;
      let sesFirstTs: string | null = null;
      let sesLastTs: string | null = null;
      const sesModels: Record<string, number> = {};
      const sesToolCounts: Record<string, number> = {};
      const sesTaskCategories: Record<string, number> = {};
      let currentUserMessage = "";
      let currentTurnToolNames: string[] = [];
      let currentTurnBashCommands: string[] = [];

      for (const line of lines) {
        try {
          const event = JSON.parse(line);

          // Track user messages for turn classification
          if (event.type === "user") {
            const msg = event.message?.content;
            if (typeof msg === "string") currentUserMessage = msg;
            else if (Array.isArray(msg)) currentUserMessage = msg.map((b: { text?: string }) => b.text ?? "").join("");
          }

          if (event.type === "assistant" && event.message?.usage) {
            // Skip synthetic/plugin events
            if ((event.message.model || "") === "<synthetic>") continue;
            // Skip events older than cutoff
            if (cutoffDate && event.timestamp && event.timestamp < cutoffDate) continue;

            const usage = event.message.usage;
            const model = event.message.model || "unknown";
            const inputTokens = usage.input_tokens || 0;
            const outputTokens = usage.output_tokens || 0;
            const cacheCreation = usage.cache_creation_input_tokens || 0;
            const cacheRead = usage.cache_read_input_tokens || 0;

            totalInputTokens += inputTokens;
            totalOutputTokens += outputTokens;
            totalCacheCreation += cacheCreation;
            totalCacheRead += cacheRead;

            sesInputTokens += inputTokens;
            sesOutputTokens += outputTokens;
            sesCacheCreation += cacheCreation;
            sesCacheRead += cacheRead;
            sesTurns++;

            const messageCost = estimateCost(model, inputTokens, outputTokens, cacheCreation, cacheRead);
            totalCost += messageCost;
            sesCost += messageCost;

            const messageTokens = inputTokens + outputTokens + cacheCreation + cacheRead;
            models[model] = (models[model] || 0) + messageTokens;
            sesModels[model] = (sesModels[model] || 0) + messageTokens;

            // Daily aggregation (KST date)
            let eventDate: string | null = null;
            if (event.timestamp) {
              const d = new Date(event.timestamp);
              // KST = UTC+9
              const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
              eventDate = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}-${String(kst.getUTCDate()).padStart(2, "0")}`;

              if (!dailyData[eventDate]) {
                dailyData[eventDate] = {
                  inputTokens: 0,
                  outputTokens: 0,
                  cacheCreationTokens: 0,
                  cacheReadTokens: 0,
                  totalTokens: 0,
                  cost: 0,
                  models: {},
                  linesAdded: 0,
                  linesRemoved: 0,
                  commitsCount: 0,
                  pullRequestsCount: 0,
                  activeTimeSecs: 0,
                };
              }

              const day = dailyData[eventDate];
              day.inputTokens += inputTokens;
              day.outputTokens += outputTokens;
              day.cacheCreationTokens += cacheCreation;
              day.cacheReadTokens += cacheRead;
              day.totalTokens += messageTokens;
              day.cost += messageCost;
              day.models[model] = (day.models[model] || 0) + messageTokens;

              // Track overall date range
              if (!firstTimestamp || event.timestamp < firstTimestamp) firstTimestamp = event.timestamp;
              if (!lastTimestamp || event.timestamp > lastTimestamp) lastTimestamp = event.timestamp;

              // Track session timestamps
              if (!sesFirstTs || event.timestamp < sesFirstTs) sesFirstTs = event.timestamp;
              if (!sesLastTs || event.timestamp > sesLastTs) sesLastTs = event.timestamp;
            }

            // Extract activity metrics from tool_use blocks + count all tools
            const contentBlocks = event.message?.content;
            if (Array.isArray(contentBlocks)) {
              for (const block of contentBlocks) {
                if (block.type !== "tool_use" && block.type !== "server_tool_use") continue;

                // Count all tool invocations (core tools + MCP via server_tool_use)
                const toolName = block.type === "server_tool_use"
                  ? `mcp__${block.name}`
                  : block.name;
                sesToolCounts[toolName] = (sesToolCounts[toolName] ?? 0) + 1;

                if (block.name === "Bash") {
                  const cmd: string = block.input?.command ?? "";
                  if (/\bgit\s+commit\b/.test(cmd)) {
                    totalCommits++;
                    if (eventDate) dailyData[eventDate].commitsCount++;
                  }
                  if (/\bgh\s+pr\s+create\b/.test(cmd)) {
                    totalPRs++;
                    if (eventDate) dailyData[eventDate].pullRequestsCount++;
                  }
                  currentTurnBashCommands.push(cmd);
                } else if (block.name === "Write") {
                  const fileContent: string = block.input?.content ?? "";
                  const lineCount = fileContent.split("\n").length;
                  totalLinesAdded += lineCount;
                  if (eventDate) dailyData[eventDate].linesAdded += lineCount;
                } else if (block.name === "Edit" || block.name === "MultiEdit") {
                  const edits = block.name === "MultiEdit"
                    ? (block.input?.edits ?? [])
                    : [block.input];
                  for (const edit of edits) {
                    if (!edit) continue;
                    const oldStr: string = edit.old_string ?? "";
                    const newStr: string = edit.new_string ?? "";
                    const added = newStr ? newStr.split("\n").length : 0;
                    const removed = oldStr ? oldStr.split("\n").length : 0;
                    totalLinesAdded += added;
                    totalLinesRemoved += removed;
                    if (eventDate) {
                      dailyData[eventDate].linesAdded += added;
                      dailyData[eventDate].linesRemoved += removed;
                    }
                  }
                }

                // Track tool name for turn classification
                currentTurnToolNames.push(toolName);
              }
            }

            // Classify turn and accumulate category
            if (currentTurnToolNames.length > 0) {
              const category = classifyTurn({
                toolNames: currentTurnToolNames,
                bashCommands: currentTurnBashCommands,
                userMessage: currentUserMessage,
              });
              sesTaskCategories[category] = (sesTaskCategories[category] ?? 0) + 1;
              currentTurnToolNames = [];
              currentTurnBashCommands = [];
              currentUserMessage = "";
            }
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

      // Accumulate active time for this session
      if (sesFirstTs && sesLastTs) {
        const diffSecs = Math.round(
          (new Date(sesLastTs).getTime() - new Date(sesFirstTs).getTime()) / 1000
        );
        if (diffSecs > 0) {
          totalActiveTimeSecs += diffSecs;
          // Distribute active time across days spanned by this session
          const startDate = new Date(sesFirstTs).toISOString().split("T")[0];
          const endDate = new Date(sesLastTs).toISOString().split("T")[0];
          if (startDate === endDate) {
            if (dailyData[startDate]) dailyData[startDate].activeTimeSecs += diffSecs;
          } else {
            // Distribute evenly across spanned days
            const start = new Date(startDate);
            const end = new Date(endDate);
            const dayCount = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
            const perDay = Math.floor(diffSecs / dayCount);
            for (let d = 0; d < dayCount; d++) {
              const dayStr = new Date(start.getTime() + d * 86_400_000).toISOString().split("T")[0];
              if (dailyData[dayStr]) dailyData[dayStr].activeTimeSecs += perDay;
            }
          }
        }
      }

      // Record session data (only if it had any tokens)
      const sesTotalTokens = sesInputTokens + sesOutputTokens + sesCacheCreation + sesCacheRead;
      if (sesTotalTokens > 0) {
        sessionsList.push({
          sessionId,
          projectName,
          totalTokens: sesTotalTokens,
          totalCost: Math.round(sesCost * 10000) / 10000,
          inputTokens: sesInputTokens,
          outputTokens: sesOutputTokens,
          cacheCreationTokens: sesCacheCreation,
          cacheReadTokens: sesCacheRead,
          modelsUsed: Object.keys(sesModels),
          turnsCount: sesTurns,
          sessionStart: sesFirstTs,
          sessionEnd: sesLastTs,
          toolCounts: sesToolCounts,
          taskCategories: sesTaskCategories,
        });
      }
    } catch {
      // Skip unreadable files
    }

    if (onProgress) {
      onProgress(i + 1, allJsonlEntries.length);
    }
  }

  const totalTokens = totalInputTokens + totalOutputTokens + totalCacheCreation + totalCacheRead;
  if (totalTokens === 0) return null;

  // Build daily breakdown
  const dailyBreakdown: DailyBreakdown[] = Object.entries(dailyData)
    .map(([date, data]) => ({
      date,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cacheCreationTokens: data.cacheCreationTokens,
      cacheReadTokens: data.cacheReadTokens,
      totalTokens: data.totalTokens,
      totalCost: Math.round(data.cost * 100) / 100,
      modelsUsed: Object.keys(data.models),
      linesAdded: data.linesAdded,
      linesRemoved: data.linesRemoved,
      commitsCount: data.commitsCount,
      pullRequestsCount: data.pullRequestsCount,
      activeTimeSecs: data.activeTimeSecs,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const activity: ActivityMetrics = {
    sessionsCount: allJsonlEntries.length,
    linesAdded: totalLinesAdded,
    linesRemoved: totalLinesRemoved,
    commitsCount: totalCommits,
    pullRequestsCount: totalPRs,
    activeTimeSecs: totalActiveTimeSecs,
  };

  // Read rate limits from statusline cache
  const rateLimits = readRateLimits() ?? undefined;

  // Source identifier: unique per-machine UUID stored in ~/.claude/klic-source-id
  const source = getOrCreateSourceId();
  const hostname = os.hostname();

  return {
    totalTokens,
    totalCost: Math.round(totalCost * 100) / 100,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    cacheCreationTokens: totalCacheCreation,
    cacheReadTokens: totalCacheRead,
    modelsUsed: Object.keys(models),
    dailyBreakdown,
    dateRange: {
      start: firstTimestamp ? kstDateStr(new Date(firstTimestamp)) : "1970-01-01",
      end: lastTimestamp ? kstDateStr(new Date(lastTimestamp)) : "1970-01-01",
    },
    activity,
    sessions: sessionsList,
    rateLimits,
    source,
    hostname,
  };
}
