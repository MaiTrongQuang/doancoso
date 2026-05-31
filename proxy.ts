import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, canAccessPath, roleHomePath } from "@/lib/auth";
import { verifySessionToken } from "@/lib/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const session = await verifySessionToken(token);

    if (!canAccessPath(session.role, pathname)) {
      return NextResponse.redirect(new URL(roleHomePath[session.role], request.url));
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);

    const response = NextResponse.redirect(loginUrl);
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    return response;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/cashier/:path*"],
};
