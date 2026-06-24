export type CashierBillIdentity = {
  orderId: number;
  sessionId: number | null;
};

export type CashierBillListItem = {
  id: number;
  sessionId: number | null;
};

export type CashierOrderListState = {
  id: number;
  status: string;
  updatedAt: string;
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

export function hasCashierOrderListChanged(
  currentOrders: readonly CashierOrderListState[],
  nextSummaries: readonly CashierOrderListState[],
) {
  if (currentOrders.length !== nextSummaries.length) {
    return true;
  }

  const currentOrderById = new Map(
    currentOrders.map((order) => [
      order.id,
      {
        status: order.status,
        updatedAt: order.updatedAt,
      },
    ]),
  );

  return nextSummaries.some((summary) => {
    const currentOrder = currentOrderById.get(summary.id);

    return (
      !currentOrder ||
      currentOrder.status !== summary.status ||
      currentOrder.updatedAt !== summary.updatedAt
    );
  });
}
