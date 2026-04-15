DELETE FROM "api_keys"
WHERE "id" IN (
	SELECT "id"
	FROM (
		SELECT
			"id",
			ROW_NUMBER() OVER (
				PARTITION BY "user_id"
				ORDER BY "last_used_at" DESC NULLS LAST, "created_at" DESC, "id" ASC
			) AS "rank"
		FROM "api_keys"
	) AS "ranked_api_keys"
	WHERE "rank" > 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_user_id_unique" ON "api_keys" USING btree ("user_id");