import { OrderStatus, PaymentMethod, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildShiftRevenue,
  createShiftRevenueMonthRange,
  normalizeShiftRevenueMonth,
} from "@/lib/shift-revenue";

const vietnamOffsetMs = 7 * 60 * 60 * 1000;
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

type DashboardSelectedDay = {
  date: string;
  label: string;
  isToday: boolean;
};

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { day, month, year };
}

function formatDateKeyFromParts({
  day,
  month,
  year,
}: {
  day: number;
  month: number;
  year: number;
}) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateLabelFromKey(dateKey: string) {
  const parsedDate = parseDateKey(dateKey);

  if (!parsedDate) {
    return dateKey;
  }

  return `${String(parsedDate.day).padStart(2, "0")}/${String(parsedDate.month).padStart(2, "0")}`;
}

function addDaysToDateKey(dateKey: string, days: number) {
  const parsedDate = parseDateKey(dateKey);

  if (!parsedDate) {
    return dateKey;
  }

  const nextDate = new Date(
    Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day + days),
  );

  return formatDateKeyFromParts({
    day: nextDate.getUTCDate(),
    month: nextDate.getUTCMonth() + 1,
    year: nextDate.getUTCFullYear(),
  });
}

export function normalizeDashboardDate(value: unknown, now = new Date()) {
  if (typeof value === "string" && dateKeyPattern.test(value) && parseDateKey(value)) {
    return value;
  }

  const vietnamNow = new Date(now.getTime() + vietnamOffsetMs);

  return formatDateKeyFromParts({
    day: vietnamNow.getUTCDate(),
    month: vietnamNow.getUTCMonth() + 1,
    year: vietnamNow.getUTCFullYear(),
  });
}

export function createDashboardDayRange(dateKey: string) {
  const parsedDate = parseDateKey(dateKey);

  if (!parsedDate) {
    throw new Error(`Invalid dashboard date: ${dateKey}`);
  }

  const start = new Date(
    Date.UTC(parsedDate.year, parsedDate.month - 1, parsedDate.day) -
      vietnamOffsetMs,
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    date: dateKey,
    end,
    label: formatDateLabelFromKey(dateKey),
    start,
  };
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  QR_PAYMENT: "Thanh toán QR",
};

const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Chờ thanh toán",
  CONFIRMED: "Đã thu tiền",
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
  topTables: Array<{
    tableId: number;
    tableName: string;
    invoiceCount: number;
    revenue: number;
  }>;
  orderStatusStats: Array<{
    status: OrderStatus | string;
    count: number;
  }>;
  recentInvoices: Array<{
    id: number;
    orderId: number;
    sessionId: number | null;
    totalAmount: number;
    paymentMethod: PaymentMethod | string;
    paidAt: string;
    table: {
      id: number;
      name: string;
    };
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

type DashboardShiftRevenue = ReturnType<typeof buildShiftRevenue>;

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
    topTables: [],
    orderStatusStats: [],
    recentInvoices: [],
    recentOrders: [],
  };
}

export function normalizeDashboardDays(value: unknown) {
  const days = typeof value === "number" ? value : Number(value);
  return days === 30 ? 30 : 7;
}

export function buildDashboardSummaryResult({
  dayBuckets,
  rawSummary,
  selectedDay,
  shiftRevenue,
}: {
  dayBuckets: DashboardDayBucket[];
  rawSummary: RawDashboardSummary;
  selectedDay: DashboardSelectedDay;
  shiftRevenue: DashboardShiftRevenue;
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
  const totalPaymentRevenue = rawSummary.paymentStats.reduce(
    (total, item) => total + toNumber(item.revenue),
    0,
  );
  const orderCountByStatus = new Map(
    rawSummary.orderStatusStats.map((item) => [
      item.status,
      toNumber(item.count),
    ]),
  );

  return {
    selectedDate: selectedDay.date,
    selectedDateLabel: selectedDay.label,
    isSelectedToday: selectedDay.isToday,
    todayRevenue: toNumber(rawSummary.todayRevenue),
    todayOrders: toNumber(rawSummary.todayOrders),
    todayPaidOrders: toNumber(rawSummary.todayPaidOrders),
    averageInvoiceValue:
      toNumber(rawSummary.todayPaidOrders) > 0
        ? Math.round(
            toNumber(rawSummary.todayRevenue) /
              toNumber(rawSummary.todayPaidOrders),
          )
        : 0,
    availableProducts: toNumber(rawSummary.availableProducts),
    totalTables: toNumber(rawSummary.totalTables),
    shiftRevenue,
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
        share:
          totalPaymentRevenue > 0 && stats
            ? Math.round((stats.revenue / totalPaymentRevenue) * 100)
            : 0,
      };
    }),
    topTables: rawSummary.topTables.map((table) => ({
      tableId: toNumber(table.tableId),
      tableName: table.tableName,
      invoiceCount: toNumber(table.invoiceCount),
      revenue: toNumber(table.revenue),
    })),
    orderStatusStats: Object.values(OrderStatus).map((status) => {
      return {
        status,
        label: orderStatusLabels[status],
        count: orderCountByStatus.get(status) ?? 0,
      };
    }),
    recentInvoices: rawSummary.recentInvoices.map((invoice) => ({
      id: toNumber(invoice.id),
      orderId: toNumber(invoice.orderId),
      sessionId:
        invoice.sessionId === null || invoice.sessionId === undefined
          ? null
          : toNumber(invoice.sessionId),
      totalAmount: toNumber(invoice.totalAmount),
      paymentMethod: invoice.paymentMethod,
      paidAt: invoice.paidAt,
      table: invoice.table,
    })),
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

