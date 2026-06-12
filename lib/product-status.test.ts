import { strict as assert } from "node:assert";
import {
  getProductStatusLabel,
  productStatusOptions,
} from "./product-status";

assert.equal(getProductStatusLabel("AVAILABLE"), "Đang hiển thị");
assert.equal(getProductStatusLabel("UNAVAILABLE"), "Ẩn khỏi menu");
assert.deepEqual(productStatusOptions, [
  { value: "AVAILABLE", label: "Đang hiển thị" },
  { value: "UNAVAILABLE", label: "Ẩn khỏi menu" },
]);
