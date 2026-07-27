import { strict as assert } from "node:assert";
import {
  canTransitionOrderStatus,
  canUserTransitionOrderStatus,
  getPersistedOrderStatusAfterTransition,
  getAllowedNextOrderStatuses,
  isLockedOrderStatus,
} from "./order-status-flow";

assert.deepEqual(getAllowedNextOrderStatuses("PENDING"), [
  "CONFIRMED",
  "CANCELLED",
]);
assert.deepEqual(getAllowedNextOrderStatuses("PREPARING"), [
  "READY",
  "CANCELLED",
]);
assert.deepEqual(getAllowedNextOrderStatuses("SERVED"), ["AWAITING_PAYMENT"]);
assert.deepEqual(getAllowedNextOrderStatuses("AWAITING_PAYMENT"), [
  "COMPLETED",
]);

assert.equal(canTransitionOrderStatus("PENDING", "CONFIRMED"), true);
assert.equal(canTransitionOrderStatus("PENDING", "PREPARING"), false);
assert.equal(canTransitionOrderStatus("CONFIRMED", "PREPARING"), true);
assert.equal(canTransitionOrderStatus("PREPARING", "READY"), true);
assert.equal(canTransitionOrderStatus("READY", "SERVED"), true);
assert.equal(canTransitionOrderStatus("SERVED", "AWAITING_PAYMENT"), true);
assert.equal(canTransitionOrderStatus("AWAITING_PAYMENT", "COMPLETED"), true);
assert.equal(canTransitionOrderStatus("PAID", "CANCELLED"), false);
assert.equal(isLockedOrderStatus("PAID"), true);
assert.equal(isLockedOrderStatus("COMPLETED"), true);
assert.equal(isLockedOrderStatus("CANCELLED"), true);
assert.equal(isLockedOrderStatus("SERVED"), false);

assert.equal(
  getPersistedOrderStatusAfterTransition({
    hasInvoice: true,
    nextStatus: "SERVED",
  }),
  "SERVED",
);
assert.equal(
  getPersistedOrderStatusAfterTransition({
    hasInvoice: false,
    nextStatus: "SERVED",
  }),
  "SERVED",
);
assert.equal(
  getPersistedOrderStatusAfterTransition({
    hasInvoice: true,
    nextStatus: "CONFIRMED",
  }),
  "CONFIRMED",
);

assert.equal(
  canUserTransitionOrderStatus("BARISTA", "CONFIRMED", "PREPARING"),
  true,
);
assert.equal(
  canUserTransitionOrderStatus("BARISTA", "PREPARING", "READY"),
  true,
);
assert.equal(
  canUserTransitionOrderStatus("SERVER", "READY", "SERVED"),
  true,
);
assert.equal(
  canUserTransitionOrderStatus("CASHIER", "AWAITING_PAYMENT", "COMPLETED"),
  true,
);
assert.equal(
  canUserTransitionOrderStatus("SYSTEM", "PENDING", "CONFIRMED"),
  true,
);
assert.equal(
  canUserTransitionOrderStatus("CASHIER", "PREPARING", "READY"),
  false,
);
assert.equal(
  canUserTransitionOrderStatus("BARISTA", "READY", "SERVED"),
  false,
);
