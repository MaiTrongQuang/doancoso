import { OrderStatus } from "@prisma/client";
import { canPayDiningSession } from "@/lib/table-session-flow";

export type OrderDateRange = {
  start: Date;
  end: Date;
};

export type OrderListRecord = {
  id: number;
  sessionId: number | null;
  status: OrderStatus;
  totalAmount: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  table: {
    id: number;
    name: string;
  };
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    price: number;
    note: string | null;
    product: {
      id: number;
      name: string;
    };
  }>;
};

export type OrderListRecordWithSession = OrderListRecord & {
  session: {
    id: number;
    orders: Array<{
      status: OrderStatus;
    }>;
  } | null;
};

export type OrderSummaryRecord = {
  id: number;
  sessionId: number | null;
  status: OrderStatus;
  totalAmount: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  table: {
    id: number;
    name: string;
  };
};

export type OrderSummaryRecordWithSession = OrderSummaryRecord & {
  session: {
    id: number;
    orders: Array<{
      status: OrderStatus;
    }>;
  } | null;
};

const orderListInclude = {
  table: {
    select: {
      id: true,
      name: true,
    },
  },
  items: {
    orderBy: {
      id: "asc",
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;

const groupedOrderListInclude = {
  ...orderListInclude,
  session: {
    select: {
      id: true,
      orders: {
        select: {
          status: true,
        },
      },
    },
  },
} as const;

const orderSummarySelect = {
  id: true,
  sessionId: true,
  status: true,
  totalAmount: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  table: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

const groupedOrderSummarySelect = {
  ...orderSummarySelect,
  session: {
    select: {
      id: true,
      orders: {
        select: {
          status: true,
        },
      },
    },
  },
} as const;

type OrderListDetail = "full" | "summary";

type BuildOrderListQueryOptions<Grouped extends boolean> = {
  statuses: OrderStatus[];
  dateRange: OrderDateRange | null;
  groupBySession: Grouped;
  detail?: OrderListDetail;
};

type OrderListQueryBase = {
  where: {
    status?: {
      in: OrderStatus[];
    };
    createdAt?: {
      gte: Date;
      lt: Date;
    };
  };
  orderBy: {
    createdAt: "desc";
  };
};

export function buildOrderListQuery(
  options: BuildOrderListQueryOptions<true> & { detail: "summary" },
): OrderListQueryBase & { select: typeof groupedOrderSummarySelect };
export function buildOrderListQuery(
  options: BuildOrderListQueryOptions<false> & { detail: "summary" },
): OrderListQueryBase & { select: typeof orderSummarySelect };
export function buildOrderListQuery(
  options: BuildOrderListQueryOptions<true> & { detail?: "full" },
): OrderListQueryBase & { include: typeof groupedOrderListInclude };
export function buildOrderListQuery(
  options: BuildOrderListQueryOptions<false> & { detail?: "full" },
): OrderListQueryBase & { include: typeof orderListInclude };
export function buildOrderListQuery({
  dateRange,
  detail = "full",
  groupBySession,
  statuses,
}: BuildOrderListQueryOptions<boolean>):
  | (OrderListQueryBase & { include: typeof groupedOrderListInclude })
  | (OrderListQueryBase & { include: typeof orderListInclude })
  | (OrderListQueryBase & { select: typeof groupedOrderSummarySelect })
  | (OrderListQueryBase & { select: typeof orderSummarySelect }) {
  const baseQuery = {
    where: {
      ...(statuses.length > 0
        ? {
            status: {
              in: statuses,
            },
          }
        : {}),
      ...(dateRange
        ? {
            createdAt: {
              gte: dateRange.start,
              lt: dateRange.end,
            },
          }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  } as const;

  if (detail === "summary") {
    return {
      ...baseQuery,
      select: groupBySession ? groupedOrderSummarySelect : orderSummarySelect,
    } as const;
  }

  return {
    ...baseQuery,
    include: groupBySession ? groupedOrderListInclude : orderListInclude,
  } as const;
}

export function serializeOrder(order: OrderListRecord) {
  return {
    id: order.id,
    sessionId: order.sessionId,
    status: order.status,
    totalAmount: order.totalAmount,
    note: order.note,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    table: order.table,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.price,
      note: item.note,
    })),
  };
}

export function serializeOrderSummary(order: OrderSummaryRecord) {
  return {
    id: order.id,
    sessionId: order.sessionId,
    status: order.status,
    totalAmount: order.totalAmount,
    note: order.note,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    table: order.table,
  };
}

function isReadySessionOrder(
  order: OrderListRecordWithSession | OrderSummaryRecordWithSession,
) {
  if (!order.session) {
    return true;
  }

  return canPayDiningSession(
    order.session.orders.map((sessionOrder) => sessionOrder.status),
  );
}

function groupOrdersBySession<TOrder extends { sessionId: number | null }>(
  orders: TOrder[],
) {
  const sessionGroups = new Map<number, TOrder[]>();
  const standaloneOrders: TOrder[] = [];

  for (const order of orders) {
    if (!order.sessionId) {
      standaloneOrders.push(order);
      continue;
    }

    const currentGroup = sessionGroups.get(order.sessionId) ?? [];
    currentGroup.push(order);
    sessionGroups.set(order.sessionId, currentGroup);
  }

  return {
    sessionGroups,
    standaloneOrders,
  };
}

function serializeSessionBill(orders: OrderListRecordWithSession[]) {
  const [firstOrder] = orders;

  if (!firstOrder) {
    throw new Error("Cannot serialize an empty session bill.");
  }

  const sortedOrders = [...orders].sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
  );
  const newestUpdatedAt = sortedOrders.reduce(
    (latest, order) => (order.updatedAt > latest ? order.updatedAt : latest),
    sortedOrders[0].updatedAt,
  );

  return {
    id: firstOrder.id,
    sessionId: firstOrder.sessionId,
    status: firstOrder.status,
    totalAmount: orders.reduce((total, order) => total + order.totalAmount, 0),
    note: sortedOrders.map((order) => order.note).find(Boolean) ?? null,
    createdAt: sortedOrders[0].createdAt.toISOString(),
    updatedAt: newestUpdatedAt.toISOString(),
    table: firstOrder.table,
    items: sortedOrders.flatMap((order) =>
      order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
        note: item.note,
      })),
    ),
  };
}

