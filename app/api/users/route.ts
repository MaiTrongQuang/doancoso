import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/server-auth";

const roles = new Set<string>(Object.values(Role));
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export async function GET() {
  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Ban khong co quyen xem danh sach nguoi dung." },
        { status: 403 },
      );
    }

    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
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
      data: users.map(serializeUser),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tải danh sách người dùng." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Ban khong co quyen them nguoi dung." },
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
        { message: "Ten nguoi dung la bat buoc." },
        { status: 400 },
      );
    }

    if (!emailPattern.test(email)) {
      return NextResponse.json(
        { message: "Email khong hop le." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Mat khau phai co it nhat 6 ky tu." },
        { status: 400 },
      );
    }

    if (!role) {
      return NextResponse.json(
        { message: "Vai tro nguoi dung khong hop le." },
        { status: 400 },
      );
    }

    const duplicatedUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });

    if (duplicatedUser) {
      return NextResponse.json(
        { message: "Email da duoc su dung." },
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role,
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

    return NextResponse.json(
      {
        message: "Them nguoi dung thanh cong.",
        data: serializeUser(user),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể thêm người dùng." },
      { status: 500 },
    );
  }
}
