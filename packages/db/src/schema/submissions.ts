import { pgTable, text, bigint, integer, numeric, jsonb, date, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import type { DailyBreakdown } from "@klic/shared";

export const submissions = pgTable("submissions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  source: text("source").notNull().default("default"),
  totalTokens: bigint("total_tokens", { mode: "number" }).notNull(),
  totalCost: numeric("total_cost", { precision: 12, scale: 6 }).notNull(),
  inputTokens: bigint("input_tokens", { mode: "number" }).notNull(),
  outputTokens: bigint("output_tokens", { mode: "number" }).notNull(),
  cacheCreationTokens: bigint("cache_creation_tokens", { mode: "number" }).notNull().default(0),
  cacheReadTokens: bigint("cache_read_tokens", { mode: "number" }).notNull().default(0),
  modelsUsed: jsonb("models_used").$type<string[]>().notNull().default([]),
  dailyBreakdown: jsonb("daily_breakdown").$type<DailyBreakdown[]>().notNull().default([]),
  dateRangeStart: date("date_range_start").notNull(),
  dateRangeEnd: date("date_range_end").notNull(),
  submittedAt: timestamp("submitted_at", { mode: "date" }).notNull().defaultNow(),
  // Activity metrics extracted from JSONL
  sessionsCount: integer("sessions_count"),
  linesAdded: bigint("lines_added", { mode: "number" }),
  linesRemoved: bigint("lines_removed", { mode: "number" }),
  commitsCount: integer("commits_count"),
  pullRequestsCount: integer("pull_requests_count"),
  activeTimeSecs: bigint("active_time_secs", { mode: "number" }),
});

export type Submission = typeof submissions.$inferSelect;
