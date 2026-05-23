import { createHash } from "node:crypto";

export function daySaltUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function computeVisitorId(ip: string, userAgent: string): string {
  const salt = daySaltUtc();
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
