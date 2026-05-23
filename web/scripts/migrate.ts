#!/usr/bin/env npx tsx
/**
 * Apply SQL migrations under web/migrations/ in filename order.
 * Usage: pnpm -F @chef/web db:migrate
 * Loads web/.env.local when DATABASE_URL is not already set (Neon URLs may contain &).
 */
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "migrations");

function loadEnvLocal(): void {
  if (process.env.DATABASE_URL?.trim()) return;
  const envPath = path.join(__dirname, "..", ".env.local");
  try {
    const text = fs.readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* .env.local optional */
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const files = (await fsPromises.readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql") && !f.includes(".down."))
    .sort();
  for (const file of files) {
    const body = await fsPromises.readFile(path.join(migrationsDir, file), "utf-8");
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
