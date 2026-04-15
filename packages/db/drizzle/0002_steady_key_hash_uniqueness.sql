DROP INDEX IF EXISTS "api_keys_key_hash_unique";--> statement-breakpoint
DELETE FROM "api_keys"
WHERE "id" IN (
	SELECT "id"
	FROM (
		SELECT
			"id",
			ROW_NUMBER() OVER (
				PARTITION BY "key_hash"
				ORDER BY "last_used_at" DESC NULLS LAST, "created_at" DESC, "id" ASC
			) AS "rank"
		FROM "api_keys"
	) AS "ranked_api_keys"
	WHERE "rank" > 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_key_hash_unique" ON "api_keys" USING btree ("key_hash");