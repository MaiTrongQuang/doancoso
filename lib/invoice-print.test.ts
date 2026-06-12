import { strict as assert } from "node:assert";
import {
  formatInvoiceCode,
  getPaymentLabel,
  receiptStoreInfo,
  receiptThankYouMessage,
} from "./invoice-print";

assert.equal(formatInvoiceCode(1), "HD000001");
assert.equal(formatInvoiceCode(125), "HD000125");
assert.equal(getPaymentLabel("CASH"), "Tiền mặt");
assert.equal(getPaymentLabel("BANK_TRANSFER"), "Thanh toán QR (SePay)");
assert.equal(getPaymentLabel("QR_PAYMENT"), "Thanh toán QR (SePay)");
assert.deepEqual(receiptStoreInfo, {
  name: "NANA CAFE & TEA",
  address: "xx, Phú Nhuận, Tp.HCM",
  phone: "098 xxx",
});
assert.equal(
  receiptThankYouMessage,
  "Xin cảm ơn, hẹn gặp lại quý khách",
);
