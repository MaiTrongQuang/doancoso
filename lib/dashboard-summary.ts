import { OrderStatus, PaymentMethod, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${day}/${month}`;
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  QR_PAYMENT: "QR Payment",
};

const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Đơn mới",
  CONFIRMED: "Đã xác nhận",
  PREPARING: "Đang chuẩn bị",
  SERVED: "Đã phục vụ",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
};

type DashboardDayBucket = {
  date: string;
  label: string;
  revenue: number;
  orderCount: number;
  paidOrderCount: number;
};

type RawDashboardSummary = {
  todayRevenue: number;
  todayOrders: number;
  todayPaidOrders: number;
  availableProducts: number;
  totalTables: number;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    orderCount: number;
    paidOrderCount: number;
  }>;
  topProducts: Array<{
    productId: number;
    productName: string;
    categoryName: string;
    quantity: number;
    revenue: number;
  }>;
  paymentStats: Array<{
    paymentMethod: PaymentMethod | string;
    invoiceCount: number;
    revenue: number;
  }>;
  orderStatusStats: Array<{
    status: OrderStatus | string;
    count: number;
  }>;
  recentOrders: Array<{
    id: number;
    status: OrderStatus | string;
    totalAmount: number;
    note: string | null;
    createdAt: string;
    table: {
      id: number;
      name: string;
    };
    itemCount: number;
  }>;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function createEmptyRawDashboardSummary(): RawDashboardSummary {
  return {
    todayRevenue: 0,
    todayOrders: 0,
    todayPaidOrders: 0,
    availableProducts: 0,
    totalTables: 0,
    dailyRevenue: [],
    topProducts: [],
    paymentStats: [],
    orderStatusStats: [],
    recentOrders: [],
  };
}

export function buildDashboardSummaryResult({
  dayBuckets,
  rawSummary,
}: {
  dayBuckets: DashboardDayBucket[];
  rawSummary: RawDashboardSummary;
}) {
  const dailyRevenueByDate = new Map(
    rawSummary.dailyRevenue.map((item) => [item.date, item]),
  );
  const paymentStatsByMethod = new Map(
    rawSummary.paymentStats.map((item) => [
      item.paymentMethod,
      {
        invoiceCount: toNumber(item.invoiceCount),
        revenue: toNumber(item.revenue),
      },
    ]),
  );
  const orderCountByStatus = new Map(
    rawSummary.orderStatusStats.map((item) => [
      item.status,
      toNumber(item.count),
    ]),
  );

  return {
    todayRevenue: toNumber(rawSummary.todayRevenue),
    todayOrders: toNumber(rawSummary.todayOrders),
    todayPaidOrders: toNumber(rawSummary.todayPaidOrders),
    availableProducts: toNumber(rawSummary.availableProducts),
    totalTables: toNumber(rawSummary.totalTables),
    dailyRevenue: dayBuckets.map((bucket) => {
      const rawBucket = dailyRevenueByDate.get(bucket.date);

      return {
        ...bucket,
        revenue: toNumber(rawBucket?.revenue),
        orderCount: toNumber(rawBucket?.orderCount),
        paidOrderCount: toNumber(rawBucket?.paidOrderCount),
      };
    }),
    topProducts: rawSummary.topProducts.map((product) => ({
      productId: toNumber(product.productId),
      productName: product.productName,
      categoryName: product.categoryName,
      quantity: toNumber(product.quantity),
      revenue: toNumber(product.revenue),
    })),
    paymentStats: Object.values(PaymentMethod).map((paymentMethod) => {
      const stats = paymentStatsByMethod.get(paymentMethod);

      return {
        paymentMethod,
        label: paymentMethodLabels[paymentMethod],
        invoiceCount: stats?.invoiceCount ?? 0,
        revenue: stats?.revenue ?? 0,
      };
    }),
    orderStatusStats: Object.values(OrderStatus).map((status) => {
      return {
        status,
        label: orderStatusLabels[status],
        count: orderCountByStatus.get(status) ?? 0,
      };
    }),
    recentOrders: rawSummary.recentOrders.map((order) => ({
      id: toNumber(order.id),
      status: order.status,
      totalAmount: toNumber(order.totalAmount),
      note: order.note,
      createdAt: order.createdAt,
      table: order.table,
      itemCount: toNumber(order.itemCount),
    })),
  };
}

export async function getDashboardSummary() {
  const { start } = getTodayRange();
  const chartStart = addDays(start, -6);
  const dayBuckets = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(chartStart, index);

    return {
      date: formatDateKey(date),
      label: formatDateLabel(date),
      revenue: 0,
      orderCount: 0,
      paidOrderCount: 0,
    };
  });
  const end = addDays(start, 1);
  const rows = await prisma.$queryRaw<Array<{ summary: RawDashboardSummary }>>`
    SELECT jsonb_build_object(
      'todayRevenue',
        COALESCE((
          SELECT SUM(total_amount)::int
          FROM invoices
          WHERE paid_at >= ${start}::timestamp
            AND paid_at < ${end}::timestamp
        ), 0),
      'todayOrders',
        COALESCE((
          SELECT COUNT(*)::int
          FROM orders
          WHERE created_at >= ${start}::timestamp
            AND created_at < ${end}::timestamp
        ), 0),
      'todayPaidOrders',
        COALESCE((
          SELECT COUNT(*)::int
          FROM invoices
          WHERE paid_at >= ${start}::timestamp
            AND paid_at < ${end}::timestamp
        ), 0),
      'availableProducts',
        COALESCE((
          SELECT COUNT(*)::int
          FROM products
          WHERE status::text = ${ProductStatus.AVAILABLE}
        ), 0),
      'totalTables',
        COALESCE((SELECT COUNT(*)::int FROM cafe_tables), 0),
      'dailyRevenue',
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'date', daily.date,
              'revenue', daily.revenue,
              'orderCount', daily.order_count,
              'paidOrderCount', daily.paid_order_count
            )
            ORDER BY daily.day_start
          )
          FROM (
            SELECT
              bucket.day_start,
              to_char(bucket.day_start, 'YYYY-MM-DD') AS date,
              COALESCE((
                SELECT SUM(total_amount)::int
                FROM invoices
                WHERE paid_at >= bucket.day_start
                  AND paid_at < bucket.day_start + interval '1 day'
              ), 0) AS revenue,
              COALESCE((
                SELECT COUNT(*)::int
                FROM orders
                WHERE created_at >= bucket.day_start
                  AND created_at < bucket.day_start + interval '1 day'
              ), 0) AS order_count,
              COALESCE((
                SELECT COUNT(*)::int
                FROM invoices
                WHERE paid_at >= bucket.day_start
                  AND paid_at < bucket.day_start + interval '1 day'
              ), 0) AS paid_order_count
            FROM generate_series(
              ${chartStart}::timestamp,
              ${start}::timestamp,
              interval '1 day'
            ) AS bucket(day_start)
          ) daily
        ), '[]'::jsonb),
      'topProducts',
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'productId', ranked.product_id,
              'productName', ranked.product_name,
              'categoryName', ranked.category_name,
              'quantity', ranked.quantity,
              'revenue', ranked.revenue
            )
            ORDER BY ranked.quantity DESC, ranked.revenue DESC, ranked.product_name ASC
          )
          FROM (
            SELECT
              p.id AS product_id,
              p.name AS product_name,
              c.name AS category_name,
              SUM(oi.quantity)::int AS quantity,
              SUM(oi.price * oi.quantity)::int AS revenue
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            INNER JOIN products p ON p.id = oi.product_id
            INNER JOIN categories c ON c.id = p.category_id
            WHERE o.status::text = ${OrderStatus.PAID}
            GROUP BY p.id, p.name, c.name
            ORDER BY quantity DESC, revenue DESC, p.name ASC
            LIMIT 5
          ) ranked
        ), '[]'::jsonb),
      'paymentStats',
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'paymentMethod', payment_method::text,
              'invoiceCount', invoice_count,
              'revenue', revenue
            )
            ORDER BY payment_method::text
          )
          FROM (
            SELECT
              payment_method,
              COUNT(*)::int AS invoice_count,
              COALESCE(SUM(total_amount), 0)::int AS revenue
            FROM invoices
            GROUP BY payment_method
          ) payment_rows
        ), '[]'::jsonb),
      'orderStatusStats',
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'status', status::text,
              'count', order_count
            )
            ORDER BY status::text
          )
          FROM (
            SELECT status, COUNT(*)::int AS order_count
            FROM orders
            GROUP BY status
          ) status_rows
        ), '[]'::jsonb),
      'recentOrders',
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', recent.id,
              'status', recent.status,
              'totalAmount', recent.total_amount,
              'note', recent.note,
              'createdAt', recent.created_at,
              'table', jsonb_build_object(
                'id', recent.table_id,
                'name', recent.table_name
              ),
              'itemCount', recent.item_count
            )
            ORDER BY recent.created_at DESC
          )
          FROM (
            SELECT
              o.id,
              o.status::text AS status,
              o.total_amount,
              o.note,
              to_char(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
              t.id AS table_id,
              t.name AS table_name,
              (
                SELECT COUNT(*)::int
                FROM order_items oi
                WHERE oi.order_id = o.id
              ) AS item_count
            FROM orders o
            INNER JOIN cafe_tables t ON t.id = o.table_id
            ORDER BY o.created_at DESC
            LIMIT 5
          ) recent
        ), '[]'::jsonb)
    ) AS summary
  `;
  const rawSummary = rows[0]?.summary ?? createEmptyRawDashboardSummary();

  return buildDashboardSummaryResult({
    rawSummary:
      typeof rawSummary === "string" ? JSON.parse(rawSummary) : rawSummary,
    dayBuckets,
  });
}
