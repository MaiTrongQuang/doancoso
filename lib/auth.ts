import type { SessionPayload } from "@/lib/jwt";

export type UserRole = SessionPayload["role"];

export const AUTH_COOKIE_NAME = "cafe_pos_session";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export const roleHomePath: Record<UserRole, string> = {
  ADMIN: "/admin/dashboard",
  STAFF: "/staff/orders",
  CASHIER: "/cashier/orders",
  BARISTA: "/staff/orders",
  SERVER: "/staff/orders",
};

const userRoles = [
  "ADMIN",
  "STAFF",
  "CASHIER",
  "BARISTA",
  "SERVER",
] as const satisfies readonly UserRole[];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.includes(value as UserRole);
}

export function canViewTables(role: UserRole) {
  return userRoles.includes(role);
}

export function canManageTables(role: UserRole) {
  return role === "ADMIN";
}

export const protectedRoutePrefixes = ["/admin", "/staff", "/cashier", "/invoices"];

export function isProtectedPath(pathname: string) {
  return protectedRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function canAccessPath(role: UserRole, pathname: string) {
  if (role === "ADMIN") {
    return (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/staff") ||
      pathname.startsWith("/cashier") ||
      pathname.startsWith("/invoices")
    );
  }

  if (role === "STAFF" || role === "BARISTA" || role === "SERVER") {
    return pathname.startsWith("/staff");
  }

  if (role === "CASHIER") {
    return pathname.startsWith("/cashier") || pathname.startsWith("/invoices");
  }

  return false;
}
