// packages/shared/src/classifier.ts

export type TaskCategory =
  | "coding"
  | "debugging"
  | "feature"
  | "refactoring"
  | "testing"
  | "exploration"
  | "planning"
  | "delegation"
  | "git"
  | "build/deploy"
  | "conversation"
  | "brainstorming"
  | "general";

export interface TurnInput {
  toolNames: string[];
  bashCommands: string[];
  userMessage: string;
}

const EDIT_TOOLS = new Set(["Edit", "Write", "FileEditTool", "FileWriteTool", "NotebookEdit"]);
const READ_TOOLS = new Set(["Read", "Grep", "Glob", "FileReadTool", "GrepTool", "GlobTool"]);
const BASH_TOOLS = new Set(["Bash", "BashTool", "PowerShellTool"]);
const TASK_TOOLS = new Set(["TaskCreate", "TaskUpdate", "TaskGet", "TaskList", "TaskOutput", "TaskStop", "TodoWrite"]);
const SEARCH_TOOLS = new Set(["WebSearch", "WebFetch", "ToolSearch"]);

const TEST_PATTERNS = /\b(test|pytest|vitest|jest|mocha|spec|coverage|npm\s+test|npx\s+vitest|npx\s+jest)\b/i;
const GIT_PATTERNS = /\bgit\s+(push|pull|commit|merge|rebase|checkout|branch|stash|log|diff|status|add|reset|cherry-pick|tag)\b/i;
const BUILD_PATTERNS = /\b(npm\s+run\s+build|npm\s+publish|pip\s+install|docker|deploy|make\s+build|npm\s+run\s+dev|npm\s+start|pm2|systemctl|brew|cargo\s+build)\b/i;
const INSTALL_PATTERNS = /\b(npm\s+install|pip\s+install|brew\s+install|apt\s+install|cargo\s+add)\b/i;
const DEBUG_KEYWORDS = /\b(fix|bug|error|broken|failing|crash|issue|debug|traceback|exception|stack\s*trace|not\s+working|wrong|unexpected)\b/i;
const FEATURE_KEYWORDS = /\b(add|create|implement|new|build|feature|introduce|set\s*up|scaffold|generate)\b/i;
const REFACTOR_KEYWORDS = /\b(refactor|clean\s*up|rename|reorganize|simplify|extract|restructure|move|migrate|split)\b/i;
const BRAINSTORM_KEYWORDS = /\b(brainstorm|idea|what\s+if|explore|think\s+about|approach|strategy|design|consider|how\s+should|what\s+would|opinion|suggest|recommend)\b/i;
const RESEARCH_KEYWORDS = /\b(research|investigate|look\s+into|find\s+out|check|search|analyze|review|understand|explain|how\s+does|what\s+is|show\s+me|list|compare)\b/i;

function hasTool(names: string[], set: Set<string>): boolean {
  return names.some((n) => set.has(n));
}

function hasMcp(names: string[]): boolean {
  return names.some((n) => n.startsWith("mcp__"));
}

function matchesAny(text: string, ...patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function classifyByToolPattern(input: TurnInput): TaskCategory | null {
  const { toolNames, bashCommands } = input;

  if (toolNames.includes("EnterPlanMode")) return "planning";
  if (toolNames.includes("Agent")) return "delegation";

  const hasEdit = hasTool(toolNames, EDIT_TOOLS);
  const hasRead = hasTool(toolNames, READ_TOOLS);
  const hasBash = hasTool(toolNames, BASH_TOOLS);
  const hasSearch = hasTool(toolNames, SEARCH_TOOLS);
  const hasTask = hasTool(toolNames, TASK_TOOLS);
  const isMcp = hasMcp(toolNames);

  if (hasBash && !hasEdit) {
    const bashText = bashCommands.join(" ");
    if (TEST_PATTERNS.test(bashText)) return "testing";
    if (GIT_PATTERNS.test(bashText)) return "git";
    if (matchesAny(bashText, BUILD_PATTERNS, INSTALL_PATTERNS)) return "build/deploy";
  }

  if (hasEdit) return "coding";
  if (hasBash && hasRead) return "exploration";
  if (hasBash) return "coding";
  if (hasSearch || isMcp) return "exploration";
  if (hasRead) return "exploration";
  if (hasTask) return "planning";
  if (toolNames.includes("Skill")) return "general";

  return null;
}

function refineByKeywords(toolResult: TaskCategory, userMessage: string): TaskCategory {
  if (toolResult === "coding") {
    if (DEBUG_KEYWORDS.test(userMessage)) return "debugging";
    if (REFACTOR_KEYWORDS.test(userMessage)) return "refactoring";
    if (FEATURE_KEYWORDS.test(userMessage)) return "feature";
    return "coding";
  }

  if (toolResult === "exploration") {
    if (DEBUG_KEYWORDS.test(userMessage)) return "debugging";
    return "exploration";
  }

  return toolResult;
}

function classifyConversation(userMessage: string): TaskCategory {
  if (BRAINSTORM_KEYWORDS.test(userMessage)) return "brainstorming";
  if (RESEARCH_KEYWORDS.test(userMessage)) return "exploration";
  if (DEBUG_KEYWORDS.test(userMessage)) return "debugging";
  if (FEATURE_KEYWORDS.test(userMessage)) return "feature";
  return "conversation";
}

export function classifyTurn(input: TurnInput): TaskCategory {
  const toolResult = classifyByToolPattern(input);
  if (toolResult) return refineByKeywords(toolResult, input.userMessage);
  return classifyConversation(input.userMessage);
}
