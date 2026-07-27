import { NextResponse } from "next/server";
import { PaymentMethod } from "@prisma/client";
import { getInvoiceDateFilterRange } from "@/lib/invoice-date-filter";
import { getInvoiceListRows } from "@/lib/invoice-read-model";
import {
  getCurrentActor,
  hasRole,
} from "@/lib/server-auth";
import { completeManualPayment } from "@/lib/payment-workflow";
import { OrderWorkflowError } from "@/lib/order-workflow";

const paymentMethods = new Set<string>(Object.values(PaymentMethod));

function normalizeId(value: unknown) {
  const id = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizePaymentMethod(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const paymentMethod = value.trim().toUpperCase();
  if (!paymentMethods.has(paymentMethod)) {
    return null;
  }

  return paymentMethod as PaymentMethod;
}

function serializeCashierInvoice(invoice: {
  id: number;
  orderId: number;
  sessionId: number | null;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paidAt: Date;
  createdAt: Date;
  order: {
    table: {
      id: number;
      name: string;
    };
  };
}) {
  return {
    id: invoice.id,
    orderId: invoice.orderId,
    sessionId: invoice.sessionId,
    totalAmount: invoice.totalAmount,
    paymentMethod: invoice.paymentMethod,
    paidAt: invoice.paidAt.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    order: {
      table: invoice.order.table,
      items: [],
    },
  };
}

export async function GET(request: Request) {
  try {
    const canReadInvoices = await hasRole(["ADMIN", "CASHIER"]);

    if (!canReadInvoices) {
      return NextResponse.json(
        { message: "Bạn không có quyền xem hóa đơn." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const dateFilter = getInvoiceDateFilterRange({
      date: searchParams.get("date"),
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
    });

    if (!dateFilter.ok) {
      return NextResponse.json(
        { message: dateFilter.message },
        { status: 400 },
      );
    }

    const paidAtFilter = dateFilter.range
      ? {
          ...(dateFilter.range.start ? { gte: dateFilter.range.start } : {}),
          ...(dateFilter.range.end ? { lt: dateFilter.range.end } : {}),
        }
      : null;

    return NextResponse.json({
      data: await getInvoiceListRows(paidAtFilter),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tải danh sách hóa đơn." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getCurrentActor();

    if (!actor || !["ADMIN", "CASHIER"].includes(actor.role)) {
      return NextResponse.json(
        { message: "Bạn không có quyền thanh toán hóa đơn." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const orderId = normalizeId(body?.orderId);
    const paymentMethod = normalizePaymentMethod(body?.paymentMethod);

    if (!orderId) {
      return NextResponse.json(
        { message: "Mã đơn hàng không hợp lệ." },
        { status: 400 },
      );
    }

    if (
      paymentMethod !== PaymentMethod.CASH &&
      paymentMethod !== PaymentMethod.BANK_TRANSFER
    ) {
      return NextResponse.json(
        {
          message:
            "Thanh toán QR phải đi qua endpoint callback SePay để chống ghi nhận trùng.",
        },
        { status: 400 },
      );
    }

    const result = await completeManualPayment({
      orderId,
      actorUserId: actor.userId,
      actorRole: actor.role,
      paymentMethod,
    });

    return NextResponse.json(
      {
        message: "Thanh toán thành công.",
        data: serializeCashierInvoice(result.invoice),
      },
      { status: 201 },
    );
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
      { message: "Không thể tạo hóa đơn." },
      { status: 500 },
    );
  }
}
