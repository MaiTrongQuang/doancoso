import { NextResponse } from "next/server";
import {
  DiningSessionStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  TableStatus,
} from "@prisma/client";
import {
  canTransitionOrderStatus,
  getPersistedOrderStatusAfterTransition,
  isLockedOrderStatus,
  isOrderStatus,
} from "@/lib/order-status-flow";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/server-auth";
import { activeTableOrderStatuses } from "@/lib/table-session-flow";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeStatus(value: unknown) {
  if (isOrderStatus(value)) {
    return value;
  }

  return null;
}

function normalizePaymentMethod(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const paymentMethod = value.trim().toUpperCase();

  return Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod)
    ? (paymentMethod as PaymentMethod)
    : null;
}

function serializeOrderStatusPatch(order: {
  id: number;
  status: OrderStatus;
  updatedAt: Date;
  invoice?: {
    id: number;
    paymentMethod: PaymentMethod;
    totalAmount: number;
  } | null;
}) {
  return {
    id: order.id,
    invoice: order.invoice
      ? {
          id: order.invoice.id,
          paymentMethod: order.invoice.paymentMethod,
          totalAmount: order.invoice.totalAmount,
        }
      : null,
    status: order.status,
    updatedAt: order.updatedAt.toISOString(),
  };
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id: idParam } = await params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json(
      { message: "Mã đơn hàng không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const canUpdateOrder = await hasRole(["ADMIN", "STAFF", "CASHIER"]);

    if (!canUpdateOrder) {
      return NextResponse.json(
        { message: "Bạn không có quyền cập nhật đơn hàng." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const nextStatus = normalizeStatus(body?.status);
    const paymentMethod = normalizePaymentMethod(body?.paymentMethod);

    if (!nextStatus) {
      return NextResponse.json(
        { message: "Trạng thái đơn hàng không hợp lệ." },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        tableId: true,
        sessionId: true,
        status: true,
        totalAmount: true,
        invoice: {
          select: {
            id: true,
            paymentMethod: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Đơn hàng không tồn tại." },
        { status: 404 },
      );
    }

    if (isLockedOrderStatus(order.status)) {
      return NextResponse.json(
        {
          message:
            order.status === OrderStatus.PAID
              ? "Đơn đã thanh toán nên không thể cập nhật hoặc hủy."
              : "Đơn đã hủy nên không thể cập nhật lại.",
        },
        { status: 409 },
      );
    }

    if (
      order.status === OrderStatus.PENDING &&
      nextStatus === OrderStatus.CONFIRMED
    ) {
      if (!paymentMethod) {
        return NextResponse.json(
          {
            message:
              "Vui lòng chọn phương thức thanh toán trước khi xác nhận đơn.",
          },
          { status: 400 },
        );
      }

      if (order.invoice) {
        return NextResponse.json(
          { message: "Đơn này đã có hóa đơn thanh toán." },
          { status: 409 },
        );
      }

      const updatedOrder = await prisma.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: {
            orderId: id,
            status: PaymentStatus.PENDING,
          },
          data: {
            status: PaymentStatus.CANCELLED,
          },
        });

        const invoice = await tx.invoice.create({
          data: {
            orderId: id,
            totalAmount: order.totalAmount,
            paymentMethod,
          },
          select: {
            id: true,
            paymentMethod: true,
            totalAmount: true,
          },
        });

        const confirmedOrder = await tx.order.update({
          where: { id },
          data: {
            status: OrderStatus.CONFIRMED,
          },
          select: {
            id: true,
            status: true,
            updatedAt: true,
          },
        });

        return {
          ...confirmedOrder,
          invoice,
        };
      });

      return NextResponse.json({
        message: "Đã xác nhận thanh toán và chuyển đơn sang quầy pha chế.",
        data: serializeOrderStatusPatch(updatedOrder),
      });
    }

    if (nextStatus === OrderStatus.CANCELLED && order.invoice) {
      return NextResponse.json(
        {
          message:
            "Đơn đã thu tiền nên cần xử lý hoàn tiền hoặc đổi món tại quầy trước khi hủy.",
        },
        { status: 409 },
      );
    }

    if (!canTransitionOrderStatus(order.status, nextStatus)) {
      return NextResponse.json(
        { message: "Không thể chuyển trạng thái đơn hàng theo luồng này." },
        { status: 400 },
      );
    }

    const persistedNextStatus = getPersistedOrderStatusAfterTransition({
      hasInvoice: Boolean(order.invoice),
      nextStatus,
    });

    if (nextStatus !== OrderStatus.CANCELLED) {
      const updatedOrder = await prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
          where: { id },
          data: {
            status: persistedNextStatus,
          },
          select: {
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
          },
        });

        if (persistedNextStatus === OrderStatus.PAID) {
          const activeOrdersInTable = await tx.order.count({
            where: {
              tableId: order.tableId,
              status: {
                in: [...activeTableOrderStatuses],
              },
            },
          });

          if (activeOrdersInTable === 0) {
            await tx.cafeTable.update({
              where: {
                id: order.tableId,
              },
              data: {
                status: TableStatus.AVAILABLE,
              },
            });
          }

          if (order.sessionId) {
            const remainingActiveSessionOrders = await tx.order.count({
              where: {
                sessionId: order.sessionId,
                status: {
                  in: [...activeTableOrderStatuses],
                },
              },
            });

            if (remainingActiveSessionOrders === 0) {
              await tx.diningSession.update({
                where: {
                  id: order.sessionId,
                },
                data: {
                  status: DiningSessionStatus.CLOSED,
                  closedAt: new Date(),
                },
              });
            }
          }
        }

        return updatedOrder;
      });

      return NextResponse.json({
        message:
          persistedNextStatus === OrderStatus.PAID
            ? "Đơn đã phục vụ và được đóng thanh toán."
            : "Cập nhật trạng thái đơn hàng thành công.",
        data: serializeOrderStatusPatch(updatedOrder),
      });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: nextStatus,
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });

      if (nextStatus === OrderStatus.CANCELLED) {
        const activeOrdersInTable = await tx.order.count({
          where: {
            tableId: order.tableId,
            id: {
              not: id,
            },
            status: {
              in: [...activeTableOrderStatuses],
            },
          },
        });

        if (activeOrdersInTable === 0) {
          await tx.cafeTable.update({
            where: {
              id: order.tableId,
            },
            data: {
              status: TableStatus.AVAILABLE,
            },
          });
        }

        if (order.sessionId) {
          const remainingBillableOrders = await tx.order.count({
            where: {
              sessionId: order.sessionId,
              status: {
                not: OrderStatus.CANCELLED,
              },
            },
          });

          if (remainingBillableOrders === 0) {
            await tx.diningSession.update({
              where: {
                id: order.sessionId,
              },
              data: {
                status: DiningSessionStatus.CANCELLED,
                closedAt: new Date(),
              },
            });
          }
        }
      }

      return updatedOrder;
    });

    return NextResponse.json({
      message: "Cập nhật trạng thái đơn hàng thành công.",
      data: serializeOrderStatusPatch(updatedOrder),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể cập nhật trạng thái đơn hàng." },
      { status: 500 },
    );
  }
}
