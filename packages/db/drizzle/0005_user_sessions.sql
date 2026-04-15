CREATE TABLE "user_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "session_id" text NOT NULL,
  "project_name" text DEFAULT '' NOT NULL,
  "total_tokens" bigint DEFAULT 0 NOT NULL,
  "total_cost" numeric(12, 6) DEFAULT '0' NOT NULL,
  "input_tokens" bigint DEFAULT 0 NOT NULL,
  "output_tokens" bigint DEFAULT 0 NOT NULL,
  "cache_creation_tokens" bigint DEFAULT 0 NOT NULL,
  "cache_read_tokens" bigint DEFAULT 0 NOT NULL,
  "models_used" jsonb DEFAULT '[]' NOT NULL,
  "turns_count" integer DEFAULT 0 NOT NULL,
  "session_start" timestamp,
  "session_end" timestamp
);--> statement-breakpoint
CREATE UNIQUE INDEX "user_sessions_user_session_unique" ON "user_sessions" ("user_id", "session_id");
