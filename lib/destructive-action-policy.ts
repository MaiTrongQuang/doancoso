export type ProductRemovalAction = "DELETE" | "DISABLE";

export function getProductRemovalAction(orderItemCount: number): ProductRemovalAction {
  return orderItemCount > 0 ? "DISABLE" : "DELETE";
}

