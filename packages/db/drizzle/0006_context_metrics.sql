ALTER TABLE "user_sessions" ADD COLUMN "peak_context_tokens" integer NOT NULL DEFAULT 0;
ALTER TABLE "user_sessions" ADD COLUMN "context_remaining_hours" numeric(8,1);
