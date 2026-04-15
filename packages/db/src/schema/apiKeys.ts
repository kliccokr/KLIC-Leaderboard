import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    keyHash: text("key_hash").notNull(),
    keyValue: text("key_value"),
    name: text("name").notNull().default("default"),
    lastUsedAt: timestamp("last_used_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("api_keys_key_hash_unique").on(table.keyHash),
    uniqueIndex("api_keys_user_id_unique").on(table.userId),
  ],
);
