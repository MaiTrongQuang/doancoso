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
  sessionId: number | null;
  status: OrderStatus;
  totalAmount: number;
};

export { getOrderPaymentReferenceLabel as getCustomerOrderPaymentLabel } from "./order-payment-reference";

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
    sessionId: order.sessionId,
    status: order.status,
    totalAmount: order.totalAmount,
  };
}
