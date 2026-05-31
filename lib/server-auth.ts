import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { verifySessionToken, type SessionPayload } from "@/lib/jwt";

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function hasRole(allowedRoles: SessionPayload["role"][]) {
  const session = await getCurrentSession();

  if (!session) {
    return false;
  }

  return allowedRoles.includes(session.role);
}
