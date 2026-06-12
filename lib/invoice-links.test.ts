import { strict as assert } from "node:assert";
import { getInvoicePrintHref } from "./invoice-links";

assert.equal(getInvoicePrintHref(8), "/invoices/8/print");
assert.equal(
  getInvoicePrintHref(8, { plain: true }),
  "/invoices/8/print?plain=1",
);
