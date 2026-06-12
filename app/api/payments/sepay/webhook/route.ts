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

  if (!isIncomingSepayTransfer(payload.transferType)) {
    return NextResponse.json({
      message: "Webhook không phải giao dịch tiền vào, đã bỏ qua.",
      data: {
        ignored: true,
      },
    });
  }

  const transferCode = extractSepayTransferCode({
    code: payload.code,
    content: getSepayContent(payload),
  });

  if (!transferCode) {
    return NextResponse.json({
      message: "Không tìm thấy mã thanh toán trong webhook.",
      data: {
        ignored: true,
      },
    });
  }

  const transferAmount = normalizeSepayAmount(payload.transferAmount);

  if (transferAmount === null) {
    return NextResponse.json(
      { message: "Số tiền giao dịch SePay không hợp lệ." },
      { status: 400 },
    );
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
    return NextResponse.json({
      message: "Không tìm thấy thanh toán tương ứng, đã bỏ qua.",
      data: {
        ignored: true,
      },
    });
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

  try {
    const result = await prisma.$transaction(async (tx) => {
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

        return {
          ignored: true,
          invoiceId: null,
          paymentId: currentPayment.id,
          paymentStatus: currentPayment.status,
        };
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

      const invoice = existingInvoice
        ? await tx.invoice.update({
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
          })
        : await tx.invoice.create({
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

      return {
        ignored: false,
        invoiceId: invoice.id,
        paymentId: currentPayment.id,
        paymentStatus: PaymentStatus.PAID,
      };
    });

    return NextResponse.json({
      message: "Đã xác nhận thanh toán SePay.",
      data: {
        ...result,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể xử lý webhook SePay." },
      { status: 500 },
    );
  }
}
