import assert from "node:assert/strict";
import { getCategoryContextIds } from "./customer-order-navigation";

const ids = ["ALL", "coffee", "tea", "juice", "cake"];

assert.deepEqual(getCategoryContextIds(ids, "tea"), ["coffee", "tea", "juice"]);
assert.deepEqual(getCategoryContextIds(ids, "ALL"), ["ALL", "coffee"]);
assert.deepEqual(getCategoryContextIds(ids, "cake"), ["juice", "cake"]);
assert.deepEqual(getCategoryContextIds(ids, "missing"), ["ALL", "coffee"]);
