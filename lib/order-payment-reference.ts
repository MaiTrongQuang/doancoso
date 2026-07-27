type OrderPaymentReferenceSource = {
  id: number;
  sessionId: number | null;
};

export function getOrderPaymentReferenceNumber(
  order: OrderPaymentReferenceSource,
) {
  return order.id;
}

export function getOrderPaymentReferenceLabel(
  order: OrderPaymentReferenceSource,
) {
  return `Mã đơn #${getOrderPaymentReferenceNumber(order)}`;
}
