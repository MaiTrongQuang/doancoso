import { strict as assert } from "node:assert";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import { buildDashboardSummaryResult } from "./dashboard-summary";

const result = buildDashboardSummaryResult({
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
    orderStatusStats: [
      {
        status: OrderStatus.PENDING,
        count: 1,
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

assert.equal(result.todayRevenue, 70_000);
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
assert.equal(
  result.orderStatusStats.find((item) => item.status === OrderStatus.PENDING)
    ?.count,
  1,
);
assert.equal(result.topProducts[0].productName, "Coffee");
assert.equal(result.recentOrders[0].id, 8);
