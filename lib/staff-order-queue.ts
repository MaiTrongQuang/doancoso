export type StaffQueueOrder = {
  id: number;
  status: string;
};

export function applyUpdatedStaffOrder<T extends StaffQueueOrder>(
  orders: T[],
  updatedOrder: T,
  visibleStatuses: readonly string[],
) {
  const isVisible = visibleStatuses.includes(updatedOrder.status);

  if (!isVisible) {
    return orders.filter((order) => order.id !== updatedOrder.id);
  }

  const existingIndex = orders.findIndex((order) => order.id === updatedOrder.id);

  if (existingIndex === -1) {
    return [updatedOrder, ...orders];
  }

  return orders.map((order) =>
    order.id === updatedOrder.id ? updatedOrder : order,
  );
}
