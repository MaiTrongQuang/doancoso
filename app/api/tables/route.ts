import { NextResponse } from "next/server";
import { DiningSessionStatus, TableStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/server-auth";

function normalizeName(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeStatus(value: unknown) {
  if (value === TableStatus.OCCUPIED || value === TableStatus.RESERVED) {
    return value;
  }

  return TableStatus.AVAILABLE;
}

export async function GET() {
  try {
    const tables = await prisma.cafeTable.findMany({
      orderBy: {
        id: "asc",
      },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
        sessions: {
          where: {
            status: DiningSessionStatus.OPEN,
          },
          take: 1,
          select: {
            id: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: tables.map((table) => ({
        id: table.id,
        name: table.name,
        status: table.status,
        activeSessionId: table.sessions[0]?.id ?? null,
        qrCodeUrl: table.qrCodeUrl,
        orderCount: table._count.orders,
        createdAt: table.createdAt.toISOString(),
        updatedAt: table.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tải danh sách bàn." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Bạn không có quyền thêm bàn." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const name = normalizeName(body?.name);
    const status = normalizeStatus(body?.status);

    if (!name) {
      return NextResponse.json(
        { message: "Tên bàn là bắt buộc." },
        { status: 400 },
      );
    }

    const duplicatedTable = await prisma.cafeTable.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (duplicatedTable) {
      return NextResponse.json(
        { message: "Tên bàn đã tồn tại." },
        { status: 409 },
      );
    }

    const table = await prisma.$transaction(async (tx) => {
      const createdTable = await tx.cafeTable.create({
        data: {
          name,
          status,
        },
      });

      if (status === TableStatus.OCCUPIED) {
        await tx.diningSession.create({
          data: {
            tableId: createdTable.id,
            status: DiningSessionStatus.OPEN,
          },
        });
      }

      return tx.cafeTable.update({
        where: {
          id: createdTable.id,
        },
        data: {
          qrCodeUrl: `/order/table/${createdTable.id}`,
        },
      });
    });

    return NextResponse.json(
      {
        message: "Thêm bàn thành công.",
        data: table,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể thêm bàn." },
      { status: 500 },
    );
  }
}
