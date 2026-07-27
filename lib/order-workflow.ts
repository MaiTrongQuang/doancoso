import {
  DiningSessionStatus,
  OrderItemStatus,
  OrderStatus,
  Prisma,
  TableStatus,
} from "@prisma/client";
import {
  canUserTransitionOrderStatus,
  isLockedOrderStatus,
  type OrderActorRole,
} from "@/lib/order-status-flow";
import { activeTableOrderStatuses } from "@/lib/table-session-flow";
import { prisma } from "@/lib/prisma";

export type OrderWorkflowInput = {
  orderId: number;
  actorUserId: number | null;
  actorRole: OrderActorRole;
  nextStatus: OrderStatus;
  reason?: string | null;
};

export class OrderWorkflowError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "INVALID_TRANSITION"
      | "CONFLICT"
      | "REASON_REQUIRED",
  ) {
    super(message);
    this.name = "OrderWorkflowError";
  }
}

const itemStatusByOrderStatus: Partial<Record<OrderStatus, OrderItemStatus>> = {
  PENDING: OrderItemStatus.PENDING,
  CONFIRMED: OrderItemStatus.PENDING,
  PREPARING: OrderItemStatus.PREPARING,
  READY: OrderItemStatus.READY,
  SERVED: OrderItemStatus.SERVED,
  AWAITING_PAYMENT: OrderItemStatus.SERVED,
  COMPLETED: OrderItemStatus.SERVED,
  CANCELLED: OrderItemStatus.CANCELLED,
};

const orderStatusHistorySelect = {
  id: true,
  status: true,
  updatedAt: true,
  invoice: {
    select: {
      id: true,
      paymentMethod: true,
      totalAmount: true,
    },
  },
} as const;

type WorkflowClient = Prisma.TransactionClient;

function normalizeReason(reason: string | null | undefined) {
  const normalized = reason?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function isAdminOverride({
  actorRole,
  currentStatus,
  nextStatus,
}: Pick<OrderWorkflowInput, "actorRole" | "nextStatus"> & {
  currentStatus: OrderStatus;
}) {
  return (
    actorRole === "ADMIN" &&
    nextStatus === OrderStatus.CANCELLED &&
    !isLockedOrderStatus(currentStatus)
  );
}

async function releaseTableIfNoActiveOrders(
  tx: WorkflowClient,
  tableId: number,
  sessionId: number | null,
) {
  const activeOrdersInTable = await tx.order.count({
    where: {
      tableId,
      status: {
        in: [...activeTableOrderStatuses],
      },
    },
  });

  if (activeOrdersInTable === 0) {
    await tx.cafeTable.update({
      where: { id: tableId },
      data: { status: TableStatus.AVAILABLE },
    });
  }

  if (!sessionId) {
    return;
  }

  const remainingSessionOrders = await tx.order.count({
    where: {
      sessionId,
      status: {
        in: [...activeTableOrderStatuses],
      },
    },
  });

  if (remainingSessionOrders === 0) {
    await tx.diningSession.updateMany({
      where: {
        id: sessionId,
        status: DiningSessionStatus.OPEN,
      },
      data: {
        status: DiningSessionStatus.CLOSED,
        closedAt: new Date(),
      },
    });
  }
}

export async function transitionOrderStatusInTransaction(
  tx: WorkflowClient,
  input: OrderWorkflowInput,
) {
  await tx.$queryRaw(Prisma.sql`
    SELECT id
    FROM orders
    WHERE id = ${input.orderId}
    FOR UPDATE
  `);

  const order = await tx.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      tableId: true,
      sessionId: true,
      status: true,
    },
  });

  if (!order) {
    throw new OrderWorkflowError("Đơn hàng không tồn tại.", "NOT_FOUND");
  }

  if (isLockedOrderStatus(order.status)) {
    throw new OrderWorkflowError(
      "Đơn hàng đã kết thúc hoặc đã hủy.",
      "CONFLICT",
    );
  }

  const adminOverride = isAdminOverride({
    actorRole: input.actorRole,
    currentStatus: order.status,
    nextStatus: input.nextStatus,
  });
  const canTransition = canUserTransitionOrderStatus(
    input.actorRole,
    order.status,
    input.nextStatus,
  );

  if (!adminOverride && !canTransition) {
    throw new OrderWorkflowError(
      "Bạn không có quyền chuyển đơn sang trạng thái này.",
      "FORBIDDEN",
    );
  }

  const reason = normalizeReason(input.reason);

  if (adminOverride && !reason) {
    throw new OrderWorkflowError(
      "Hủy đơn sau khi đã nhận cần ghi rõ lý do.",
      "REASON_REQUIRED",
    );
  }

  const updateResult = await tx.order.updateMany({
    where: {
      id: order.id,
      status: order.status,
    },
    data: {
      status: input.nextStatus,
    },
  });

  if (updateResult.count !== 1) {
    throw new OrderWorkflowError(
      "Đơn vừa được cập nhật bởi người khác. Vui lòng tải lại.",
      "CONFLICT",
    );
  }

  const itemStatus = itemStatusByOrderStatus[input.nextStatus];

  if (itemStatus) {
    await tx.orderItem.updateMany({
      where: { orderId: order.id },
      data: { status: itemStatus },
    });
  }

  await tx.orderStatusHistory.create({
    data: {
      orderId: order.id,
      fromStatus: order.status,
      toStatus: input.nextStatus,
      actorUserId: input.actorUserId,
      reason,
      metadata: {
        actorRole: input.actorRole,
      },
    },
  });

  if (adminOverride || input.nextStatus === OrderStatus.CANCELLED) {
    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: "ORDER_CANCELLED",
        entityType: "ORDER",
        entityId: order.id,
        metadata: {
          actorRole: input.actorRole,
          fromStatus: order.status,
          reason,
        },
      },
    });
  }

  if (
    input.nextStatus === OrderStatus.CANCELLED ||
    input.nextStatus === OrderStatus.COMPLETED
  ) {
    await releaseTableIfNoActiveOrders(tx, order.tableId, order.sessionId);
  }

  return tx.order.findUniqueOrThrow({
    where: { id: order.id },
    select: orderStatusHistorySelect,
  });
}

export async function transitionOrderStatus(input: OrderWorkflowInput) {
  return prisma.$transaction((tx) =>
    transitionOrderStatusInTransaction(tx, input),
  );
}
