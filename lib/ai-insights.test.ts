import { strict as assert } from "node:assert";
import {
  buildAdminInsightPrompt,
  buildFastAdminInsight,
  buildCustomerChatPrompt,
  buildFastCustomerChatReply,
  customerAiSampleQuestions,
  parseGeminiJsonObject,
  selectCustomerChatSuggestedProducts,
  toAdminInsight,
} from "./ai-insights";

const parsed = parseGeminiJsonObject(`
Here is the JSON:
{
  "headline": "Doanh thu ổn nhưng cần kéo ca sáng",
  "narrative": "Ca tối đang giữ doanh thu, ca sáng chưa tạo đủ hóa đơn.",
  "likelyCauses": ["Khách sáng ít gọi món kèm"],
  "priorityActions": [
    {
      "title": "Đẩy combo cà phê sáng",
      "reason": "Ca sáng có hóa đơn thấp hơn ca tối",
      "action": "Đưa combo cà phê + bánh lên đầu menu QR trong khung 06:00-10:00"
    }
  ],
  "riskAlerts": [
    {
      "title": "Ca sáng yếu",
      "evidence": "Doanh thu thấp hơn các ca còn lại",
      "action": "Theo dõi thêm 2 ngày trước khi giảm nhân sự"
    }
  ],
  "followUpQuestions": ["Vì sao ca sáng thấp?"]
}
`);

assert.deepEqual(parsed, {
  headline: "Doanh thu ổn nhưng cần kéo ca sáng",
  narrative: "Ca tối đang giữ doanh thu, ca sáng chưa tạo đủ hóa đơn.",
  likelyCauses: ["Khách sáng ít gọi món kèm"],
  priorityActions: [
    {
      title: "Đẩy combo cà phê sáng",
      reason: "Ca sáng có hóa đơn thấp hơn ca tối",
      action: "Đưa combo cà phê + bánh lên đầu menu QR trong khung 06:00-10:00",
    },
  ],
  riskAlerts: [
    {
      title: "Ca sáng yếu",
      evidence: "Doanh thu thấp hơn các ca còn lại",
      action: "Theo dõi thêm 2 ngày trước khi giảm nhân sự",
    },
  ],
  followUpQuestions: ["Vì sao ca sáng thấp?"],
});

const insight = toAdminInsight({
  headline: "Tháng tốt",
  narrative: "Ca tối kéo phần lớn doanh thu.",
  likelyCauses: ["Khách tối gọi hóa đơn lớn"],
  priorityActions: [
    {
      title: "Khen thưởng ca tối",
      reason: "Ca tối đang giữ nhịp doanh thu",
      action: "Ghi nhận ca tối và nhân rộng cách bán combo",
    },
  ],
  riskAlerts: "không phải mảng",
  followUpQuestions: ["Món nào nên đẩy ngày mai?"],
});

assert.equal(insight.headline, "Tháng tốt");
assert.equal(insight.narrative, "Ca tối kéo phần lớn doanh thu.");
assert.deepEqual(insight.likelyCauses, ["Khách tối gọi hóa đơn lớn"]);
assert.deepEqual(insight.riskAlerts, []);
assert.deepEqual(insight.priorityActions, [
  {
    title: "Khen thưởng ca tối",
    reason: "Ca tối đang giữ nhịp doanh thu",
    action: "Ghi nhận ca tối và nhân rộng cách bán combo",
  },
]);
assert.deepEqual(insight.followUpQuestions, ["Món nào nên đẩy ngày mai?"]);

const adminSummary = {
  averageInvoiceValue: 100_000,
  dailyRevenue: [
    {
      date: "2026-06-15",
      label: "15/06",
      orderCount: 6,
      paidOrderCount: 4,
      revenue: 420_000,
    },
  ],
  orderStatusStats: [{ status: "PENDING", label: "Chờ thanh toán", count: 2 }],
  paymentStats: [
    {
      invoiceCount: 2,
      label: "Thanh toán QR",
      paymentMethod: "QR_PAYMENT",
      revenue: 200_000,
      share: 50,
    },
  ],
  question: "Ngày mai nên đẩy món nào?",
  recentOrders: [
    {
      createdAt: "2026-06-16T01:00:00.000Z",
      id: 41,
      itemCount: 2,
      note: null,
      status: "PENDING",
      table: { id: 1, name: "Bàn 1" },
      totalAmount: 80_000,
    },
  ],
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
  todayOrders: 5,
  todayRevenue: 300_000,
  topTables: [{ tableId: 1, tableName: "Bàn 1", invoiceCount: 2, revenue: 160_000 }],
  topProducts: [{ productName: "Trà sữa", quantity: 12, revenue: 480_000 }],
};

const adminPrompt = buildAdminInsightPrompt(adminSummary);

assert.match(adminPrompt, /06\/2026/);
assert.match(adminPrompt, /18:00-22:00/);
assert.match(adminPrompt, /Trà sữa/);
assert.match(adminPrompt, /Ngày mai nên đẩy món nào/);
assert.match(adminPrompt, /ưu tiên hành động/i);

const fastAdminInsight = buildFastAdminInsight(adminSummary);

assert.match(fastAdminInsight.headline, /Trà sữa/);
assert.match(fastAdminInsight.narrative, /300\.000/);
assert.ok(fastAdminInsight.priorityActions.length >= 2);
assert.ok(fastAdminInsight.followUpQuestions.length >= 3);

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

const fastBestSellerReply = buildFastCustomerChatReply({
  menuItems: [
    {
      categoryName: "Cà phê",
      id: 11,
      imageUrl: "/bac-xiu.png",
      name: "Bạc xỉu",
      price: 35_000,
    },
    {
      categoryName: "Trà & trà sữa",
      id: 12,
      imageUrl: "/tra-sua.png",
      name: "Trà sữa truyền thống",
      price: 35_000,
    },
  ],
  message: "Món nào bán chạy nhất quán?",
  tableName: "Bàn 1",
  topProducts: [
    { name: "Bạc xỉu", quantity: 10 },
    { name: "Trà sữa truyền thống", quantity: 8 },
  ],
});

assert.match(fastBestSellerReply ?? "", /Bạc xỉu/);
assert.match(fastBestSellerReply ?? "", /Trà sữa truyền thống/);
assert.match(fastBestSellerReply ?? "", /Bàn 1/);

const fastLightCoffeeReply = buildFastCustomerChatReply({
  menuItems: [
    {
      categoryName: "Cà phê",
      id: 21,
      imageUrl: "/bac-xiu.png",
      name: "Bạc xỉu",
      price: 35_000,
    },
  ],
  message: "Tôi muốn uống cà phê nhẹ, nên chọn gì?",
  tableName: "Bàn 2",
  topProducts: [],
});

assert.match(fastLightCoffeeReply ?? "", /Bạc xỉu/);
assert.equal(
  buildFastCustomerChatReply({
    menuItems: [],
    message: "Bạn có mở nhạc được không?",
    tableName: "Bàn 3",
    topProducts: [],
  }),
  null,
);

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
