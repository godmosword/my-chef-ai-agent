import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const isRscRequest = (request: Request) =>
  request.headers.get("RSC") === "1" ||
  request.headers.get("Next-Router-Prefetch") === "1" ||
  request.headers.get("Next-Router-State-Tree") != null;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request }) => isRscRequest(request),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request }) =>
        request.destination === "style" ||
        request.destination === "script" ||
        request.destination === "font",
      handler: new CacheFirst({
        cacheName: "static-assets-v1",
        plugins: [
          new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
        ],
      }),
    },
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/_next/image") ||
        url.hostname.endsWith("blob.vercel-storage.com"),
      handler: new CacheFirst({
        cacheName: "recipe-images-v1",
        plugins: [
          new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
    {
      matcher: ({ url, request }) =>
        url.pathname.startsWith("/api/recipes") && request.method === "GET",
      handler: new StaleWhileRevalidate({
        cacheName: "api-recipes-v1",
        plugins: [
          new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 5 }),
        ],
      }),
    },
    {
      matcher: ({ url, request }) =>
        url.pathname.startsWith("/api/recipes") && request.method === "POST",
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/api/favorites") ||
        url.pathname.startsWith("/api/plan"),
      handler: new NetworkFirst({
        cacheName: "api-mutable-v1",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 10 }),
        ],
      }),
    },
    {
      matcher: ({ url }) =>
        url.pathname === "/api/quota" || url.pathname === "/api/health",
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/r/"),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url, request }) =>
        url.pathname.startsWith("/api/plan/shopping") && request.method === "GET",
      handler: new NetworkFirst({
        cacheName: "api-shopping-v1",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 10 }),
        ],
      }),
    },
    {
      matcher: ({ request }) =>
        request.mode === "navigate" && !isRscRequest(request),
      handler: new NetworkFirst({
        cacheName: "pages-v1",
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.mode === "navigate";
        },
      },
    ],
  },
});

const META_CACHE = "chef-meta-v1";
const META_KEY = "/dinner-reminder-settings";

type DinnerReminderPayload = {
  enabled: boolean;
  hour: number;
  minute: number;
};

function partsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { hour: get("hour"), minute: get("minute") };
}

async function maybeShowDinnerReminder(): Promise<void> {
  try {
    const cache = await caches.open(META_CACHE);
    const res = await cache.match(META_KEY);
    if (!res) return;
    const settings = (await res.json()) as DinnerReminderPayload;
    if (!settings.enabled) return;
    const tz = "Asia/Taipei";
    const now = new Date();
    const p = partsInTimeZone(now, tz);
    if (p.hour !== settings.hour || p.minute !== settings.minute) return;
    await self.registration.showNotification("今晚想吃什麼？", {
      body: "點開職人料理，3 分鐘內想出晚餐",
      tag: "chef-dinner-reminder",
      icon: "/icons/icon-192.png",
      data: { url: "/app" },
    });
  } catch {
    /* optional */
  }
}

self.addEventListener("message", (event) => {
  const data = event.data as { type?: string; settings?: DinnerReminderPayload };
  if (data?.type !== "ARM_DINNER_REMINDER" || !data.settings) return;
  event.waitUntil(
    caches.open(META_CACHE).then((cache) =>
      cache.put(
        META_KEY,
        new Response(JSON.stringify(data.settings), {
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data as { url?: string } | undefined)?.url ?? "/app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          void (client as WindowClient).focus();
          return;
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(maybeShowDinnerReminder());
});

serwist.addEventListeners();
