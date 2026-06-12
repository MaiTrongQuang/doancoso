import { strict as assert } from "node:assert";
import { applyUpdatedStaffOrder } from "./staff-order-queue";

const visibleStatuses = ["PENDING", "CONFIRMED", "PREPARING"] as const;

const baseOrder = {
  id: 1,
  status: "PENDING",
  totalAmount: 20_000,
  note: null,
  createdAt: "2026-06-01T10:00:00.000+07:00",
  updatedAt: "2026-06-01T10:00:00.000+07:00",
  table: { id: 1, name: "Ban 1" },
  items: [],
};

assert.deepEqual(
  applyUpdatedStaffOrder(
    [baseOrder],
    {
      ...baseOrder,
      status: "CONFIRMED",
      updatedAt: "2026-06-01T10:01:00.000+07:00",
    },
    visibleStatuses,
  ),
  [
    {
      ...baseOrder,
      status: "CONFIRMED",
      updatedAt: "2026-06-01T10:01:00.000+07:00",
    },
  ],
);

assert.deepEqual(
  applyUpdatedStaffOrder(
    [baseOrder],
    {
      ...baseOrder,
      status: "SERVED",
      updatedAt: "2026-06-01T10:02:00.000+07:00",
    },
    visibleStatuses,
  ),
  [],
);
