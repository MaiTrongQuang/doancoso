export type PrintablePaymentMethod = "CASH" | "BANK_TRANSFER" | "QR_PAYMENT";

const paymentLabels: Record<PrintablePaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  QR_PAYMENT: "QR Payment",
};

export const receiptStoreInfo = {
  name: "NANA CAFE & TEA",
  address: "xx, Phú Nhuận, Tp.HCM",
  phone: "098 xxx",
};

export const receiptThankYouMessage = "Xin cảm ơn, hẹn gặp lại quý khách";

export function formatInvoiceCode(invoiceId: number) {
  return `HD${String(invoiceId).padStart(6, "0")}`;
}

export function getPaymentLabel(paymentMethod: PrintablePaymentMethod) {
  return paymentLabels[paymentMethod];
}
