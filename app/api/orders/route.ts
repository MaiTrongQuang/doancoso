import { NextResponse } from "next/server";
import {
  DiningSessionStatus,
  OrderStatus,
  Prisma,
  ProductStatus,
  TableStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/server-auth";
import {
  canAcceptQrOrderForTable,
  canUseDiningSessionForOrder,
} from "@/lib/table-session-flow";
import {
  buildOrderListQuery,
  serializeOrder,
  serializeOrderSummary,
  serializeOrdersGroupedBySessionSummary,
  serializeOrdersGroupedBySession,
} from "@/lib/order-read-model";
import {
  buildCustomerOrderDraft,
  getCustomerOrderPaymentLabel,
  serializeCustomerSubmittedOrder,
} from "@/lib/customer-order-submit";

const orderStatuses = new Set<string>(Object.values(OrderStatus));

type CustomerOrderContext = {
  tableId: number;
  tableStatus: TableStatus;
  activeSessionId: number | null;
  products: Array<{
    id: number;
    price: number;
  }>;
};

type CustomerOrderItemDraft = {
  productId: number;
  quantity: number;
  price: number;
  note: string | null;
};

type CreatedCustomerOrder = {
  id: number;
  sessionId: number | null;
  status: OrderStatus;
  totalAmount: number;
};

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

async function getCustomerOrderContext(tableId: number, productIds: number[]) {
  const rows = await prisma.$queryRaw<CustomerOrderContext[]>(
    Prisma.sql`
      WITH requested_products AS (
        SELECT
          p.id,
          p.price
        FROM products p
        WHERE
          p.id IN (${Prisma.join(productIds)})
          AND p.status = ${ProductStatus.AVAILABLE}::product_status
      )
      SELECT
        t.id AS "tableId",
        t.status::text AS "tableStatus",
        (
          SELECT ds.id
          FROM dining_sessions ds
          WHERE
            ds.table_id = t.id
            AND ds.status = ${DiningSessionStatus.OPEN}::dining_session_status
          ORDER BY ds.started_at DESC
          LIMIT 1
        ) AS "activeSessionId",
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', requested_products.id,
                'price', requested_products.price
              )
            )
            FROM requested_products
          ),
          '[]'::json
        ) AS products
      FROM cafe_tables t
      WHERE t.id = ${tableId}
      LIMIT 1
    `,
  );

  return rows[0] ?? null;
}

async function createCustomerOrder({
  note,
  orderItems,
  tableId,
  totalAmount,
}: {
  note: string | null;
  orderItems: CustomerOrderItemDraft[];
  tableId: number;
  totalAmount: number;
}) {
  const itemValues = Prisma.join(
    orderItems.map(
      (item) =>
        Prisma.sql`(${item.productId}, ${item.quantity}, ${item.price}, ${item.note}::text)`,
    ),
  );
  const rows = await prisma.$queryRaw<CreatedCustomerOrder[]>(
    Prisma.sql`
      WITH locked_table AS (
        SELECT id
        FROM cafe_tables
        WHERE id = ${tableId}
        FOR UPDATE
      ),
      current_session AS (
        SELECT ds.id
        FROM dining_sessions ds
        JOIN locked_table ON locked_table.id = ds.table_id
        WHERE ds.status = ${DiningSessionStatus.OPEN}::dining_session_status
        ORDER BY ds.started_at DESC
        LIMIT 1
      ),
      new_session AS (
        INSERT INTO dining_sessions (
          table_id,
          status,
          started_at,
          created_at,
          updated_at
        )
        SELECT
          locked_table.id,
          ${DiningSessionStatus.OPEN}::dining_session_status,
          NOW(),
          NOW(),
          NOW()
        FROM locked_table
        WHERE NOT EXISTS (SELECT 1 FROM current_session)
        RETURNING id
      ),
      session_row AS (
        SELECT id FROM current_session
        UNION ALL
        SELECT id FROM new_session
        LIMIT 1
      ),
      created_order AS (
        INSERT INTO orders (
          table_id,
          session_id,
          status,
          total_amount,
          note,
          created_at,
          updated_at
        )
        SELECT
          locked_table.id,
          session_row.id,
          ${OrderStatus.PENDING}::order_status,
          ${totalAmount},
          ${note},
          NOW(),
          NOW()
        FROM locked_table
        CROSS JOIN session_row
        RETURNING
          id,
          session_id AS "sessionId",
          status::text AS status,
          total_amount AS "totalAmount"
      ),
      inserted_items AS (
        INSERT INTO order_items (
          order_id,
          product_id,
          quantity,
          price,
          note
        )
        SELECT
          created_order.id,
          item.product_id::integer,
          item.quantity::integer,
          item.price::integer,
          item.note::text
        FROM created_order
        CROSS JOIN (VALUES ${itemValues}) AS item(
          product_id,
          quantity,
          price,
          note
        )
        RETURNING id
      ),
      updated_table AS (
        UPDATE cafe_tables
        SET
          status = ${TableStatus.OCCUPIED}::table_status,
          updated_at = NOW()
        FROM locked_table
        WHERE
          cafe_tables.id = locked_table.id
          AND cafe_tables.status <> ${TableStatus.OCCUPIED}::table_status
        RETURNING cafe_tables.id
      )
      SELECT
        id,
        "sessionId",
        status,
        "totalAmount"
      FROM created_order
      LIMIT 1
    `,
  );

  if (!rows[0]) {
    throw new Error("Unable to create customer order.");
  }

  return rows[0];
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const tableId = normalizeId(body?.tableId);
    const sessionId = normalizeId(body?.sessionId);
    const note = normalizeOptionalText(body?.note);
    const items = normalizeItems(body?.items);

    if (!tableId) {
      return NextResponse.json(
        { message: "Mã bàn không hợp lệ." },
        { status: 400 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { message: "Vui lòng chọn ít nhất một món." },
        { status: 400 },
      );
    }

    const productIds = items.map((item) => item.productId);
    const orderContext = await getCustomerOrderContext(tableId, productIds);

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

    if (
      !canUseDiningSessionForOrder(
        sessionId,
        orderContext.activeSessionId ?? null,
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Phiên gọi món không còn hiệu lực. Vui lòng quét lại mã QR tại bàn.",
        },
        { status: 409 },
      );
    }

    if (orderContext.products.length !== productIds.length) {
      return NextResponse.json(
        { message: "Một số món đã ngừng bán hoặc không tồn tại." },
        { status: 400 },
      );
    }

    const { orderItems, totalAmount } = buildCustomerOrderDraft({
      items,
      products: orderContext.products,
    });
    const order = await createCustomerOrder({
      note,
      orderItems,
      tableId,
      totalAmount,
    });

    return NextResponse.json(
      {
        message: `Đã gửi đơn. Mang mã ${getCustomerOrderPaymentLabel(order)} ra quầy để thanh toán và quán chuyển món sang pha chế.`,
        data: serializeCustomerSubmittedOrder(order),
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
