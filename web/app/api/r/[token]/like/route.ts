import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/platform/db/client";
import {
  addPublicLike,
  removePublicLike,
} from "@/platform/db/queries/sharing";
import {
  computeVisitorId,
  getClientIp,
} from "@/platform/identity/visitor";

type RouteContext = { params: Promise<{ token: string }> };

function visitorId(request: Request): string {
  return computeVisitorId(
    getClientIp(request),
    request.headers.get("user-agent") ?? "",
  );
}

export async function POST(request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Unavailable" }, { status: 503 });
  }

  const { token } = await context.params;
  const result = await addPublicLike(token, visitorId(request));
  if (!result) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...result });
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Unavailable" }, { status: 503 });
  }

  const { token } = await context.params;
  const result = await removePublicLike(token, visitorId(request));
  if (!result) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...result });
}
