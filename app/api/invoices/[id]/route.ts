import { NextResponse } from "next/server";
import { OrderStatus, PaymentMethod } from "@prisma/client";
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

type InvoiceOrder = {
  id: number;
  status: OrderStatus;
  note: string | null;
  totalAmount: number;
  createdAt: Date;
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
};

function serializeInvoice(invoice: {
  id: number;
  orderId: number;
  sessionId: number | null;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paidAt: Date;
  createdAt: Date;
  order: InvoiceOrder;
  session: {
    id: number;
    orders: InvoiceOrder[];
  } | null;
}) {
  const billOrders =
    invoice.session?.orders.filter(
      (order) => order.status !== OrderStatus.CANCELLED,
    ) ?? [invoice.order];
  const sortedOrders = [...billOrders].sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
  );
  const [firstOrder] = sortedOrders;

  if (!firstOrder) {
    throw new Error("Cannot serialize invoice without billable orders.");
  }

  return {
    id: invoice.id,
    orderId: invoice.orderId,
    sessionId: invoice.sessionId,
    totalAmount: invoice.totalAmount,
    paymentMethod: invoice.paymentMethod,
    paidAt: invoice.paidAt.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    order: {
      id: firstOrder.id,
      status: firstOrder.status,
      note: sortedOrders.map((order) => order.note).find(Boolean) ?? null,
      totalAmount: invoice.totalAmount,
      createdAt: firstOrder.createdAt.toISOString(),
      table: firstOrder.table,
      items: sortedOrders.flatMap((order) => order.items).map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
        note: item.note,
      })),
    },
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id: idParam } = await params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json(
      { message: "Mã hóa đơn không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const canReadInvoice = await hasRole(["ADMIN", "CASHIER"]);

    if (!canReadInvoice) {
      return NextResponse.json(
        { message: "Bạn không có quyền xem hóa đơn." },
        { status: 403 },
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: {
        id,
      },
      include: {
        order: {
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
        },
        session: {
          include: {
            orders: {
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
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { message: "Hóa đơn không tồn tại." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: serializeInvoice(invoice),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tải chi tiết hóa đơn." },
      { status: 500 },
    );
  }
}
