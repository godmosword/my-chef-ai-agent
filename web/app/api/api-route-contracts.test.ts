import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/platform/identity/session", () => ({
  getSessionUserId: vi.fn(async () => null),
  SESSION_COOKIE: "chef_session",
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
  })),
}));

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type RouteContext = { params: Promise<Record<string, string>> };
type RouteHandler = (
  request: Request,
  context: RouteContext,
) => Response | Promise<Response>;
type RouteModule = Partial<Record<HttpMethod, RouteHandler>>;

const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const apiRoot = dirname(fileURLToPath(import.meta.url));

function collectRouteFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectRouteFiles(full));
    } else if (entry === "route.ts") {
      files.push(full);
    }
  }
  return files;
}

const routeModules = collectRouteFiles(apiRoot).map((file) => ({
  path: `./${relative(apiRoot, file).split(sep).join("/")}`,
  load: () => import(pathToFileURL(file).href) as Promise<RouteModule>,
}));

const paramValues: Record<string, string> = {
  date: "2026-05-25",
  id: "recipe-1",
  itemId: "1",
  listId: "1",
  memberId: "1",
  planId: "1",
  recipeId: "recipe-1",
  sessionId: "00000000-0000-4000-8000-000000000000",
  slot: "dinner",
  slotId: "1",
  stepIndex: "0",
  token: "share-token",
  week: "2026-05-25",
};

function contextFor(path: string): RouteContext {
  const params: Record<string, string> = {};
  for (const match of path.matchAll(/\[([^\]]+)\]/g)) {
    const key = match[1]!;
    params[key] = paramValues[key] ?? "test";
  }
  return { params: Promise.resolve(params) };
}

function requestFor(method: HttpMethod): Request {
  const init: RequestInit = {
    method,
    headers: {
      "content-type": "application/json",
      "user-agent": "vitest",
    },
  };
  if (method !== "GET") {
    init.body = JSON.stringify({});
  }
  return new Request("http://localhost/api/contract?week_of=2026-05-25", init);
}

describe("API route contracts", () => {
  for (const { path, load } of routeModules) {
    for (const method of methods) {
      it(`${method} ${path} returns a Response when exported`, async () => {
        const mod = await load();
        const handler = mod[method];
        if (!handler) return;

        const response = await handler(requestFor(method), contextFor(path));
        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBeGreaterThanOrEqual(100);
      });
    }
  }
});
