import { strict as assert } from "node:assert";
import { getInvoiceDateFilterRange } from "./invoice-date-filter";

assert.deepEqual(getInvoiceDateFilterRange({}), {
  ok: true,
  range: null,
});

const singleDayRange = getInvoiceDateFilterRange({
  date: "2026-06-01",
});

assert.equal(singleDayRange.ok, true);
assert.equal(
  singleDayRange.ok ? singleDayRange.range?.start?.toISOString() : "",
  "2026-05-31T17:00:00.000Z",
);
assert.equal(
  singleDayRange.ok ? singleDayRange.range?.end?.toISOString() : "",
  "2026-06-01T17:00:00.000Z",
);

const multiDayRange = getInvoiceDateFilterRange({
  dateFrom: "2026-05-31",
  dateTo: "2026-06-01",
});

assert.equal(multiDayRange.ok, true);
assert.equal(
  multiDayRange.ok ? multiDayRange.range?.start?.toISOString() : "",
  "2026-05-30T17:00:00.000Z",
);
assert.equal(
  multiDayRange.ok ? multiDayRange.range?.end?.toISOString() : "",
  "2026-06-01T17:00:00.000Z",
);

const openStartRange = getInvoiceDateFilterRange({
  dateFrom: "2026-06-01",
});

assert.equal(openStartRange.ok, true);
assert.equal(
  openStartRange.ok ? openStartRange.range?.start?.toISOString() : "",
  "2026-05-31T17:00:00.000Z",
);
assert.equal(openStartRange.ok ? openStartRange.range?.end : "not-ok", null);

const openEndRange = getInvoiceDateFilterRange({
  dateTo: "2026-06-01",
});

assert.equal(openEndRange.ok, true);
assert.equal(openEndRange.ok ? openEndRange.range?.start : "not-ok", null);
assert.equal(
  openEndRange.ok ? openEndRange.range?.end?.toISOString() : "",
  "2026-06-01T17:00:00.000Z",
);

assert.deepEqual(getInvoiceDateFilterRange({ dateFrom: "2026-06-02", dateTo: "2026-06-01" }), {
  ok: false,
  message: "Ngày bắt đầu không được lớn hơn ngày kết thúc.",
});

assert.deepEqual(getInvoiceDateFilterRange({ dateFrom: "01/06/2026" }), {
  ok: false,
  message: "Ngày lọc hóa đơn không hợp lệ.",
});
