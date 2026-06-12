import { NextResponse } from "next/server";
import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/server-auth";

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
