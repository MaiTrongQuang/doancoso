import { NextResponse } from "next/server";
import { OrderStatus, TableStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const nextStatusByCurrent: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.SERVED, OrderStatus.CANCELLED],
  SERVED: [],
  PAID: [],
  CANCELLED: [],
};

const activeTableStatuses = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.SERVED,
];

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeStatus(value: unknown) {
  if (
    value === OrderStatus.PENDING ||
    value === OrderStatus.CONFIRMED ||
    value === OrderStatus.PREPARING ||
    value === OrderStatus.SERVED ||
    value === OrderStatus.PAID ||
    value === OrderStatus.CANCELLED
  ) {
    return value;
  }

  return null;
}

function serializeOrder(order: {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  table: {
    id: number;
    name: string;
  };
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    price: number;
    note: string | null;
    product: {
      id: number;
      name: string;
    };
  }>;
}) {
  return {
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    note: order.note,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    table: order.table,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.price,
      note: item.note,
    })),
  };
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id: idParam } = await params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json(
      { message: "Ma don hang khong hop le." },
      { status: 400 },
    );
  }

  try {
    const canUpdateOrder = await hasRole(["ADMIN", "STAFF"]);

    if (!canUpdateOrder) {
      return NextResponse.json(
        { message: "Ban khong co quyen cap nhat don hang." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const nextStatus = normalizeStatus(body?.status);

    if (!nextStatus) {
      return NextResponse.json(
        { message: "Trang thai don hang khong hop le." },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        tableId: true,
        status: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Don hang khong ton tai." },
        { status: 404 },
      );
    }

    if (!nextStatusByCurrent[order.status].includes(nextStatus)) {
      return NextResponse.json(
        { message: "Không thể chuyển trạng thái đơn hàng theo luồng này." },
        { status: 400 },
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: {
          status: nextStatus,
        },
      });

      if (nextStatus === OrderStatus.CANCELLED) {
        const activeOrdersInTable = await tx.order.count({
          where: {
            tableId: order.tableId,
            id: {
              not: id,
            },
            status: {
              in: activeTableStatuses,
            },
          },
        });

        if (activeOrdersInTable === 0) {
          await tx.cafeTable.update({
            where: {
              id: order.tableId,
            },
            data: {
              status: TableStatus.AVAILABLE,
            },
          });
        }
      }

      return tx.order.findUniqueOrThrow({
        where: { id },
        include: {
          table: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            orderBy: {
              id: "asc",
            },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json({
      message: "Cap nhat trang thai don hang thanh cong.",
      data: serializeOrder(updatedOrder),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể cập nhật trạng thái đơn hàng." },
      { status: 500 },
    );
  }
}
