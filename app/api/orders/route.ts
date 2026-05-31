import { NextResponse } from "next/server";
import { OrderStatus, ProductStatus, TableStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/server-auth";

const orderStatuses = new Set<string>(Object.values(OrderStatus));

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

function normalizeStatuses(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((status) => status.trim().toUpperCase())
    .filter((status): status is OrderStatus => orderStatuses.has(status));
}

function getVietnamDateRange(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const start = new Date(`${value}T00:00:00.000+07:00`);

  if (Number.isNaN(start.getTime())) {
    return null;
  }

  return {
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
}

export async function GET(request: Request) {
  try {
    const canReadOrders = await hasRole(["ADMIN", "STAFF", "CASHIER"]);

    if (!canReadOrders) {
      return NextResponse.json(
        { message: "Ban khong co quyen xem don hang." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const statuses = normalizeStatuses(
      searchParams.get("statuses") ?? searchParams.get("status"),
    );
    const dateRange = getVietnamDateRange(searchParams.get("date"));

    const orders = await prisma.order.findMany({
      where: {
        ...(statuses.length > 0
          ? {
              status: {
                in: statuses,
              },
            }
          : {}),
        ...(dateRange
          ? {
              createdAt: {
                gte: dateRange.start,
                lt: dateRange.end,
              },
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
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

    return NextResponse.json({
      data: orders.map(serializeOrder),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tải danh sách đơn hàng." },
      { status: 500 },
    );
  }
}

function normalizeId(value: unknown) {
  const id = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeQuantity(value: unknown) {
  const quantity =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return null;
  }

  return Math.min(quantity, 99);
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  return text.length > 0 ? text : null;
}

type IncomingOrderItem = {
  productId: number;
  quantity: number;
  note: string | null;
};

function normalizeItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const itemMap = new Map<number, IncomingOrderItem>();

  for (const item of value) {
    const productId = normalizeId(item?.productId);
    const quantity = normalizeQuantity(item?.quantity);

    if (!productId || !quantity) {
      continue;
    }

    const currentItem = itemMap.get(productId);

    if (currentItem) {
      currentItem.quantity = Math.min(currentItem.quantity + quantity, 99);
      continue;
    }

    itemMap.set(productId, {
      productId,
      quantity,
      note: normalizeOptionalText(item?.note),
    });
  }

  return Array.from(itemMap.values());
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const tableId = normalizeId(body?.tableId);
    const note = normalizeOptionalText(body?.note);
    const items = normalizeItems(body?.items);

    if (!tableId) {
      return NextResponse.json(
        { message: "Ma ban khong hop le." },
        { status: 400 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { message: "Vui long chon it nhat mot mon." },
        { status: 400 },
      );
    }

    const productIds = items.map((item) => item.productId);
    const [table, products] = await Promise.all([
      prisma.cafeTable.findUnique({
        where: { id: tableId },
      }),
      prisma.product.findMany({
        where: {
          id: {
            in: productIds,
          },
          status: ProductStatus.AVAILABLE,
        },
        select: {
          id: true,
          price: true,
          name: true,
        },
      }),
    ]);

    if (!table) {
      return NextResponse.json(
        { message: "Ban khong ton tai." },
        { status: 404 },
      );
    }

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { message: "Mot so mon da ngung ban hoac khong ton tai." },
        { status: 400 },
      );
    }

    const productById = new Map(products.map((product) => [product.id, product]));
    const orderItems = items.map((item) => {
      const product = productById.get(item.productId);

      if (!product) {
        throw new Error("Product was validated but not found.");
      }

      return {
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        note: item.note,
      };
    });
    const totalAmount = orderItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          tableId,
          status: OrderStatus.CONFIRMED,
          totalAmount,
          note,
          items: {
            create: orderItems,
          },
        },
        include: {
          table: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
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

      await tx.cafeTable.update({
        where: { id: tableId },
        data: {
          status: TableStatus.OCCUPIED,
        },
      });

      return createdOrder;
    });

    return NextResponse.json(
      {
        message:
          "Đã gửi đơn thành công. Bếp đã nhận đơn và sẽ chuẩn bị theo thứ tự.",
        data: {
          id: order.id,
          table: order.table,
          status: order.status,
          totalAmount: order.totalAmount,
          note: order.note,
          items: order.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            productName: item.product.name,
            quantity: item.quantity,
            price: item.price,
            note: item.note,
          })),
          createdAt: order.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tạo đơn hàng." },
      { status: 500 },
    );
  }
}
