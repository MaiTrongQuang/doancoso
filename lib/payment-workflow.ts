import {
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentTransactionStatus,
  Prisma,
} from "@prisma/client";
import {
  OrderWorkflowError,
  transitionOrderStatusInTransaction,
} from "@/lib/order-workflow";
import type { OrderActorRole } from "@/lib/order-status-flow";
import { prisma } from "@/lib/prisma";

export async function completeManualPayment({
  actorRole,
  actorUserId,
  orderId,
  paymentMethod,
}: {
  actorRole: OrderActorRole;
  actorUserId: number;
  orderId: number;
  paymentMethod: PaymentMethod;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`
      SELECT id
      FROM orders
      WHERE id = ${orderId}
      FOR UPDATE
    `);

    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        invoice: { select: { id: true } },
        sessionId: true,
      },
    });

    if (!order) {
      throw new OrderWorkflowError("Đơn hàng không tồn tại.", "NOT_FOUND");
    }

    if (order.invoice) {
      throw new OrderWorkflowError(
        "Đơn hàng đã có hóa đơn thanh toán.",
        "CONFLICT",
      );
    }

    if (order.status === OrderStatus.SERVED) {
      await transitionOrderStatusInTransaction(tx, {
        orderId,
        actorUserId,
        actorRole,
        nextStatus: OrderStatus.AWAITING_PAYMENT,
      });
    } else if (order.status !== OrderStatus.AWAITING_PAYMENT) {
      throw new OrderWorkflowError(
        "Chỉ được thanh toán khi đơn đã phục vụ.",
        "INVALID_TRANSITION",
      );
    }

    const invoice = await tx.invoice.create({
      data: {
        orderId,
        // New orders are settled individually. The session remains the grouping key.
        sessionId: null,
        totalAmount: order.totalAmount,
        paymentMethod,
      },
      select: {
        id: true,
        orderId: true,
        sessionId: true,
        totalAmount: true,
        paymentMethod: true,
        paidAt: true,
        createdAt: true,
        order: {
          select: {
            table: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    await tx.$queryRaw(Prisma.sql`
      SELECT id
      FROM payments
      WHERE order_id = ${orderId}
      FOR UPDATE
    `);

    await tx.payment.updateMany({
      where: {
        orderId,
        status: "PENDING",
      },
      data: {
        status: "CANCELLED",
      },
    });

    await tx.paymentTransaction.create({
      data: {
        orderId,
        provider: PaymentProvider.INTERNAL,
        providerTransactionId: `INTERNAL-ORDER-${orderId}`,
        status: PaymentTransactionStatus.APPLIED,
        amount: order.totalAmount,
        referenceCode: `CASHIER-${actorUserId}-${paymentMethod}`,
        processedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId,
        action: "PAYMENT_COMPLETED",
        entityType: "ORDER",
        entityId: orderId,
        metadata: {
          actorRole,
          paymentMethod,
          provider: PaymentProvider.INTERNAL,
        },
      },
    });

    const completedOrder = await transitionOrderStatusInTransaction(tx, {
      orderId,
      actorUserId,
      actorRole,
      nextStatus: OrderStatus.COMPLETED,
    });

    return {
      invoice,
      order: completedOrder,
    };
  });
}
