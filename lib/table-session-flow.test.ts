import { strict as assert } from "node:assert";
import {
  canAcceptQrOrderForTable,
  canUseDiningSessionForOrder,
  canPayDiningSession,
  shouldReleaseTable,
} from "./table-session-flow";

assert.equal(canPayDiningSession(["SERVED"]), true);
assert.equal(canPayDiningSession(["SERVED", "SERVED"]), true);
assert.equal(canPayDiningSession(["SERVED", "CANCELLED"]), true);
assert.equal(canPayDiningSession(["SERVED", "PREPARING"]), false);
assert.equal(canPayDiningSession(["CANCELLED"]), false);

assert.equal(shouldReleaseTable([]), true);
assert.equal(shouldReleaseTable(["PAID", "CANCELLED"]), true);
assert.equal(shouldReleaseTable(["SERVED"]), false);
assert.equal(shouldReleaseTable(["PAID", "PREPARING"]), false);

assert.equal(canAcceptQrOrderForTable("AVAILABLE"), true);
assert.equal(canAcceptQrOrderForTable("OCCUPIED"), true);
assert.equal(canAcceptQrOrderForTable("RESERVED"), false);

assert.equal(canUseDiningSessionForOrder(7, 7), true);
assert.equal(canUseDiningSessionForOrder(null, null), true);
assert.equal(canUseDiningSessionForOrder(null, 7), true);
assert.equal(canUseDiningSessionForOrder(7, null), false);
assert.equal(canUseDiningSessionForOrder(7, 8), false);
