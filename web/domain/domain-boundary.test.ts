import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const domainRoot = join(__dirname);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) return sourceFiles(path);
      return path;
    })
    .filter((path) => /\.(ts|tsx)$/.test(path))
    .filter((path) => !path.endsWith(".test.ts") && !path.endsWith(".test.tsx"))
    .filter((path) => !path.endsWith(".d.ts"));
}

function relativeSource(path: string): string {
  return relative(domainRoot, path);
}

describe("domain layer boundary", () => {
  const files = sourceFiles(domainRoot);

  it("does not import outer layers or framework modules", () => {
    const violations = files.flatMap((path) => {
      const source = readFileSync(path, "utf8");
      const matches = source.matchAll(
        /(?:from\s+|import\()\s*["'](@\/(?:application|platform|components|lib)(?:\/|["'])|next(?:\/|["'])|react(?:\/|["'])|react-dom(?:\/|["'])|drizzle-orm(?:\/|["'])|@neondatabase(?:\/|["']))/g,
      );
      return Array.from(matches, (match) => `${relativeSource(path)} -> ${match[1]}`);
    });

    expect(violations).toEqual([]);
  });

  it("does not perform browser, env, network, or clock I/O", () => {
    const sideEffectPattern =
      /\btypeof\s+(?:window|document|localStorage|sessionStorage)\b|\b(?:window|document|localStorage|sessionStorage|indexedDB|navigator|Notification)\.|\bfetch\s*\(|\bprocess\.env\b|\bDate\.now\s*\(|\bnew Date\s*\(\s*\)/g;
    const violations = files.flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return Array.from(source.matchAll(sideEffectPattern), (match) => {
        const line = source.slice(0, match.index).split("\n").length;
        return `${relativeSource(path)}:${line} ${match[0]}`;
      });
    });

    expect(violations).toEqual([]);
  });
});
