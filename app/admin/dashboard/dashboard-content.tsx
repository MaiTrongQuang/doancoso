"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  CountPill,
  PageHero,
  PageShell,
  Panel,
  PanelHeader,
} from "@/components/ui";
import { buildFastAdminInsight } from "@/lib/ai-insights";
import { formatMoney } from "@/lib/format-money";

type DailyRevenue = {
  date: string;
  label: string;
  revenue: number;
  orderCount: number;
  paidOrderCount: number;
};

type TopProduct = {
  productId: number;
  productName: string;
  categoryName: string;
  quantity: number;
  revenue: number;
};

type PaymentStat = {
  paymentMethod: string;
  label: string;
  invoiceCount: number;
  revenue: number;
  share: number;
};

type TopTable = {
  tableId: number;
  tableName: string;
  invoiceCount: number;
  revenue: number;
};

type OrderStatusStat = {
  status: string;
  label: string;
  count: number;
};

type RecentInvoice = {
  id: number;
  orderId: number;
  sessionId: number | null;
  totalAmount: number;
  paymentMethod: string;
  paidAt: string;
  table: {
    id: number;
    name: string;
  };
};

type RecentOrder = {
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
};

type ShiftRevenueItem = {
  key: string;
  label: string;
  startHour: number;
  endHour: number;
  revenue: number;
  invoiceCount: number;
  averageInvoiceValue: number;
  bestDay: string | null;
  bestDayLabel: string | null;
  bestDayRevenue: number;
};

type ShiftRevenue = {
  month: string;
  monthLabel: string;
  totalInvoiceCount: number;
  totalRevenue: number;
  shifts: ShiftRevenueItem[];
};

type AdminAiAction = {
  title: string;
  reason: string;
  action: string;
};

type AdminAiRiskAlert = {
  title: string;
  evidence: string;
  action: string;
};

type AdminAiInsight = {
  headline: string;
  narrative: string;
  likelyCauses: string[];
  priorityActions: AdminAiAction[];
  riskAlerts: AdminAiRiskAlert[];
  followUpQuestions: string[];
};

type AdminAiMessageStatus = "fast" | "thinking" | "final" | "error";

type AdminAiChatMessage = {
  id: number;
  role: "assistant" | "user";
  content: string;
  insight?: AdminAiInsight;
  status?: AdminAiMessageStatus;
};

type DashboardSummary = {
  isSelectedToday: boolean;
  selectedDate: string;
  selectedDateLabel: string;
  todayRevenue: number;
  todayOrders: number;
  todayPaidOrders: number;
  averageInvoiceValue: number;
  availableProducts: number;
  totalTables: number;
  dailyRevenue: DailyRevenue[];
  topProducts: TopProduct[];
  paymentStats: PaymentStat[];
  topTables: TopTable[];
  orderStatusStats: OrderStatusStat[];
  recentInvoices: RecentInvoice[];
  recentOrders: RecentOrder[];
  shiftRevenue: ShiftRevenue;
};

const periodOptions = [
  { label: "7 ngày", value: 7 },
  { label: "30 ngày", value: 30 },
] as const;

const paymentToneClassName: Record<string, string> = {
  CASH: "bg-emerald-50 text-emerald-700",
  QR: "bg-sky-50 text-sky-700",
};

const invoiceMethodLabel: Record<string, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  QR_PAYMENT: "Thanh toán QR",
};

const defaultAdminAiQuestion =
  "Hôm nay quán đang vận hành thế nào và nên làm gì ngay?";

const adminAiQuickQuestions = [
  "Vì sao doanh thu hôm nay thấp?",
  "Ngày mai nên đẩy món nào?",
  "Có rủi ro vận hành nào cần xử lý?",
  "Ca nào cần tối ưu nhân sự?",
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getBarHeight(revenue: number, maxRevenue: number) {
  if (maxRevenue <= 0 || revenue <= 0) {
    return 10;
  }

  return Math.max(14, Math.round((revenue / maxRevenue) * 178));
}

function getWidthPercent(value: number, maxValue: number) {
  if (value <= 0 || maxValue <= 0) {
    return 0;
  }

  return Math.max(8, Math.round((value / maxValue) * 100));
}

function getErrorMessage(value: unknown, fallback: string) {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }

  return fallback;
}

