import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type InvoiceListDateFilter = {
  gte?: Date;
  lt?: Date;
} | null;

export type InvoiceListRow = {
  id: number;
  orderId: number;
  sessionId: number | null;
  totalAmount: number;
  paymentMethod: string;
  paidAt: string;
  createdAt: string;
  order: {
    id: number;
    status: string;
    note: string | null;
    totalAmount: number;
    createdAt: string;
    table: {
      id: number;
      name: string;
    };
    items: Array<{
      id: number;
      productId: number;
      productName: string;
      quantity: number;
      price: number;
      note: string | null;
    }>;
  };
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export function normalizeInvoiceListRows(rows: InvoiceListRow[]) {
  return rows.map((invoice) => ({
    id: toNumber(invoice.id),
    orderId: toNumber(invoice.orderId),
    sessionId:
      invoice.sessionId === null ? null : toNumber(invoice.sessionId),
    totalAmount: toNumber(invoice.totalAmount),
    paymentMethod: invoice.paymentMethod,
    paidAt: invoice.paidAt,
    createdAt: invoice.createdAt,
    order: {
      id: toNumber(invoice.order.id),
      status: invoice.order.status,
      note: invoice.order.note,
      totalAmount: toNumber(invoice.order.totalAmount),
      createdAt: invoice.order.createdAt,
      table: invoice.order.table,
      items: invoice.order.items.map((item) => ({
        id: toNumber(item.id),
        productId: toNumber(item.productId),
        productName: item.productName,
        quantity: toNumber(item.quantity),
        price: toNumber(item.price),
        note: item.note,
      })),
    },
  }));
}

function buildInvoiceWhereClause(paidAtFilter: InvoiceListDateFilter) {
  const conditions = [
    paidAtFilter?.gte
      ? Prisma.sql`i.paid_at >= ${paidAtFilter.gte}`
      : null,
    paidAtFilter?.lt ? Prisma.sql`i.paid_at < ${paidAtFilter.lt}` : null,
  ].filter((condition): condition is Prisma.Sql => condition !== null);

  if (conditions.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

export async function getInvoiceListRows(paidAtFilter: InvoiceListDateFilter) {
  const whereClause = buildInvoiceWhereClause(paidAtFilter);
  const rows = await prisma.$queryRaw<Array<{ data: InvoiceListRow[] }>>`
    SELECT COALESCE(jsonb_agg(invoice_rows.data ORDER BY invoice_rows.paid_at DESC), '[]'::jsonb) AS data
    FROM (
      SELECT
        i.paid_at,
        jsonb_build_object(
          'id', i.id,
          'orderId', i.order_id,
          'sessionId', i.session_id,
          'totalAmount', i.total_amount,
          'paymentMethod', i.payment_method::text,
          'paidAt', to_char(i.paid_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'createdAt', to_char(i.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'order', jsonb_build_object(
            'id', first_order.id,
            'status', first_order.status,
            'note', first_note.note,
            'totalAmount', i.total_amount,
            'createdAt', first_order.created_at,
            'table', jsonb_build_object(
              'id', first_order.table_id,
              'name', first_order.table_name
            ),
            'items', bill_items.items
          )
        ) AS data
      FROM invoices i
      INNER JOIN LATERAL (
        SELECT
          o.id,
          o.status::text AS status,
          to_char(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
          t.id AS table_id,
          t.name AS table_name
        FROM orders o
        INNER JOIN cafe_tables t ON t.id = o.table_id
        WHERE (
          i.session_id IS NOT NULL
          AND o.session_id = i.session_id
          AND o.status::text <> ${OrderStatus.CANCELLED}
        ) OR (
          i.session_id IS NULL
          AND o.id = i.order_id
        )
        ORDER BY o.created_at ASC
        LIMIT 1
      ) first_order ON true
      LEFT JOIN LATERAL (
        SELECT o.note
        FROM orders o
        WHERE (
          i.session_id IS NOT NULL
          AND o.session_id = i.session_id
          AND o.status::text <> ${OrderStatus.CANCELLED}
          AND o.note IS NOT NULL
        ) OR (
          i.session_id IS NULL
          AND o.id = i.order_id
          AND o.note IS NOT NULL
        )
        ORDER BY o.created_at ASC
        LIMIT 1
      ) first_note ON true
      INNER JOIN LATERAL (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', oi.id,
              'productId', oi.product_id,
              'productName', p.name,
              'quantity', oi.quantity,
              'price', oi.price,
              'note', oi.note
            )
            ORDER BY bill_order.created_at ASC, oi.id ASC
          ),
          '[]'::jsonb
        ) AS items
        FROM orders bill_order
        INNER JOIN order_items oi ON oi.order_id = bill_order.id
        INNER JOIN products p ON p.id = oi.product_id
        WHERE (
          i.session_id IS NOT NULL
          AND bill_order.session_id = i.session_id
          AND bill_order.status::text <> ${OrderStatus.CANCELLED}
        ) OR (
          i.session_id IS NULL
          AND bill_order.id = i.order_id
        )
      ) bill_items ON true
      ${whereClause}
      ORDER BY i.paid_at DESC
    ) invoice_rows
  `;

  const data = rows[0]?.data ?? [];
  return normalizeInvoiceListRows(
    typeof data === "string" ? JSON.parse(data) : data,
  );
}
