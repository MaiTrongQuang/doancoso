import { strict as assert } from "node:assert";
import {
  canTransitionOrderStatus,
  getAllowedNextOrderStatuses,
} from "./order-status-flow";

assert.deepEqual(getAllowedNextOrderStatuses("PENDING"), [
  "CONFIRMED",
  "CANCELLED",
]);

assert.equal(canTransitionOrderStatus("PENDING", "CONFIRMED"), true);
assert.equal(canTransitionOrderStatus("PENDING", "PREPARING"), false);
assert.equal(canTransitionOrderStatus("CONFIRMED", "PREPARING"), true);
assert.equal(canTransitionOrderStatus("PREPARING", "SERVED"), true);
