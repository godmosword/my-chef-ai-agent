#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
];

function walk(dir, cb) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (["node_modules", ".next"].includes(ent.name)) continue;
    if (ent.isDirectory()) walk(p, cb);
    else if (/\.(ts|tsx|mjs)$/.test(ent.name)) cb(p);
  }
}

let files = 0;
walk(WEB, (file) => {
  let s = fs.readFileSync(file, "utf8");
  let changed = false;
  for (const [a, b] of replacements) {
    if (s.includes(a)) {
      s = s.split(a).join(b);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, s);
    files++;
  }
});
console.log(`Updated imports in ${files} files.`);
