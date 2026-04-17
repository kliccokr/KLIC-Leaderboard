export interface DailyBreakdown {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  totalCost: number;
  modelsUsed: string[];
  // Activity metrics (per-day)
  linesAdded?: number;
  linesRemoved?: number;
  commitsCount?: number;
  pullRequestsCount?: number;
  activeTimeSecs?: number;
}

export interface ActivityMetrics {
  sessionsCount: number;
  linesAdded: number;
  linesRemoved: number;
  commitsCount: number;
  pullRequestsCount: number;
  activeTimeSecs: number;
}

export interface SessionData {
  sessionId: string;
  projectName: string;
  totalTokens: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  modelsUsed: string[];
  turnsCount: number;
  sessionStart: string | null;
  sessionEnd: string | null;
  toolCounts?: Record<string, number>;
  taskCategories?: Record<string, number>;
}

export interface RateLimits {
  fiveHourUsedPct: number | null;
  sevenDayUsedPct: number | null;
  fiveHourResetsAt: number | null;
  sevenDayResetsAt: number | null;
  updatedAt: string | null;
}

export interface SubmissionPayload {
  totalTokens: number;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  modelsUsed: string[];
  dailyBreakdown: DailyBreakdown[];
  dateRange: { start: string; end: string };
  activity?: ActivityMetrics;
  sessions?: SessionData[];
  rateLimits?: RateLimits;
  source?: string;
  hostname?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  githubUsername: string | null;
  department: string | null;
  orgUnit: string | null;
  level: number;
  totalTokens: number;
  totalCost: number;
  submittedAt: string;
  fiveHourUsedPct: number | null;
  sevenDayUsedPct: number | null;
  fiveHourResetsAt: string | null;
  sevenDayResetsAt: string | null;
  rateLimitUpdatedAt: string | null;
  isLive: boolean;
}
