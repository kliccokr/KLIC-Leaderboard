CREATE TABLE IF NOT EXISTS "otel_metric_points" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "metric_name" text NOT NULL,
  "value" text NOT NULL,
  "observed_at" timestamp NOT NULL,
  "attrs" jsonb
);

CREATE INDEX IF NOT EXISTS "otel_metric_user_time" ON "otel_metric_points" ("user_id", "observed_at");
CREATE INDEX IF NOT EXISTS "otel_metric_name_time" ON "otel_metric_points" ("metric_name", "observed_at");

CREATE TABLE IF NOT EXISTS "otel_events" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "event_name" text NOT NULL,
  "observed_at" timestamp NOT NULL,
  "prompt_id" text,
  "session_id" text,
  "attrs" jsonb
);

CREATE INDEX IF NOT EXISTS "otel_event_user_time" ON "otel_events" ("user_id", "observed_at");
CREATE INDEX IF NOT EXISTS "otel_event_name_time" ON "otel_events" ("event_name", "observed_at");
CREATE INDEX IF NOT EXISTS "otel_event_prompt" ON "otel_events" ("prompt_id");
