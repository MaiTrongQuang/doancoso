import { NextResponse } from "next/server";
import {
  DiningSessionStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  TableStatus,
} from "@prisma/client";
import {
  canConfirmSepayPayment,
  extractSepayTransferCode,
  getOrderStatusAfterSepayPayment,
  isIncomingSepayTransfer,
  normalizeSepayAmount,
  normalizeSepayText,
} from "@/lib/sepay-payment";
import { prisma } from "@/lib/prisma";
import { activeTableOrderStatuses } from "@/lib/table-session-flow";

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

function getSepayTransactionId(payload: Record<string, unknown>) {
  return normalizeSepayText(
    payload.id ?? payload.transactionId ?? payload.sepayTransactionId,
  );
}

function getSepayContent(payload: Record<string, unknown>) {
  return payload.content ?? payload.description;
}

async function rememberWebhookDebugData({
  paymentId,
  rawData,
  referenceCode,
  sepayTransactionId,
}: {
  paymentId: number;
  rawData: Prisma.InputJsonValue;
  referenceCode: string | null;
  sepayTransactionId: string | null;
}) {
  await prisma.payment.update({
    where: {
      id: paymentId,
    },
    data: {
      rawData,
      ...(referenceCode ? { referenceCode } : {}),
      ...(sepayTransactionId ? { sepayTransactionId } : {}),
    },
  });
}

