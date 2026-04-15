ALTER TABLE "user_sessions" ADD COLUMN "tool_counts" jsonb NOT NULL DEFAULT '{}';
ALTER TABLE "user_sessions" ADD COLUMN "task_categories" jsonb NOT NULL DEFAULT '{}';
