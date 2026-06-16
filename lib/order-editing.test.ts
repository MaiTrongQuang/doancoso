import { strict as assert } from "node:assert";
import { getEditableOrderUpdatePlan } from "./order-editing";

const currentItems = [
  { id: 1, price: 25_000, quantity: 2 },
  { id: 2, price: 30_000, quantity: 1 },
];

assert.deepEqual(
  getEditableOrderUpdatePlan({
    currentItems,
    updates: [
      { id: 1, quantity: 3, note: "  ít đá  " },
      { id: 2, quantity: 0, note: "" },
    ],
  }),
  {
    ok: true,
    itemUpdates: [
      { id: 1, note: "ít đá", quantity: 3 },
      { id: 2, note: null, quantity: 0 },
    ],
    totalAmount: 75_000,
  },
);

assert.deepEqual(
  getEditableOrderUpdatePlan({
    currentItems: [{ id: 1, note: "ít sữa", price: 25_000, quantity: 2 }],
    updates: [],
  }),
  {
    ok: true,
    itemUpdates: [{ id: 1, note: "ít sữa", quantity: 2 }],
    totalAmount: 50_000,
  },
);

assert.deepEqual(
  getEditableOrderUpdatePlan({
    currentItems,
    updates: [{ id: 999, quantity: 1, note: null }],
  }),
  {
    message: "Món trong đơn không hợp lệ.",
    ok: false,
  },
);

assert.deepEqual(
  getEditableOrderUpdatePlan({
    currentItems,
    updates: [
      { id: 1, quantity: 0, note: null },
      { id: 2, quantity: 0, note: null },
    ],
  }),
  {
    message: "Đơn phải còn ít nhất một món.",
    ok: false,
  },
);

assert.deepEqual(
  getEditableOrderUpdatePlan({
    currentItems,
    updates: [{ id: 1, quantity: 100, note: null }],
  }),
  {
    message: "Số lượng món phải từ 0 đến 99.",
    ok: false,
  },
);
