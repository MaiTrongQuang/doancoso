export type ProductStatusValue = "AVAILABLE" | "UNAVAILABLE";

export const productStatusOptions: Array<{
  value: ProductStatusValue;
  label: string;
}> = [
  { value: "AVAILABLE", label: "Đang hiển thị" },
  { value: "UNAVAILABLE", label: "Ẩn khỏi menu" },
];

export function getProductStatusLabel(status: ProductStatusValue) {
  return productStatusOptions.find((option) => option.value === status)?.label;
}
