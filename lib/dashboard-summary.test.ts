import { strict as assert } from "node:assert";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import {
  buildDashboardSummaryResult,
  createDashboardDayRange,
  normalizeDashboardDate,
} from "./dashboard-summary";

const vietnamEarlyMorning = new Date("2026-06-12T20:53:00.000Z");
const todayRange = createDashboardDayRange(
  normalizeDashboardDate(null, vietnamEarlyMorning),
);

assert.equal(todayRange.date, "2026-06-13");
assert.equal(todayRange.label, "13/06");
assert.equal(todayRange.start.toISOString(), "2026-06-12T17:00:00.000Z");
assert.equal(todayRange.end.toISOString(), "2026-06-13T17:00:00.000Z");
assert.equal(normalizeDashboardDate("2026-06-01", vietnamEarlyMorning), "2026-06-01");
assert.equal(normalizeDashboardDate("bad-date", vietnamEarlyMorning), "2026-06-13");

const result = buildDashboardSummaryResult({
  selectedDay: {
    date: "2026-06-01",
    label: "01/06",
    isToday: false,
  },
  rawSummary: {
    todayRevenue: 70_000,
    todayOrders: 3,
    todayPaidOrders: 2,
    availableProducts: 12,
    totalTables: 5,
    dailyRevenue: [
      {
        date: "2026-06-01",
        revenue: 70_000,
        orderCount: 3,
        paidOrderCount: 2,
      },
    ],
    topProducts: [
      {
        productId: 1,
        productName: "Coffee",
        categoryName: "Drinks",
        quantity: 4,
        revenue: 80_000,
      },
    ],
    paymentStats: [
      {
        paymentMethod: PaymentMethod.CASH,
        invoiceCount: 2,
        revenue: 70_000,
      },
    ],
    topTables: [
      {
        tableId: 1,
        tableName: "Ban 1",
        invoiceCount: 3,
        revenue: 120_000,
      },
    ],
    orderStatusStats: [
      {
        status: OrderStatus.PENDING,
        count: 1,
      },
    ],
    recentInvoices: [
      {
        id: 9,
        orderId: 8,
        sessionId: null,
        totalAmount: 30_000,
        paymentMethod: PaymentMethod.CASH,
        paidAt: "2026-06-01T10:05:00.000Z",
        table: { id: 1, name: "Ban 1" },
      },
    ],
    recentOrders: [
      {
        id: 8,
        status: OrderStatus.PAID,
        totalAmount: 30_000,
        note: null,
        createdAt: "2026-06-01T10:00:00.000Z",
        table: { id: 1, name: "Ban 1" },
        itemCount: 2,
      },
    ],
  },
  dayBuckets: [
    {
      date: "2026-06-01",
      label: "01/06",
      revenue: 0,
      orderCount: 0,
      paidOrderCount: 0,
    },
    {
      date: "2026-06-02",
      label: "02/06",
      revenue: 0,
      orderCount: 0,
      paidOrderCount: 0,
    },
  ],
});

assert.equal(result.selectedDate, "2026-06-01");
assert.equal(result.selectedDateLabel, "01/06");
assert.equal(result.isSelectedToday, false);
assert.equal(result.todayRevenue, 70_000);
assert.equal(result.averageInvoiceValue, 35_000);
assert.equal(result.availableProducts, 12);
assert.deepEqual(result.dailyRevenue, [
  {
    date: "2026-06-01",
    label: "01/06",
    revenue: 70_000,
    orderCount: 3,
    paidOrderCount: 2,
  },
  {
    date: "2026-06-02",
    label: "02/06",
    revenue: 0,
    orderCount: 0,
    paidOrderCount: 0,
  },
]);
assert.equal(result.paymentStats.length, Object.values(PaymentMethod).length);
assert.equal(result.paymentStats[0].label, "Tiền mặt");
assert.equal(result.paymentStats[0].share, 100);
assert.equal(
  result.orderStatusStats.find((item) => item.status === OrderStatus.PENDING)
    ?.count,
  1,
);
assert.equal(result.topProducts[0].productName, "Coffee");
assert.equal(result.topTables[0].tableName, "Ban 1");
assert.equal(result.topTables[0].invoiceCount, 3);
assert.equal(result.recentInvoices[0].id, 9);
assert.equal(result.recentInvoices[0].paymentMethod, PaymentMethod.CASH);
assert.equal(result.recentOrders[0].id, 8);
