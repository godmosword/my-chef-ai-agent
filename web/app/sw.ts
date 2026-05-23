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

serwist.addEventListeners();
