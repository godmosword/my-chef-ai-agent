#!/usr/bin/env npx tsx
/**
 * Apply SQL migrations under apps/web/migrations/ in filename order.
 * Usage: DATABASE_URL=... pnpm -F @chef/web db:migrate
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "migrations");

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const body = await fs.readFile(path.join(migrationsDir, file), "utf-8");
    console.log("Applying", file);
    await pool.query(body);
  }
  await pool.end();
  console.log("Done:", files.length, "migration(s)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
