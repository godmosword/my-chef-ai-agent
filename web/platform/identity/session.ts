import { cookies } from "next/headers";

/**
 * Anonymous session (`chef_session` cookie). Stable `userId` for Neon rows.
 * OAuth / family accounts (Wave 4): map external provider `sub` → same `userId`
 * without breaking recipes/favorites; see midterm-architecture spec G3.
 */
export const SESSION_COOKIE = "chef_session";

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}