export async function getDashboardSummary({
  date,
  days = 7,
  month,
}: {
  date?: string | null;
  days?: number;
  month?: string | null;
} = {}) {
  const chartDays = normalizeDashboardDays(days);
  const todayDateKey = normalizeDashboardDate(null);
  const selectedDateKey = normalizeDashboardDate(date);
  const selectedMonthKey = normalizeShiftRevenueMonth(month);
  const selectedMonthRange = createShiftRevenueMonthRange(selectedMonthKey);
  const selectedRange = createDashboardDayRange(selectedDateKey);
  const chartStartDateKey = addDaysToDateKey(todayDateKey, -(chartDays - 1));
  const chartStart = createDashboardDayRange(chartStartDateKey).start;
  const chartEnd = createDashboardDayRange(todayDateKey).start;
  const start = selectedRange.start;
  const end = selectedRange.end;
  const dayBuckets = Array.from({ length: chartDays }, (_, index) => {
    const dateKey = addDaysToDateKey(chartStartDateKey, index);

    return {
      date: dateKey,
      label: formatDateLabelFromKey(dateKey),
      revenue: 0,
      orderCount: 0,
      paidOrderCount: 0,
    };
  });
  const [rows, shiftInvoices] = await Promise.all([
    prisma.$queryRaw<Array<{ summary: RawDashboardSummary }>>`
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
              to_char(
                bucket.day_start + interval '7 hours',
                'YYYY-MM-DD'
              ) AS date,
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
              ${chartEnd}::timestamp,
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
            INNER JOIN invoices i ON i.order_id = o.id
            INNER JOIN products p ON p.id = oi.product_id
            INNER JOIN categories c ON c.id = p.category_id
            WHERE o.status::text = ${OrderStatus.PAID}
              AND i.paid_at >= ${start}::timestamp
              AND i.paid_at < ${end}::timestamp
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
            WHERE paid_at >= ${start}::timestamp
              AND paid_at < ${end}::timestamp
            GROUP BY payment_method
          ) payment_rows
        ), '[]'::jsonb),
      'topTables',
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'tableId', ranked.table_id,
              'tableName', ranked.table_name,
              'invoiceCount', ranked.invoice_count,
              'revenue', ranked.revenue
            )
            ORDER BY ranked.invoice_count DESC, ranked.revenue DESC, ranked.table_name ASC
          )
          FROM (
            SELECT
              t.id AS table_id,
              t.name AS table_name,
              COUNT(i.id)::int AS invoice_count,
              COALESCE(SUM(i.total_amount), 0)::int AS revenue
            FROM invoices i
            INNER JOIN orders o ON o.id = i.order_id
            INNER JOIN cafe_tables t ON t.id = o.table_id
            WHERE i.paid_at >= ${start}::timestamp
              AND i.paid_at < ${end}::timestamp
            GROUP BY t.id, t.name
            ORDER BY invoice_count DESC, revenue DESC, t.name ASC
            LIMIT 5
          ) ranked
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
            WHERE created_at >= ${start}::timestamp
              AND created_at < ${end}::timestamp
            GROUP BY status
          ) status_rows
        ), '[]'::jsonb),
      'recentInvoices',
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', recent.id,
              'orderId', recent.order_id,
              'sessionId', recent.session_id,
              'totalAmount', recent.total_amount,
              'paymentMethod', recent.payment_method,
              'paidAt', recent.paid_at,
              'table', jsonb_build_object(
                'id', recent.table_id,
                'name', recent.table_name
              )
            )
            ORDER BY recent.paid_at DESC
          )
          FROM (
            SELECT
              i.id,
              i.order_id,
              i.session_id,
              i.total_amount,
              i.payment_method::text AS payment_method,
              to_char(i.paid_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS paid_at,
              t.id AS table_id,
              t.name AS table_name
            FROM invoices i
            INNER JOIN orders o ON o.id = i.order_id
            INNER JOIN cafe_tables t ON t.id = o.table_id
            WHERE i.paid_at >= ${start}::timestamp
              AND i.paid_at < ${end}::timestamp
            ORDER BY i.paid_at DESC
            LIMIT 6
          ) recent
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
            WHERE o.created_at >= ${start}::timestamp
              AND o.created_at < ${end}::timestamp
            ORDER BY o.created_at DESC
            LIMIT 5
          ) recent
        ), '[]'::jsonb)
    ) AS summary
  `,
    prisma.invoice.findMany({
      where: {
        paidAt: {
          gte: selectedMonthRange.start,
          lt: selectedMonthRange.end,
        },
      },
      select: {
        paidAt: true,
        totalAmount: true,
      },
    }),
  ]);
  const rawSummary = rows[0]?.summary ?? createEmptyRawDashboardSummary();
  const shiftRevenue = buildShiftRevenue({
    invoices: shiftInvoices,
    month: selectedMonthKey,
  });

  return buildDashboardSummaryResult({
    rawSummary:
      typeof rawSummary === "string" ? JSON.parse(rawSummary) : rawSummary,
    dayBuckets,
    selectedDay: {
      date: selectedDateKey,
      isToday: selectedDateKey === todayDateKey,
      label: selectedRange.label,
    },
    shiftRevenue,
  });
}
