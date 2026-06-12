import { strict as assert } from "node:assert";
import {
  formatKitchenWaitTime,
  getKitchenOrderUrgency,
  sortKitchenOrdersByUrgency,
} from "./kitchen-order-priority";

const now = new Date("2026-06-01T10:00:00.000+07:00");

assert.equal(
  formatKitchenWaitTime("2026-06-01T09:59:20.000+07:00", now),
  "vừa gửi",
);
assert.equal(
  formatKitchenWaitTime("2026-06-01T09:55:00.000+07:00", now),
  "5 phút",
);
assert.equal(
  formatKitchenWaitTime("2026-06-01T08:45:00.000+07:00", now),
  "1 giờ 15 phút",
);

assert.equal(
  getKitchenOrderUrgency("2026-06-01T09:57:00.000+07:00", now).level,
  "fresh",
);
assert.equal(
  getKitchenOrderUrgency("2026-06-01T09:52:00.000+07:00", now).level,
  "watch",
);
assert.equal(
  getKitchenOrderUrgency("2026-06-01T09:40:00.000+07:00", now).level,
  "late",
);

assert.deepEqual(
  sortKitchenOrdersByUrgency(
    [
      { id: 1, status: "CONFIRMED", createdAt: "2026-06-01T09:57:00.000+07:00" },
      { id: 2, status: "PENDING", createdAt: "2026-06-01T09:58:00.000+07:00" },
      { id: 3, status: "PREPARING", createdAt: "2026-06-01T09:30:00.000+07:00" },
    ],
    now,
  ).map((order) => order.id),
  [3, 2, 1],
);
