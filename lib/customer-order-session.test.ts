import { strict as assert } from "node:assert";
import { resolveCustomerOrderSession } from "./customer-order-session";

assert.deepEqual(resolveCustomerOrderSession(null, null), { kind: "CREATE" });
assert.deepEqual(resolveCustomerOrderSession(null, 7), {
  kind: "USE",
  sessionId: 7,
});
assert.deepEqual(resolveCustomerOrderSession(7, 7), {
  kind: "USE",
  sessionId: 7,
});
assert.deepEqual(resolveCustomerOrderSession(7, 8), { kind: "CONFLICT" });
assert.deepEqual(resolveCustomerOrderSession(7, null), { kind: "CONFLICT" });
