import { strict as assert } from "node:assert";
import {
  buildSepayQrUrl,
  buildSepayTransferCode,
  extractSepayTransferCode,
  isIncomingSepayTransfer,
  normalizeSepayAmount,
  normalizeSepayText,
} from "./sepay-payment";

const qrUrl = buildSepayQrUrl({
  accountNumber: "123456789",
  amount: 125000,
  bankCode: "MBBank",
  transferCode: "CAFE42ABC123",
});
const parsedQrUrl = new URL(qrUrl);

assert.equal(`${parsedQrUrl.origin}${parsedQrUrl.pathname}`, "https://qr.sepay.vn/img");
assert.equal(parsedQrUrl.searchParams.get("acc"), "123456789");
assert.equal(parsedQrUrl.searchParams.get("bank"), "MBBank");
assert.equal(parsedQrUrl.searchParams.get("amount"), "125000");
assert.equal(parsedQrUrl.searchParams.get("des"), "CAFE42ABC123");

assert.equal(buildSepayTransferCode(42, "abc123xy"), "CAFE42ABC123XY");
assert.equal(buildSepayTransferCode(42, "abc-123-xy"), "CAFE42ABC123XY");

assert.equal(
  extractSepayTransferCode({
    code: " cafe42abc123 ",
    content: "Khach hang thanh toan",
  }),
  "CAFE42ABC123",
);
assert.equal(
  extractSepayTransferCode({
    code: "",
    content: "Thanh toan don CAFE99XYZ789 tai quan",
  }),
  "CAFE99XYZ789",
);
assert.equal(
  extractSepayTransferCode({
    code: "",
    content: "Thanh toan khong co ma don",
  }),
  null,
);

assert.equal(isIncomingSepayTransfer("in"), true);
assert.equal(isIncomingSepayTransfer("IN"), true);
assert.equal(isIncomingSepayTransfer("out"), false);
assert.equal(isIncomingSepayTransfer(null), false);

assert.equal(normalizeSepayAmount(125000), 125000);
assert.equal(normalizeSepayAmount("125,000.90"), 125000);
assert.equal(normalizeSepayAmount("abc"), null);

assert.equal(normalizeSepayText("  abc  "), "abc");
assert.equal(normalizeSepayText(""), null);
assert.equal(normalizeSepayText(null), null);
