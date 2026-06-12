import { NextResponse } from "next/server";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeOrdersGroupedBySession } from "@/lib/order-read-model";
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
  invoice: {
    id: number;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    paidAt: Date;
    createdAt: Date;
  } | null;
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    price: number;
    note: string | null;
    product: {
      id: number;
      name: string;
      category: {
        id: number;
        name: string;
      };
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
    invoice: order.invoice
      ? {
          ...order.invoice,
          paidAt: order.invoice.paidAt.toISOString(),
          createdAt: order.invoice.createdAt.toISOString(),
        }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      category: item.product.category,
      quantity: item.quantity,
      price: item.price,
      lineTotal: item.price * item.quantity,
      note: item.note,
    })),
  };
}

export async function GET(request: Request, { params }: RouteContext) {
  const { id: idParam } = await params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json(
      { message: "Mã đơn hàng không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const canReadOrder = await hasRole(["ADMIN", "STAFF", "CASHIER"]);

    if (!canReadOrder) {
      return NextResponse.json(
        { message: "Bạn không có quyền xem đơn hàng." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const shouldLoadBill = searchParams.get("view") === "bill";

    if (shouldLoadBill) {
      const anchorOrder = await prisma.order.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          sessionId: true,
        },
      });

      if (!anchorOrder) {
        return NextResponse.json(
          { message: "Đơn hàng không tồn tại." },
          { status: 404 },
        );
      }

      if (anchorOrder.sessionId) {
        const billOrders = await prisma.order.findMany({
          where: {
            sessionId: anchorOrder.sessionId,
            status: {
              not: OrderStatus.CANCELLED,
            },
          },
          orderBy: {
            createdAt: "asc",
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
            session: {
              select: {
                id: true,
                orders: {
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
        });
        const [bill] = serializeOrdersGroupedBySession(billOrders);

        return NextResponse.json({
          data: bill ?? null,
        });
      }
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: {
          select: {
            id: true,
            name: true,
          },
        },
        invoice: {
          select: {
            id: true,
            totalAmount: true,
            paymentMethod: true,
            paidAt: true,
            createdAt: true,
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
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Đơn hàng không tồn tại." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: serializeOrder(order),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tải chi tiết đơn hàng." },
      { status: 500 },
    );
  }
}
