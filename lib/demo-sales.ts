export const demoOrderNotePrefix = "DEMO_POS_DATA";

export type DemoSalesProduct = {
  id: number;
  name: string;
  price: number;
};

export type DemoSalesTable = {
  id: number;
  name: string;
};

export type DemoPaymentMethod = "CASH" | "BANK_TRANSFER" | "QR_PAYMENT";
export type DemoOrderStatus = "PAID" | "CANCELLED";

export type DemoSalesOrderItem = {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  note: string | null;
};

export type DemoSalesOrder = {
  tableId: number;
  tableName: string;
  status: DemoOrderStatus;
  totalAmount: number;
  paymentMethod: DemoPaymentMethod | null;
  createdAt: Date;
  paidAt: Date | null;
  note: string;
  items: DemoSalesOrderItem[];
};

export type DemoSalesPlan = {
  orders: DemoSalesOrder[];
  paidOrderCount: number;
  cancelledOrderCount: number;
  totalRevenue: number;
};

const preferredProductNames = [
  "Cà phê đen",
  "Cà phê sữa",
  "Bạc xỉu",
  "Trà sữa truyền thống",
  "Trà đào cam sả",
  "Trà đá",
  "Bánh flan caramel",
  "Bánh bông lan trứng muối",
  "Set trà bánh mùa thu",
  "Nước ép cam",
];

const paymentMethods: DemoPaymentMethod[] = [
  "CASH",
  "QR_PAYMENT",
  "BANK_TRANSFER",
  "QR_PAYMENT",
];

const saleHours = [7, 8, 10, 13, 15, 18, 19, 20];

function getVietnamDateParts(now: Date) {
  const vietnamNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

  return {
    day: vietnamNow.getUTCDate(),
    month: vietnamNow.getUTCMonth(),
    year: vietnamNow.getUTCFullYear(),
  };
}

function createVietnamTime({
  dayOffset,
  hour,
  minute,
  now,
}: {
  dayOffset: number;
  hour: number;
  minute: number;
  now: Date;
}) {
  const parts = getVietnamDateParts(now);

  return new Date(
    Date.UTC(parts.year, parts.month, parts.day + dayOffset, hour - 7, minute),
  );
}

function rankProducts(products: DemoSalesProduct[]) {
  return [...products].sort((firstProduct, secondProduct) => {
    const firstRank = preferredProductNames.indexOf(firstProduct.name);
    const secondRank = preferredProductNames.indexOf(secondProduct.name);
    const normalizedFirstRank =
      firstRank === -1 ? preferredProductNames.length : firstRank;
    const normalizedSecondRank =
      secondRank === -1 ? preferredProductNames.length : secondRank;

    if (normalizedFirstRank !== normalizedSecondRank) {
      return normalizedFirstRank - normalizedSecondRank;
    }

    return firstProduct.name.localeCompare(secondProduct.name, "vi");
  });
}

function buildOrderItems({
  orderIndex,
  products,
}: {
  orderIndex: number;
  products: DemoSalesProduct[];
}) {
  const itemCount = 1 + (orderIndex % 3);

  return Array.from({ length: itemCount }, (_, itemIndex) => {
    const product = products[(orderIndex + itemIndex * 2) % products.length];
    const quantity = 1 + ((orderIndex + itemIndex) % 2);

    return {
      note:
        itemIndex === 0 && orderIndex % 5 === 0
          ? "Ít đá, ít ngọt"
          : null,
      price: product.price,
      productId: product.id,
      productName: product.name,
      quantity,
    };
  });
}

function sumOrderItems(items: DemoSalesOrderItem[]) {
  return items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
}

export function buildDemoSalesPlan({
  days = 30,
  now = new Date(),
  products,
  tables,
}: {
  days?: number;
  now?: Date;
  products: DemoSalesProduct[];
  tables: DemoSalesTable[];
}): DemoSalesPlan {
  if (products.length === 0) {
    throw new Error("Cần ít nhất một sản phẩm để tạo dữ liệu demo.");
  }

  if (tables.length === 0) {
    throw new Error("Cần ít nhất một bàn để tạo dữ liệu demo.");
  }

  const rankedProducts = rankProducts(products);
  const orders: DemoSalesOrder[] = [];
  let orderIndex = 0;

  for (let daysAgo = days - 1; daysAgo >= 0; daysAgo -= 1) {
    const dayOffset = -daysAgo;
    const weekday = createVietnamTime({
      dayOffset,
      hour: 12,
      minute: 0,
      now,
    }).getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const paidOrdersToday = 2 + ((daysAgo * 7 + 3) % 4) + (isWeekend ? 2 : 0);

    for (let dayOrderIndex = 0; dayOrderIndex < paidOrdersToday; dayOrderIndex += 1) {
      const hour = saleHours[(dayOrderIndex + daysAgo) % saleHours.length];
      const minute = (dayOrderIndex * 11 + daysAgo * 3) % 60;
      const createdAt = createVietnamTime({
        dayOffset,
        hour,
        minute,
        now,
      });
      const paidAt = new Date(createdAt.getTime() + (4 + (orderIndex % 12)) * 60_000);
      const table = tables[(orderIndex + daysAgo) % tables.length];
      const items = buildOrderItems({
        orderIndex,
        products: rankedProducts,
      });

      orders.push({
        createdAt,
        items,
        note: `${demoOrderNotePrefix} - Hóa đơn demo ${daysAgo + 1}-${dayOrderIndex + 1}`,
        paidAt,
        paymentMethod: paymentMethods[orderIndex % paymentMethods.length],
        status: "PAID",
        tableId: table.id,
        tableName: table.name,
        totalAmount: sumOrderItems(items),
      });

      orderIndex += 1;
    }

    if (daysAgo % 3 === 0) {
      const table = tables[(orderIndex + 1) % tables.length];
      const items = buildOrderItems({
        orderIndex,
        products: rankedProducts,
      });
      const createdAt = createVietnamTime({
        dayOffset,
        hour: 21,
        minute: (daysAgo * 7) % 60,
        now,
      });

      orders.push({
        createdAt,
        items,
        note: `${demoOrderNotePrefix} - Đơn hủy demo ${daysAgo + 1}`,
        paidAt: null,
        paymentMethod: null,
        status: "CANCELLED",
        tableId: table.id,
        tableName: table.name,
        totalAmount: sumOrderItems(items),
      });

      orderIndex += 1;
    }
  }

  const paidOrders = orders.filter((order) => order.status === "PAID");
  const cancelledOrders = orders.filter((order) => order.status === "CANCELLED");

  return {
    cancelledOrderCount: cancelledOrders.length,
    orders,
    paidOrderCount: paidOrders.length,
    totalRevenue: paidOrders.reduce(
      (total, order) => total + order.totalAmount,
      0,
    ),
  };
}
