import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  PaymentTransactionStatus,
  Prisma,
} from "@prisma/client";
import {
  extractSepayTransferCode,
  isIncomingSepayTransfer,
  normalizeSepayAmount,
  normalizeSepayText,
} from "@/lib/sepay-payment";
import { prisma } from "@/lib/prisma";
import {
  OrderWorkflowError,
  transitionOrderStatusInTransaction,
} from "@/lib/order-workflow";

function getAuthorizedApiKey(request: Request) {
  const apiKey = normalizeSepayText(process.env.SEPAY_API_KEY);
  const authorization = normalizeSepayText(request.headers.get("authorization"));

  if (!apiKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Chưa cấu hình API key SePay." },
        { status: 500 },
      ),
    } as const;
  }

  if (authorization !== `Apikey ${apiKey}`) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Webhook SePay không hợp lệ." },
        { status: 401 },
      ),
    } as const;
  }

  return { ok: true } as const;
}

function getPayloadRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getProviderTransactionId(
  payload: Record<string, unknown>,
  rawData: Prisma.InputJsonValue,
) {
  const providerId = normalizeSepayText(
    payload.id ?? payload.transactionId ?? payload.sepayTransactionId,
  );

  if (providerId) {
    return providerId;
  }

  return `payload-${createHash("sha256")
    .update(JSON.stringify(rawData))
    .digest("hex")}`;
}

function getSepayContent(payload: Record<string, unknown>) {
  return payload.content ?? payload.description;
}

function getErrorStatus(error: OrderWorkflowError) {
  if (error.code === "NOT_FOUND") {
    return 404;
  }

  if (error.code === "FORBIDDEN") {
    return 403;
  }

  return error.code === "CONFLICT" ? 409 : 400;
}

