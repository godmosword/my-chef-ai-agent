import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { isDatabaseConfigured } from "./client";
import * as schema from "./schema";

let _pool: Pool | null = null;

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!_pool) {
    _pool = new Pool({ connectionString: url });
  }
  return _pool;
}

/** Drizzle client (Pool / WebSocket) — supports `db.transaction()` for recipe writes. */
export function getDb() {
  const pool = getPool();
  if (!pool) return null;
  return drizzle(pool, { schema });
}

export { schema, isDatabaseConfigured };
