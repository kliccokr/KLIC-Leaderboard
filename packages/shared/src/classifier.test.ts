// packages/shared/src/classifier.test.ts
import { describe, expect, it } from "vitest";
import { classifyTurn, type TurnInput } from "./classifier";

function makeTurn(overrides: Partial<TurnInput> = {}): TurnInput {
  return {
    toolNames: [],
    bashCommands: [],
    userMessage: "",
    ...overrides,
  };
}

describe("classifyTurn", () => {
  it("classifies EnterPlanMode as planning", () => {
    expect(classifyTurn(makeTurn({ toolNames: ["EnterPlanMode"] }))).toBe("planning");
  });

  it("classifies Agent tool as delegation", () => {
    expect(classifyTurn(makeTurn({ toolNames: ["Agent", "Read"] }))).toBe("delegation");
  });

  it("classifies Bash with test commands as testing", () => {
    expect(classifyTurn(makeTurn({
      toolNames: ["Bash"],
      bashCommands: ["npm test", "vitest run"],
    }))).toBe("testing");
  });

  it("classifies Bash with git commands as git", () => {
    expect(classifyTurn(makeTurn({
      toolNames: ["Bash"],
      bashCommands: ["git commit -m 'fix'"],
    }))).toBe("git");
  });

  it("classifies Bash with build commands as build/deploy", () => {
    expect(classifyTurn(makeTurn({
      toolNames: ["Bash"],
      bashCommands: ["npm run build"],
    }))).toBe("build/deploy");
  });

  it("classifies Edit tools as coding", () => {
    expect(classifyTurn(makeTurn({ toolNames: ["Edit"] }))).toBe("coding");
  });

  it("classifies Write tool as coding", () => {
    expect(classifyTurn(makeTurn({ toolNames: ["Write"] }))).toBe("coding");
  });

  it("classifies Bash+Read without Edit as exploration", () => {
    expect(classifyTurn(makeTurn({
      toolNames: ["Bash", "Read"],
      bashCommands: ["ls"],
    }))).toBe("exploration");
  });

  it("classifies Bash-only as coding", () => {
    expect(classifyTurn(makeTurn({
      toolNames: ["Bash"],
      bashCommands: ["echo hello"],
    }))).toBe("coding");
  });

  it("classifies Read-only as exploration", () => {
    expect(classifyTurn(makeTurn({ toolNames: ["Read", "Glob"] }))).toBe("exploration");
  });

  it("classifies WebSearch as exploration", () => {
    expect(classifyTurn(makeTurn({ toolNames: ["WebSearch"] }))).toBe("exploration");
  });

  it("classifies MCP tools as exploration", () => {
    expect(classifyTurn(makeTurn({ toolNames: ["mcp__github__search"] }))).toBe("exploration");
  });

  it("classifies Task tools as planning", () => {
    expect(classifyTurn(makeTurn({ toolNames: ["TaskCreate", "TaskUpdate"] }))).toBe("planning");
  });

  it("classifies Skill as general", () => {
    expect(classifyTurn(makeTurn({ toolNames: ["Skill"] }))).toBe("general");
  });

  it("refines coding with debug keywords to debugging", () => {
    expect(classifyTurn(makeTurn({
      toolNames: ["Edit"],
      userMessage: "fix this bug that is broken",
    }))).toBe("debugging");
  });

  it("refines coding with refactor keywords to refactoring", () => {
    expect(classifyTurn(makeTurn({
      toolNames: ["Edit"],
      userMessage: "refactor this to clean up the module",
    }))).toBe("refactoring");
  });

  it("refines coding with feature keywords to feature", () => {
    expect(classifyTurn(makeTurn({
      toolNames: ["Edit"],
      userMessage: "add a new feature to implement search",
    }))).toBe("feature");
  });

  it("refines exploration with debug keywords to debugging", () => {
    expect(classifyTurn(makeTurn({
      toolNames: ["Read"],
      userMessage: "debug this error traceback",
    }))).toBe("debugging");
  });

  it("classifies no-tool brainstorm as brainstorming", () => {
    expect(classifyTurn(makeTurn({
      toolNames: [],
      userMessage: "brainstorm some ideas for what we could design",
    }))).toBe("brainstorming");
  });

  it("classifies no-tool research as exploration", () => {
    expect(classifyTurn(makeTurn({
      toolNames: [],
      userMessage: "research how does this work",
    }))).toBe("exploration");
  });

  it("classifies no-tool debug as debugging", () => {
    expect(classifyTurn(makeTurn({
      toolNames: [],
      userMessage: "the thing is not working and crashes",
    }))).toBe("debugging");
  });

  it("classifies no-tool feature as feature", () => {
    expect(classifyTurn(makeTurn({
      toolNames: [],
      userMessage: "create and implement a new feature",
    }))).toBe("feature");
  });

  it("classifies no-tool no-match as conversation", () => {
    expect(classifyTurn(makeTurn({
      toolNames: [],
      userMessage: "hello how are you",
    }))).toBe("conversation");
  });
});
