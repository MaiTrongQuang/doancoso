import { formatMoney } from "@/lib/format-money";

export type AdminInsight = {
  summary: string;
  bestShifts: string[];
  risks: string[];
  recommendations: string[];
  promotionIdeas: string[];
};

type AdminPromptSummary = {
  selectedDateLabel: string;
  todayRevenue: number;
  todayPaidOrders: number;
  topProducts: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  shiftRevenue: {
    monthLabel: string;
    totalRevenue: number;
    totalInvoiceCount: number;
    shifts: Array<{
      key: string;
      label: string;
      revenue: number;
      invoiceCount: number;
    }>;
  };
};

type CustomerMenuItem = {
  categoryName: string;
  name: string;
  price: number;
};

type CustomerTopProduct = {
  name: string;
  quantity: number;
};

export const customerAiSampleQuestions = [
  "Món nào bán chạy nhất quán?",
  "Tôi thích ít ngọt thì nên chọn món nào?",
  "Gợi ý đồ uống mát cho hôm nay",
  "Có món nào hợp ăn kèm với bánh không?",
  "Tôi muốn uống cà phê nhẹ, nên chọn gì?",
];

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseGeminiJsonObject(text: string) {
  const trimmedText = text.trim();

  try {
    return JSON.parse(trimmedText) as unknown;
  } catch {
    const firstBrace = trimmedText.indexOf("{");
    const lastBrace = trimmedText.lastIndexOf("}");

    if (firstBrace < 0 || lastBrace <= firstBrace) {
      throw new Error("Gemini response did not contain a JSON object.");
    }

    return JSON.parse(trimmedText.slice(firstBrace, lastBrace + 1)) as unknown;
  }
}

export function toAdminInsight(value: unknown): AdminInsight {
  const record =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};

  return {
    bestShifts: toStringArray(record.bestShifts),
    promotionIdeas: toStringArray(record.promotionIdeas),
    recommendations: toStringArray(record.recommendations),
    risks: toStringArray(record.risks),
    summary:
      typeof record.summary === "string" && record.summary.trim()
        ? record.summary.trim()
        : "Chưa có đủ dữ liệu để tạo nhận xét.",
  };
}

export function buildAdminInsightPrompt(summary: AdminPromptSummary) {
  const shiftLines = summary.shiftRevenue.shifts
    .map(
      (shift) =>
        `- ${shift.label}: ${formatMoney(shift.revenue)}, ${shift.invoiceCount} hóa đơn`,
    )
    .join("\n");
  const topProductLines =
    summary.topProducts.length > 0
      ? summary.topProducts
          .map(
            (product) =>
              `- ${product.productName}: ${product.quantity} món, ${formatMoney(
                product.revenue,
              )}`,
          )
          .join("\n")
      : "- Chưa có món bán chạy trong kỳ";

  return `Bạn là trợ lý phân tích vận hành cho quán cà phê NaNa Cafe.
Chỉ dựa trên dữ liệu được cung cấp, không bịa số liệu.
Trả về JSON với các khóa: summary, bestShifts, risks, recommendations, promotionIdeas.

Dữ liệu ngày đang xem (${summary.selectedDateLabel}):
- Doanh thu: ${formatMoney(summary.todayRevenue)}
- Hóa đơn đã thanh toán: ${summary.todayPaidOrders}

Doanh thu theo ca tháng ${summary.shiftRevenue.monthLabel}:
- Tổng doanh thu: ${formatMoney(summary.shiftRevenue.totalRevenue)}
- Tổng hóa đơn: ${summary.shiftRevenue.totalInvoiceCount}
${shiftLines}

Top món:
${topProductLines}`;
}

export function buildCustomerChatPrompt({
  menuItems,
  message,
  tableName,
  topProducts,
}: {
  menuItems: CustomerMenuItem[];
  message: string;
  tableName: string;
  topProducts: CustomerTopProduct[];
}) {
  const menuLines = menuItems
    .slice(0, 40)
    .map(
      (item) =>
        `- ${item.name} (${item.categoryName}) - ${formatMoney(item.price)}`,
    )
    .join("\n");
  const topProductLines =
    topProducts.length > 0
      ? topProducts
          .map((product) => `- ${product.name}: ${product.quantity} món`)
          .join("\n")
      : "- Chưa có dữ liệu món bán chạy";

  return `Bạn là trợ lý gọi món thân thiện cho khách tại ${tableName} của NaNa Cafe.
Trả lời bằng tiếng Việt, ngắn gọn, dễ hiểu, tối đa 5 câu.
Chỉ gợi ý món có trong menu. Nếu khách hỏi ngoài phạm vi quán, lịch sự kéo về tư vấn món.
Không nhận thanh toán, không hứa giảm giá, không hỏi thông tin cá nhân.

Câu hỏi của khách: ${message}

Món bán chạy:
${topProductLines}

Menu hiện có:
${menuLines}`;
}
