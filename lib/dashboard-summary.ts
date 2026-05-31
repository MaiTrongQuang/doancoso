import { OrderStatus, PaymentMethod, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${day}/${month}`;
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  QR_PAYMENT: "QR Payment",
};

const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Đơn mới",
  CONFIRMED: "Bếp đã nhận",
  PREPARING: "Đang chuẩn bị",
  SERVED: "Đã phục vụ",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
};

export async function getDashboardSummary() {
  const { start } = getTodayRange();
  const chartStart = addDays(start, -6);
  const todayKey = formatDateKey(start);
  const dayBuckets = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(chartStart, index);

    return {
      date: formatDateKey(date),
      label: formatDateLabel(date),
      revenue: 0,
      orderCount: 0,
      paidOrderCount: 0,
    };
  });
  const dayBucketByDate = new Map(
    dayBuckets.map((bucket) => [bucket.date, bucket]),
  );

  const [
    availableProducts,
    totalTables,
    recentOrders,
    invoices,
    orders,
    paidOrderItems,
  ] = await Promise.all([
    prisma.product.count({
      where: {
        status: ProductStatus.AVAILABLE,
      },
    }),
    prisma.cafeTable.count(),
    prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        status: true,
        totalAmount: true,
        note: true,
        createdAt: true,
        table: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    }),
    prisma.invoice.findMany({
      select: {
        totalAmount: true,
        paidAt: true,
        paymentMethod: true,
      },
    }),
    prisma.order.findMany({
      select: {
        status: true,
        createdAt: true,
      },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          status: OrderStatus.PAID,
        },
      },
      select: {
        quantity: true,
        price: true,
        product: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  let todayRevenue = 0;
  let todayPaidOrders = 0;
  const paymentStatsByMethod = new Map<
    PaymentMethod,
    {
      invoiceCount: number;
      revenue: number;
    }
  >();

  for (const invoice of invoices) {
    const invoiceDateKey = formatDateKey(invoice.paidAt);
    const bucket = dayBucketByDate.get(invoiceDateKey);

    if (bucket) {
      bucket.revenue += invoice.totalAmount;
      bucket.paidOrderCount += 1;
    }

    if (invoiceDateKey === todayKey) {
      todayRevenue += invoice.totalAmount;
      todayPaidOrders += 1;
    }

    const currentPaymentStats = paymentStatsByMethod.get(
      invoice.paymentMethod,
    ) ?? {
      invoiceCount: 0,
      revenue: 0,
    };

    currentPaymentStats.invoiceCount += 1;
    currentPaymentStats.revenue += invoice.totalAmount;
    paymentStatsByMethod.set(invoice.paymentMethod, currentPaymentStats);
  }

  let todayOrders = 0;
  const orderCountByStatus = new Map<OrderStatus, number>();

  for (const order of orders) {
    const orderDateKey = formatDateKey(order.createdAt);
    const bucket = dayBucketByDate.get(orderDateKey);

    if (bucket) {
      bucket.orderCount += 1;
    }

    if (orderDateKey === todayKey) {
      todayOrders += 1;
    }

    orderCountByStatus.set(
      order.status,
      (orderCountByStatus.get(order.status) ?? 0) + 1,
    );
  }

  const productStats = new Map<
    number,
    {
      productId: number;
      productName: string;
      categoryName: string;
      quantity: number;
      revenue: number;
    }
  >();

  for (const item of paidOrderItems) {
    const currentStats = productStats.get(item.product.id) ?? {
      productId: item.product.id,
      productName: item.product.name,
      categoryName: item.product.category.name,
      quantity: 0,
      revenue: 0,
    };

    currentStats.quantity += item.quantity;
    currentStats.revenue += item.price * item.quantity;
    productStats.set(item.product.id, currentStats);
  }

  return {
    todayRevenue,
    todayOrders,
    todayPaidOrders,
    availableProducts,
    totalTables,
    dailyRevenue: dayBuckets,
    topProducts: Array.from(productStats.values())
      .sort((left, right) => {
        if (right.quantity !== left.quantity) {
          return right.quantity - left.quantity;
        }

        return right.revenue - left.revenue;
      })
      .slice(0, 5),
    paymentStats: Object.values(PaymentMethod).map((paymentMethod) => {
      const stats = paymentStatsByMethod.get(paymentMethod);

      return {
        paymentMethod,
        label: paymentMethodLabels[paymentMethod],
        invoiceCount: stats?.invoiceCount ?? 0,
        revenue: stats?.revenue ?? 0,
      };
    }),
    orderStatusStats: Object.values(OrderStatus).map((status) => {
      return {
        status,
        label: orderStatusLabels[status],
        count: orderCountByStatus.get(status) ?? 0,
      };
    }),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      note: order.note,
      createdAt: order.createdAt.toISOString(),
      table: order.table,
      itemCount: order._count.items,
    })),
  };
}
