import type { OrderStatus } from "@prisma/client";

type CustomerOrderItemInput = {
  productId: number;
  quantity: number;
  note: string | null;
};

type CustomerOrderProduct = {
  id: number;
  price: number;
};

type CustomerSubmittedOrder = {
  id: number;
  status: OrderStatus;
  totalAmount: number;
};

export function buildCustomerOrderDraft({
  items,
  products,
}: {
  items: CustomerOrderItemInput[];
  products: CustomerOrderProduct[];
}) {
  const productById = new Map(
    products.map((product) => [product.id, product]),
  );
  const orderItems = items.map((item) => {
    const product = productById.get(item.productId);

    if (!product) {
      throw new Error("Product was validated but not found.");
    }

    return {
      productId: item.productId,
      quantity: item.quantity,
      price: product.price,
      note: item.note,
    };
  });

  return {
    orderItems,
    totalAmount: orderItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    ),
  };
}

export function serializeCustomerSubmittedOrder(order: CustomerSubmittedOrder) {
  return {
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
  };
}
