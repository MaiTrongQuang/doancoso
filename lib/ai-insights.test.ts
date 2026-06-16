import { strict as assert } from "node:assert";
import {
  buildAdminInsightPrompt,
  buildCustomerChatPrompt,
  customerAiSampleQuestions,
  parseGeminiJsonObject,
  selectCustomerChatSuggestedProducts,
  toAdminInsight,
} from "./ai-insights";

const parsed = parseGeminiJsonObject(`
Here is the JSON:
{
  "summary": "Doanh thu ổn",
  "bestShifts": ["18:00-22:00"],
  "risks": ["Ca sáng thấp"],
  "recommendations": ["Đẩy combo trà"],
  "promotionIdeas": ["Mua trà tặng bánh"]
}
`);

assert.deepEqual(parsed, {
  summary: "Doanh thu ổn",
  bestShifts: ["18:00-22:00"],
  risks: ["Ca sáng thấp"],
  recommendations: ["Đẩy combo trà"],
  promotionIdeas: ["Mua trà tặng bánh"],
});

const insight = toAdminInsight({
  summary: "Tháng tốt",
  bestShifts: ["06:00-10:00"],
  risks: "không phải mảng",
  recommendations: ["Khen thưởng ca tối"],
  promotionIdeas: ["Combo cà phê + bánh"],
});

assert.equal(insight.summary, "Tháng tốt");
assert.deepEqual(insight.bestShifts, ["06:00-10:00"]);
assert.deepEqual(insight.risks, []);
assert.deepEqual(insight.recommendations, ["Khen thưởng ca tối"]);

const adminPrompt = buildAdminInsightPrompt({
  selectedDateLabel: "16/06",
  shiftRevenue: {
    monthLabel: "06/2026",
    shifts: [
      {
        invoiceCount: 10,
        key: "18-22",
        label: "18:00-22:00",
        revenue: 1_200_000,
      },
    ],
    totalInvoiceCount: 10,
    totalRevenue: 1_200_000,
  },
  todayPaidOrders: 3,
  todayRevenue: 300_000,
  topProducts: [{ productName: "Trà sữa", quantity: 12, revenue: 480_000 }],
});

assert.match(adminPrompt, /06\/2026/);
assert.match(adminPrompt, /18:00-22:00/);
assert.match(adminPrompt, /Trà sữa/);

const customerPrompt = buildCustomerChatPrompt({
  menuItems: [
    {
      categoryName: "Trà & trà sữa",
      name: "Trà sữa truyền thống",
      price: 35_000,
    },
  ],
  message: "Tôi thích ít ngọt",
  tableName: "Bàn 1",
  topProducts: [{ name: "Cà phê sữa", quantity: 8 }],
});

assert.match(customerPrompt, /Bàn 1/);
assert.match(customerPrompt, /Tôi thích ít ngọt/);
assert.match(customerPrompt, /Cà phê sữa/);
assert.ok(customerAiSampleQuestions.length >= 4);

const suggestedProducts = selectCustomerChatSuggestedProducts({
  limit: 3,
  menuItems: [
    {
      categoryName: "Trà & trà sữa",
      id: 1,
      imageUrl: "/tra-sua.png",
      name: "Trà sữa truyền thống",
      price: 35_000,
    },
    {
      categoryName: "Cà phê",
      id: 2,
      imageUrl: "/bac-xiu.png",
      name: "Bạc xỉu",
      price: 35_000,
    },
    {
      categoryName: "Bánh ngọt",
      id: 3,
      imageUrl: "/flan.png",
      name: "Bánh flan caramel",
      price: 25_000,
    },
  ],
  message: "Tôi thích trà sữa ít ngọt",
  reply:
    "Bạn có thể chọn Trà sữa truyền thống hoặc Bánh flan caramel ăn kèm.",
  topProducts: [
    { name: "Bạc xỉu", quantity: 10 },
    { name: "Bánh flan caramel", quantity: 4 },
  ],
});

assert.deepEqual(
  suggestedProducts.map((product) => product.id),
  [1, 3, 2],
);
assert.equal(suggestedProducts[0].imageUrl, "/tra-sua.png");
assert.equal(suggestedProducts[0].price, 35_000);
