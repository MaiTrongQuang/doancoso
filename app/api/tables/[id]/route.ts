import { NextResponse } from "next/server";
import { TableStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/server-auth";

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

export async function PUT(request: Request, { params }: RouteContext) {
  const { id: idParam } = await params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json(
      { message: "Ma ban khong hop le." },
      { status: 400 },
    );
  }

  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Ban khong co quyen cap nhat ban." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const name = normalizeName(body?.name);
    const status = normalizeStatus(body?.status);

    if (!name) {
      return NextResponse.json(
        { message: "Ten ban la bat buoc." },
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
        { message: "Ban khong ton tai." },
        { status: 404 },
      );
    }

    if (duplicatedTable) {
      return NextResponse.json(
        { message: "Ten ban da ton tai." },
        { status: 409 },
      );
    }

    const updatedTable = await prisma.cafeTable.update({
      where: { id },
      data: {
        name,
        status,
        qrCodeUrl: table.qrCodeUrl ?? `/order/table/${id}`,
      },
    });

    return NextResponse.json({
      message: "Cap nhat ban thanh cong.",
      data: updatedTable,
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
      { message: "Ma ban khong hop le." },
      { status: 400 },
    );
  }

  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Ban khong co quyen xoa ban." },
        { status: 403 },
      );
    }

    const table = await prisma.cafeTable.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!table) {
      return NextResponse.json(
        { message: "Ban khong ton tai." },
        { status: 404 },
      );
    }

    if (table._count.orders > 0) {
      return NextResponse.json(
        {
          message: "Không thể xóa bàn vì bàn đã có đơn hàng trong hệ thống.",
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
