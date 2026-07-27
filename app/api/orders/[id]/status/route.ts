import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { isOrderStatus } from "@/lib/order-status-flow";
import {
  OrderWorkflowError,
  transitionOrderStatus,
} from "@/lib/order-workflow";
import { getCurrentActor } from "@/lib/server-auth";

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
    return value as OrderStatus;
  }

  return null;
}

function serializeOrderStatusPatch(order: {
  id: number;
  status: OrderStatus;
  updatedAt: Date;
  invoice: {
    id: number;
    paymentMethod: string;
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

function getWorkflowErrorResponse(error: OrderWorkflowError) {
  const statusByCode: Record<OrderWorkflowError["code"], number> = {
    NOT_FOUND: 404,
    FORBIDDEN: 403,
    INVALID_TRANSITION: 400,
    CONFLICT: 409,
    REASON_REQUIRED: 400,
  };

  return NextResponse.json(
    { message: error.message },
    { status: statusByCode[error.code] },
  );
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

  const actor = await getCurrentActor();

  if (!actor) {
    return NextResponse.json(
      { message: "Bạn cần đăng nhập để cập nhật đơn hàng." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const nextStatus = normalizeStatus(body?.status);

  if (!nextStatus) {
    return NextResponse.json(
      { message: "Trạng thái đơn hàng không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const updatedOrder = await transitionOrderStatus({
      orderId: id,
      actorUserId: actor.userId,
      actorRole: actor.role,
      nextStatus,
      reason: typeof body?.reason === "string" ? body.reason : null,
    });

    return NextResponse.json({
      message:
        nextStatus === OrderStatus.CONFIRMED
          ? "Đã gửi đơn sang bếp/quầy pha chế."
          : nextStatus === OrderStatus.READY
            ? "Món đã sẵn sàng phục vụ."
            : nextStatus === OrderStatus.SERVED
              ? "Đã xác nhận phục vụ."
              : nextStatus === OrderStatus.AWAITING_PAYMENT
                ? "Đơn đang chờ thanh toán."
                : nextStatus === OrderStatus.CANCELLED
                  ? "Đã hủy đơn hàng."
                  : "Cập nhật trạng thái đơn hàng thành công.",
      data: serializeOrderStatusPatch(updatedOrder),
    });
  } catch (error) {
    if (error instanceof OrderWorkflowError) {
      return getWorkflowErrorResponse(error);
    }

    console.error(error);

    return NextResponse.json(
      { message: "Không thể cập nhật trạng thái đơn hàng." },
      { status: 500 },
    );
  }
}
