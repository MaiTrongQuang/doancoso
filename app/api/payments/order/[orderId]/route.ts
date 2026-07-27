import { NextResponse } from "next/server";
import {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from "@prisma/client";
import { getSepayQrDescription } from "@/lib/sepay-payment";
import { prisma } from "@/lib/prisma";
import {
  getCurrentActor,
  hasRole,
} from "@/lib/server-auth";
import {
  OrderWorkflowError,
} from "@/lib/order-workflow";
import { completeManualPayment } from "@/lib/payment-workflow";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function serializePayment(payment: {
  id: number;
  orderId: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  transferCode: string;
  qrUrl: string | null;
  bankCode: string;
  accountNumber: string;
  accountName: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
} | null) {
  if (!payment) {
    return null;
  }

  return {
    id: payment.id,
    orderId: payment.orderId,
    provider: payment.provider,
    status: payment.status,
    amount: payment.amount,
    transferCode: payment.transferCode,
    qrUrl: payment.qrUrl,
    bankCode: payment.bankCode,
    accountNumber: payment.accountNumber,
    accountName: payment.accountName,
    transferDescription: getSepayQrDescription(
      payment.qrUrl,
      payment.transferCode,
    ),
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { orderId: orderIdParam } = await params;
  const orderId = parseId(orderIdParam);

  if (!orderId) {
    return NextResponse.json(
      { message: "Mã đơn hàng không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const canReadPayment = await hasRole(["ADMIN", "CASHIER"]);

    if (!canReadPayment) {
      return NextResponse.json(
        { message: "Bạn không có quyền xem trạng thái thanh toán." },
        { status: 403 },
      );
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        sessionId: true,
        status: true,
        totalAmount: true,
        invoice: {
          select: {
            id: true,
            paymentMethod: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Đơn hàng không tồn tại." },
        { status: 404 },
      );
    }

    const payment = serializePayment(order.payment);

    return NextResponse.json({
      data: {
        order: {
          id: order.id,
          sessionId: order.sessionId,
          status: order.status,
          totalAmount: order.totalAmount,
          invoice: order.invoice,
        },
        orderStatus: order.status,
        payment,
        paymentStatus: payment?.status ?? null,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tải trạng thái thanh toán." },
      { status: 500 },
    );
  }
}

function normalizePaymentMethod(value: unknown) {
  if (value === PaymentMethod.CASH) {
    return value;
  }

  return null;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { orderId: orderIdParam } = await params;
  const orderId = parseId(orderIdParam);

  if (!orderId) {
    return NextResponse.json(
      { message: "Mã đơn hàng không hợp lệ." },
      { status: 400 },
    );
  }

  const actor = await getCurrentActor();

  if (!actor || !["ADMIN", "CASHIER"].includes(actor.role)) {
    return NextResponse.json(
      { message: "Chỉ thu ngân hoặc quản trị viên được xác nhận thanh toán." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const paymentMethod = normalizePaymentMethod(body?.paymentMethod);

  if (!paymentMethod) {
    return NextResponse.json(
      { message: "Phương thức thanh toán không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const result = await completeManualPayment({
      orderId,
      actorUserId: actor.userId,
      actorRole: actor.role,
      paymentMethod,
    });

    return NextResponse.json({
      message: "Đã xác nhận thanh toán và hoàn tất đơn hàng.",
      data: {
        id: result.order.id,
        status: result.order.status,
        updatedAt: result.order.updatedAt.toISOString(),
        invoice: result.invoice,
      },
    });
  } catch (error) {
    if (error instanceof OrderWorkflowError) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : error.code === "FORBIDDEN"
            ? 403
            : error.code === "CONFLICT"
              ? 409
              : 400;

      return NextResponse.json({ message: error.message }, { status });
    }

    console.error(error);

    return NextResponse.json(
      { message: "Không thể xác nhận thanh toán." },
      { status: 500 },
    );
  }
}
