import type { SessionPayload } from "@/lib/jwt";

export const AUTH_COOKIE_NAME = "cafe_pos_session";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export const roleHomePath: Record<SessionPayload["role"], string> = {
  ADMIN: "/admin/dashboard",
  STAFF: "/staff/orders",
  CASHIER: "/cashier/orders",
};

export const protectedRoutePrefixes = ["/admin", "/staff", "/cashier"];

export function isProtectedPath(pathname: string) {
  return protectedRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function canAccessPath(role: SessionPayload["role"], pathname: string) {
  if (role === "ADMIN") {
    return (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/staff") ||
      pathname.startsWith("/cashier")
    );
  }

  if (role === "STAFF") {
    return pathname.startsWith("/staff");
  }

  if (role === "CASHIER") {
    return pathname.startsWith("/cashier");
  }

  return false;
}
