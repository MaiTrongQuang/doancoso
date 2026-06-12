export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "SERVED"
  | "PAID"
  | "CANCELLED";

const orderStatuses = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SERVED",
  "PAID",
  "CANCELLED",
] as const satisfies readonly OrderStatus[];

const nextOrderStatusesByCurrent: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["SERVED", "CANCELLED"],
  SERVED: [],
  PAID: [],
  CANCELLED: [],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" && orderStatuses.includes(value as OrderStatus)
  );
}

export function getAllowedNextOrderStatuses(status: OrderStatus) {
  return nextOrderStatusesByCurrent[status];
}

export function isLockedOrderStatus(status: OrderStatus) {
  return status === "PAID" || status === "CANCELLED";
}

export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
) {
  return getAllowedNextOrderStatuses(currentStatus).includes(nextStatus);
}
