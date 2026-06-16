export type CashierBillIdentity = {
  orderId: number;
  sessionId: number | null;
};

export type CashierBillListItem = {
  id: number;
  sessionId: number | null;
};

export function removeSettledBillOrders<TOrder extends CashierBillListItem>(
  orders: readonly TOrder[],
  bill: CashierBillIdentity,
) {
  return orders.filter((order) => {
    if (bill.sessionId !== null && order.sessionId === bill.sessionId) {
      return false;
    }

    return order.id !== bill.orderId;
  });
}

export function applyCashierOrderStatusPatch<TOrder extends { id: number }>(
  orders: readonly TOrder[],
  patch: { id: number; status: string },
  visibleStatuses: readonly string[],
) {
  if (visibleStatuses.includes(patch.status)) {
    return orders.slice();
  }

  return orders.filter((order) => order.id !== patch.id);
}