export async function POST(request: Request) {
  const authorization = getAuthorizedApiKey(request);

  if (!authorization.ok) {
    return authorization.response;
  }

  const body = await request.json().catch(() => null);
  const payload = getPayloadRecord(body);

  if (!payload || !isIncomingSepayTransfer(payload.transferType)) {
    return NextResponse.json({ message: "Đã bỏ qua callback không hợp lệ." });
  }

  const transferCode = extractSepayTransferCode({
    code: payload.code,
    content: getSepayContent(payload),
  });
  const transferAmount = normalizeSepayAmount(payload.transferAmount);
  const rawData = toJsonValue(body);

  if (!transferCode || transferAmount === null) {
    return NextResponse.json({ message: "Callback chưa đủ dữ liệu thanh toán." });
  }

  const referenceCode = normalizeSepayText(payload.referenceCode);
  const providerTransactionId = getProviderTransactionId(payload, rawData);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingTransaction = await tx.paymentTransaction.findUnique({
        where: { providerTransactionId },
        select: { id: true, status: true },
      });

      if (existingTransaction) {
        return {
          ignored: true,
          message: "Callback đã được xử lý trước đó.",
          transactionStatus: existingTransaction.status,
        };
      }

      const paymentCandidate = await tx.payment.findUnique({
        where: { transferCode },
        include: {
          order: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
              tableId: true,
              sessionId: true,
              invoice: { select: { id: true } },
            },
          },
        },
      });

      if (!paymentCandidate) {
        return {
          ignored: true,
          message: "Không tìm thấy mã chuyển khoản tương ứng.",
          transactionStatus: PaymentTransactionStatus.REJECTED,
        };
      }

      // Serialize callbacks for the same payment so two webhook deliveries
      // cannot both pass the PENDING check and create two invoices.
      await tx.$queryRaw(Prisma.sql`
        SELECT id
        FROM orders
        WHERE id = ${paymentCandidate.orderId}
        FOR UPDATE
      `);

      await tx.$queryRaw(Prisma.sql`
        SELECT id
        FROM payments
        WHERE id = ${paymentCandidate.id}
        FOR UPDATE
      `);

      const payment = await tx.payment.findUnique({
        where: { id: paymentCandidate.id },
        include: {
          order: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
              tableId: true,
              sessionId: true,
              invoice: { select: { id: true } },
            },
          },
        },
      });

      if (!payment) {
        return {
          ignored: true,
          message: "Không tìm thấy thanh toán tương ứng.",
          transactionStatus: PaymentTransactionStatus.REJECTED,
        };
      }

      const existingTransactionAfterLock =
        await tx.paymentTransaction.findUnique({
          where: { providerTransactionId },
          select: { id: true, status: true },
        });

      if (existingTransactionAfterLock) {
        return {
          ignored: true,
          message: "Callback đã được xử lý trước đó.",
          transactionStatus: existingTransactionAfterLock.status,
        };
      }

      const transaction = await tx.paymentTransaction.create({
        data: {
          orderId: payment.orderId,
          paymentId: payment.id,
          provider: PaymentProvider.SEPAY,
          providerTransactionId,
          amount: transferAmount,
          referenceCode,
          rawData,
          status: PaymentTransactionStatus.RECEIVED,
        },
      });

      if (transferAmount < payment.amount) {
        await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: PaymentTransactionStatus.REJECTED,
            processedAt: new Date(),
          },
        });

        return {
          ignored: true,
          message: "Số tiền chuyển khoản chưa đủ.",
          transactionStatus: PaymentTransactionStatus.REJECTED,
        };
      }

      if (payment.status !== PaymentStatus.PENDING) {
        await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: PaymentTransactionStatus.DUPLICATE,
            processedAt: new Date(),
          },
        });

        return {
          ignored: true,
          message: "Thanh toán đã được xử lý trước đó.",
          transactionStatus: PaymentTransactionStatus.DUPLICATE,
        };
      }

      if (payment.order.status === OrderStatus.SERVED) {
        await transitionOrderStatusInTransaction(tx, {
          orderId: payment.orderId,
          actorUserId: null,
          actorRole: "SYSTEM",
          nextStatus: OrderStatus.AWAITING_PAYMENT,
        });
      }

      if (payment.order.status !== OrderStatus.SERVED && payment.order.status !== OrderStatus.AWAITING_PAYMENT) {
        await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: PaymentTransactionStatus.REJECTED,
            processedAt: new Date(),
          },
        });

        return {
          ignored: true,
          message: "Đơn chưa ở trạng thái chờ thanh toán.",
          transactionStatus: PaymentTransactionStatus.REJECTED,
        };
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          paidAt: new Date(),
          rawData,
          referenceCode,
          sepayTransactionId: providerTransactionId,
          status: PaymentStatus.PAID,
        },
      });

      if (payment.order.invoice) {
        await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: PaymentTransactionStatus.CONFLICT,
            processedAt: new Date(),
          },
        });

        return {
          ignored: true,
          message: "Đơn đã có hóa đơn, giao dịch được đưa vào đối soát.",
          transactionStatus: PaymentTransactionStatus.CONFLICT,
        };
      }

      await tx.invoice.create({
        data: {
          orderId: payment.orderId,
          // Every order is settled independently; the session groups orders
          // but must not make the invoice unique across the whole table visit.
          sessionId: null,
          paymentMethod: PaymentMethod.QR_PAYMENT,
          totalAmount: payment.amount,
        },
      });

      const completedOrder = await transitionOrderStatusInTransaction(tx, {
        orderId: payment.orderId,
        actorUserId: null,
        actorRole: "SYSTEM",
        nextStatus: OrderStatus.COMPLETED,
      });

      await tx.auditLog.create({
        data: {
          actorUserId: null,
          action: "PAYMENT_COMPLETED",
          entityType: "ORDER",
          entityId: payment.orderId,
          metadata: {
            actorRole: "SYSTEM",
            paymentMethod: PaymentMethod.QR_PAYMENT,
            provider: PaymentProvider.SEPAY,
            providerTransactionId,
          },
        },
      });

      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: PaymentTransactionStatus.APPLIED,
          processedAt: new Date(),
        },
      });

      return {
        ignored: false,
        message: "Đã ghi nhận thanh toán và hoàn tất đơn.",
        transactionStatus: PaymentTransactionStatus.APPLIED,
        orderId: completedOrder.id,
      };
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof OrderWorkflowError) {
      return NextResponse.json(
        { message: error.message },
        { status: getErrorStatus(error) },
      );
    }

    console.error(error);

    return NextResponse.json(
      { message: "Không thể xử lý callback thanh toán." },
      { status: 500 },
    );
  }
}
