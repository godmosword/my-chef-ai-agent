import { drizzle } from "drizzle-orm/neon-http";
import { getSql, isDatabaseConfigured } from "./client";
import * as schema from "./schema";

export function getDb() {
  const sql = getSql();
  if (!sql) return null;
  return drizzle(sql, { schema });
}

export { schema, isDatabaseConfigured };
