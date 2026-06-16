import { strict as assert } from "node:assert";
import {
  buildShiftRevenue,
  createShiftRevenueMonthRange,
  getShiftKeyForVietnamDate,
  normalizeShiftRevenueMonth,
  shiftDefinitions,
} from "./shift-revenue";

assert.deepEqual(
  shiftDefinitions.map((shift) => shift.key),
  ["06-10", "10-14", "14-18", "18-22", "22-02", "02-06"],
);

const monthRange = createShiftRevenueMonthRange("2026-06");

assert.equal(monthRange.month, "2026-06");
assert.equal(monthRange.label, "06/2026");
assert.equal(monthRange.start.toISOString(), "2026-05-31T17:00:00.000Z");
assert.equal(monthRange.end.toISOString(), "2026-06-30T17:00:00.000Z");

assert.equal(
  normalizeShiftRevenueMonth("bad", new Date("2026-06-16T10:00:00.000Z")),
  "2026-06",
);
assert.equal(
  normalizeShiftRevenueMonth("2026-05", new Date("2026-06-16T10:00:00.000Z")),
  "2026-05",
);

assert.equal(
  getShiftKeyForVietnamDate(new Date("2026-06-16T03:00:00.000Z")),
  "10-14",
);
assert.equal(
  getShiftKeyForVietnamDate(new Date("2026-06-16T15:30:00.000Z")),
  "22-02",
);
assert.equal(
  getShiftKeyForVietnamDate(new Date("2026-06-16T19:30:00.000Z")),
  "02-06",
);

const shiftRevenue = buildShiftRevenue({
  invoices: [
    {
      paidAt: new Date("2026-06-16T03:00:00.000Z"),
      totalAmount: 100_000,
    },
    {
      paidAt: new Date("2026-06-16T03:30:00.000Z"),
      totalAmount: 50_000,
    },
    {
      paidAt: new Date("2026-06-16T15:30:00.000Z"),
      totalAmount: 200_000,
    },
    {
      paidAt: new Date("2026-06-17T19:30:00.000Z"),
      totalAmount: 120_000,
    },
  ],
  month: "2026-06",
});

const tenToFourteen = shiftRevenue.shifts.find((shift) => shift.key === "10-14");
const twentyTwoToTwo = shiftRevenue.shifts.find((shift) => shift.key === "22-02");
const twoToSix = shiftRevenue.shifts.find((shift) => shift.key === "02-06");

assert.equal(tenToFourteen?.revenue, 150_000);
assert.equal(tenToFourteen?.invoiceCount, 2);
assert.equal(tenToFourteen?.averageInvoiceValue, 75_000);
assert.equal(tenToFourteen?.bestDayLabel, "16/06");

assert.equal(twentyTwoToTwo?.revenue, 200_000);
assert.equal(twentyTwoToTwo?.invoiceCount, 1);
assert.equal(twoToSix?.revenue, 120_000);
assert.equal(shiftRevenue.totalRevenue, 470_000);
assert.equal(shiftRevenue.totalInvoiceCount, 4);
