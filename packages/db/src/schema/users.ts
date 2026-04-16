import { pgEnum, pgTable, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  githubUsername: text("github_username").unique(),
  department: text("department"),
  team: text("team"),
  role: roleEnum("role").notNull().default("user"),
  level: integer("level").notNull().default(1),
  lastSubmissionAt: timestamp("last_submission_at", { mode: "date" }),
  fiveHourUsedPct: numeric("five_hour_used_pct", { precision: 5, scale: 2 }),
  sevenDayUsedPct: numeric("seven_day_used_pct", { precision: 5, scale: 2 }),
  fiveHourResetsAt: timestamp("five_hour_resets_at", { mode: "date" }),
  sevenDayResetsAt: timestamp("seven_day_resets_at", { mode: "date" }),
  rateLimitUpdatedAt: timestamp("rate_limit_updated_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
