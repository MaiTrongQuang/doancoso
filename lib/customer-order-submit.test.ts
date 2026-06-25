import { strict as assert } from "node:assert";
import { OrderStatus } from "@prisma/client";
import {
  buildCustomerOrderDraft,
  getCustomerOrderPaymentLabel,
  serializeCustomerSubmittedOrder,
} from "./customer-order-submit";

const draft = buildCustomerOrderDraft({
  items: [
    {
      productId: 1,
      quantity: 2,
      note: "Ít đá",
    },
    {
      productId: 2,
      quantity: 1,
      note: null,
    },
  ],
  products: [
    {
      id: 1,
      price: 25_000,
    },
    {
      id: 2,
      price: 30_000,
    },
  ],
});

assert.deepEqual(draft, {
  orderItems: [
    {
      productId: 1,
      quantity: 2,
      price: 25_000,
      note: "Ít đá",
    },
    {
      productId: 2,
      quantity: 1,
      price: 30_000,
      note: null,
    },
  ],
  totalAmount: 80_000,
});

const submittedOrder = serializeCustomerSubmittedOrder({
  id: 12,
  sessionId: 7,
  status: OrderStatus.PENDING,
  totalAmount: 80_000,
});

assert.deepEqual(submittedOrder, {
  id: 12,
  sessionId: 7,
  status: OrderStatus.PENDING,
  totalAmount: 80_000,
});

assert.equal(
  getCustomerOrderPaymentLabel({
    id: 76,
    sessionId: 44,
  }),
  "Phiên #44",
);

assert.equal(
  getCustomerOrderPaymentLabel({
    id: 76,
    sessionId: null,
  }),
  "Đơn #76",
);
