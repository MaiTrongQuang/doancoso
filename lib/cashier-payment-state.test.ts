import { strict as assert } from "node:assert";
import { removeSettledBillOrders } from "./cashier-payment-state";

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
