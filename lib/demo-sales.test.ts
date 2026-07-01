import { strict as assert } from "node:assert";
import {
  buildDemoSalesPlan,
  demoOrderNotePrefix,
} from "./demo-sales";

const products = [
  { id: 1, name: "Cà phê đen", price: 25_000 },
  { id: 2, name: "Cà phê sữa", price: 30_000 },
  { id: 3, name: "Trà sữa truyền thống", price: 38_000 },
  { id: 4, name: "Trà đá", price: 10_000 },
  { id: 5, name: "Bánh flan caramel", price: 30_000 },
];
const tables = [
  { id: 1, name: "Bàn 1" },
  { id: 2, name: "Bàn 2" },
  { id: 3, name: "Bàn 3" },
];

const plan = buildDemoSalesPlan({
  days: 7,
  now: new Date("2026-07-01T00:00:00.000Z"),
  products,
  tables,
});

const paidOrders = plan.orders.filter((order) => order.status === "PAID");
const cancelledOrders = plan.orders.filter(
  (order) => order.status === "CANCELLED",
);

assert.ok(paidOrders.length >= 20);
assert.ok(cancelledOrders.length >= 2);
assert.ok(plan.totalRevenue > 0);
assert.ok(plan.orders.every((order) => order.note.startsWith(demoOrderNotePrefix)));
assert.ok(
  paidOrders.every(
    (order) =>
      order.totalAmount ===
      order.items.reduce((total, item) => total + item.price * item.quantity, 0),
  ),
);
assert.ok(
  new Set(paidOrders.map((order) => order.paymentMethod)).size >= 3,
);
assert.ok(
  paidOrders.every((order) => order.paidAt && order.paidAt >= order.createdAt),
);
