#!/usr/bin/env node
/**
 * One-shot lib → domain / application / platform migration.
 * Run from web/: node scripts/migrate-architecture.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sh(cmd) {
  execSync(cmd, { cwd: WEB, stdio: "inherit" });
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function gitMv(from, to) {
  const src = path.join(WEB, from);
  const dest = path.join(WEB, to);
  if (!fs.existsSync(src)) {
    console.warn("skip missing:", from);
    return;
  }
  mkdirp(path.dirname(dest));
  sh(`git mv "${from}" "${to}"`);
}

// --- moves ---
const dirs = [
  "domain/recipe",
  "domain/cook",
  "domain/plan",
  "platform/db/queries",
  "platform/sync",
  "platform/analytics",
  "platform/identity",
  "platform/config",
  "platform/media",
  "application/api",
  "application/notifications",
  "application/hero",
  "application/poster",
  "application/settings",
];
dirs.forEach((d) => mkdirp(path.join(WEB, d)));

// domain/recipe
for (const f of fs.readdirSync(path.join(WEB, "lib/ai"))) {
  gitMv(`lib/ai/${f}`, `domain/recipe/${f}`);
}
for (const f of fs.readdirSync(path.join(WEB, "lib/recipe"))) {
  gitMv(`lib/recipe/${f}`, `domain/recipe/${f}`);
}
[
  "recipe-payload.ts",
  "recipe-payload.test.ts",
  "recipe-steps.ts",
  "recipe-steps.test.ts",
  "recipe-scale.ts",
  "recipe-display.ts",
  "recipe-memory.ts",
  "recipe-progress.ts",
  "cuisines.ts",
].forEach((f) => gitMv(`lib/${f}`, `domain/recipe/${f}`));

// domain/cook
for (const f of fs.readdirSync(path.join(WEB, "lib/cooking"))) {
  gitMv(`lib/cooking/${f}`, `domain/cook/${f}`);
}

// domain/plan
gitMv("lib/aggregation/shopping-list.ts", "domain/plan/shopping-list.ts");
gitMv("lib/shopping/add-from-recipe.ts", "domain/plan/add-from-recipe.ts");
if (fs.existsSync(path.join(WEB, "lib/shopping-parse.test.ts"))) {
  gitMv("lib/shopping-parse.test.ts", "domain/plan/shopping-parse.test.ts");
}

// platform
gitMv("lib/db", "platform/db");
for (const f of fs.readdirSync(path.join(WEB, "lib/offline"))) {
  gitMv(`lib/offline/${f}`, `platform/sync/${f}`);
}
gitMv("lib/analytics", "platform/analytics");
gitMv("lib/session.ts", "platform/identity/session.ts");
gitMv("lib/sharing/visitor.ts", "platform/identity/visitor.ts");
gitMv("lib/sharing/token.ts", "platform/identity/token.ts");
gitMv("lib/flags.ts", "platform/config/flags.ts");
gitMv("lib/config.ts", "platform/config/app-config.ts");
gitMv("lib/site-url.ts", "platform/config/site-url.ts");
gitMv("lib/media", "platform/media");

// application
gitMv("lib/api", "application/api");
gitMv("lib/notifications", "application/notifications");
gitMv("lib/hero", "application/hero");
gitMv("lib/poster", "application/poster");
gitMv("lib/settings", "application/settings");

// cleanup empty dirs
["lib/ai", "lib/recipe", "lib/cooking", "lib/aggregation", "lib/shopping", "lib/offline", "lib/sharing"].forEach(
  (d) => {
    const p = path.join(WEB, d);
    if (fs.existsSync(p) && fs.readdirSync(p).length === 0) fs.rmdirSync(p);
  }
);

// --- import replacements (longest first) ---
const replacements = [
  ["@/platform/sync/", "@/platform/sync/"],
  ["@/application/notifications/", "@/application/notifications/"],
  ["@/domain/plan/", "@/domain/plan/"],
  ["@/domain/plan/", "@/domain/plan/"],
  ["@/domain/recipe/recipe-payload", "@/domain/recipe/recipe-payload"],
  ["@/domain/recipe/recipe-steps", "@/domain/recipe/recipe-steps"],
  ["@/domain/recipe/recipe-scale", "@/domain/recipe/recipe-scale"],
  ["@/domain/recipe/recipe-display", "@/domain/recipe/recipe-display"],
  ["@/domain/recipe/recipe-memory", "@/domain/recipe/recipe-memory"],
  ["@/domain/recipe/recipe-progress", "@/domain/recipe/recipe-progress"],
  ["@/domain/recipe/", "@/domain/recipe/"],
  ["@/domain/recipe/", "@/domain/recipe/"],
  ["@/domain/cook/", "@/domain/cook/"],
  ["@/platform/db/", "@/platform/db/"],
  ["@/platform/analytics/", "@/platform/analytics/"],
  ["@/application/api/", "@/application/api/"],
  ["@/application/hero/", "@/application/hero/"],
  ["@/application/poster/", "@/application/poster/"],
  ["@/application/settings/", "@/application/settings/"],
  ["@/platform/media/", "@/platform/media/"],
  ["@/platform/identity/session", "@/platform/identity/session"],
  ["@/platform/identity/visitor", "@/platform/identity/visitor"],
  ["@/platform/identity/token", "@/platform/identity/token"],
  ["@/platform/config/flags", "@/platform/config/flags"],
  ["@/platform/config/app-config", "@/platform/config/app-config"],
  ["@/platform/config/site-url", "@/platform/config/site-url"],
  ["@/domain/recipe/cuisines", "@/domain/recipe/cuisines"],
  // relative paths used inside lib
  ["from \"../db/", "from \"@/platform/db/"],
  ["from '../db/", "from '@/platform/db/"],
  ["from \"../../db/", "from \"@/platform/db/"],
  ["from \"../offline/", "from \"@/platform/sync/"],
  ["from \"../analytics/", "from \"@/platform/analytics/"],
  ["from \"../session", "from \"@/platform/identity/session"],
  ["from \"../flags", "from \"@/platform/config/flags"],
  ["from \"../config\"", "from \"@/platform/config/app-config\""],
  ["from \"../site-url", "from \"@/platform/config/site-url"],
  ["from \"../api/", "from \"@/application/api/"],
  ["from \"../ai/", "from \"@/domain/recipe/"],
  ["from \"../recipe/", "from \"@/domain/recipe/"],
  ["from \"../cooking/", "from \"@/domain/cook/"],
  ["from \"./flags", "from \"@/platform/config/flags"],
  ["from \"./config\"", "from \"@/platform/config/app-config\""],
];

function walk(dir, cb) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.name === "node_modules" || ent.name === ".next") continue;
    if (ent.isDirectory()) walk(p, cb);
    else if (/\.(ts|tsx|mjs)$/.test(ent.name)) cb(p);
  }
}

walk(WEB, (file) => {
  let s = fs.readFileSync(file, "utf8");
  let changed = false;
  for (const [a, b] of replacements) {
    if (s.includes(a)) {
      s = s.split(a).join(b);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(file, s);
});

console.log("Migration moves + import rewrites done.");
