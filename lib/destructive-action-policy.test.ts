import { strict as assert } from "node:assert";
import { getProductRemovalAction } from "./destructive-action-policy";

assert.equal(getProductRemovalAction(0), "DELETE");
assert.equal(getProductRemovalAction(1), "DISABLE");
assert.equal(getProductRemovalAction(24), "DISABLE");

