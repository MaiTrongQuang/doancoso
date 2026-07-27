export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "AWAITING_PAYMENT"
  | "COMPLETED"
  | "PAID"
  | "CANCELLED";

export type OrderActorRole =
  | "ADMIN"
  | "STAFF"
  | "CASHIER"
  | "BARISTA"
  | "SERVER"
  | "SYSTEM";

const orderStatuses = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "SERVED",
  "AWAITING_PAYMENT",
  "COMPLETED",
  "PAID",
  "CANCELLED",
] as const satisfies readonly OrderStatus[];

const nextOrderStatusesByCurrent: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "CANCELLED"],
  SERVED: ["AWAITING_PAYMENT"],
  AWAITING_PAYMENT: ["COMPLETED"],
  COMPLETED: [],
  // PAID is kept for existing demo data and is never used by the new flow.
  PAID: [],
  CANCELLED: [],
};

const roleTransitions: Record<
  Exclude<OrderActorRole, "ADMIN">,
  Array<[OrderStatus, OrderStatus]>
> = {
  CASHIER: [
    ["PENDING", "CONFIRMED"],
    ["SERVED", "AWAITING_PAYMENT"],
    ["AWAITING_PAYMENT", "COMPLETED"],
  ],
  BARISTA: [
    ["CONFIRMED", "PREPARING"],
    ["PREPARING", "READY"],
  ],
  SERVER: [
    ["READY", "SERVED"],
    ["SERVED", "AWAITING_PAYMENT"],
  ],
  // Existing deployments use STAFF for both barista and server operations.
  STAFF: [
    ["CONFIRMED", "PREPARING"],
    ["PREPARING", "READY"],
    ["READY", "SERVED"],
    ["SERVED", "AWAITING_PAYMENT"],
  ],
  SYSTEM: [
    ["PENDING", "CONFIRMED"],
    ["SERVED", "AWAITING_PAYMENT"],
    ["AWAITING_PAYMENT", "COMPLETED"],
  ],
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
  return (
    status === "COMPLETED" || status === "PAID" || status === "CANCELLED"
  );
}

export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
) {
  return getAllowedNextOrderStatuses(currentStatus).includes(nextStatus);
}

export function canUserTransitionOrderStatus(
  role: OrderActorRole,
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
) {
  if (!canTransitionOrderStatus(currentStatus, nextStatus)) {
    return false;
  }

  if (role === "ADMIN") {
    return true;
  }

  return roleTransitions[role].some(
    ([from, to]) => from === currentStatus && to === nextStatus,
  );
}

export function getPersistedOrderStatusAfterTransition({
  nextStatus,
}: {
  hasInvoice: boolean;
  nextStatus: OrderStatus;
}) {
  return nextStatus;
}
