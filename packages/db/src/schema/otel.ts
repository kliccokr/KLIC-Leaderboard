import { pgTable, text, timestamp, bigint, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const otelMetricPoints = pgTable(
  "otel_metric_points",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    metricName: text("metric_name").notNull(),
    value: text("value").notNull(),
    observedAt: timestamp("observed_at", { mode: "date" }).notNull(),
    attrs: jsonb("attrs").$type<Record<string, unknown>>(),
  },
  (t) => [
    index("otel_metric_user_time").on(t.userId, t.observedAt),
    index("otel_metric_name_time").on(t.metricName, t.observedAt),
  ],
);

export const otelEvents = pgTable(
  "otel_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    eventName: text("event_name").notNull(),
    observedAt: timestamp("observed_at", { mode: "date" }).notNull(),
    promptId: text("prompt_id"),
    sessionId: text("session_id"),
    attrs: jsonb("attrs").$type<Record<string, unknown>>(),
  },
  (t) => [
    index("otel_event_user_time").on(t.userId, t.observedAt),
    index("otel_event_name_time").on(t.eventName, t.observedAt),
    index("otel_event_prompt").on(t.promptId),
  ],
);

export type OtelMetricPoint = typeof otelMetricPoints.$inferSelect;
export type OtelEvent = typeof otelEvents.$inferSelect;
