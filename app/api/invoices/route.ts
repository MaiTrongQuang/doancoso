import { NextResponse } from "next/server";
import {
  DiningSessionStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  TableStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getInvoiceDateFilterRange } from "@/lib/invoice-date-filter";
import { getInvoiceListRows } from "@/lib/invoice-read-model";
import { hasRole } from "@/lib/server-auth";
import {
  activeTableOrderStatuses,
  canPayDiningSession,
} from "@/lib/table-session-flow";

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
  return paymentMethods.has(paymentMethod)
    ? (paymentMethod as PaymentMethod)
    : null;
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
    const canCreateInvoice = await hasRole(["ADMIN", "CASHIER"]);

    if (!canCreateInvoice) {
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

    if (!paymentMethod) {
      return NextResponse.json(
        { message: "Phương thức thanh toán không hợp lệ." },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
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
    });

    if (!order) {
      return NextResponse.json(
        { message: "Đơn hàng không tồn tại." },
        { status: 404 },
      );
    }

    if (order.invoice || order.session?.invoice) {
      return NextResponse.json(
        { message: "Đơn hàng hoặc phiên bàn này đã có hóa đơn." },
        { status: 409 },
      );
    }

    const billOrders = order.session?.orders ?? [order];
    const billOrderStatuses = billOrders.map((billOrder) => billOrder.status);

    if (!canPayDiningSession(billOrderStatuses)) {
      return NextResponse.json(
        {
          message:
            "Chỉ có thể thanh toán khi tất cả đơn trong phiên bàn đã được phục vụ.",
        },
        { status: 400 },
      );
    }

    const payableOrderIds = billOrders
      .filter((billOrder) => billOrder.status === OrderStatus.SERVED)
      .map((billOrder) => billOrder.id);
    const totalAmount = billOrders
      .filter((billOrder) => billOrder.status === OrderStatus.SERVED)
      .reduce((total, billOrder) => total + billOrder.totalAmount, 0);

    const invoice = await prisma.$transaction(async (tx) => {
      if (paymentMethod === PaymentMethod.CASH) {
        await tx.payment.updateMany({
          where: {
            orderId: {
              in: payableOrderIds,
            },
            status: PaymentStatus.PENDING,
          },
          data: {
            status: PaymentStatus.CANCELLED,
          },
        });
      }

      await tx.order.updateMany({
        where: {
          id: {
            in: payableOrderIds,
          },
        },
        data: {
          status: OrderStatus.PAID,
        },
      });

      if (order.sessionId) {
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

      const remainingActiveOrders = await tx.order.count({
        where: {
          tableId: order.tableId,
          status: {
            in: [...activeTableOrderStatuses],
          },
        },
      });

      if (remainingActiveOrders === 0) {
        await tx.cafeTable.update({
          where: {
            id: order.tableId,
          },
          data: {
            status: TableStatus.AVAILABLE,
          },
        });
      }

      return tx.invoice.create({
        data: {
          orderId,
          sessionId: order.sessionId,
          totalAmount,
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
    });

    return NextResponse.json(
      {
        message: "Thanh toán thành công.",
        data: serializeCashierInvoice(invoice),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tạo hóa đơn." },
      { status: 500 },
    );
  }
}
