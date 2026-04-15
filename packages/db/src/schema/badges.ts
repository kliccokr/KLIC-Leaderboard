import { pgTable, text, jsonb, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";

export interface BadgeCondition {
  type: "tokens" | "level" | "streak";
  threshold: number;
}

export const badges = pgTable("badges", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  condition: jsonb("condition").$type<BadgeCondition>().notNull(),
});

export const userBadges = pgTable("user_badges", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeId: text("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
  earnedAt: timestamp("earned_at", { mode: "date" }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.badgeId] })]);
