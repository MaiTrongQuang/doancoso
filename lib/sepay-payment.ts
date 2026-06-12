const TRANSFER_CODE_PREFIX = "CAFE";
const TRANSFER_CODE_PATTERN = /\bCAFE[0-9A-Z]{6,}\b/;

function normalizeTransferCodeSegment(value: string) {
  return value.replace(/[^0-9a-z]/gi, "").toUpperCase();
}

export function buildSepayTransferCode(orderId: number, suffix: string) {
  return `${TRANSFER_CODE_PREFIX}${orderId}${normalizeTransferCodeSegment(suffix)}`;
}

export function buildSepayQrUrl({
  accountNumber,
  amount,
  bankCode,
  transferCode,
}: {
  accountNumber: string;
  amount: number;
  bankCode: string;
  transferCode: string;
}) {
  const url = new URL("https://qr.sepay.vn/img");
  url.searchParams.set("acc", accountNumber);
  url.searchParams.set("bank", bankCode);
  url.searchParams.set("amount", String(amount));
  url.searchParams.set("des", transferCode);

  return url.toString();
}

export function normalizeSepayText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  return text.length > 0 ? text : null;
}

export function normalizeSepayAmount(value: unknown) {
  const normalizedValue =
    typeof value === "string" ? value.replace(/[,\s]/g, "") : value;
  const amount =
    typeof normalizedValue === "number" || typeof normalizedValue === "string"
      ? Number(normalizedValue)
      : Number.NaN;

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Math.trunc(amount);
}

export function isIncomingSepayTransfer(value: unknown) {
  return typeof value === "string" && value.trim().toLowerCase() === "in";
}

export function extractSepayTransferCode({
  code,
  content,
}: {
  code: unknown;
  content: unknown;
}) {
  const normalizedCode = normalizeSepayText(code);

  if (normalizedCode) {
    return normalizeTransferCodeSegment(normalizedCode);
  }

  const normalizedContent = normalizeSepayText(content);

  if (!normalizedContent) {
    return null;
  }

  return normalizedContent.toUpperCase().match(TRANSFER_CODE_PATTERN)?.[0] ?? null;
}