async function processSepayWebhook(body: unknown) {
  const payload = getPayloadRecord(body);

  if (!payload) {
    return;
  }

  if (!isIncomingSepayTransfer(payload.transferType)) {
    return;
  }

  const transferCode = extractSepayTransferCode({
    code: payload.code,
    content: getSepayContent(payload),
  });

  if (!transferCode) {
    return;
  }

  const transferAmount = normalizeSepayAmount(payload.transferAmount);

  if (transferAmount === null) {
    return;
  }

  const rawData = toJsonValue(body);
  const referenceCode = normalizeSepayText(payload.referenceCode);
  const sepayTransactionId = getSepayTransactionId(payload);

  const payment = await prisma.payment.findUnique({
    where: {
      transferCode,
    },
    include: {
      order: {
        include: {
          invoice: true,
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
      },
    },
  });

  if (!payment) {
    return;
  }

  if (!canConfirmSepayPayment(payment.status)) {
    await rememberWebhookDebugData({
      paymentId: payment.id,
      rawData,
      referenceCode,
      sepayTransactionId,
    });

    return NextResponse.json({
      message: "Thanh toán SePay không còn ở trạng thái chờ, đã bỏ qua.",
      data: {
        ignored: true,
        paymentStatus: payment.status,
      },
    });
  }

  if (transferAmount < payment.amount) {
    await rememberWebhookDebugData({
      paymentId: payment.id,
      rawData,
      referenceCode,
      sepayTransactionId,
    });

    return NextResponse.json({
      message: "Số tiền chuyển khoản chưa đủ, chưa xác nhận thanh toán.",
      data: {
        ignored: true,
        paymentStatus: payment.status,
      },
    });
  }

  await prisma.$transaction(async (tx) => {
    const currentPayment = await tx.payment.findUnique({
      where: {
        id: payment.id,
      },
      include: {
        order: {
          include: {
            session: {
              include: {
                orders: {
                  select: {
                    id: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!currentPayment) {
      throw new Error("Payment disappeared while processing webhook.");
    }

    if (!canConfirmSepayPayment(currentPayment.status)) {
      await tx.payment.update({
        where: {
          id: currentPayment.id,
        },
        data: {
          rawData,
          referenceCode: referenceCode ?? currentPayment.referenceCode,
          sepayTransactionId:
            sepayTransactionId ?? currentPayment.sepayTransactionId,
        },
      });

      return;
    }

    await tx.payment.update({
      where: {
        id: currentPayment.id,
      },
      data: {
        paidAt: currentPayment.paidAt ?? new Date(),
        rawData,
        referenceCode: referenceCode ?? currentPayment.referenceCode,
        sepayTransactionId:
          sepayTransactionId ?? currentPayment.sepayTransactionId,
        status: PaymentStatus.PAID,
      },
    });

    const nextOrderStatus = getOrderStatusAfterSepayPayment(
      currentPayment.order.status,
    );

    if (nextOrderStatus === OrderStatus.CONFIRMED) {
      await tx.order.update({
        where: {
          id: currentPayment.orderId,
        },
        data: {
          status: OrderStatus.CONFIRMED,
        },
      });

      const existingInvoice = await tx.invoice.findUnique({
        where: {
          orderId: currentPayment.orderId,
        },
        select: {
          id: true,
        },
      });

      if (existingInvoice) {
        await tx.invoice.update({
          where: {
            id: existingInvoice.id,
          },
          data: {
            paymentMethod: PaymentMethod.QR_PAYMENT,
            totalAmount: currentPayment.amount,
          },
        });

        return;
      }

      await tx.invoice.create({
        data: {
          orderId: currentPayment.orderId,
          paymentMethod: PaymentMethod.QR_PAYMENT,
          totalAmount: currentPayment.amount,
        },
      });

      return;
    }

    if (nextOrderStatus !== OrderStatus.PAID) {
      return;
    }

    const billOrderIds =
      currentPayment.order.session?.orders
        .filter((order) => order.status !== OrderStatus.CANCELLED)
        .map((order) => order.id) ?? [currentPayment.orderId];

    await tx.order.updateMany({
      where: {
        id: {
          in: billOrderIds,
        },
      },
      data: {
        status: OrderStatus.PAID,
      },
    });

    if (currentPayment.order.sessionId) {
      await tx.diningSession.update({
        where: {
          id: currentPayment.order.sessionId,
        },
        data: {
          closedAt: new Date(),
          status: DiningSessionStatus.CLOSED,
        },
      });
    }

    const remainingActiveOrders = await tx.order.count({
      where: {
        tableId: currentPayment.order.tableId,
        status: {
          in: [...activeTableOrderStatuses],
        },
      },
    });

    if (remainingActiveOrders === 0) {
      await tx.cafeTable.update({
        where: {
          id: currentPayment.order.tableId,
        },
        data: {
          status: TableStatus.AVAILABLE,
        },
      });
    }

    const existingInvoice = await tx.invoice.findFirst({
      where: {
        OR: [
          {
            orderId: currentPayment.orderId,
          },
          ...(currentPayment.order.sessionId
            ? [
                {
                  sessionId: currentPayment.order.sessionId,
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
      },
    });

    if (existingInvoice) {
      await tx.invoice.update({
        where: {
          id: existingInvoice.id,
        },
        data: {
          paymentMethod: PaymentMethod.QR_PAYMENT,
          totalAmount: currentPayment.amount,
        },
        select: {
          id: true,
        },
      });

      return;
    }

    await tx.invoice.create({
      data: {
        orderId: currentPayment.orderId,
        paymentMethod: PaymentMethod.QR_PAYMENT,
        sessionId: currentPayment.order.sessionId,
        totalAmount: currentPayment.amount,
      },
      select: {
        id: true,
      },
    });
  });
}

export async function POST(request: Request) {
  const authorization = getAuthorizedApiKey(request);

  if (!authorization.ok) {
    return authorization.response;
  }

  const body = await request.json().catch(() => null);
  const payload = getPayloadRecord(body);

  if (!payload) {
    return NextResponse.json(
      { message: "Payload SePay không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const processingResponse = await processSepayWebhook(body);

    if (processingResponse) {
      return processingResponse;
    }
  } catch (error) {
    console.error("Không thể xử lý webhook SePay.", error);

    return NextResponse.json(
      { message: "Không thể xử lý webhook SePay." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "Đã nhận webhook SePay.",
    data: {
      accepted: true,
    },
  });
}
