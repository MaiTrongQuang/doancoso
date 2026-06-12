import { strict as assert } from "node:assert";
import { PaymentMethod } from "@prisma/client";
import { normalizeInvoiceListRows } from "./invoice-read-model";

const rows = normalizeInvoiceListRows([
  {
    id: 3,
    orderId: 7,
    sessionId: 2,
    totalAmount: 50_000,
    paymentMethod: PaymentMethod.CASH,
    paidAt: "2026-06-01T10:00:00.000Z",
    createdAt: "2026-06-01T10:00:00.000Z",
    order: {
      id: 7,
      status: "PAID",
      note: "Less ice",
      totalAmount: 50_000,
      createdAt: "2026-06-01T09:00:00.000Z",
      table: { id: 1, name: "Ban 1" },
      items: [
        {
          id: 10,
          productId: 4,
          productName: "Coffee",
          quantity: 2,
          price: 25_000,
          note: null,
        },
      ],
    },
  },
]);

assert.deepEqual(rows, [
  {
    id: 3,
    orderId: 7,
    sessionId: 2,
    totalAmount: 50_000,
    paymentMethod: PaymentMethod.CASH,
    paidAt: "2026-06-01T10:00:00.000Z",
    createdAt: "2026-06-01T10:00:00.000Z",
    order: {
      id: 7,
      status: "PAID",
      note: "Less ice",
      totalAmount: 50_000,
      createdAt: "2026-06-01T09:00:00.000Z",
      table: { id: 1, name: "Ban 1" },
      items: [
        {
          id: 10,
          productId: 4,
          productName: "Coffee",
          quantity: 2,
          price: 25_000,
          note: null,
        },
      ],
    },
  },
]);
