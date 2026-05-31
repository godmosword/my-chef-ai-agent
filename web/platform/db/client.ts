import "server-only";

import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!_sql) {
    _sql = neon(url);
  }
  return _sql;
}

/** Normalize neon query result to a typed row array. */
export function asRows<T = Record<string, unknown>>(result: unknown): T[] {
  return Array.isArray(result) ? (result as T[]) : [];
}