function serializeSessionBillSummary(orders: OrderSummaryRecordWithSession[]) {
  const [firstOrder] = orders;

  if (!firstOrder) {
    throw new Error("Cannot serialize an empty session bill.");
  }

  const sortedOrders = [...orders].sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
  );
  const newestUpdatedAt = sortedOrders.reduce(
    (latest, order) => (order.updatedAt > latest ? order.updatedAt : latest),
    sortedOrders[0].updatedAt,
  );

  return {
    id: firstOrder.id,
    sessionId: firstOrder.sessionId,
    status: firstOrder.status,
    totalAmount: orders.reduce((total, order) => total + order.totalAmount, 0),
    note: sortedOrders.map((order) => order.note).find(Boolean) ?? null,
    createdAt: sortedOrders[0].createdAt.toISOString(),
    updatedAt: newestUpdatedAt.toISOString(),
    table: firstOrder.table,
  };
}

export function serializeOrdersGroupedBySession(
  orders: OrderListRecordWithSession[],
) {
  const { sessionGroups, standaloneOrders } = groupOrdersBySession(
    orders.filter(isReadySessionOrder),
  );

  return [
    ...standaloneOrders.map(serializeOrder),
    ...Array.from(sessionGroups.values()).map(serializeSessionBill),
  ].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export function serializeOrdersGroupedBySessionSummary(
  orders: OrderSummaryRecordWithSession[],
) {
  const { sessionGroups, standaloneOrders } = groupOrdersBySession(
    orders.filter(isReadySessionOrder),
  );

  return [
    ...standaloneOrders.map(serializeOrderSummary),
    ...Array.from(sessionGroups.values()).map(serializeSessionBillSummary),
  ].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}
