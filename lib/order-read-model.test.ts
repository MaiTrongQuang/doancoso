import { strict as assert } from "node:assert";
import { OrderStatus } from "@prisma/client";
import {
  buildOrderListQuery,
  serializeOrdersGroupedBySessionSummary,
  serializeOrdersGroupedBySession,
} from "./order-read-model";

const baseQuery = buildOrderListQuery({
  statuses: [OrderStatus.PENDING, OrderStatus.CONFIRMED],
  dateRange: null,
  groupBySession: false,
});

assert.deepEqual(baseQuery.where.status, {
  in: [OrderStatus.PENDING, OrderStatus.CONFIRMED],
});
assert.equal("session" in baseQuery.include, false);
assert.equal("items" in baseQuery.include, true);

const groupedQuery = buildOrderListQuery({
  statuses: [OrderStatus.SERVED],
  dateRange: {
    start: new Date("2026-06-01T00:00:00.000+07:00"),
    end: new Date("2026-06-02T00:00:00.000+07:00"),
  },
  groupBySession: true,
});

assert.equal("session" in groupedQuery.include, true);
assert.deepEqual(groupedQuery.where.createdAt, {
  gte: new Date("2026-06-01T00:00:00.000+07:00"),
  lt: new Date("2026-06-02T00:00:00.000+07:00"),
});

const createdAt = new Date("2026-06-01T10:00:00.000+07:00");
const updatedAt = new Date("2026-06-01T10:05:00.000+07:00");
const groupedOrders = serializeOrdersGroupedBySession([
  {
    id: 1,
    sessionId: 10,
    status: OrderStatus.SERVED,
    totalAmount: 20_000,
    note: null,
    createdAt,
    updatedAt,
    table: { id: 1, name: "Ban 1" },
    session: {
      id: 10,
      orders: [{ status: OrderStatus.SERVED }, { status: OrderStatus.SERVED }],
    },
    items: [
      {
        id: 1,
        productId: 1,
        quantity: 1,
        price: 20_000,
        note: null,
        product: { id: 1, name: "Coffee" },
      },
    ],
  },
  {
    id: 2,
    sessionId: 10,
    status: OrderStatus.SERVED,
    totalAmount: 30_000,
    note: "Less ice",
    createdAt: new Date("2026-06-01T10:02:00.000+07:00"),
    updatedAt,
    table: { id: 1, name: "Ban 1" },
    session: {
      id: 10,
      orders: [{ status: OrderStatus.SERVED }, { status: OrderStatus.SERVED }],
    },
    items: [
      {
        id: 2,
        productId: 2,
        quantity: 1,
        price: 30_000,
        note: null,
        product: { id: 2, name: "Tea" },
      },
    ],
  },
]);

assert.equal(groupedOrders.length, 1);
assert.equal(groupedOrders[0].sessionId, 10);
assert.equal(groupedOrders[0].totalAmount, 50_000);
assert.equal(groupedOrders[0].note, "Less ice");
assert.deepEqual(
  groupedOrders[0].items.map((item) => item.productName),
  ["Coffee", "Tea"],
);

const summaryQuery = buildOrderListQuery({
  statuses: [OrderStatus.PENDING],
  dateRange: null,
  groupBySession: false,
  detail: "summary",
});

assert.equal("select" in summaryQuery, true);
assert.equal("include" in summaryQuery, false);
assert.equal("items" in summaryQuery.select, false);
assert.deepEqual(summaryQuery.select.table, {
  select: {
    id: true,
    name: true,
  },
});

const groupedSummaryOrders = serializeOrdersGroupedBySessionSummary([
  {
    id: 3,
    sessionId: 11,
    status: OrderStatus.SERVED,
    totalAmount: 45_000,
    note: null,
    createdAt,
    updatedAt,
    table: { id: 2, name: "Ban 2" },
    session: {
      id: 11,
      orders: [{ status: OrderStatus.SERVED }, { status: OrderStatus.SERVED }],
    },
  },
  {
    id: 4,
    sessionId: 11,
    status: OrderStatus.SERVED,
    totalAmount: 15_000,
    note: "No sugar",
    createdAt: new Date("2026-06-01T10:03:00.000+07:00"),
    updatedAt: new Date("2026-06-01T10:06:00.000+07:00"),
    table: { id: 2, name: "Ban 2" },
    session: {
      id: 11,
      orders: [{ status: OrderStatus.SERVED }, { status: OrderStatus.SERVED }],
    },
  },
]);

assert.equal(groupedSummaryOrders.length, 1);
assert.equal(groupedSummaryOrders[0].id, 3);
assert.equal(groupedSummaryOrders[0].sessionId, 11);
assert.equal(groupedSummaryOrders[0].totalAmount, 60_000);
assert.equal(groupedSummaryOrders[0].note, "No sugar");
assert.equal(groupedSummaryOrders[0].updatedAt, "2026-06-01T03:06:00.000Z");
assert.equal("items" in groupedSummaryOrders[0], false);
