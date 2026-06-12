import { NextResponse } from "next/server";
import { DiningSessionStatus, OrderStatus, TableStatus } from "@prisma/client";
import {
  canTransitionOrderStatus,
  isOrderStatus,
} from "@/lib/order-status-flow";
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

function normalizeStatus(value: unknown) {
  if (isOrderStatus(value)) {
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
      { message: "Mã đơn hàng không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const canUpdateOrder = await hasRole(["ADMIN", "STAFF"]);

    if (!canUpdateOrder) {
      return NextResponse.json(
        { message: "Bạn không có quyền cập nhật đơn hàng." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const nextStatus = normalizeStatus(body?.status);

    if (!nextStatus) {
      return NextResponse.json(
        { message: "Trạng thái đơn hàng không hợp lệ." },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        tableId: true,
        sessionId: true,
        status: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Đơn hàng không tồn tại." },
        { status: 404 },
      );
    }

    if (!canTransitionOrderStatus(order.status, nextStatus)) {
      return NextResponse.json(
        { message: "Không thể chuyển trạng thái đơn hàng theo luồng này." },
        { status: 400 },
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: nextStatus,
        },
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

      if (nextStatus === OrderStatus.CANCELLED) {
        const activeOrdersInTable = await tx.order.count({
          where: {
            tableId: order.tableId,
            id: {
              not: id,
            },
            status: {
              in: [...activeTableOrderStatuses],
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

        if (order.sessionId) {
          const remainingBillableOrders = await tx.order.count({
            where: {
              sessionId: order.sessionId,
              status: {
                not: OrderStatus.CANCELLED,
              },
            },
          });

          if (remainingBillableOrders === 0) {
            await tx.diningSession.update({
              where: {
                id: order.sessionId,
              },
              data: {
                status: DiningSessionStatus.CANCELLED,
                closedAt: new Date(),
              },
            });
          }
        }
      }

      return updatedOrder;
    });

    return NextResponse.json({
      message: "Cập nhật trạng thái đơn hàng thành công.",
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
