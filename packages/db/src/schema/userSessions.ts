import { pgTable, text, bigint, integer, numeric, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

export const userSessions = pgTable(
  "user_sessions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sessionId: text("session_id").notNull(),
    projectName: text("project_name").notNull().default(""),
    totalTokens: bigint("total_tokens", { mode: "number" }).notNull().default(0),
    totalCost: numeric("total_cost", { precision: 12, scale: 6 }).notNull().default("0"),
    inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
    outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
    cacheCreationTokens: bigint("cache_creation_tokens", { mode: "number" }).notNull().default(0),
    cacheReadTokens: bigint("cache_read_tokens", { mode: "number" }).notNull().default(0),
    modelsUsed: jsonb("models_used").$type<string[]>().notNull().default([]),
    turnsCount: integer("turns_count").notNull().default(0),
    sessionStart: timestamp("session_start", { mode: "date" }),
    sessionEnd: timestamp("session_end", { mode: "date" }),
    source: text("source").notNull().default("default"),
    hostname: text("hostname"),
    toolCounts: jsonb("tool_counts").$type<Record<string, number>>().notNull().default({}),
    taskCategories: jsonb("task_categories").$type<Record<string, number>>().notNull().default({}),
  },
  (t) => [uniqueIndex("user_sessions_user_session_unique").on(t.userId, t.sessionId)],
);

export type UserSession = typeof userSessions.$inferSelect;
