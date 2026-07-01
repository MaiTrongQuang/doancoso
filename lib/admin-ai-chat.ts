export type AdminAiMode = "fast" | "deep";

export const defaultAdminAiQuestion =
  "Hôm nay nên làm gì để tăng doanh thu?";

export const adminAiQuickQuestions = [
  "Nên đẩy món nào hôm nay?",
  "Doanh thu đang yếu ở đâu?",
  "Có đơn nào cần xử lý?",
  "Ca nào nên bố trí thêm người?",
];

export function normalizeAdminAiQuestion(question: string) {
  return question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function buildAdminAiRequestKey({
  mode,
  periodDays,
  question,
  selectedDate,
  selectedMonth,
}: {
  mode: AdminAiMode;
  periodDays: number;
  question: string;
  selectedDate: string;
  selectedMonth: string;
}) {
  return [
    mode,
    periodDays,
    selectedDate || "today",
    selectedMonth || "current-month",
    normalizeAdminAiQuestion(question),
  ].join("|");
}
