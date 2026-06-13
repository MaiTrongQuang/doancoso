import assert from "node:assert/strict";
import { getPaymentPollingDelay } from "./payment-polling";

assert.equal(getPaymentPollingDelay(0), 1000);
assert.equal(getPaymentPollingDelay(14_999), 1000);
assert.equal(getPaymentPollingDelay(15_000), 3000);
assert.equal(getPaymentPollingDelay(90_000), 3000);
assert.equal(getPaymentPollingDelay(-25), 1000);
