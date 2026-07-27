import { NextResponse } from "next/server";
import {
  DiningSessionStatus,
  OrderStatus,
  TableStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/server-auth";
import { resolveCustomerOrderSession } from "@/lib/customer-order-session";
import { canAcceptQrOrderForTable } from "@/lib/table-session-flow";
import {
  buildOrderListQuery,
  serializeOrder,
  serializeOrderSummary,
  serializeOrdersGroupedBySessionSummary,
  serializeOrdersGroupedBySession,
} from "@/lib/order-read-model";
import { serializeCustomerSubmittedOrder } from "@/lib/customer-order-submit";
import { getOrderPaymentReferenceNumber } from "@/lib/order-payment-reference";
import { hashTableQrToken, isValidTableQrToken } from "@/lib/table-qr";
import { transitionOrderStatusInTransaction } from "@/lib/order-workflow";

const orderStatuses = new Set<string>(Object.values(OrderStatus));

type CustomerOrderContext = {
  tableId: number;
  tableStatus: TableStatus;
};

class CustomerOrderError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 400 | 404 | 409,
  ) {
    super(message);
    this.name = "CustomerOrderError";
  }
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
    const canReadOrders = await hasRole([
      "ADMIN",
      "STAFF",
      "CASHIER",
      "BARISTA",
      "SERVER",
    ]);

    if (!canReadOrders) {
      return NextResponse.json(
        { message: "Bạn không có quyền xem đơn hàng." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const statuses = normalizeStatuses(
      searchParams.get("statuses") ?? searchParams.get("status"),
    );
    const dateRange = getVietnamDateRange(searchParams.get("date"));
    const groupBySession = searchParams.get("groupBySession") === "true";
    const detail = searchParams.get("view") === "summary" ? "summary" : "full";

    if (groupBySession) {
      if (detail === "summary") {
        const orders = await prisma.order.findMany(
          buildOrderListQuery({
            statuses,
            dateRange,
            groupBySession: true,
            detail: "summary",
          }),
        );

        return NextResponse.json({
          data: serializeOrdersGroupedBySessionSummary(orders),
        });
      }

      const orders = await prisma.order.findMany(
        buildOrderListQuery({
          statuses,
          dateRange,
          groupBySession: true,
        }),
      );

      return NextResponse.json({
        data: serializeOrdersGroupedBySession(orders),
      });
    }

    if (detail === "summary") {
      const orders = await prisma.order.findMany(
        buildOrderListQuery({
          statuses,
          dateRange,
          groupBySession: false,
          detail: "summary",
        }),
      );

      return NextResponse.json({
        data: orders.map(serializeOrderSummary),
      });
    }

    const orders = await prisma.order.findMany(
      buildOrderListQuery({
        statuses,
        dateRange,
        groupBySession: false,
      }),
    );

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

async function getCustomerOrderContext(qrToken: string) {
  if (!isValidTableQrToken(qrToken)) {
    return null;
  }

  const qrConfig = await prisma.qrConfig.findFirst({
    where: {
      tokenHash: hashTableQrToken(qrToken),
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: {
      table: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!qrConfig) {
    return null;
  }

  return {
    tableId: qrConfig.table.id,
    tableStatus: qrConfig.table.status,
  } satisfies CustomerOrderContext;
}

async function createCustomerOrder({
  note,
  items,
  qrToken,
  tableId,
  sessionId,
  idempotencyKey,
}: {
  note: string | null;
  items: IncomingOrderItem[];
  qrToken: string;
  tableId: number;
  sessionId: number | null;
  idempotencyKey: string;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM cafe_tables WHERE id = ${tableId} FOR UPDATE`;

    const existingOrder = await tx.order.findUnique({
      where: { idempotencyKey },
      select: {
        id: true,
        sessionId: true,
        status: true,
        totalAmount: true,
      },
    });

    if (existingOrder) {
      return { ...existingOrder, reused: true };
    }

    const activeQrConfig = await tx.qrConfig.findFirst({
      where: {
        tableId,
        tokenHash: hashTableQrToken(qrToken),
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true },
    });

    if (!activeQrConfig) {
      throw new CustomerOrderError(
        "Mã QR bàn đã được thay mới. Vui lòng quét lại mã tại bàn.",
        409,
      );
    }

    const table = await tx.cafeTable.findUnique({
      where: { id: tableId },
      select: {
        status: true,
        sessions: {
          where: { status: DiningSessionStatus.OPEN },
          orderBy: { startedAt: "desc" },
          take: 1,
          select: { id: true },
        },
      },
    });

    if (!table) {
      throw new CustomerOrderError("Bàn không tồn tại.", 404);
    }

    if (!canAcceptQrOrderForTable(table.status)) {
      throw new CustomerOrderError(
        "Bàn này đang được đặt trước. Vui lòng liên hệ nhân viên.",
        409,
      );
    }

    const sessionResolution = resolveCustomerOrderSession(
      sessionId,
      table.sessions[0]?.id ?? null,
    );

    if (sessionResolution.kind === "CONFLICT") {
      throw new CustomerOrderError(
        "Phiên gọi món không còn hiệu lực. Vui lòng quét lại mã QR tại bàn.",
        409,
      );
    }

    const activeSessionId =
      sessionResolution.kind === "USE"
        ? sessionResolution.sessionId
        : (
            await tx.diningSession.create({
              data: {
                tableId,
                status: DiningSessionStatus.OPEN,
              },
              select: { id: true },
            })
          ).id;

    // Lock product rows before checking availability so a stale customer menu
    // cannot win a race against an admin marking a product unavailable.
    for (const item of items) {
      await tx.$queryRaw`
        SELECT id
        FROM products
        WHERE id = ${item.productId}
        FOR UPDATE
      `;
    }

    const products = await tx.product.findMany({
      where: {
        id: { in: items.map((item) => item.productId) },
        status: "AVAILABLE",
      },
      select: { id: true, price: true },
    });

    if (products.length !== new Set(items.map((item) => item.productId)).size) {
      throw new CustomerOrderError(
        "Một số món đã ngừng bán hoặc không tồn tại.",
        400,
      );
    }

    const productById = new Map(products.map((product) => [product.id, product]));
    const totalAmount = items.reduce(
      (total, item) => total + productById.get(item.productId)!.price * item.quantity,
      0,
    );

    const order = await tx.order.create({
      data: {
        tableId,
        sessionId: activeSessionId,
        idempotencyKey,
        status: OrderStatus.PENDING,
        totalAmount,
        note,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: productById.get(item.productId)!.price,
            note: item.note,
          })),
        },
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: OrderStatus.PENDING,
            reason: "Khách gửi đơn từ QR tại bàn.",
          },
        },
      },
      select: {
        id: true,
        sessionId: true,
        status: true,
        totalAmount: true,
      },
    });

    // Sending from the customer menu is the system event that moves the
    // order from creation into the kitchen queue.
    const submittedOrder = await transitionOrderStatusInTransaction(tx, {
      orderId: order.id,
      actorUserId: null,
      actorRole: "SYSTEM",
      nextStatus: OrderStatus.CONFIRMED,
    });

    await tx.cafeTable.update({
      where: { id: tableId },
      data: { status: TableStatus.OCCUPIED },
    });

    return { ...order, status: submittedOrder.status, reused: false };
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const qrToken = typeof body?.qrToken === "string" ? body.qrToken.trim() : "";
    const sessionId = normalizeId(body?.sessionId);
    const note = normalizeOptionalText(body?.note);
    const items = normalizeItems(body?.items);
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";

    if (!isValidTableQrToken(qrToken)) {
      return NextResponse.json(
        { message: "Mã QR bàn không hợp lệ hoặc đã hết hiệu lực." },
        { status: 400 },
      );
    }

    if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
      return NextResponse.json(
        { message: "Thiếu mã yêu cầu để chống tạo đơn trùng." },
        { status: 400 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { message: "Vui lòng chọn ít nhất một món." },
        { status: 400 },
      );
    }

    const orderContext = await getCustomerOrderContext(qrToken);

    if (!orderContext) {
      return NextResponse.json(
        { message: "Bàn không tồn tại." },
        { status: 404 },
      );
    }

    if (!canAcceptQrOrderForTable(orderContext.tableStatus)) {
      return NextResponse.json(
        {
          message: "Bàn này đang được đặt trước. Vui lòng liên hệ nhân viên.",
        },
        { status: 409 },
      );
    }

    const order = await createCustomerOrder({
      note,
      items,
      qrToken,
      tableId: orderContext.tableId,
      sessionId,
      idempotencyKey,
    });

    return NextResponse.json(
      {
        message: order.reused
          ? `Đơn #${getOrderPaymentReferenceNumber(order)} đã được ghi nhận trước đó.`
          : `Đã gửi đơn #${getOrderPaymentReferenceNumber(order)}. Quán sẽ chuẩn bị món và thu tiền sau khi phục vụ.`,
        data: serializeCustomerSubmittedOrder(order),
      },
      { status: order.reused ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof CustomerOrderError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode },
      );
    }

    console.error(error);

    return NextResponse.json(
      { message: "Không thể tạo đơn hàng." },
      { status: 500 },
    );
  }
}
