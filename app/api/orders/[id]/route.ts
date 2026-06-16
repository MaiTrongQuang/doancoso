import { NextResponse } from "next/server";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEditableOrderUpdatePlan } from "@/lib/order-editing";
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

function normalizeId(value: unknown) {
  const id = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeEditableQuantity(value: unknown) {
  const quantity =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
    return null;
  }

  return quantity;
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  return text.length > 0 ? text : null;
}

function hasOwnKey<TObject extends object>(
  value: TObject,
  key: PropertyKey,
): key is keyof TObject {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeOrderItemUpdates(value: unknown) {
  if (value === undefined) {
    return {
      ok: true as const,
      updates: [],
    };
  }

  if (!Array.isArray(value)) {
    return {
      message: "Danh sách món cập nhật không hợp lệ.",
      ok: false as const,
    };
  }

  const updates = [];

  for (const item of value) {
    const id = normalizeId(item?.id);
    const quantity = normalizeEditableQuantity(item?.quantity);

    if (!id || quantity === null) {
      return {
        message: "Thông tin món cập nhật không hợp lệ.",
        ok: false as const,
      };
    }

    updates.push({
      id,
      note: normalizeOptionalText(item?.note),
      quantity,
    });
  }

  return {
    ok: true as const,
    updates,
  };
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

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id: idParam } = await params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json(
      { message: "Mã đơn hàng không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const canUpdateOrder = await hasRole(["ADMIN", "CASHIER"]);

    if (!canUpdateOrder) {
      return NextResponse.json(
        { message: "Bạn không có quyền cập nhật đơn hàng." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { message: "Dữ liệu cập nhật đơn không hợp lệ." },
        { status: 400 },
      );
    }

    const itemUpdates = normalizeOrderItemUpdates(
      hasOwnKey(body, "items") ? body.items : undefined,
    );

    if (!itemUpdates.ok) {
      return NextResponse.json(
        { message: itemUpdates.message },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        note: true,
        status: true,
        invoice: {
          select: {
            id: true,
          },
        },
        items: {
          select: {
            id: true,
            note: true,
            price: true,
            quantity: true,
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

    if (order.status !== OrderStatus.PENDING || order.invoice) {
      return NextResponse.json(
        {
          message:
            "Chỉ có thể cập nhật đơn đang chờ thanh toán tại quầy.",
        },
        { status: 409 },
      );
    }

    const updatePlan = getEditableOrderUpdatePlan({
      currentItems: order.items,
      updates: itemUpdates.updates,
    });

    if (!updatePlan.ok) {
      return NextResponse.json(
        { message: updatePlan.message },
        { status: 400 },
      );
    }

    const nextOrderNote = hasOwnKey(body, "note")
      ? normalizeOptionalText(body.note)
      : order.note;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      for (const itemUpdate of updatePlan.itemUpdates) {
        if (itemUpdate.quantity === 0) {
          await tx.orderItem.deleteMany({
            where: {
              id: itemUpdate.id,
              orderId: id,
            },
          });
          continue;
        }

        await tx.orderItem.updateMany({
          where: {
            id: itemUpdate.id,
            orderId: id,
          },
          data: {
            note: itemUpdate.note,
            quantity: itemUpdate.quantity,
          },
        });
      }

      return tx.order.update({
        where: { id },
        data: {
          note: nextOrderNote,
          totalAmount: updatePlan.totalAmount,
        },
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
    });

    return NextResponse.json({
      message: "Đã cập nhật đơn chờ thanh toán.",
      data: serializeOrder(updatedOrder),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể cập nhật đơn hàng." },
      { status: 500 },
    );
  }
}
