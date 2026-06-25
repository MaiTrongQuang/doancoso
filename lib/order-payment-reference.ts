type OrderPaymentReferenceSource = {
  id: number;
  sessionId: number | null;
};

export function getOrderPaymentReferenceLabel(
  order: OrderPaymentReferenceSource,
) {
  return order.sessionId ? `Phiên #${order.sessionId}` : `Đơn #${order.id}`;
}
