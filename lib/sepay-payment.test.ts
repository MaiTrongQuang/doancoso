import { strict as assert } from "node:assert";
import {
  buildSepayTransferDescription,
  buildSepayQrUrl,
  buildSepayTransferCode,
  canConfirmSepayPayment,
  extractSepayTransferCode,
  getSepayQrDescription,
  isIncomingSepayTransfer,
  normalizeSepayAmount,
  normalizeSepayText,
} from "./sepay-payment";

const transferDescription = buildSepayTransferDescription({
  orderId: 42,
  tableName: "Bàn 2",
  transferCode: "CAFE42ABC1",
});

assert.equal(transferDescription, "TT BAN2 CAFE42ABC1");

const qrUrl = buildSepayQrUrl({
  accountNumber: "123456789",
  amount: 125000,
  bankCode: "MBBank",
  transferDescription,
  transferCode: "CAFE42ABC1",
});
const parsedQrUrl = new URL(qrUrl);

assert.equal(`${parsedQrUrl.origin}${parsedQrUrl.pathname}`, "https://qr.sepay.vn/img");
assert.equal(parsedQrUrl.searchParams.get("acc"), "123456789");
assert.equal(parsedQrUrl.searchParams.get("bank"), "MBBank");
assert.equal(parsedQrUrl.searchParams.get("amount"), "125000");
assert.equal(parsedQrUrl.searchParams.get("des"), transferDescription);
assert.equal(getSepayQrDescription(qrUrl, "CAFE42ABC1"), transferDescription);
assert.equal(
  getSepayQrDescription("not-a-url", "CAFE42ABC1"),
  "CAFE42ABC1",
);

assert.equal(buildSepayTransferCode(42, "abc123xy"), "CAFE42ABC1");
assert.equal(buildSepayTransferCode(42, "abc-123-xy"), "CAFE42ABC1");

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
    content: "TT BAN2 CAFE99XYZ7",
  }),
  "CAFE99XYZ7",
);
assert.equal(
  extractSepayTransferCode({
    code: "",
    content: "TT BAN1 CAFE1A7K2",
  }),
  "CAFE1A7K2",
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

assert.equal(canConfirmSepayPayment("PENDING"), true);
assert.equal(canConfirmSepayPayment("PAID"), false);
assert.equal(canConfirmSepayPayment("CANCELLED"), false);
assert.equal(canConfirmSepayPayment("EXPIRED"), false);
assert.equal(canConfirmSepayPayment("FAILED"), false);

assert.equal(normalizeSepayAmount(125000), 125000);
assert.equal(normalizeSepayAmount("125,000.90"), 125000);
assert.equal(normalizeSepayAmount("abc"), null);

assert.equal(normalizeSepayText("  abc  "), "abc");
assert.equal(normalizeSepayText(""), null);
assert.equal(normalizeSepayText(null), null);
