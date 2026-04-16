import type { DailyBreakdown } from "@klic/shared";

/** KST(UTC+9) offset in ms */
const KST_OFFSET = 9 * 60 * 60 * 1000;

/**
 * Get KST "today" as a date string (YYYY-MM-DD).
 * All dailyBreakdown dates should match this format.
 */
export function kstToday(): string {
  return kstDateStr(new Date());
}

/**
 * Format a Date as KST date string (YYYY-MM-DD).
 */
export function kstDateStr(d: Date): string {
  const kst = new Date(d.getTime() + KST_OFFSET);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Calculate period date range using KST dates.
 * "1d" = today only, "3d" = today + 2 prior days, etc.
 */
export function getPeriodRange(period: string): { start: Date; end: Date } | null {
  if (period === "all") return null;
  const days = period === "1d" ? 1 : period === "3d" ? 3 : period === "5d" ? 5 : period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const now = new Date();
  // KST today midnight expressed as a Date for comparison
  const todayKST = kstToday();
  const [y, m, d] = todayKST.split("-").map(Number);
  // Start of period in KST (convert back to UTC for Date object)
  const startKST = new Date(Date.UTC(y, m - 1, d - (days - 1), 0, 0, 0) - KST_OFFSET);
  return { start: startKST, end: now };
}

interface SubmissionLike {
  dateRangeStart: string;
  dateRangeEnd: string;
  activeTimeSecs: number | null;
  commitsCount: number | null;
  pullRequestsCount: number | null;
  linesAdded: number | null;
  linesRemoved: number | null;
}

/**
 * Fill in per-day activity metrics when dailyBreakdown entries
 * lack the new fields (data submitted before the schema change).
 *
 * Strategy: calculate daily average from each submission
 * (activity / days_spanned), sum across submissions,
 * then assign uniformly to filtered days.
 */
export function backfillDailyActivity(
  dailyData: DailyBreakdown[],
  submissions: SubmissionLike[],
  rangeStart: string | null,
  rangeEnd: string | null,
): void {
  // Check if any day already has activity data from new CLI
  const hasDailyActivity = dailyData.some(
    (d) =>
      (d.commitsCount ?? 0) > 0 ||
      (d.linesAdded ?? 0) > 0 ||
      (d.activeTimeSecs ?? 0) > 0 ||
      (d.pullRequestsCount ?? 0) > 0,
  );
  if (hasDailyActivity) return;

  // No daily activity data — estimate from submission-level totals
  const filteredSubs = submissions.filter((s) => {
    if (rangeStart && s.dateRangeEnd < rangeStart) return false;
    if (rangeEnd && s.dateRangeStart > rangeEnd) return false;
    return true;
  });

  // Calculate per-day averages from each submission, then sum
  let avgCommitsPerDay = 0;
  let avgPRsPerDay = 0;
  let avgLinesAddedPerDay = 0;
  let avgLinesRemovedPerDay = 0;
  let avgActiveTimePerDay = 0;

  for (const sub of filteredSubs) {
    const start = new Date(sub.dateRangeStart).getTime();
    const end = new Date(sub.dateRangeEnd).getTime();
    const days = Math.max(1, Math.round((end - start) / 86_400_000) + 1);

    avgCommitsPerDay += (sub.commitsCount ?? 0) / days;
    avgPRsPerDay += (sub.pullRequestsCount ?? 0) / days;
    avgLinesAddedPerDay += (sub.linesAdded ?? 0) / days;
    avgLinesRemovedPerDay += (sub.linesRemoved ?? 0) / days;
    avgActiveTimePerDay += (sub.activeTimeSecs ?? 0) / days;
  }

  if (avgCommitsPerDay === 0 && avgPRsPerDay === 0 && avgLinesAddedPerDay === 0 && avgActiveTimePerDay === 0) return;

  // Assign daily averages to each filtered day
  for (const d of dailyData) {
    d.commitsCount = Math.round(avgCommitsPerDay);
    d.pullRequestsCount = Math.round(avgPRsPerDay);
    d.linesAdded = Math.round(avgLinesAddedPerDay);
    d.linesRemoved = Math.round(avgLinesRemovedPerDay);
    d.activeTimeSecs = Math.round(avgActiveTimePerDay);
  }
}
