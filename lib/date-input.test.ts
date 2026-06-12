import { strict as assert } from "node:assert";
import {
  formatDateInputValue,
  getRecentDateRangeInputValue,
} from "./date-input";

assert.equal(
  formatDateInputValue(new Date(2026, 5, 1, 9, 37, 0)),
  "2026-06-01",
);
assert.equal(
  formatDateInputValue(new Date(2026, 0, 5, 23, 59, 0)),
  "2026-01-05",
);

assert.deepEqual(getRecentDateRangeInputValue(1, new Date(2026, 5, 1, 9, 0)), {
  dateFrom: "2026-06-01",
  dateTo: "2026-06-01",
});
assert.deepEqual(getRecentDateRangeInputValue(3, new Date(2026, 5, 1, 9, 0)), {
  dateFrom: "2026-05-30",
  dateTo: "2026-06-01",
});
assert.deepEqual(getRecentDateRangeInputValue(7, new Date(2026, 0, 5, 9, 0)), {
  dateFrom: "2025-12-30",
  dateTo: "2026-01-05",
});
