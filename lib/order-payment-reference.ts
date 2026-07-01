type OrderPaymentReferenceSource = {
  id: number;
  sessionId: number | null;
};

export function getOrderPaymentReferenceNumber(
  order: OrderPaymentReferenceSource,
) {
  return order.sessionId ?? order.id;
}

export function getOrderPaymentReferenceLabel(
  order: OrderPaymentReferenceSource,
) {
  return `Mã thanh toán #${getOrderPaymentReferenceNumber(order)}`;
}
