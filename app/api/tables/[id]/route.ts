import { NextResponse } from "next/server";
import { DiningSessionStatus, TableStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/server-auth";
import { activeTableOrderStatuses } from "@/lib/table-session-flow";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

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

function serializeTable(table: {
  id: number;
  name: string;
  status: TableStatus;
  qrCodeUrl: string | null;
  _count: {
    orders: number;
  };
  sessions: Array<{
    id: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: table.id,
    name: table.name,
    status: table.status,
    activeSessionId: table.sessions[0]?.id ?? null,
    qrCodeUrl: table.qrCodeUrl,
    orderCount: table._count.orders,
    createdAt: table.createdAt.toISOString(),
    updatedAt: table.updatedAt.toISOString(),
  };
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id: idParam } = await params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json(
      { message: "Mã bàn không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Bạn không có quyền cập nhật bàn." },
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

    const [table, duplicatedTable] = await Promise.all([
      prisma.cafeTable.findUnique({
        where: { id },
      }),
      prisma.cafeTable.findFirst({
        where: {
          id: {
            not: id,
          },
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      }),
    ]);

    if (!table) {
      return NextResponse.json(
        { message: "Bàn không tồn tại." },
        { status: 404 },
      );
    }

    if (duplicatedTable) {
      return NextResponse.json(
        { message: "Tên bàn đã tồn tại." },
        { status: 409 },
      );
    }

    if (status !== TableStatus.OCCUPIED) {
      const activeOrderCount = await prisma.order.count({
        where: {
          tableId: id,
          status: {
            in: [...activeTableOrderStatuses],
          },
        },
      });

      if (activeOrderCount > 0) {
        return NextResponse.json(
          {
            message:
              "Bàn vẫn còn đơn đang mở nên chưa thể chuyển về trống hoặc đặt trước.",
          },
          { status: 409 },
        );
      }
    }

    const updatedTable = await prisma.$transaction(async (tx) => {
      if (status === TableStatus.OCCUPIED) {
        const activeSession = await tx.diningSession.findFirst({
          where: {
            tableId: id,
            status: DiningSessionStatus.OPEN,
          },
        });

        if (!activeSession) {
          await tx.diningSession.create({
            data: {
              tableId: id,
              status: DiningSessionStatus.OPEN,
            },
          });
        }
      }

      if (status !== TableStatus.OCCUPIED) {
        await tx.diningSession.updateMany({
          where: {
            tableId: id,
            status: DiningSessionStatus.OPEN,
          },
          data: {
            status: DiningSessionStatus.CLOSED,
            closedAt: new Date(),
          },
        });
      }

      return tx.cafeTable.update({
        where: { id },
        data: {
          name,
          status,
          qrCodeUrl: table.qrCodeUrl ?? `/order/table/${id}`,
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
    });

    return NextResponse.json({
      message: "Cập nhật bàn thành công.",
      data: serializeTable(updatedTable),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể cập nhật bàn." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id: idParam } = await params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json(
      { message: "Mã bàn không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Bạn không có quyền xóa bàn." },
        { status: 403 },
      );
    }

    const table = await prisma.cafeTable.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            sessions: true,
          },
        },
      },
    });

    if (!table) {
      return NextResponse.json(
        { message: "Bàn không tồn tại." },
        { status: 404 },
      );
    }

    if (table._count.orders > 0 || table._count.sessions > 0) {
      return NextResponse.json(
        {
          message:
            "Không thể xóa bàn vì bàn đã có đơn hàng hoặc phiên phục vụ trong hệ thống.",
        },
        { status: 409 },
      );
    }

    await prisma.cafeTable.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Xóa bàn thành công.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể xóa bàn." },
      { status: 500 },
    );
  }
}
