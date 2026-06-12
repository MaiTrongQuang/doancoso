import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession, hasRole } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const roles = new Set<string>(Object.values(Role));
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeId(value: string) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeRole(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const role = value.trim().toUpperCase();
  return roles.has(role) ? (role as Role) : null;
}

function serializeUser(user: {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Bạn không có quyền xem người dùng." },
        { status: 403 },
      );
    }

    const { id: idParam } = await params;
    const id = normalizeId(idParam);

    if (!id) {
      return NextResponse.json(
        { message: "Mã người dùng không hợp lệ." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
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
        { message: "Người dùng không tồn tại." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: serializeUser(user),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tải thông tin người dùng." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id: idParam } = await params;
  const id = normalizeId(idParam);

  if (!id) {
    return NextResponse.json(
      { message: "Mã người dùng không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Bạn không có quyền cập nhật người dùng." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const name = normalizeText(body?.name);
    const email = normalizeEmail(body?.email);
    const password = typeof body?.password === "string" ? body.password : "";
    const role = normalizeRole(body?.role);

    if (!name) {
      return NextResponse.json(
        { message: "Tên người dùng là bắt buộc." },
        { status: 400 },
      );
    }

    if (!emailPattern.test(email)) {
      return NextResponse.json(
        { message: "Email không hợp lệ." },
        { status: 400 },
      );
    }

    if (password.length > 0 && password.length < 6) {
      return NextResponse.json(
        { message: "Mật khẩu mới phải có ít nhất 6 ký tự." },
        { status: 400 },
      );
    }

    if (!role) {
      return NextResponse.json(
        { message: "Vai trò người dùng không hợp lệ." },
        { status: 400 },
      );
    }

    const [user, duplicatedUser, adminCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
      }),
      prisma.user.findFirst({
        where: {
          id: {
            not: id,
          },
          email: {
            equals: email,
            mode: "insensitive",
          },
        },
      }),
      prisma.user.count({
        where: {
          role: Role.ADMIN,
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json(
        { message: "Người dùng không tồn tại." },
        { status: 404 },
      );
    }

    if (duplicatedUser) {
      return NextResponse.json(
        { message: "Email đã được sử dụng." },
        { status: 409 },
      );
    }

    if (user.role === Role.ADMIN && role !== Role.ADMIN && adminCount <= 1) {
      return NextResponse.json(
        { message: "Hệ thống cần ít nhất một tài khoản admin." },
        { status: 409 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        ...(password
          ? {
              password: await bcrypt.hash(password, 10),
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: "Cập nhật người dùng thành công.",
      data: serializeUser(updatedUser),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể cập nhật người dùng." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id: idParam } = await params;
  const id = normalizeId(idParam);

  if (!id) {
    return NextResponse.json(
      { message: "Mã người dùng không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const session = await getCurrentSession();

    if (!session || session.role !== Role.ADMIN) {
      return NextResponse.json(
        { message: "Bạn không có quyền xóa người dùng." },
        { status: 403 },
      );
    }

    if (session.userId === id) {
      return NextResponse.json(
        { message: "Không thể xóa tài khoản đang đăng nhập." },
        { status: 409 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Người dùng không tồn tại." },
        { status: 404 },
      );
    }

    if (user.role === Role.ADMIN) {
      const adminCount = await prisma.user.count({
        where: {
          role: Role.ADMIN,
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { message: "Hệ thống cần ít nhất một tài khoản admin." },
          { status: 409 },
        );
      }
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Xóa người dùng thành công.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể xóa người dùng." },
      { status: 500 },
    );
  }
}
