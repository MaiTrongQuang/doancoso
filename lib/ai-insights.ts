import { formatMoney } from "@/lib/format-money";
import {
  adminAiQuickQuestions,
  defaultAdminAiQuestion,
} from "@/lib/admin-ai-chat";

export type AdminInsight = {
  headline: string;
  narrative: string;
  likelyCauses: string[];
  priorityActions: AdminPriorityAction[];
  riskAlerts: AdminRiskAlert[];
  followUpQuestions: string[];
};

export type AdminPriorityAction = {
  title: string;
  reason: string;
  action: string;
};

export type AdminRiskAlert = {
  title: string;
  evidence: string;
  action: string;
};

type AdminPromptSummary = {
  selectedDateLabel: string;
  todayRevenue: number;
  todayOrders: number;
  todayPaidOrders: number;
  averageInvoiceValue: number;
  dailyRevenue: Array<{
    date: string;
    label: string;
    revenue: number;
    orderCount: number;
    paidOrderCount: number;
  }>;
  topProducts: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  paymentStats: Array<{
    paymentMethod: string;
    label: string;
    invoiceCount: number;
    revenue: number;
    share: number;
  }>;
  topTables: Array<{
    tableId: number;
    tableName: string;
    invoiceCount: number;
    revenue: number;
  }>;
  orderStatusStats: Array<{
    status: string;
    label: string;
    count: number;
  }>;
  recentOrders: Array<{
    id: number;
    status: string;
    totalAmount: number;
    note: string | null;
    createdAt: string;
    table: {
      id: number;
      name: string;
    };
    itemCount: number;
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
  question?: string | null;
};

type CustomerMenuItem = {
  id?: number;
  categoryName: string;
  imageUrl?: string | null;
  name: string;
  price: number;
};

type CustomerTopProduct = {
  name: string;
  quantity: number;
};

const adminNarrativeMaxLength = 240;

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

function toNonEmptyText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function compactText(value: string, maxLength = adminNarrativeMaxLength) {
  const normalizedValue = value.replace(/\s+/g, " ").trim();

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength - 3).trimEnd()}...`;
}

function toPriorityActions(value: unknown): AdminPriorityAction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record =
        typeof item === "object" && item !== null
          ? (item as Record<string, unknown>)
          : {};
      const title = toNonEmptyText(record.title);
      const reason = toNonEmptyText(record.reason);
      const action = toNonEmptyText(record.action);

      if (!title || !action) {
        return null;
      }

      return {
        title,
        reason: reason || "Dựa trên dữ liệu vận hành hiện có.",
        action,
      };
    })
    .filter((item): item is AdminPriorityAction => Boolean(item));
}

function toRiskAlerts(value: unknown): AdminRiskAlert[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const record =
        typeof item === "object" && item !== null
          ? (item as Record<string, unknown>)
          : {};
      const title = toNonEmptyText(record.title);
      const evidence = toNonEmptyText(record.evidence);
      const action = toNonEmptyText(record.action);

      if (!title || !action) {
        return null;
      }

      return {
        title,
        evidence: evidence || "Chưa đủ dữ liệu chi tiết, cần theo dõi thêm.",
        action,
      };
    })
    .filter((item): item is AdminRiskAlert => Boolean(item));
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function normalizeIntentText(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isGreetingAdminQuestion(normalizedQuestion: string) {
  return [
    "chao",
    "xin chao",
    "hello",
    "hi",
    "alo",
    "hey",
    "chao ai",
    "xin chao ai",
  ].includes(normalizedQuestion);
}

const operationalAdminKeywords = [
  "ban",
  "bep",
  "ca",
  "cashier",
  "doanh thu",
  "don",
  "giam",
  "hoa don",
  "hom nay",
  "khach",
  "lam gi",
  "menu",
  "mon",
  "ngay mai",
  "nhan su",
  "nhan vien",
  "pos",
  "quay",
  "rui ro",
  "tang",
  "thanh toan",
  "thu ngan",
  "thuong",
  "van hanh",
];

function isOperationalAdminQuestion(normalizedQuestion: string) {
  return operationalAdminKeywords.some((keyword) =>
    normalizedQuestion.includes(keyword),
  );
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
  const headline = toNonEmptyText(record.headline);
  const narrative = toNonEmptyText(record.narrative);

  return {
    followUpQuestions: toStringArray(record.followUpQuestions).slice(0, 3),
    headline: compactText(
      headline || "Chưa có đủ dữ liệu để kết luận vận hành.",
      90,
    ),
    likelyCauses: toStringArray(record.likelyCauses).slice(0, 2),
    narrative: compactText(
      narrative ||
        toNonEmptyText(record.summary) ||
        "AI cần thêm dữ liệu hóa đơn, ca bán và món bán chạy để phân tích rõ hơn.",
    ),
    priorityActions: toPriorityActions(record.priorityActions).slice(0, 2),
    riskAlerts: toRiskAlerts(record.riskAlerts).slice(0, 1),
  };
}

function findTopProduct(summary: AdminPromptSummary) {
  return summary.topProducts[0] ?? null;
}

function findBestShift(summary: AdminPromptSummary) {
  return (
    [...summary.shiftRevenue.shifts].sort(
      (firstShift, secondShift) => secondShift.revenue - firstShift.revenue,
    )[0] ?? null
  );
}

function findWeakRevenueDay(summary: AdminPromptSummary) {
  const revenueDays = summary.dailyRevenue.filter(
    (day) => day.orderCount > 0 || day.paidOrderCount > 0 || day.revenue > 0,
  );

  return (
    revenueDays.sort(
      (firstDay, secondDay) => firstDay.revenue - secondDay.revenue,
    )[0] ?? null
  );
}

function findStrongRevenueDay(summary: AdminPromptSummary) {
  const revenueDays = summary.dailyRevenue.filter(
    (day) => day.orderCount > 0 || day.paidOrderCount > 0 || day.revenue > 0,
  );

  return (
    revenueDays.sort(
      (firstDay, secondDay) => secondDay.revenue - firstDay.revenue,
    )[0] ?? null
  );
}

function findWeakShift(summary: AdminPromptSummary) {
  const activeShifts = summary.shiftRevenue.shifts.filter(
    (shift) => shift.invoiceCount > 0 || shift.revenue > 0,
  );

  return (
    activeShifts.sort(
      (firstShift, secondShift) => firstShift.revenue - secondShift.revenue,
    )[0] ?? null
  );
}

function getPeriodStats(summary: AdminPromptSummary) {
  const activeDays = summary.dailyRevenue.filter(
    (day) => day.orderCount > 0 || day.paidOrderCount > 0 || day.revenue > 0,
  );
  const revenue = activeDays.reduce((total, day) => total + day.revenue, 0);
  const paidOrderCount = activeDays.reduce(
    (total, day) => total + day.paidOrderCount,
    0,
  );
  const dayCount = summary.dailyRevenue.length || activeDays.length || 1;

  return {
    averageRevenue: Math.round(
      revenue / Math.max(1, activeDays.length || dayCount),
    ),
    dayCount,
    label: `${dayCount} ngày`,
    paidOrderCount,
    revenue,
  };
}

function findStatusCount(summary: AdminPromptSummary, status: string) {
  return (
    summary.orderStatusStats.find((item) => item.status === status)?.count ?? 0
  );
}

function findTopPayment(summary: AdminPromptSummary) {
  return (
    [...summary.paymentStats].sort(
      (firstPayment, secondPayment) =>
        secondPayment.revenue - firstPayment.revenue,
    )[0] ?? null
  );
}

export function buildFastAdminInsight(summary: AdminPromptSummary): AdminInsight {
  const normalizedQuestion = normalizeIntentText(summary.question ?? "");
  const topProduct = findTopProduct(summary);
  const bestShift = findBestShift(summary);
  const weakDay = findWeakRevenueDay(summary);
  const strongDay = findStrongRevenueDay(summary);
  const weakShift = findWeakShift(summary);
  const topPayment = findTopPayment(summary);
  const periodStats = getPeriodStats(summary);
  const pendingOrders = findStatusCount(summary, "PENDING");
  const cancelledOrders = findStatusCount(summary, "CANCELLED");
  const wantsProductPush =
    normalizedQuestion.includes("day mon") ||
    normalizedQuestion.includes("mon nao") ||
    normalizedQuestion.includes("ngay mai");
  const wantsRisk =
    normalizedQuestion.includes("rui ro") ||
    normalizedQuestion.includes("can xu ly") ||
    normalizedQuestion.includes("bat thuong");
  const wantsOrderIssue =
    normalizedQuestion.includes("don") &&
    (normalizedQuestion.includes("xu ly") ||
      normalizedQuestion.includes("ket") ||
      normalizedQuestion.includes("cho"));
  const wantsWeakRevenue =
    normalizedQuestion.includes("doanh thu") &&
    (normalizedQuestion.includes("yeu") ||
      normalizedQuestion.includes("thap") ||
      normalizedQuestion.includes("giam") ||
      normalizedQuestion.includes("dau"));
  const wantsStaffing =
    normalizedQuestion.includes("bo tri") ||
    normalizedQuestion.includes("them nguoi") ||
    normalizedQuestion.includes("nhan su") ||
    normalizedQuestion.includes("ca nao");
  const wantsShiftEfficiency =
    normalizedQuestion.includes("ca") &&
    (normalizedQuestion.includes("hieu qua") ||
      normalizedQuestion.includes("manh") ||
      normalizedQuestion.includes("tot nhat"));
  const wantsTable =
    normalizedQuestion.includes("ban nao") ||
    normalizedQuestion.includes("ban dong gop");
  const wantsStaffReward =
    normalizedQuestion.includes("thuong") ||
    normalizedQuestion.includes("khen thuong") ||
    normalizedQuestion.includes("khen nhan vien");
  const shiftRewardEvidence =
    bestShift && bestShift.invoiceCount > 0
      ? `nhóm trực ca ${bestShift.label} vì ca này tạo ${formatMoney(
          bestShift.revenue,
        )} từ ${bestShift.invoiceCount} hóa đơn`
      : "nhóm trực ca có xác nhận tốt nhất trong sổ phân công";

  if (isGreetingAdminQuestion(normalizedQuestion)) {
    return {
      followUpQuestions: adminAiQuickQuestions.slice(0, 3),
      headline: "Chào bạn, mình là trợ lý NaNa POS.",
      likelyCauses: [],
      narrative:
        "Mình có thể hỗ trợ nhanh về doanh thu, đơn chờ, món bán chạy, ca bán và gợi ý vận hành. Bạn muốn xem vấn đề nào trước?",
      priorityActions: [],
      riskAlerts: [],
    };
  }

  if (
    normalizedQuestion &&
    !isOperationalAdminQuestion(normalizedQuestion)
  ) {
    return {
      followUpQuestions: adminAiQuickQuestions.slice(0, 3),
      headline: "Mình chỉ hỗ trợ vận hành NaNa POS.",
      likelyCauses: [],
      narrative:
        "Câu này chưa nằm trong dữ liệu POS hiện có. Bạn có thể hỏi về doanh thu, đơn hàng, món bán, ca bán, bàn hoạt động hoặc thanh toán.",
      priorityActions: [],
      riskAlerts: [],
    };
  }

  if (wantsStaffReward) {
    return {
      followUpQuestions: [
        "Ca nào hiệu quả nhất?",
        "Bàn nào đóng góp nhiều?",
        "Có đơn nào cần xử lý?",
      ],
      headline: "Chưa đủ dữ liệu để chọn nhân viên.",
      likelyCauses: [
        "Hóa đơn hiện chưa lưu nhân viên phụ trách.",
        "Dashboard chỉ có dữ liệu theo món, bàn, ca và thanh toán.",
      ],
      narrative: compactText(
        `${summary.selectedDateLabel}: dashboard chưa gắn hóa đơn với nhân viên nên không nên thưởng theo tên. Có thể tạm thưởng theo ${shiftRewardEvidence}.`,
      ),
      priorityActions: [
        {
          title: "Thưởng theo ca mạnh",
          reason:
            bestShift && bestShift.invoiceCount > 0
              ? `Ca ${bestShift.label} đang có ${bestShift.invoiceCount} hóa đơn, ${formatMoney(
                  bestShift.revenue,
                )} doanh thu.`
              : "Chưa có dữ liệu nhân viên để chấm theo cá nhân.",
          action:
            bestShift && bestShift.invoiceCount > 0
              ? `Đối chiếu lịch trực rồi khen thưởng nhóm ca ${bestShift.label}.`
              : "Đối chiếu lịch trực và chọn nhóm có đóng góp rõ nhất.",
        },
        {
          title: "Gắn nhân viên vào hóa đơn",
          reason: "Cần dữ liệu người xác nhận hoặc phục vụ để thưởng chính xác.",
          action:
            "Lưu nhân viên phụ trách khi thanh toán để lần sau AI nêu đúng người.",
        },
      ],
      riskAlerts: [
        {
          title: "Thiếu dữ liệu nhân sự",
          evidence: "Dashboard chưa có doanh thu hoặc số đơn theo từng nhân viên.",
          action: "Tránh nêu tên cá nhân nếu chưa có lịch trực và phân công.",
        },
      ],
    };
  }

  if (wantsOrderIssue) {
    return {
      followUpQuestions: [
        "Doanh thu đang yếu ở đâu?",
        "Ca nào nên bố trí thêm người?",
        "Bàn nào đóng góp nhiều?",
      ],
      headline:
        pendingOrders > 0
          ? `Cần xử lý ${pendingOrders} đơn chờ thanh toán.`
          : "Chưa thấy đơn kẹt lớn.",
      likelyCauses: [
        pendingOrders > 0
          ? "Một phần đơn chưa chuyển sang doanh thu vì còn chờ thanh toán."
          : "Luồng đơn trong ngày không có điểm nghẽn lớn.",
        cancelledOrders > 0
          ? "Có đơn hủy cần xem lại lý do."
          : "Chưa thấy tín hiệu hủy đơn bất thường.",
      ],
      narrative: compactText(
        `${summary.selectedDateLabel}: có ${summary.todayOrders} đơn tạo, ${summary.todayPaidOrders} hóa đơn đã thanh toán, ${pendingOrders} đơn chờ và ${cancelledOrders} đơn hủy.`,
      ),
      priorityActions: [
        {
          title:
            pendingOrders > 0 ? "Chốt đơn chờ thanh toán" : "Giữ nhịp xử lý đơn",
          reason:
            pendingOrders > 0
              ? `${pendingOrders} đơn còn ở trạng thái chờ thanh toán.`
              : "Không có đơn chờ lớn trong ngày đang xem.",
          action:
            pendingOrders > 0
              ? "Rà danh sách đơn chờ, xác nhận thanh toán rồi chuyển sang bếp."
              : "Tiếp tục giữ màn hình đơn chờ mở ở quầy trong giờ cao điểm.",
        },
        {
          title: cancelledOrders > 0 ? "Xem lại đơn hủy" : "Theo dõi đơn mới",
          reason:
            cancelledOrders > 0
              ? `${cancelledOrders} đơn đã hủy trong ngày đang xem.`
              : "Đơn mới cần được xác nhận đều để tránh dồn cuối ca.",
          action:
            cancelledOrders > 0
              ? "Kiểm tra lý do hủy từ khách, quầy hay bếp."
              : "Đặt nhắc quầy kiểm tra đơn mới mỗi vài phút.",
        },
      ],
      riskAlerts:
        pendingOrders > 0
          ? [
              {
                title: "Đơn chờ thanh toán",
                evidence: `${pendingOrders} đơn chưa được chốt.`,
                action: "Xử lý trước khi đánh giá doanh thu ca.",
              },
            ]
          : [],
    };
  }

  if (wantsWeakRevenue) {
    return {
      followUpQuestions: [
        "Món nào kéo doanh thu?",
        "Ca nào nên bố trí thêm người?",
        "Bàn nào đóng góp nhiều?",
      ],
      headline: weakDay
        ? `${weakDay.label} yếu nhất trong ${periodStats.label}.`
        : "Chưa đủ dữ liệu để tìm điểm yếu.",
      likelyCauses: [
        weakDay
          ? `Ngày ${weakDay.label} thấp hơn mức trung bình ${formatMoney(
              periodStats.averageRevenue,
            )}.`
          : "Chưa có đủ ngày phát sinh doanh thu.",
        topProduct
          ? "Doanh thu vẫn phụ thuộc vào món bán chạy chính."
          : "Chưa có món chủ lực rõ để kéo ngày yếu.",
      ],
      narrative: compactText(
        weakDay
          ? `${periodStats.label}: thấp nhất là ${weakDay.label} với ${formatMoney(
              weakDay.revenue,
            )}, trung bình ${formatMoney(periodStats.averageRevenue)}/ngày. Mạnh nhất là ${
              strongDay?.label ?? "chưa rõ"
            } với ${formatMoney(strongDay?.revenue ?? 0)}.`
          : `${periodStats.label}: chưa có đủ dữ liệu doanh thu để tìm ngày yếu.`,
      ),
      priorityActions: [
        {
          title: "Kéo ngày yếu",
          reason: weakDay
            ? `${weakDay.label} chỉ đạt ${formatMoney(weakDay.revenue)}.`
            : "Chưa có ngày yếu rõ ràng.",
          action:
            weakDay && strongDay
              ? `So sánh món bán, ca bán của ${weakDay.label} với ${strongDay.label}.`
              : "Theo dõi thêm doanh thu từng ngày trước khi kết luận.",
        },
        {
          title: topProduct ? `Đẩy ${topProduct.productName}` : "Chọn món chủ lực",
          reason: topProduct
            ? `${topProduct.productName} đang tạo ${formatMoney(topProduct.revenue)}.`
            : "Chưa thấy top món rõ trong ngày đang xem.",
          action: topProduct
            ? "Đưa món này vào gợi ý trong khung giờ có doanh thu thấp."
            : "Chọn một món dễ mua để thử kéo doanh thu.",
        },
      ],
      riskAlerts:
        weakDay && weakDay.revenue < periodStats.averageRevenue
          ? [
              {
                title: "Ngày doanh thu thấp",
                evidence: `${weakDay.label} thấp hơn trung bình kỳ.`,
                action: "Theo dõi lại lịch trực, thời tiết và món gợi ý ngày đó.",
              },
            ]
          : [],
    };
  }

  if (wantsShiftEfficiency) {
    return {
      followUpQuestions: [
        "Ca nào nên bố trí thêm người?",
        "Doanh thu đang yếu ở đâu?",
        "Bàn nào đóng góp nhiều?",
      ],
      headline: bestShift
        ? `Ca ${bestShift.label} hiệu quả nhất.`
        : "Chưa đủ dữ liệu để xếp ca.",
      likelyCauses: [
        bestShift
          ? `Ca ${bestShift.label} đang dẫn doanh thu tháng ${summary.shiftRevenue.monthLabel}.`
          : "Chưa có ca nào phát sinh đủ hóa đơn.",
        weakShift && bestShift && weakShift.key !== bestShift.key
          ? `Ca ${weakShift.label} còn thấp hơn rõ.`
          : "Các ca chưa có chênh lệch đủ lớn.",
      ],
      narrative: compactText(
        bestShift
          ? `Tháng ${summary.shiftRevenue.monthLabel}: ca ${bestShift.label} tạo ${formatMoney(
              bestShift.revenue,
            )} từ ${bestShift.invoiceCount} hóa đơn. Tổng tháng đang ghi nhận ${formatMoney(
              summary.shiftRevenue.totalRevenue,
            )}.`
          : `Tháng ${summary.shiftRevenue.monthLabel}: chưa đủ hóa đơn theo ca để kết luận ca hiệu quả nhất.`,
      ),
      priorityActions: [
        {
          title: bestShift ? `Nhân rộng ca ${bestShift.label}` : "Theo dõi thêm ca",
          reason: bestShift
            ? `${bestShift.invoiceCount} hóa đơn, ${formatMoney(bestShift.revenue)} doanh thu.`
            : "Dữ liệu ca còn mỏng.",
          action: bestShift
            ? "Xem món bán và cách phục vụ ở ca này để áp dụng cho ca yếu."
            : "Chờ thêm dữ liệu trước khi đánh giá hiệu quả ca.",
        },
        {
          title: weakShift ? `Kéo ca ${weakShift.label}` : "So sánh ca yếu",
          reason: weakShift
            ? `Ca này mới đạt ${formatMoney(weakShift.revenue)}.`
            : "Cần điểm so sánh để tối ưu lịch.",
          action: "Dùng món chủ lực và nhắc quầy ở ca có doanh thu thấp.",
        },
      ],
      riskAlerts: [],
    };
  }

  if (wantsStaffing) {
    return {
      followUpQuestions: [
        "Doanh thu đang yếu ở đâu?",
        "Có đơn nào cần xử lý?",
        "Ca nào hiệu quả nhất?",
      ],
      headline: bestShift
        ? `Ưu tiên thêm người ca ${bestShift.label}.`
        : "Chưa đủ dữ liệu ca để thêm người.",
      likelyCauses: [
        bestShift
          ? `Ca ${bestShift.label} có tải cao nhất tháng ${summary.shiftRevenue.monthLabel}.`
          : "Chưa có ca nào phát sinh đủ hóa đơn.",
        pendingOrders > 0
          ? "Đơn chờ thanh toán có thể làm quầy bị nghẽn."
          : "Chưa thấy nghẽn lớn ở trạng thái đơn.",
      ],
      narrative: compactText(
        bestShift
          ? `Tháng ${summary.shiftRevenue.monthLabel}: ca ${bestShift.label} dẫn với ${bestShift.invoiceCount} hóa đơn, ${formatMoney(
              bestShift.revenue,
            )}. Ca thấp nhất đang hoạt động là ${weakShift?.label ?? "chưa rõ"}.`
          : `Tháng ${summary.shiftRevenue.monthLabel}: chưa có đủ hóa đơn theo ca để đề xuất tăng nhân sự.`,
      ),
      priorityActions: [
        {
          title: bestShift
            ? `Bố trí thêm người ca ${bestShift.label}`
            : "Chưa tăng nhân sự vội",
          reason: bestShift
            ? `${bestShift.invoiceCount} hóa đơn, ${formatMoney(bestShift.revenue)} doanh thu.`
            : "Dữ liệu ca còn mỏng.",
          action: bestShift
            ? "Thêm 1 người hỗ trợ quầy/bếp vào ca này trong ngày đông khách."
            : "Theo dõi thêm vài ngày trước khi đổi lịch.",
        },
        {
          title: "Không dàn đều nhân sự",
          reason: weakShift
            ? `Ca ${weakShift.label} thấp hơn với ${formatMoney(weakShift.revenue)}.`
            : "Không phải ca nào cũng cần thêm người.",
          action: "Dồn người theo ca có hóa đơn và doanh thu cao nhất.",
        },
      ],
      riskAlerts:
        pendingOrders > 0
          ? [
              {
                title: "Quầy có thể nghẽn",
                evidence: `${pendingOrders} đơn đang chờ thanh toán.`,
                action: "Ưu tiên hỗ trợ thu ngân trước khi thêm người ở bếp.",
              },
            ]
          : [],
    };
  }

  if (wantsTable) {
    const topTable = summary.topTables[0] ?? null;

    return {
      followUpQuestions: [
        "Doanh thu đang yếu ở đâu?",
        "Nên đẩy món nào hôm nay?",
        "Ca nào nên bố trí thêm người?",
      ],
      headline: topTable
        ? `${topTable.tableName} đóng góp nhiều nhất.`
        : "Chưa có bàn nổi bật.",
      likelyCauses: [
        topTable
          ? "Một số bàn đang tạo doanh thu cao hơn phần còn lại."
          : "Ngày đang xem chưa có bàn phát sinh hóa đơn.",
        "Cần xem thêm ca bán để biết thời điểm bàn hoạt động mạnh.",
      ],
      narrative: compactText(
        topTable
          ? `${summary.selectedDateLabel}: ${topTable.tableName} tạo ${formatMoney(
              topTable.revenue,
            )} từ ${topTable.invoiceCount} hóa đơn. Tổng ngày là ${formatMoney(
              summary.todayRevenue,
            )}.`
          : `${summary.selectedDateLabel}: chưa có bàn nào đủ nổi bật để so sánh.`,
      ),
      priorityActions: [
        {
          title: topTable ? `Chăm ${topTable.tableName}` : "Theo dõi bàn phát sinh",
          reason: topTable
            ? `${topTable.invoiceCount} hóa đơn, ${formatMoney(topTable.revenue)} doanh thu.`
            : "Chưa có dữ liệu bàn.",
          action: topTable
            ? "Ưu tiên tốc độ phục vụ và gợi ý món kèm cho bàn có đóng góp cao."
            : "Đợi thêm hóa đơn trước khi kết luận bàn trọng điểm.",
        },
        {
          title: "So sánh với ca bán",
          reason: "Bàn mạnh thường gắn với khung giờ đông khách.",
          action: "Đối chiếu bàn mạnh với ca doanh thu cao để bố trí phục vụ.",
        },
      ],
      riskAlerts: [],
    };
  }

  const headline = wantsProductPush && topProduct
    ? `Ưu tiên đẩy ${topProduct.productName} hôm nay.`
    : wantsRisk && pendingOrders > 0
      ? `Cần xử lý ${pendingOrders} đơn chờ thanh toán.`
      : summary.todayPaidOrders > 0
        ? `Doanh thu ${formatMoney(
            summary.todayRevenue,
          )} từ ${summary.todayPaidOrders} hóa đơn.`
        : "Dữ liệu còn mỏng, nên kiểm tra đơn chờ.";
  const productSignal = topProduct
    ? `${topProduct.productName} đang dẫn top với ${topProduct.quantity} món, tạo ${formatMoney(
        topProduct.revenue,
      )}`
    : "chưa có món dẫn đầu rõ ràng";
  const shiftSignal = bestShift
    ? `ca ${bestShift.label} mạnh nhất với ${bestShift.invoiceCount} hóa đơn`
    : "chưa có ca nổi bật";
  const paymentSignal = topPayment
    ? `${topPayment.label} chiếm ${topPayment.share}% doanh thu thanh toán`
    : "chưa rõ kênh thanh toán chính";
  const priorityActions: AdminPriorityAction[] = [
    topProduct
      ? {
          title: `Ưu tiên ${topProduct.productName}`,
          reason: `${topProduct.quantity} món, ${formatMoney(
            topProduct.revenue,
          )} doanh thu.`,
          action:
            bestShift && bestShift.invoiceCount > 0
              ? `Đặt món này lên đầu gợi ý trong ca ${bestShift.label}.`
              : "Đặt món này lên đầu nhóm gợi ý hôm nay.",
        }
      : {
          title: "Tạo món gợi ý mặc định",
          reason: "Chưa có top món đủ rõ.",
          action: "Chọn một đồ uống dễ mua và một món kèm để thử trong ngày.",
        },
    {
      title: pendingOrders > 0 ? "Chốt đơn chờ thanh toán" : "Giữ nhịp quầy",
      reason:
        pendingOrders > 0
          ? `Có ${pendingOrders} đơn đang chờ thanh toán.`
          : "Luồng thanh toán sạch giúp dữ liệu doanh thu phản ánh nhanh hơn.",
      action:
        pendingOrders > 0
          ? "Nhắc thu ngân rà soát và chốt trước khi chuyển đơn sang bếp."
          : "Mở sẵn màn hình đơn chờ trong giờ cao điểm.",
    },
  ];

  if (bestShift) {
    priorityActions.push({
      title: `Tận dụng ca ${bestShift.label}`,
      reason: `Ca này đang tạo ${formatMoney(bestShift.revenue)} trong tháng.`,
      action: "Dùng ca này để thử combo hoặc món gợi ý trong 2-3 ngày tới.",
    });
  }

  const riskAlerts: AdminRiskAlert[] = [];

  if (pendingOrders > 0) {
    riskAlerts.push({
      title: "Đơn chờ thanh toán",
      evidence: `${pendingOrders} đơn còn ở trạng thái chờ thanh toán.`,
      action: "Kiểm tra quầy để tránh khách đã gọi nhưng món chưa sang bếp.",
    });
  }

  if (cancelledOrders > 0) {
    riskAlerts.push({
      title: "Có đơn bị hủy",
      evidence: `${cancelledOrders} đơn đã hủy trong ngày đang xem.`,
      action: "Xem lại lý do hủy để biết lỗi từ khách, quầy hay bếp.",
    });
  }

  if (weakDay && summary.dailyRevenue.length > 1) {
    riskAlerts.push({
      title: `Ngày ${weakDay.label} yếu hơn`,
      evidence: `Doanh thu ngày này chỉ ${formatMoney(weakDay.revenue)}.`,
      action: "So sánh món bán và ca bán của ngày này với ngày tốt nhất.",
    });
  }

  return {
    followUpQuestions: adminAiQuickQuestions.slice(0, 3),
    headline,
    likelyCauses: [
      topProduct
        ? "Doanh thu phụ thuộc vào món dẫn đầu."
        : "Chưa đủ hóa đơn để nhận diện món chủ lực.",
      bestShift
        ? `Ca ${bestShift.label} kéo doanh thu tốt nhất.`
        : "Chưa có ca bán nào đủ mạnh để so sánh.",
    ].slice(0, 2),
    narrative: compactText(
      `${summary.selectedDateLabel}: doanh thu ${formatMoney(
        summary.todayRevenue,
      )} từ ${summary.todayPaidOrders} hóa đơn; kỳ ${periodStats.label} đạt ${formatMoney(
        periodStats.revenue,
      )}, TB ${formatMoney(periodStats.averageRevenue)}/ngày; ${productSignal}. ${shiftSignal}; ${paymentSignal}.`,
    ),
    priorityActions: priorityActions.slice(0, 2),
    riskAlerts: riskAlerts.slice(0, 1),
  };
}

export function buildAdminInsightPrompt(summary: AdminPromptSummary) {
  const revenueDaysForPrompt = summary.dailyRevenue.slice(-30);
  const revenuePeriodLabel =
    revenueDaysForPrompt.length > 0
      ? `${revenueDaysForPrompt.length} ngày`
      : "theo ngày";
  const dailyLines =
    revenueDaysForPrompt.length > 0
      ? revenueDaysForPrompt
          .map(
            (day) =>
              `- ${day.label}: ${formatMoney(day.revenue)}, ${day.paidOrderCount} hóa đơn đã thanh toán, ${day.orderCount} đơn tạo`,
          )
          .join("\n")
      : "- Chưa có dữ liệu doanh thu ngày";
  const shiftLines = summary.shiftRevenue.shifts
    .map(
      (shift) =>
        `- ${shift.label}: ${formatMoney(shift.revenue)}, ${shift.invoiceCount} hóa đơn`,
    )
    .join("\n");
  const paymentLines =
    summary.paymentStats.length > 0
      ? summary.paymentStats
          .map(
            (payment) =>
              `- ${payment.label}: ${formatMoney(payment.revenue)}, ${payment.invoiceCount} hóa đơn, ${payment.share}% doanh thu`,
          )
          .join("\n")
      : "- Chưa có dữ liệu thanh toán";
  const tableLines =
    summary.topTables.length > 0
      ? summary.topTables
          .map(
            (table) =>
              `- ${table.tableName}: ${formatMoney(table.revenue)}, ${table.invoiceCount} hóa đơn`,
          )
          .join("\n")
      : "- Chưa có bàn phát sinh hóa đơn";
  const statusLines =
    summary.orderStatusStats.length > 0
      ? summary.orderStatusStats
          .filter((status) => status.count > 0)
          .map((status) => `- ${status.label}: ${status.count} đơn`)
          .join("\n") || "- Không có trạng thái đơn nổi bật"
      : "- Chưa có dữ liệu trạng thái đơn";
  const recentOrderLines =
    summary.recentOrders.length > 0
      ? summary.recentOrders
          .slice(0, 5)
          .map(
            (order) =>
              `- Đơn #${order.id} ${order.table.name}: ${order.status}, ${formatMoney(order.totalAmount)}, ${order.itemCount} món`,
          )
          .join("\n")
      : "- Chưa có đơn gần đây";
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
  const adminQuestion = toNonEmptyText(summary.question);

  return `Bạn là trợ lý phân tích vận hành cho quán cà phê NaNa Cafe.
Chỉ dựa trên dữ liệu được cung cấp, không bịa số liệu.
Luôn trả lời đúng trọng tâm câu hỏi cụ thể của admin; không tự chuyển sang tổng kết doanh thu nếu admin chỉ chào hỏi hoặc hỏi việc khác.
Nếu admin chỉ chào hỏi, hãy chào lại ngắn gọn và gợi ý họ hỏi về doanh thu, đơn chờ, món bán, ca bán hoặc bàn hoạt động; không phân tích số liệu.
Nếu câu hỏi không liên quan vận hành POS, hãy nói rõ phạm vi hỗ trợ của bạn và gợi ý 2-3 câu hỏi phù hợp; không bịa dữ liệu.
Nếu câu hỏi liên quan thưởng, khen hoặc nhân viên mà dữ liệu không có nhân viên theo hóa đơn, không nêu tên nhân viên; hãy nói rõ thiếu dữ liệu và gợi ý theo ca hoặc nhóm trực.
Không trả lời như dashboard thống kê. Hãy đóng vai cố vấn vận hành: nêu chuyện gì đang xảy ra, vì sao có thể xảy ra, ưu tiên hành động ngay và câu hỏi admin có thể hỏi tiếp.
Trả về JSON với các khóa:
- headline: một câu kết luận sắc gọn, tối đa 12 từ.
- narrative: tối đa 2 câu, ngắn nhưng đủ nghĩa, ưu tiên số liệu quan trọng nhất.
- likelyCauses: mảng tối đa 2 giả thuyết nguyên nhân, không khẳng định quá mức.
- priorityActions: mảng tối đa 2 object { title, reason, action }, mỗi trường ngắn nhưng đủ nghĩa.
- riskAlerts: mảng tối đa 1 object { title, evidence, action }.
- followUpQuestions: mảng tối đa 3 câu hỏi ngắn nhưng đủ nghĩa để admin bấm hỏi tiếp.
Nếu dữ liệu ít, nói rõ dữ liệu chưa đủ và đề xuất cách theo dõi tiếp.

Dữ liệu ngày đang xem (${summary.selectedDateLabel}):
- Doanh thu: ${formatMoney(summary.todayRevenue)}
- Đơn tạo: ${summary.todayOrders}
- Hóa đơn đã thanh toán: ${summary.todayPaidOrders}
- Giá trị hóa đơn trung bình: ${formatMoney(summary.averageInvoiceValue)}

Doanh thu ${revenuePeriodLabel} trong kỳ xem:
${dailyLines}

Doanh thu theo ca tháng ${summary.shiftRevenue.monthLabel}:
- Tổng doanh thu: ${formatMoney(summary.shiftRevenue.totalRevenue)}
- Tổng hóa đơn: ${summary.shiftRevenue.totalInvoiceCount}
${shiftLines}

Thanh toán:
${paymentLines}

Top bàn:
${tableLines}

Top món:
${topProductLines}

Trạng thái đơn:
${statusLines}

Đơn gần đây:
${recentOrderLines}

Câu hỏi cụ thể của admin: ${
    adminQuestion || defaultAdminAiQuestion
  }`;
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
    .slice(0, 24)
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

