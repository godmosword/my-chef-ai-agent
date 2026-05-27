import { createHash } from "node:crypto";
import { displayDateKey } from "@/lib/locale/datetime";

function daySaltLocal(): string {
  return displayDateKey();
}

export function computeVisitorId(ip: string, userAgent: string): string {
  const salt = daySaltLocal();
  return createHash("sha256")
    .update(`${ip}|${userAgent}|${salt}`)
    .digest("hex");
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}
