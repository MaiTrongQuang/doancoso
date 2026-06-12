import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
  isUserRole,
  roleHomePath,
} from "@/lib/auth";
import { createSessionToken } from "@/lib/jwt";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email và mật khẩu là bắt buộc." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Email hoặc mật khẩu không đúng." },
        { status: 401 },
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Email hoặc mật khẩu không đúng." },
        { status: 401 },
      );
    }

    const role = user.role;

    if (!isUserRole(role)) {
      return NextResponse.json(
        { message: "Vai trò tài khoản không hợp lệ." },
        { status: 500 },
      );
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role,
    };

    const token = await createSessionToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      role,
    });

    const response = NextResponse.json({
      message: "Đăng nhập thành công.",
      user: safeUser,
      redirectTo: roleHomePath[role],
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: AUTH_COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể kết nối cơ sở dữ liệu." },
      { status: 500 },
    );
  }
}
