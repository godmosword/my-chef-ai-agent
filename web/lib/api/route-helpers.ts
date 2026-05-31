import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID } from "@/platform/config/app-config";
import { isDatabaseConfigured } from "@/platform/db/client";
import { getSessionUserId } from "@/platform/identity/session";

export type ApiSession = {
  userId: string;
  tenantId: string;
};

export async function requireApiSession(options: {
  databaseError?: string;
  requireDatabase?: boolean;
} = {}): Promise<ApiSession | NextResponse> {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "Missing session" },
      { status: 401 },
    );
  }

  const missingDatabase =
    options.requireDatabase === false
      ? null
      : rejectMissingDatabase(options.databaseError);
  if (missingDatabase) return missingDatabase;

  return { userId, tenantId: DEFAULT_TENANT_ID };
}

export function rejectMissingDatabase(
  error = "DATABASE_URL not configured",
): NextResponse | null {
  if (isDatabaseConfigured()) return null;
  return NextResponse.json({ ok: false, error }, { status: 503 });
}

export async function readJsonBody(
  request: Request,
  invalidJsonError = "Invalid JSON",
): Promise<unknown | NextResponse> {
  try {
    return await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: invalidJsonError },
      { status: 400 },
    );
  }
}