function findMenuItemByName(menuItems: CustomerMenuItem[], name: string) {
  const normalizedTarget = normalizeText(name);

  return menuItems.find(
    (item) =>
      normalizeText(item.name) === normalizedTarget ||
      normalizeText(item.name).includes(normalizedTarget),
  );
}

function formatMenuItemBrief(item: CustomerMenuItem) {
  return `${item.name} (${formatMoney(item.price)})`;
}

function listExistingItems(menuItems: CustomerMenuItem[], names: string[]) {
  return names
    .map((name) => findMenuItemByName(menuItems, name))
    .filter((item): item is CustomerMenuItem => Boolean(item));
}

export function buildFastCustomerChatReply({
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
  const normalizedMessage = normalizeText(message);
  const isAskingBestSeller =
    normalizedMessage.includes("ban chay") ||
    normalizedMessage.includes("best seller") ||
    normalizedMessage.includes("top mon");
  const isAskingLessSweet =
    normalizedMessage.includes("it ngot") ||
    normalizedMessage.includes("khong ngot") ||
    normalizedMessage.includes("giam duong");
  const isAskingCoolDrink =
    normalizedMessage.includes("do uong mat") ||
    normalizedMessage.includes("giai khat") ||
    normalizedMessage.includes("hom nay") ||
    normalizedMessage.includes("nong");
  const isAskingCakePairing =
    normalizedMessage.includes("banh") ||
    normalizedMessage.includes("an kem");
  const isAskingLightCoffee =
    normalizedMessage.includes("ca phe nhe") ||
    normalizedMessage.includes("cafe nhe") ||
    normalizedMessage.includes("khong qua dam");

  if (isAskingBestSeller && topProducts.length > 0) {
    const topLines = topProducts
      .slice(0, 3)
      .map((topProduct) => {
        const menuItem = findMenuItemByName(menuItems, topProduct.name);

        return menuItem
          ? formatMenuItemBrief(menuItem)
          : `${topProduct.name} (${topProduct.quantity} món)`;
      })
      .join(", ");

    return `Dạ, ở ${tableName} mình gợi ý nhanh các món đang bán chạy: ${topLines}. Anh/chị có thể bấm Mua ngay bên dưới để thêm vào giỏ.`;
  }

  if (isAskingLessSweet) {
    const items = listExistingItems(menuItems, [
      "Trà sữa truyền thống",
      "Trà đào cam sả",
      "Trà vải",
      "Bạc xỉu",
    ]).slice(0, 3);

    if (items.length > 0) {
      return `Dạ, nếu thích ít ngọt thì anh/chị nên chọn ${items
        .map(formatMenuItemBrief)
        .join(", ")} và để mức đường 50% hoặc 75%.`;
    }
  }

  if (isAskingLightCoffee) {
    const items = listExistingItems(menuItems, [
      "Bạc xỉu",
      "Cà phê sữa",
      "Cà phê muối",
    ]).slice(0, 3);

    if (items.length > 0) {
      return `Dạ, cà phê nhẹ dễ uống nhất là ${items
        .map(formatMenuItemBrief)
        .join(", ")}. Bạc xỉu thường hợp nếu anh/chị muốn vị cà phê mềm hơn.`;
    }
  }

  if (isAskingCakePairing) {
    const items = listExistingItems(menuItems, [
      "Bánh flan caramel",
      "Bánh su kem",
      "Cà phê sữa",
      "Trà đào cam sả",
    ]).slice(0, 3);

    if (items.length > 0) {
      return `Dạ, ăn kèm bánh thì anh/chị có thể chọn ${items
        .map(formatMenuItemBrief)
        .join(", ")}. Các món này dễ dùng cùng đồ uống và không bị quá ngấy.`;
    }
  }

  if (isAskingCoolDrink) {
    const items = listExistingItems(menuItems, [
      "Trà đào cam sả",
      "Trà vải",
      "Nước ép cam",
      "Sinh tố xoài",
    ]).slice(0, 3);

    if (items.length > 0) {
      return `Dạ, đồ uống mát dễ chọn hôm nay là ${items
        .map(formatMenuItemBrief)
        .join(", ")}. Anh/chị có thể chọn thêm đá 100% nếu muốn mát hơn.`;
    }
  }

  return null;
}

export function selectCustomerChatSuggestedProducts({
  limit = 3,
  menuItems,
  message,
  reply,
  topProducts,
}: {
  limit?: number;
  menuItems: Array<CustomerMenuItem & { id: number }>;
  message: string;
  reply: string;
  topProducts: CustomerTopProduct[];
}) {
  const normalizedMessage = normalizeText(message);
  const normalizedReply = normalizeText(reply);
  const topProductQuantityByName = new Map(
    topProducts.map((product) => [normalizeText(product.name), product.quantity]),
  );

  return menuItems
    .map((item) => {
      const normalizedName = normalizeText(item.name);
      const normalizedCategory = normalizeText(item.categoryName);
      const nameWords = normalizedName
        .split(/\s+/)
        .filter((word) => word.length >= 3);
      const replyMentionsName = normalizedReply.includes(normalizedName);
      const messageMentionsName = normalizedMessage.includes(normalizedName);
      const messageMentionsCategory = normalizedMessage.includes(normalizedCategory);
      const sharedWordScore = nameWords.filter(
        (word) =>
          normalizedMessage.includes(word) || normalizedReply.includes(word),
      ).length;
      const topQuantity = topProductQuantityByName.get(normalizedName) ?? 0;

      return {
        item,
        score:
          (replyMentionsName ? 10_000 : 0) +
          (messageMentionsName ? 2_000 : 0) +
          (messageMentionsCategory ? 800 : 0) +
          sharedWordScore * 120 +
          Math.min(topQuantity, 100),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.item.name.localeCompare(right.item.name, "vi"),
    )
    .slice(0, limit)
    .map(({ item }) => ({
      categoryName: item.categoryName,
      id: item.id,
      imageUrl: item.imageUrl ?? null,
      name: item.name,
      price: item.price,
    }));
}
