#!/usr/bin/env npx tsx
/**
 * Audit recipes.hero_url persistence.
 *
 * Reports:
 *  - total recipes
 *  - rows where hero_status='ready' but hero_url IS NULL (the bug case)
 *  - rows still in pending/generating older than 1 hour (stuck jobs)
 *  - rows where hero_status='ready' AND hero_url present (the happy path)
 *  - average hero_url length (data URL bloat indicator)
 *
 * Usage: pnpm -F @chef/web tsx scripts/audit-hero-persistence.ts
 * Loads web/.env.local when DATABASE_URL is not already set.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

async function main(): Promise<void> {
  loadEnvLocal();
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });

  const queries = {
    total: "SELECT COUNT(*)::int AS n FROM recipes",
    readyMissingUrl:
      "SELECT COUNT(*)::int AS n FROM recipes WHERE hero_status = 'ready' AND (hero_url IS NULL OR hero_url = '')",
    readyHasUrl:
      "SELECT COUNT(*)::int AS n FROM recipes WHERE hero_status = 'ready' AND hero_url IS NOT NULL AND hero_url <> ''",
    stuckPending:
      "SELECT COUNT(*)::int AS n FROM recipes WHERE hero_status IN ('pending','generating') AND created_at < NOW() - INTERVAL '1 hour'",
    failed: "SELECT COUNT(*)::int AS n FROM recipes WHERE hero_status = 'failed'",
    skipped: "SELECT COUNT(*)::int AS n FROM recipes WHERE hero_status = 'skipped'",
    avgUrlLen:
      "SELECT COALESCE(AVG(LENGTH(hero_url))::int, 0) AS n FROM recipes WHERE hero_url IS NOT NULL AND hero_url <> ''",
    last30dReady:
      "SELECT COUNT(*)::int AS n FROM recipes WHERE created_at > NOW() - INTERVAL '30 days' AND hero_status = 'ready'",
    last30dReadyMissingUrl:
      "SELECT COUNT(*)::int AS n FROM recipes WHERE created_at > NOW() - INTERVAL '30 days' AND hero_status = 'ready' AND (hero_url IS NULL OR hero_url = '')",
  } as const;

  const results: Record<string, number> = {};
  for (const [key, sql] of Object.entries(queries)) {
    const r = await pool.query<{ n: number }>(sql);
    results[key] = r.rows[0]?.n ?? 0;
  }

  await pool.end();

  console.log("\n=== Hero Persistence Audit ===\n");
  console.log(`Total recipes:                    ${results.total}`);
  console.log(`  hero_status=ready + hero_url:   ${results.readyHasUrl}  (healthy)`);
  console.log(`  hero_status=ready + NULL url:   ${results.readyMissingUrl}  (BUG if > 0)`);
  console.log(`  hero_status=failed:             ${results.failed}`);
  console.log(`  hero_status=skipped:            ${results.skipped}`);
  console.log(`  stuck pending/generating (>1h): ${results.stuckPending}  (job worker issue if > 0)`);
  console.log(`Avg hero_url length:              ${results.avgUrlLen} chars`);
  console.log("\nLast 30 days:");
  console.log(`  ready total:                    ${results.last30dReady}`);
  console.log(`  ready w/ missing url:           ${results.last30dReadyMissingUrl}  (user concern if > 0)`);
  console.log("");

  if (results.readyMissingUrl > 0 || results.stuckPending > 0) {
    console.log("WARN: anomalies found above. Investigate.");
    process.exit(2);
  }
  console.log("OK: no persistence anomalies found.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
