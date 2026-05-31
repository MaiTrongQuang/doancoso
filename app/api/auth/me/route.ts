import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/jwt";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Chưa đăng nhập.", user: null },
      { status: 401 },
    );
  }

  try {
    const session = await verifySessionToken(token);
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Tai khoan khong ton tai.", user: null },
        { status: 401 },
      );
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { message: "Phien dang nhap khong hop le.", user: null },
      { status: 401 },
    );
  }
}
