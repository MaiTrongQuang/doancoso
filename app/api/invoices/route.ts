import { NextResponse } from "next/server";
import { OrderStatus, PaymentMethod, TableStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/server-auth";

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

function getVietnamDateRange(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const start = new Date(`${value}T00:00:00.000+07:00`);

  if (Number.isNaN(start.getTime())) {
    return null;
  }

  return {
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
}

function serializeInvoice(invoice: {
  id: number;
  orderId: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paidAt: Date;
  createdAt: Date;
  order: {
    id: number;
    status: OrderStatus;
    note: string | null;
    totalAmount: number;
    createdAt: Date;
    table: {
      id: number;
      name: string;
    };
    items: Array<{
      id: number;
      productId: number;
      quantity: number;
      price: number;
      note: string | null;
      product: {
        id: number;
        name: string;
      };
    }>;
  };
}) {
  return {
    id: invoice.id,
    orderId: invoice.orderId,
    totalAmount: invoice.totalAmount,
    paymentMethod: invoice.paymentMethod,
    paidAt: invoice.paidAt.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    order: {
      id: invoice.order.id,
      status: invoice.order.status,
      note: invoice.order.note,
      totalAmount: invoice.order.totalAmount,
      createdAt: invoice.order.createdAt.toISOString(),
      table: invoice.order.table,
      items: invoice.order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price,
        note: item.note,
      })),
    },
  };
}

const invoiceInclude = {
  order: {
    include: {
      table: {
        select: {
          id: true,
          name: true,
        },
      },
      items: {
        orderBy: {
          id: "asc",
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
} as const;

export async function GET(request: Request) {
  try {
    const canReadInvoices = await hasRole(["ADMIN", "CASHIER"]);

    if (!canReadInvoices) {
      return NextResponse.json(
        { message: "Ban khong co quyen xem hoa don." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const dateRange = getVietnamDateRange(searchParams.get("date"));

    const invoices = await prisma.invoice.findMany({
      where: {
        ...(dateRange
          ? {
              paidAt: {
                gte: dateRange.start,
                lt: dateRange.end,
              },
            }
          : {}),
      },
      orderBy: {
        paidAt: "desc",
      },
      include: invoiceInclude,
    });

    return NextResponse.json({
      data: invoices.map(serializeInvoice),
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
        { message: "Ban khong co quyen thanh toan hoa don." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const orderId = normalizeId(body?.orderId);
    const paymentMethod = normalizePaymentMethod(body?.paymentMethod);

    if (!orderId) {
      return NextResponse.json(
        { message: "Ma don hang khong hop le." },
        { status: 400 },
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { message: "Phuong thuc thanh toan khong hop le." },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        invoice: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Don hang khong ton tai." },
        { status: 404 },
      );
    }

    if (order.invoice) {
      return NextResponse.json(
        { message: "Don hang nay da co hoa don." },
        { status: 409 },
      );
    }

    if (order.status !== OrderStatus.SERVED) {
      return NextResponse.json(
        { message: "Chi co the thanh toan don hang da phuc vu." },
        { status: 400 },
      );
    }

    const invoice = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: OrderStatus.PAID,
        },
      });

      await tx.cafeTable.update({
        where: {
          id: order.tableId,
        },
        data: {
          status: TableStatus.AVAILABLE,
        },
      });

      const createdInvoice = await tx.invoice.create({
        data: {
          orderId,
          totalAmount: order.totalAmount,
          paymentMethod,
        },
      });

      return tx.invoice.findUniqueOrThrow({
        where: {
          id: createdInvoice.id,
        },
        include: invoiceInclude,
      });
    });

    return NextResponse.json(
      {
        message: "Thanh toan thanh cong.",
        data: serializeInvoice(invoice),
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
