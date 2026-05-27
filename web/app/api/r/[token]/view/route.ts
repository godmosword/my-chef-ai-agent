import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/platform/db/client";
import { recordPublicView } from "@/platform/db/queries/sharing";
import {
  computeVisitorId,
  getClientIp,
} from "@/platform/identity/visitor";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return new NextResponse(null, { status: 503 });
  }

  const { token } = await context.params;
  const visitorId = computeVisitorId(
    getClientIp(request),
    request.headers.get("user-agent") ?? "",
  );

  await recordPublicView(token, visitorId);
  return new NextResponse(null, { status: 204 });
}
