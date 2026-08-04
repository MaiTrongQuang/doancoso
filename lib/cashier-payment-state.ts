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

export const cashierPaymentMethods = ["CASH", "QR_PAYMENT"] as const;

export type CashierPaymentMethod = (typeof cashierPaymentMethods)[number];

const cashierEditableOrderItemStatuses = ["PENDING"] as const;

export function isCashierPaymentMethod(
  value: unknown,
): value is CashierPaymentMethod {
  return (
    typeof value === "string" &&
    cashierPaymentMethods.includes(value as CashierPaymentMethod)
  );
}

export function canCashierEditOrderItems(status: string) {
  return cashierEditableOrderItemStatuses.includes(
    status as (typeof cashierEditableOrderItemStatuses)[number],
  );
}

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

export function getCashierPaymentActionLabel({
  hasPendingQrPayment,
  isPaying,
  paymentMethod,
}: {
  hasPendingQrPayment: boolean;
  isPaying: boolean;
  paymentMethod: CashierPaymentMethod;
}) {
  if (paymentMethod === "QR_PAYMENT") {
    if (hasPendingQrPayment) {
      return "Đang chờ ngân hàng xác nhận";
    }

    return isPaying ? "Đang tạo mã QR..." : "Tạo mã QR thanh toán";
  }

  return isPaying ? "Đang xác nhận..." : "Xác nhận đã nhận tiền";
}
