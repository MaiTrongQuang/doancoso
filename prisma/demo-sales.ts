import "dotenv/config";
import {
  DiningSessionStatus,
  OrderStatus,
  PaymentMethod,
  PrismaClient,
  ProductStatus,
} from "@prisma/client";
import {
  buildDemoSalesPlan,
  demoOrderNotePrefix,
  type DemoSalesOrder,
} from "../lib/demo-sales";

const prisma = new PrismaClient();

function normalizeDaysArg(value: string | undefined) {
  const days = Number(value);

  if (!Number.isInteger(days) || days < 7 || days > 90) {
    return 30;
  }

  return days;
}

async function clearExistingDemoSales() {
  const demoOrders = await prisma.order.findMany({
    where: {
      note: {
        startsWith: demoOrderNotePrefix,
      },
    },
    select: {
      id: true,
      sessionId: true,
    },
  });
  const orderIds = demoOrders.map((order) => order.id);
  const sessionIds = demoOrders
    .map((order) => order.sessionId)
    .filter((sessionId): sessionId is number => sessionId !== null);

  if (orderIds.length === 0) {
    return 0;
  }

  await prisma.$transaction([
    prisma.payment.deleteMany({
      where: {
        orderId: {
          in: orderIds,
        },
      },
    }),
    prisma.invoice.deleteMany({
      where: {
        orderId: {
          in: orderIds,
        },
      },
    }),
    prisma.orderItem.deleteMany({
      where: {
        orderId: {
          in: orderIds,
        },
      },
    }),
    prisma.order.deleteMany({
      where: {
        id: {
          in: orderIds,
        },
      },
    }),
    prisma.diningSession.deleteMany({
      where: {
        id: {
          in: sessionIds,
        },
      },
    }),
  ]);

  return orderIds.length;
}

async function loadDemoInputs() {
  const [products, tables] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: ProductStatus.AVAILABLE,
      },
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
    }),
    prisma.cafeTable.findMany({
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  if (products.length === 0 || tables.length === 0) {
    throw new Error(
      "Chưa có sản phẩm hoặc bàn. Hãy chạy npm run db:seed trước.",
    );
  }

  return { products, tables };
}

async function createDemoOrder(order: DemoSalesOrder) {
  await prisma.$transaction(async (tx) => {
    const closedAt = order.paidAt ?? order.createdAt;
    const session = await tx.diningSession.create({
      data: {
        closedAt,
        createdAt: order.createdAt,
        startedAt: order.createdAt,
        status:
          order.status === "PAID"
            ? DiningSessionStatus.CLOSED
            : DiningSessionStatus.CANCELLED,
        tableId: order.tableId,
        updatedAt: closedAt,
      },
    });
    const createdOrder = await tx.order.create({
      data: {
        createdAt: order.createdAt,
        items: {
          create: order.items.map((item) => ({
            note: item.note,
            price: item.price,
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
        note: order.note,
        sessionId: session.id,
        status:
          order.status === "PAID"
            ? OrderStatus.PAID
            : OrderStatus.CANCELLED,
        tableId: order.tableId,
        totalAmount: order.totalAmount,
        updatedAt: closedAt,
      },
      select: {
        id: true,
      },
    });

    if (order.status === "PAID" && order.paymentMethod && order.paidAt) {
      await tx.invoice.create({
        data: {
          createdAt: order.paidAt,
          orderId: createdOrder.id,
          paidAt: order.paidAt,
          paymentMethod: order.paymentMethod as PaymentMethod,
          sessionId: session.id,
          totalAmount: order.totalAmount,
        },
      });
    }
  });
}

async function main() {
  const days = normalizeDaysArg(process.argv[2]);
  const { products, tables } = await loadDemoInputs();
  const deletedOrders = await clearExistingDemoSales();
  const plan = buildDemoSalesPlan({
    days,
    products,
    tables,
  });

  for (const order of plan.orders) {
    await createDemoOrder(order);
  }

  console.log(
    [
      `Đã xóa ${deletedOrders} đơn demo cũ.`,
      `Đã tạo ${plan.paidOrderCount} hóa đơn đã thanh toán.`,
      `Đã tạo ${plan.cancelledOrderCount} đơn hủy demo.`,
      `Tổng doanh thu demo: ${plan.totalRevenue.toLocaleString("vi-VN")} đ.`,
    ].join("\n"),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
