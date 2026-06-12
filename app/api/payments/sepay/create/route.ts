import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import {
  buildSepayQrUrl,
  buildSepayTransferCode,
  normalizeSepayText,
} from "@/lib/sepay-payment";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/server-auth";
import { canPayDiningSession } from "@/lib/table-session-flow";

function normalizeId(value: unknown) {
  const id = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getSepayBankConfig() {
  const bankCode = normalizeSepayText(process.env.SEPAY_BANK_CODE);
  const accountNumber = normalizeSepayText(process.env.SEPAY_ACCOUNT_NUMBER);
  const accountName = normalizeSepayText(process.env.SEPAY_ACCOUNT_NAME);

  if (!bankCode || !accountNumber) {
    return null;
  }

  return {
    accountName,
    accountNumber,
    bankCode,
  };
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
}) {
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

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function createPendingPayment({
  accountName,
  accountNumber,
  amount,
  bankCode,
  orderId,
}: {
  accountName: string | null;
  accountNumber: string;
  amount: number;
  bankCode: string;
  orderId: number;
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const transferCode = buildSepayTransferCode(
      orderId,
      `${Date.now().toString(36)}${randomUUID().slice(0, 8)}`,
    );
    const qrUrl = buildSepayQrUrl({
      accountNumber,
      amount,
      bankCode,
      transferCode,
    });

    try {
      return await prisma.payment.create({
        data: {
          accountName,
          accountNumber,
          amount,
          bankCode,
          orderId,
          provider: PaymentProvider.SEPAY,
          qrUrl,
          status: PaymentStatus.PENDING,
          transferCode,
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === 2) {
        throw error;
      }
    }
  }

  throw new Error("Unable to create a unique SePay payment.");
}

export async function POST(request: Request) {
  let normalizedOrderId: number | null = null;

  try {
    const canCreatePayment = await hasRole(["ADMIN", "CASHIER"]);

    if (!canCreatePayment) {
      return NextResponse.json(
        { message: "Bạn không có quyền tạo thanh toán QR." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const orderId = normalizeId(body?.orderId);
    normalizedOrderId = orderId;

    if (!orderId) {
      return NextResponse.json(
        { message: "Mã đơn hàng không hợp lệ." },
        { status: 400 },
      );
    }

    const sepayConfig = getSepayBankConfig();

    if (!sepayConfig) {
      return NextResponse.json(
        { message: "Chưa cấu hình tài khoản ngân hàng SePay." },
        { status: 500 },
      );
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        invoice: true,
        payment: true,
        session: {
          include: {
            invoice: true,
            orders: {
              select: {
                id: true,
                status: true,
                totalAmount: true,
              },
            },
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

    if (order.status !== OrderStatus.SERVED) {
      return NextResponse.json(
        { message: "Chỉ có thể tạo QR cho đơn đã được phục vụ." },
        { status: 400 },
      );
    }

    if (order.invoice || order.session?.invoice) {
      return NextResponse.json(
        { message: "Đơn hàng hoặc phiên bàn này đã có hóa đơn." },
        { status: 409 },
      );
    }

    if (order.payment?.status === PaymentStatus.PENDING) {
      return NextResponse.json({
        message: "Đã có mã QR đang chờ thanh toán.",
        data: serializePayment(order.payment),
        qrUrl: order.payment.qrUrl,
      });
    }

    if (order.payment) {
      return NextResponse.json(
        { message: "Đơn hàng này đã có giao dịch thanh toán." },
        { status: 409 },
      );
    }

    const billOrders = order.session?.orders ?? [order];
    const billOrderStatuses = billOrders.map((billOrder) => billOrder.status);

    if (!canPayDiningSession(billOrderStatuses)) {
      return NextResponse.json(
        {
          message:
            "Chỉ có thể tạo QR khi tất cả đơn trong phiên bàn đã được phục vụ.",
        },
        { status: 400 },
      );
    }

    const amount = billOrders
      .filter((billOrder) => billOrder.status === OrderStatus.SERVED)
      .reduce((total, billOrder) => total + billOrder.totalAmount, 0);

    if (amount <= 0) {
      return NextResponse.json(
        { message: "Số tiền thanh toán không hợp lệ." },
        { status: 400 },
      );
    }

    const payment = await createPendingPayment({
      ...sepayConfig,
      amount,
      orderId,
    });

    return NextResponse.json(
      {
        message: "Đã tạo mã QR thanh toán SePay.",
        data: serializePayment(payment),
        qrUrl: payment.qrUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const payment = normalizedOrderId
        ? await prisma.payment.findUnique({ where: { orderId: normalizedOrderId } })
        : null;

      if (payment?.status === PaymentStatus.PENDING) {
        return NextResponse.json({
          message: "Đã có mã QR đang chờ thanh toán.",
          data: serializePayment(payment),
          qrUrl: payment.qrUrl,
        });
      }
    }

    console.error(error);

    return NextResponse.json(
      { message: "Không thể tạo thanh toán QR SePay." },
      { status: 500 },
    );
  }
}
