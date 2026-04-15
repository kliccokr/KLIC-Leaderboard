ALTER TABLE "submissions" ADD COLUMN "sessions_count" integer;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "lines_added" bigint;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "lines_removed" bigint;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "commits_count" integer;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "pull_requests_count" integer;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "active_time_secs" bigint;
