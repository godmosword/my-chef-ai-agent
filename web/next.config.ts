import type { NextConfig } from "next";
import { spawnSync } from "node:child_process";
import withSerwistInit from "@serwist/next";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [{ url: "/offline", revision }],
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable:
    process.env.NODE_ENV === "development" ||
    process.env.ENABLE_PWA === "false",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@chef/design-tokens", "@chef/shared-types"],
};

export default withSerwist(nextConfig);
