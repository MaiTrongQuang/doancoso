import { strict as assert } from "node:assert";
import {
  applyCashierOrderStatusPatch,
  hasCashierOrderListChanged,
  removeSettledBillOrders,
} from "./cashier-payment-state";

const orders = [
  {
    id: 53,
    sessionId: 27,
    table: {
      name: "Ban 2",
    },
  },
  {
    id: 55,
    sessionId: 29,
    table: {
      name: "Ban 3",
    },
  },
  {
    id: 56,
    sessionId: null,
    table: {
      name: "Ban 4",
    },
  },
];

assert.deepEqual(
  removeSettledBillOrders(orders, { orderId: 53, sessionId: 27 }).map(
    (order) => order.id,
  ),
  [55, 56],
);

assert.deepEqual(
  removeSettledBillOrders(orders, { orderId: 56, sessionId: null }).map(
    (order) => order.id,
  ),
  [53, 55],
);

assert.deepEqual(
  removeSettledBillOrders(orders, { orderId: 999, sessionId: null }).map(
    (order) => order.id,
  ),
  [53, 55, 56],
);

assert.deepEqual(
  applyCashierOrderStatusPatch(
    orders,
    { id: 53, status: "CANCELLED" },
    ["PENDING"],
  ).map((order) => order.id),
  [55, 56],
);

assert.deepEqual(
  applyCashierOrderStatusPatch(
    orders,
    { id: 55, status: "CONFIRMED" },
    ["PENDING"],
  ).map((order) => order.id),
  [53, 56],
);

assert.deepEqual(
  applyCashierOrderStatusPatch(
    orders,
    { id: 999, status: "CANCELLED" },
    ["PENDING"],
  ).map((order) => order.id),
  [53, 55, 56],
);

const cashierOrders = [
  {
    id: 53,
    status: "PENDING",
    updatedAt: "2026-06-25T00:00:00.000Z",
  },
  {
    id: 55,
    status: "PENDING",
    updatedAt: "2026-06-25T00:01:00.000Z",
  },
];

assert.equal(
  hasCashierOrderListChanged(cashierOrders, [
    {
      id: 53,
      status: "PENDING",
      updatedAt: "2026-06-25T00:00:00.000Z",
    },
    {
      id: 55,
      status: "PENDING",
      updatedAt: "2026-06-25T00:01:00.000Z",
    },
  ]),
  false,
);

assert.equal(
  hasCashierOrderListChanged(cashierOrders, [
    {
      id: 53,
      status: "PENDING",
      updatedAt: "2026-06-25T00:00:00.000Z",
    },
    {
      id: 55,
      status: "PENDING",
      updatedAt: "2026-06-25T00:01:00.000Z",
    },
    {
      id: 56,
      status: "PENDING",
      updatedAt: "2026-06-25T00:02:00.000Z",
    },
  ]),
  true,
);

assert.equal(
  hasCashierOrderListChanged(cashierOrders, [
    {
      id: 53,
      status: "CONFIRMED",
      updatedAt: "2026-06-25T00:00:00.000Z",
    },
    {
      id: 55,
      status: "PENDING",
      updatedAt: "2026-06-25T00:01:00.000Z",
    },
  ]),
  true,
);

assert.equal(
  hasCashierOrderListChanged(cashierOrders, [
    {
      id: 53,
      status: "PENDING",
      updatedAt: "2026-06-25T00:03:00.000Z",
    },
    {
      id: 55,
      status: "PENDING",
      updatedAt: "2026-06-25T00:01:00.000Z",
    },
  ]),
  true,
);
