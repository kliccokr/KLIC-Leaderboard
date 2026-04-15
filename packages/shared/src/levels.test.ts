import { describe, expect, it } from "vitest";
import { calculateLevel, calculateTeamLevel, LEVELS, TEAM_LEVEL_MULTIPLIER } from "./levels";

describe("LEVELS constant", () => {
  it("has 10 levels", () => {
    expect(LEVELS).toHaveLength(10);
  });
  it("level 1 starts at 0", () => {
    expect(LEVELS[0].min).toBe(0);
  });
  it("level 10 has no max", () => {
    expect(LEVELS[9].max).toBeNull();
  });
});

describe("calculateLevel", () => {
  it("returns level 1 for 0 tokens", () => {
    expect(calculateLevel(0).level).toBe(1);
  });
  it("returns level 1 for 999999 tokens", () => {
    expect(calculateLevel(999_999).level).toBe(1);
  });
  it("returns level 2 for 1M tokens", () => {
    expect(calculateLevel(1_000_000).level).toBe(2);
  });
  it("returns level 10 for 10B+ tokens", () => {
    expect(calculateLevel(10_000_000_001).level).toBe(10);
  });
  it("calculates progress percent within a level", () => {
    const result = calculateLevel(3_000_000); // level 2: 1M-5M → 2M/4M = 50%
    expect(result.level).toBe(2);
    expect(result.progressPercent).toBe(50);
  });
});

describe("TEAM_LEVEL_MULTIPLIER", () => {
  it("is 10", () => {
    expect(TEAM_LEVEL_MULTIPLIER).toBe(10);
  });
});

describe("calculateTeamLevel", () => {
  it("team level is individual level applied to tokens/10", () => {
    // 40M tokens / 10 = 4M → level 2 (1M-5M)
    expect(calculateTeamLevel(40_000_000).level).toBe(2);
  });
  it("team level 3 requires 50M+ tokens", () => {
    // 50M tokens / 10 = 5M → level 3 (5M-20M)
    expect(calculateTeamLevel(50_000_000).level).toBe(3);
  });
  it("team level 10 requires 100B+ tokens", () => {
    expect(calculateTeamLevel(100_000_000_001).level).toBe(10);
  });
});
