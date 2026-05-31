import { NextResponse } from "next/server";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
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

export async function GET(_request: Request, { params }: RouteContext) {
  const { id: idParam } = await params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json(
      { message: "Ma hoa don khong hop le." },
      { status: 400 },
    );
  }

  try {
    const canReadInvoice = await hasRole(["ADMIN", "CASHIER"]);

    if (!canReadInvoice) {
      return NextResponse.json(
        { message: "Ban khong co quyen xem hoa don." },
        { status: 403 },
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: {
        id,
      },
      include: {
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
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { message: "Hoa don khong ton tai." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: serializeInvoice(invoice),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tải chi tiết hóa đơn." },
      { status: 500 },
    );
  }
}
