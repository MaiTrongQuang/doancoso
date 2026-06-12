export type BillOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "SERVED"
  | "PAID"
  | "CANCELLED";

export type QrOrderTableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED";

export const activeTableOrderStatuses = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SERVED",
] as const satisfies readonly BillOrderStatus[];

const activeTableOrderStatusSet = new Set<BillOrderStatus>(
  activeTableOrderStatuses,
);

export function canPayDiningSession(statuses: readonly BillOrderStatus[]) {
  const billableStatuses = statuses.filter((status) => status !== "CANCELLED");

  return (
    billableStatuses.length > 0 &&
    billableStatuses.every((status) => status === "SERVED")
  );
}

export function shouldReleaseTable(statuses: readonly BillOrderStatus[]) {
  return statuses.every((status) => !activeTableOrderStatusSet.has(status));
}

export function canAcceptQrOrderForTable(status: QrOrderTableStatus) {
  return status !== "RESERVED";
}

export function canUseDiningSessionForOrder(
  requestedSessionId: number | null,
  activeSessionId: number | null,
) {
  if (activeSessionId === null) {
    return requestedSessionId === null;
  }

  return requestedSessionId === null || requestedSessionId === activeSessionId;
}