function getAdminAiStatusLabel(status: AdminAiMessageStatus | undefined) {
  if (status === "thinking") {
    return "Đang tinh chỉnh bằng Gemini";
  }

  if (status === "fast") {
    return "Trả lời nhanh từ dữ liệu POS";
  }

  if (status === "error") {
    return "Đang dùng bản nhanh";
  }

  return "Đã cập nhật";
}

function AdminAiInsightBubble({
  disabled,
  insight,
  onAskFollowUp,
  status,
}: {
  disabled: boolean;
  insight: AdminAiInsight;
  onAskFollowUp: (question: string) => void;
  status?: AdminAiMessageStatus;
}) {
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-[#eef4ef] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#2f5d50]">
            {getAdminAiStatusLabel(status)}
          </span>
          {status === "thinking" ? (
            <span className="flex items-center gap-1 text-xs font-bold text-[#2f5d50]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2f5d50]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2f5d50] [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2f5d50] [animation-delay:240ms]" />
            </span>
          ) : null}
        </div>
        <h3 className="mt-3 text-xl font-black leading-tight text-[#172027]">
          {insight.headline}
        </h3>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#31564b]">
          {insight.narrative}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="rounded-2xl border border-[#dfe7df] bg-white p-4">
          <h4 className="text-sm font-black text-[#172027]">
            Hành động ưu tiên
          </h4>
          <div className="mt-3 divide-y divide-[#eadfce]">
            {insight.priorityActions.length > 0 ? (
              insight.priorityActions.map((action) => (
                <article className="py-3 first:pt-0 last:pb-0" key={action.title}>
                  <p className="font-black text-[#172027]">{action.title}</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[#625b50]">
                    {action.reason}
                  </p>
                  <p className="mt-2 text-sm font-black leading-6 text-[#9a5b00]">
                    {action.action}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm font-semibold text-[#625b50]">
                Chưa có hành động ưu tiên rõ ràng.
              </p>
            )}
          </div>
        </section>

        <section className="grid gap-3">
          <div className="rounded-2xl border border-[#dfe7df] bg-white p-4">
            <h4 className="text-sm font-black text-[#172027]">
              Nguyên nhân có thể
            </h4>
            <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-[#625b50]">
              {insight.likelyCauses.length > 0 ? (
                insight.likelyCauses.map((cause) => (
                  <li className="rounded-xl bg-[#f8f3ea] px-3 py-2" key={cause}>
                    {cause}
                  </li>
                ))
              ) : (
                <li>AI cần thêm dữ liệu để suy luận nguyên nhân.</li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#f2d6d6] bg-[#fff8f8] p-4">
            <h4 className="text-sm font-black text-[#8a1f1f]">
              Cảnh báo
            </h4>
            <div className="mt-3 grid gap-2">
              {insight.riskAlerts.length > 0 ? (
                insight.riskAlerts.map((risk) => (
                  <article className="rounded-xl bg-white p-3" key={risk.title}>
                    <p className="font-black text-red-700">{risk.title}</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-red-700/80">
                      {risk.evidence}
                    </p>
                    <p className="mt-2 text-sm font-bold leading-6 text-[#3b352d]">
                      {risk.action}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm font-semibold text-[#625b50]">
                  Chưa thấy cảnh báo lớn trong dữ liệu hiện tại.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      {insight.followUpQuestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {insight.followUpQuestions.map((question) => (
            <button
              className="rounded-full border border-[#2f5d50] bg-white px-3 py-2 text-xs font-black text-[#2f5d50] transition hover:bg-[#eff7f2] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
              key={question}
              onClick={() => onAskFollowUp(question)}
              type="button"
            >
              {question}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DashboardContent() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [periodDays, setPeriodDays] = useState<7 | 30>(7);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [error, setError] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiMessages, setAiMessages] = useState<AdminAiChatMessage[]>([
    {
      content:
        "Tôi đang theo dõi doanh thu, món bán, ca bán và trạng thái đơn. Bạn có thể hỏi thẳng về món nên đẩy, rủi ro vận hành hoặc ca cần tối ưu.",
      id: 1,
      role: "assistant",
      status: "final",
    },
  ]);
  const [aiQuestion, setAiQuestion] = useState(defaultAdminAiQuestion);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const aiMessageIdRef = useRef(1);
  const aiMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      setIsLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          days: String(periodDays),
        });

        if (selectedDate) {
          params.set("date", selectedDate);
        }

        if (selectedMonth) {
          params.set("month", selectedMonth);
        }

        const response = await fetch(`/api/dashboard/summary?${params}`, {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(getErrorMessage(result, "Không thể tải dashboard."));
        }

        if (isMounted) {
          setData(result as DashboardSummary);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Không thể tải dashboard.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, [periodDays, selectedDate, selectedMonth]);

  useEffect(() => {
    aiMessagesEndRef.current?.scrollIntoView({
      block: "end",
      behavior: "smooth",
    });
  }, [aiMessages]);

  const maxRevenue = useMemo(
    () =>
      Math.max(
        1,
        ...(data?.dailyRevenue.map((item) => item.revenue) ?? [0]),
      ),
    [data],
  );

  const totalRevenueInChart = useMemo(
    () =>
      data?.dailyRevenue.reduce((total, item) => total + item.revenue, 0) ?? 0,
    [data],
  );

  const totalInvoicesInChart = useMemo(
    () =>
      data?.dailyRevenue.reduce(
        (total, item) => total + item.paidOrderCount,
        0,
      ) ?? 0,
    [data],
  );

  const maxProductRevenue = useMemo(
    () => Math.max(1, ...(data?.topProducts.map((item) => item.revenue) ?? [0])),
    [data],
  );

  const maxTableRevenue = useMemo(
    () => Math.max(1, ...(data?.topTables.map((item) => item.revenue) ?? [0])),
    [data],
  );

  const maxShiftRevenue = useMemo(
    () =>
      Math.max(
        1,
        ...(data?.shiftRevenue.shifts.map((item) => item.revenue) ?? [0]),
      ),
    [data],
  );

  const paymentMix = useMemo(() => {
    const cash = data?.paymentStats.find(
      (item) => item.paymentMethod === "CASH",
    );
    const qrStats =
      data?.paymentStats.filter((item) => item.paymentMethod !== "CASH") ?? [];
    const qrRevenue = qrStats.reduce((total, item) => total + item.revenue, 0);
    const qrInvoiceCount = qrStats.reduce(
      (total, item) => total + item.invoiceCount,
      0,
    );
    const totalRevenue = (cash?.revenue ?? 0) + qrRevenue;

    return [
      {
        key: "CASH",
        label: "Tiền mặt",
        invoiceCount: cash?.invoiceCount ?? 0,
        revenue: cash?.revenue ?? 0,
        share:
          totalRevenue > 0
            ? Math.round(((cash?.revenue ?? 0) / totalRevenue) * 100)
            : 0,
      },
      {
        key: "QR",
        label: "Thanh toán QR",
        invoiceCount: qrInvoiceCount,
        revenue: qrRevenue,
        share: totalRevenue > 0 ? Math.round((qrRevenue / totalRevenue) * 100) : 0,
      },
    ];
  }, [data]);

  const selectedDateKey = data?.selectedDate ?? "";
  const selectedDateLabel = data?.isSelectedToday
    ? `hôm nay (${data.selectedDateLabel})`
    : (data?.selectedDateLabel ?? "ngày đã chọn");
  const selectedShiftMonth =
    selectedMonth || data?.shiftRevenue.month || "";

  const kpiCards = [
    {
      label: data?.isSelectedToday
        ? "Doanh thu hôm nay"
        : `Doanh thu ${data?.selectedDateLabel ?? ""}`,
      value: data ? formatMoney(data.todayRevenue) : "--",
      subcopy: `${data?.todayPaidOrders ?? 0} hóa đơn đã thanh toán`,
    },
    {
      label: "Số hóa đơn",
      value: data ? data.todayPaidOrders.toString() : "--",
      subcopy: `${data?.todayOrders ?? 0} đơn được tạo trong ngày`,
    },
    {
      label: `Doanh thu ${periodDays} ngày`,
      value: formatMoney(totalRevenueInChart),
      subcopy: `${totalInvoicesInChart} hóa đơn trong kỳ`,
    },
    {
      label: "Menu đang bán",
      value: data ? data.availableProducts.toString() : "--",
      subcopy: `${data?.totalTables ?? 0} bàn trong hệ thống`,
    },
  ];

  function createAiMessageId() {
    aiMessageIdRef.current += 1;
    return aiMessageIdRef.current;
  }

  async function handleGenerateAiInsight(questionOverride?: string) {
    const question =
      (questionOverride ?? aiQuestion).trim() || defaultAdminAiQuestion;

    if (!data) {
      setAiError("Dashboard chưa tải xong dữ liệu.");
      return;
    }

    setAiError("");
    setAiQuestion(question);
    setIsAiLoading(true);

    const userMessageId = createAiMessageId();
    const assistantMessageId = createAiMessageId();
    const fastInsight = buildFastAdminInsight({
      ...data,
      question,
    });

    setAiMessages((messages) => [
      ...messages,
      {
        content: question,
        id: userMessageId,
        role: "user",
      },
      {
        content: "",
        id: assistantMessageId,
        insight: fastInsight,
        role: "assistant",
        status: "thinking",
      },
    ]);

    try {
      const response = await fetch("/api/ai/admin-insights", {
        body: JSON.stringify({
          date: selectedDate || undefined,
          days: periodDays,
          month: selectedShiftMonth || undefined,
          question: question || defaultAdminAiQuestion,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok || !result.data) {
        throw new Error(getErrorMessage(result, "Không thể tạo phân tích AI."));
      }

      setAiMessages((messages) =>
        messages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                insight: result.data as AdminAiInsight,
                status: result.source === "fast" ? "fast" : "final",
              }
            : message,
        ),
      );
    } catch (caughtError) {
      setAiMessages((messages) =>
        messages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                status: "error",
              }
            : message,
        ),
      );
      console.error(caughtError);
    } finally {
      setIsAiLoading(false);
    }
  }

  return (
    <PageShell maxWidthClassName="max-w-[1440px]">
      <PageHero
        eyebrow="Admin"
        title="Dashboard doanh thu"
        description="Bức tranh vận hành theo doanh thu, hóa đơn, bàn hoạt động, món bán chạy và tỷ lệ thanh toán."
        actions={
          <>
            <button
              className="pos-button-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isAiLoading || isLoading}
              onClick={() => handleGenerateAiInsight()}
              type="button"
            >
              {isAiLoading ? "AI đang suy luận..." : "Hỏi AI vận hành"}
            </button>
            <div className="flex rounded-full border border-[#d6d1c7] bg-white p-1 shadow-sm">
              {periodOptions.map((option) => (
                <button
                  className={
                    periodDays === option.value
                      ? "rounded-full bg-[#172027] px-4 py-2 text-sm font-black text-white"
                      : "rounded-full px-4 py-2 text-sm font-black text-[#625b50] transition hover:bg-[#f8f3ea]"
                  }
                  key={option.value}
                  onClick={() => setPeriodDays(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        }
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {aiError ? <Alert tone="danger">{aiError}</Alert> : null}

      <Panel className="overflow-hidden p-0">
        <div className="bg-[#172027] p-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f2a93b] text-sm font-black text-[#172027]">
                AI
              </div>
              <div>
                <h2 className="text-xl font-black">Trợ lý vận hành</h2>
                <p className="mt-1 text-sm font-semibold text-white/70">
                  Chat với dữ liệu doanh thu, món bán, ca bán và trạng thái đơn.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-right sm:flex">
              <div className="rounded-2xl bg-white/10 px-4 py-2">
                <p className="text-[11px] font-black uppercase text-white/55">
                  Doanh thu
                </p>
                <p className="mt-1 text-sm font-black">
                  {formatMoney(data?.todayRevenue ?? 0)}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-2">
                <p className="text-[11px] font-black uppercase text-white/55">
                  Hóa đơn
                </p>
                <p className="mt-1 text-sm font-black">
                  {data?.todayPaidOrders ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-[#eadfce] bg-[#f8f3ea] p-4 lg:border-b-0 lg:border-r">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-[#6d645a]">
              Câu hỏi nhanh
            </p>
            <div className="mt-3 grid gap-2">
              {adminAiQuickQuestions.map((question) => (
                <button
                  className="rounded-2xl border border-[#d6d1c7] bg-white px-3 py-3 text-left text-sm font-black leading-5 text-[#3b352d] transition hover:border-[#2f5d50] hover:bg-[#eff7f2] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isAiLoading || isLoading}
                  key={question}
                  onClick={() => handleGenerateAiInsight(question)}
                  type="button"
                >
                  {question}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-[#6d645a]">
                Ngữ cảnh
              </p>
              <div className="mt-3 grid gap-3 text-sm font-semibold text-[#625b50]">
                <div>
                  <p className="text-[#172027]">Ngày xem</p>
                  <p>{selectedDateLabel}</p>
                </div>
                <div>
                  <p className="text-[#172027]">Top món</p>
                  <p>{data?.topProducts[0]?.productName ?? "Chưa có dữ liệu"}</p>
                </div>
                <div>
                  <p className="text-[#172027]">Ca mạnh</p>
                  <p>
                    {data?.shiftRevenue.shifts
                      .slice()
                      .sort((firstShift, secondShift) =>
                        secondShift.revenue - firstShift.revenue,
                      )[0]?.label ?? "Chưa có dữ liệu"}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <section className="flex min-h-[560px] flex-col bg-[#fbfaf7]">
            <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-5">
              {aiMessages.map((message) => (
                <div
                  className={
                    message.role === "user"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                  key={message.id}
                >
                  <div
                    className={
                      message.role === "user"
                        ? "max-w-[82%] rounded-3xl rounded-br-md bg-[#2f5d50] px-4 py-3 text-sm font-bold leading-6 text-white shadow-sm"
                        : "max-w-[940px] rounded-3xl rounded-bl-md border border-[#dfe7df] bg-white p-4 text-[#172027] shadow-[0_12px_28px_rgba(31,36,40,0.06)]"
                    }
                  >
                    {message.role === "user" ? (
                      <p>{message.content}</p>
                    ) : message.insight ? (
                      <AdminAiInsightBubble
                        disabled={isAiLoading}
                        insight={message.insight}
                        onAskFollowUp={handleGenerateAiInsight}
                        status={message.status}
                      />
                    ) : (
                      <div className="flex gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#172027] text-xs font-black text-white">
                          AI
                        </div>
                        <p className="text-sm font-semibold leading-6 text-[#625b50]">
                          {message.content}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={aiMessagesEndRef} />
            </div>

            <form
              className="border-t border-[#eadfce] bg-white p-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleGenerateAiInsight();
              }}
            >
              <label className="sr-only" htmlFor="admin-ai-question">
                Câu hỏi cho AI
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="pos-input"
                  disabled={isAiLoading || isLoading}
                  id="admin-ai-question"
                  onChange={(event) => setAiQuestion(event.target.value)}
                  placeholder="Hỏi về doanh thu, món bán, ca bán..."
                  value={aiQuestion}
                />
                <button
                  className="pos-button-primary whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isAiLoading || isLoading}
                  type="submit"
                >
                  {isAiLoading ? "Đang trả lời" : "Gửi"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </Panel>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <article
            className="rounded-2xl border border-[#eadfce] bg-white p-5 shadow-[0_12px_32px_rgba(31,36,40,0.06)]"
            key={card.label}
          >
            <p className="text-xs font-black uppercase tracking-[0.1em] text-[#6d645a]">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-black text-[#172027]">
              {isLoading ? "Đang tải..." : card.value}
            </p>
            <p className="mt-2 text-sm font-semibold text-[#6d645a]">
              {card.subcopy}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.6fr)]">
        <Panel className="min-w-0 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#172027]">
                Doanh thu {periodDays} ngày
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#625b50]">
                Tổng kỳ: {formatMoney(totalRevenueInChart)}
              </p>
              <p className="mt-1 text-sm font-black text-[#2f5d50]">
                Đang xem:{" "}
                {data?.isSelectedToday
                  ? `Hôm nay (${data.selectedDateLabel})`
                  : data?.selectedDateLabel}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded-full border border-[#d6d1c7] bg-white px-3 py-2 text-xs font-black text-[#3b352d] transition hover:bg-[#f8f3ea] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!selectedDate}
                onClick={() => setSelectedDate("")}
                type="button"
              >
                Hôm nay
              </button>
              <CountPill>{totalInvoicesInChart} hóa đơn</CountPill>
            </div>
          </div>

          <div
            className="mt-6 grid h-64 items-end gap-2 border-b border-[#eadfce] pb-4"
            style={{
              gridTemplateColumns: `repeat(${data?.dailyRevenue.length ?? periodDays}, minmax(22px, 1fr))`,
            }}
          >
            {isLoading
              ? Array.from({ length: periodDays }, (_, index) => (
                  <div
                    className="flex h-full items-end justify-center"
                    key={index}
                  >
                    <div className="h-16 w-full rounded-t-xl bg-[#eadfce]" />
                  </div>
                ))
              : data?.dailyRevenue.map((item) => (
                  <button
                    aria-pressed={item.date === selectedDateKey}
                    className="flex h-full min-w-0 flex-col items-center justify-end gap-2 rounded-t-xl outline-none transition hover:bg-[#f8f3ea]/70 focus-visible:ring-2 focus-visible:ring-[#2f5d50]"
                    key={item.date}
                    onClick={() => setSelectedDate(item.date)}
                    title={`${item.label}: ${formatMoney(item.revenue)}`}
                    type="button"
                  >
                    <span className="text-[11px] font-black text-[#625b50]">
                      {item.paidOrderCount}
                    </span>
                    <div
                      className={
                        item.date === selectedDateKey
                          ? "w-full rounded-t-xl bg-[#f2a93b] shadow-[inset_0_1px_0_rgba(255,255,255,0.36)]"
                          : "w-full rounded-t-xl bg-[#2f5d50] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
                      }
                      style={{
                        height: `${getBarHeight(item.revenue, maxRevenue)}px`,
                      }}
                    />
                  </button>
                ))}
          </div>

          <div
            className="mt-3 grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${data?.dailyRevenue.length ?? periodDays}, minmax(22px, 1fr))`,
            }}
          >
            {(data?.dailyRevenue ?? []).map((item, index) => {
              const showLabel =
                periodDays === 7 ||
                index === 0 ||
                index === data!.dailyRevenue.length - 1 ||
                index % 5 === 0;

              return (
                <div className="min-w-0 text-center" key={item.date}>
                  <p className="truncate text-[11px] font-bold text-[#1f2933]">
                    {showLabel ? item.label : ""}
                  </p>
                  {periodDays === 7 ? (
                    <p className="mt-1 truncate text-[11px] text-[#625b50]">
                      {formatMoney(item.revenue)}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Panel>

        <section className="grid gap-6">
          <Panel className="p-5">
            <PanelHeader
              className="border-b-0 p-0"
              title="Tỷ lệ thanh toán"
              description={`Tính theo doanh thu hóa đơn ${selectedDateLabel}.`}
            />

            <div className="mt-5 overflow-hidden rounded-full bg-[#f1eadf]">
              <div className="flex h-4">
                <div
                  className="bg-[#2f5d50]"
                  style={{ width: `${paymentMix[0].share}%` }}
                />
                <div
                  className="bg-[#2563eb]"
                  style={{ width: `${paymentMix[1].share}%` }}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {paymentMix.map((payment) => (
                <article
                  className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4"
                  key={payment.key}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${paymentToneClassName[payment.key]}`}
                    >
                      {payment.label}
                    </span>
                    <span className="text-lg font-black text-[#172027]">
                      {payment.share}%
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#625b50]">
                    {payment.invoiceCount} hóa đơn
                  </p>
                  <p className="mt-1 text-lg font-black text-[#2f5d50]">
                    {formatMoney(payment.revenue)}
                  </p>
                </article>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <PanelHeader
              className="border-b-0 p-0"
              title={`Bàn hoạt động ${selectedDateLabel}`}
              aside={<CountPill>{data?.topTables.length ?? 0} bàn</CountPill>}
            />

            <div className="mt-4 grid gap-3">
              {isLoading ? (
                <div className="pos-empty text-left">Đang tải thống kê bàn...</div>
              ) : null}

              {!isLoading && data?.topTables.length === 0 ? (
                <div className="pos-empty text-left">
                  Chưa có bàn nào phát sinh hóa đơn.
                </div>
              ) : null}

              {data?.topTables.map((table, index) => (
                <article className="rounded-2xl bg-[#fffdf9] p-4" key={table.tableId}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.1em] text-[#6d645a]">
                        #{index + 1}
                      </p>
                      <h3 className="mt-1 truncate text-base font-black text-[#172027]">
                        {table.tableName}
                      </h3>
                    </div>
                    <span className="text-sm font-black text-[#2f5d50]">
                      {formatMoney(table.revenue)}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f1eadf]">
                    <div
                      className="h-full rounded-full bg-[#f2a93b]"
                      style={{
                        width: `${getWidthPercent(table.revenue, maxTableRevenue)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-[#625b50]">
                    {table.invoiceCount} hóa đơn
                  </p>
                </article>
              ))}
            </div>
          </Panel>
        </section>
      </section>

      <Panel className="min-w-0 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PanelHeader
            className="border-b-0 p-0"
            title="Doanh thu theo ca"
            description={`Tính theo hóa đơn đã thanh toán trong tháng ${
              data?.shiftRevenue.monthLabel ?? ""
            }.`}
          />
          <label className="flex min-w-[180px] flex-col gap-2 text-sm font-bold text-[#3b352d]">
            Tháng thống kê
            <input
              className="pos-input"
              onChange={(event) => setSelectedMonth(event.target.value)}
              type="month"
              value={selectedShiftMonth}
            />
          </label>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <div className="pos-empty text-left md:col-span-2 xl:col-span-3">
              Đang tải doanh thu theo ca...
            </div>
          ) : null}

          {data?.shiftRevenue.shifts.map((shift) => (
            <article
              className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4"
              key={shift.key}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-[#6d645a]">
                    Ca
                  </p>
                  <h3 className="mt-1 text-xl font-black text-[#172027]">
                    {shift.label}
                  </h3>
                </div>
                <span className="pos-badge bg-[#eef4ef] text-[#2f5d50]">
                  {shift.invoiceCount} hóa đơn
                </span>
              </div>
              <p className="mt-4 text-2xl font-black text-[#2f5d50]">
                {formatMoney(shift.revenue)}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f1eadf]">
                <div
                  className="h-full rounded-full bg-[#2f5d50]"
                  style={{
                    width: `${getWidthPercent(shift.revenue, maxShiftRevenue)}%`,
                  }}
                />
              </div>
              <div className="mt-4 grid gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-[#625b50]">Trung bình</span>
                  <span className="font-bold text-[#172027]">
                    {formatMoney(shift.averageInvoiceValue)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#625b50]">Ngày tốt nhất</span>
                  <span className="text-right font-bold text-[#172027]">
                    {shift.bestDayLabel
                      ? `${shift.bestDayLabel} · ${formatMoney(
                          shift.bestDayRevenue,
                        )}`
                      : "Chưa có"}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-[#172027] p-4 text-white">
          <p className="text-sm font-semibold text-white/70">
            Tổng doanh thu theo ca trong tháng
          </p>
          <p className="mt-1 text-3xl font-black">
            {formatMoney(data?.shiftRevenue.totalRevenue ?? 0)}
          </p>
          <p className="mt-1 text-sm font-semibold text-white/70">
            {data?.shiftRevenue.totalInvoiceCount ?? 0} hóa đơn đã thanh toán
          </p>
        </div>
      </Panel>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Panel className="min-w-0 p-5">
          <PanelHeader
            className="border-b-0 p-0"
            title="Top món bán chạy"
            description={`Xếp theo số lượng và doanh thu đã thanh toán ${selectedDateLabel}.`}
          />

          <div className="mt-4 flex flex-col gap-3">
            {isLoading ? (
              <div className="pos-empty text-left">
                Đang tải thống kê món bán chạy...
              </div>
            ) : null}

            {!isLoading && data?.topProducts.length === 0 ? (
              <div className="pos-empty text-left">
                Chưa có món nào trong hóa đơn đã thanh toán.
              </div>
            ) : null}

            {data?.topProducts.map((product, index) => (
              <article
                className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4"
                key={product.productId}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#6b6254]">
                      #{index + 1} · {product.categoryName}
                    </p>
                    <h3 className="mt-1 truncate font-black text-[#1f2933]">
                      {product.productName}
                    </h3>
                  </div>
                  <span className="pos-badge bg-[#f8f3ea] text-[#6d645a]">
                    {product.quantity} món
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f1eadf]">
                  <div
                    className="h-full rounded-full bg-[#2f5d50]"
                    style={{
                      width: `${getWidthPercent(product.revenue, maxProductRevenue)}%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-sm font-black text-[#2f5d50]">
                  {formatMoney(product.revenue)}
                </p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel className="min-w-0 overflow-hidden">
          <PanelHeader
            title="Hóa đơn gần nhất"
            description={`Quầy vận hành có thể mở nhanh hóa đơn trong ${selectedDateLabel}.`}
            aside={<CountPill>{data?.recentInvoices.length ?? 0} hóa đơn</CountPill>}
          />

          <div className="overflow-x-auto">
            <table className="pos-table min-w-[760px]">
              <thead>
                <tr>
                  <th className="px-4 py-3">Hóa đơn</th>
                  <th className="px-4 py-3">Bàn</th>
                  <th className="px-4 py-3">Phương thức</th>
                  <th className="px-4 py-3 text-right">Tổng tiền</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3 text-right">In</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-5 text-[#625b50]" colSpan={6}>
                      Đang tải hóa đơn...
                    </td>
                  </tr>
                ) : null}

                {!isLoading && data?.recentInvoices.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-[#625b50]" colSpan={6}>
                      Chưa có hóa đơn nào.
                    </td>
                  </tr>
                ) : null}

                {data?.recentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-[#eadfce]">
                    <td className="px-4 py-3">
                      <p className="font-black text-[#1f2933]">#{invoice.id}</p>
                      <p className="mt-1 text-xs font-semibold text-[#625b50]">
                        Đơn #{invoice.orderId}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#3b352d]">
                      {invoice.table.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#f8f3ea] px-3 py-1 text-xs font-black text-[#6d645a]">
                        {invoiceMethodLabel[invoice.paymentMethod] ??
                          invoice.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-[#2f5d50]">
                      {formatMoney(invoice.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-[#625b50]">
                      {formatDateTime(invoice.paidAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        className="rounded-md border border-[#2f5d50] px-3 py-2 text-sm font-black text-[#2f5d50] transition hover:bg-[#eff7f2]"
                        href={`/invoices/${invoice.id}/print`}
                      >
                        Xem
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </PageShell>
  );
}
