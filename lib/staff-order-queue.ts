export type StaffQueueOrder = {
  id: number;
  status: string;
};

export type StaffQueueOrderPatch = {
  id: number;
  status: string;
  updatedAt?: string;
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

export function applyStaffOrderPatch<T extends StaffQueueOrder>(
  orders: T[],
  patch: StaffQueueOrderPatch,
  visibleStatuses: readonly string[],
) {
  const existingOrder = orders.find((order) => order.id === patch.id);

  if (!existingOrder) {
    return orders;
  }

  if (!visibleStatuses.includes(patch.status)) {
    return orders.filter((order) => order.id !== patch.id);
  }

  return orders.map((order) =>
    order.id === patch.id ? ({ ...order, ...patch } as T) : order,
  );
}
