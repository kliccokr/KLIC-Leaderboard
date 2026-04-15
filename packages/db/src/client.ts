import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

export const db = connectionString
  ? drizzle(postgres(connectionString), { schema })
  : (null as unknown as ReturnType<typeof drizzle<typeof schema>>);

export type DB = ReturnType<typeof drizzle<typeof schema>>;
