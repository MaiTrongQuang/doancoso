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
import {
  adminAiQuickQuestions,
  buildAdminAiRequestKey,
  defaultAdminAiQuestion,
  type AdminAiMode,
} from "@/lib/admin-ai-chat";
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
    return "Đang hỏi AI sâu";
  }

  if (status === "fast") {
    return "Trả lời tức thì";
  }

  if (status === "error") {
    return "Bản nhanh";
  }

  return "AI sâu";
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
  const primaryRisk = insight.riskAlerts[0];

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="rounded-full bg-[#eef4ef] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#2f5d50]">
            {getAdminAiStatusLabel(status)}
          </span>
          <h3 className="mt-2 text-base font-black leading-snug text-[#172027]">
            {insight.headline}
          </h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#4f5d55]">
            {insight.narrative}
          </p>
        </div>
        {status === "thinking" ? (
          <span className="mt-1 flex items-center gap-1 text-xs font-bold text-[#2f5d50]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2f5d50]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2f5d50] [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2f5d50] [animation-delay:240ms]" />
          </span>
        ) : null}
      </div>

      {insight.priorityActions.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {insight.priorityActions.slice(0, 2).map((action) => (
            <article
              className="rounded-xl border border-[#e5d8c8] bg-[#fffaf2] px-3 py-2.5"
              key={action.title}
            >
              <p className="text-xs font-black uppercase tracking-[0.08em] text-[#9a5b00]">
                Nên làm
              </p>
              <p className="mt-1 text-sm font-black text-[#172027]">
                {action.title}
              </p>
              <p className="mt-1 text-xs font-bold leading-5 text-[#8a6a3f]">
                {action.reason}
              </p>
              <p className="mt-1 text-sm font-semibold leading-5 text-[#625b50]">
                {action.action}
              </p>
            </article>
          ))}
        </div>
      ) : null}

      {primaryRisk ? (
        <div className="rounded-xl border border-[#f0c8c8] bg-[#fff8f8] px-3 py-2.5 text-sm font-semibold leading-5 text-[#8a1f1f]">
          <span className="font-black">Chú ý: {primaryRisk.title}.</span>{" "}
          {primaryRisk.action}
        </div>
      ) : null}

      {insight.followUpQuestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {insight.followUpQuestions.slice(0, 3).map((question) => (
            <button
              className="rounded-full border border-[#d6d1c7] bg-white px-3 py-1.5 text-xs font-black text-[#2f5d50] transition hover:border-[#2f5d50] hover:bg-[#eff7f2] disabled:cursor-not-allowed disabled:opacity-50"
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
      content: "Chọn câu hỏi nhanh hoặc nhập câu hỏi vận hành.",
      id: 1,
      role: "assistant",
      status: "final",
    },
  ]);
  const [aiQuestion, setAiQuestion] = useState(defaultAdminAiQuestion);
  const [answeredAiRequestKeys, setAnsweredAiRequestKeys] = useState<string[]>(
    [],
  );
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const aiMessageIdRef = useRef(1);
  const answeredAiRequestKeySetRef = useRef<Set<string>>(new Set());

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

  function getAiRequestKey(question: string, mode: AdminAiMode) {
    return buildAdminAiRequestKey({
      mode,
      periodDays,
      question,
      selectedDate: selectedDate || data?.selectedDate || "",
      selectedMonth: selectedShiftMonth,
    });
  }

  function isAnsweredAiRequestKey(requestKey: string) {
    return Boolean(requestKey) && answeredAiRequestKeys.includes(requestKey);
  }

  function rememberAiRequestKey(requestKey: string) {
    answeredAiRequestKeySetRef.current.add(requestKey);
    setAnsweredAiRequestKeys(Array.from(answeredAiRequestKeySetRef.current));
  }

  function forgetAiRequestKey(requestKey: string) {
    answeredAiRequestKeySetRef.current.delete(requestKey);
    setAnsweredAiRequestKeys(Array.from(answeredAiRequestKeySetRef.current));
  }

  async function handleGenerateAiInsight(
    questionOverride?: string,
    mode: AdminAiMode = "fast",
  ) {
    const question =
      (questionOverride ?? aiQuestion).trim() || defaultAdminAiQuestion;
    const useDeepAi = mode === "deep";

    if (!data) {
      setAiError("Dashboard chưa tải xong dữ liệu.");
      return;
    }

    const requestKey = getAiRequestKey(question, mode);

    if (answeredAiRequestKeySetRef.current.has(requestKey)) {
      setAiQuestion(question);
      return;
    }

    rememberAiRequestKey(requestKey);
    setAiError("");
    setAiQuestion(question);
    setIsAiLoading(useDeepAi);

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
        status: useDeepAi ? "thinking" : "fast",
      },
    ]);

    if (!useDeepAi) {
      return;
    }

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
      forgetAiRequestKey(requestKey);
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

  const defaultFastRequestKey = data
    ? getAiRequestKey(defaultAdminAiQuestion, "fast")
    : "";
  const currentFastRequestKey = data ? getAiRequestKey(aiQuestion, "fast") : "";
  const currentDeepRequestKey = data ? getAiRequestKey(aiQuestion, "deep") : "";
  const isDefaultFastRepeated = isAnsweredAiRequestKey(defaultFastRequestKey);
  const isCurrentFastRepeated = isAnsweredAiRequestKey(currentFastRequestKey);
  const isCurrentDeepRepeated = isAnsweredAiRequestKey(currentDeepRequestKey);

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
              disabled={isAiLoading || isLoading || isDefaultFastRepeated}
              onClick={() => handleGenerateAiInsight()}
              type="button"
            >
              {isDefaultFastRepeated
                ? "Đã tóm tắt"
                : isAiLoading
                  ? "AI sâu..."
                  : "Tóm tắt nhanh"}
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

      <Panel className="p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#172027] text-sm font-black text-[#f2a93b]">
              AI
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-[#172027]">
                Trợ lý vận hành
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#625b50]">
                Dùng ngày đang xem, biểu đồ {periodDays} ngày và ca{" "}
                {data?.shiftRevenue.monthLabel ?? "trong tháng"}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-full bg-[#eef4ef] px-3 py-2 text-[#2f5d50]">
              {formatMoney(data?.todayRevenue ?? 0)}
            </span>
            <span className="rounded-full bg-[#f8f3ea] px-3 py-2 text-[#6d645a]">
              {data?.todayPaidOrders ?? 0} hóa đơn
            </span>
            <span className="rounded-full bg-white px-3 py-2 text-[#6d645a] ring-1 ring-[#eadfce]">
              {data?.topProducts[0]?.productName ?? "Chưa có top món"}
            </span>
            <span className="rounded-full bg-white px-3 py-2 text-[#6d645a] ring-1 ring-[#eadfce]">
              {periodDays} ngày
            </span>
          </div>
        </div>

        <div aria-label="Câu hỏi nhanh" className="mt-4 flex flex-wrap gap-2">
          {adminAiQuickQuestions.map((question) => {
            const quickRequestKey = data ? getAiRequestKey(question, "fast") : "";
            const isRepeatedQuestion = isAnsweredAiRequestKey(quickRequestKey);

            return (
              <button
                className={
                  isRepeatedQuestion
                    ? "rounded-full border border-[#2f5d50] bg-[#eef4ef] px-3 py-2 text-sm font-black text-[#2f5d50] disabled:cursor-default"
                    : "rounded-full border border-[#d6d1c7] bg-white px-3 py-2 text-sm font-black text-[#3b352d] transition hover:border-[#2f5d50] hover:bg-[#eff7f2] disabled:cursor-not-allowed disabled:opacity-50"
                }
                disabled={isAiLoading || isLoading || isRepeatedQuestion}
                key={question}
                onClick={() => handleGenerateAiInsight(question)}
                title={
                  isRepeatedQuestion
                    ? "Câu này đã có câu trả lời mới nhất ở dưới."
                    : undefined
                }
                type="button"
              >
                {question}
              </button>
            );
          })}
        </div>

        <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#eadfce] bg-[#fbfaf7] p-3 md:p-4">
          {aiMessages.map((message) => (
            <div
              className={
                message.role === "user" ? "flex justify-end" : "flex justify-start"
              }
              key={message.id}
            >
              <div
                className={
                  message.role === "user"
                    ? "max-w-[78%] rounded-2xl rounded-br-md bg-[#2f5d50] px-4 py-2.5 text-sm font-bold leading-6 text-white shadow-sm"
                    : "max-w-[760px] rounded-2xl rounded-bl-md border border-[#dfe7df] bg-white p-3 text-[#172027] shadow-[0_10px_24px_rgba(31,36,40,0.05)]"
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
                  <div className="flex gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#172027] text-[11px] font-black text-white">
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
        </section>

        <form
          className="mt-3 flex flex-col gap-2 md:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            handleGenerateAiInsight();
          }}
        >
          <label className="sr-only" htmlFor="admin-ai-question">
            Câu hỏi cho AI
          </label>
          <input
            className="pos-input"
            disabled={isAiLoading || isLoading}
            id="admin-ai-question"
            onChange={(event) => setAiQuestion(event.target.value)}
            placeholder="Hỏi nhanh về doanh thu, món bán..."
            value={aiQuestion}
          />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              className="pos-button-primary whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isAiLoading || isLoading || isCurrentFastRepeated}
              type="submit"
            >
              {isCurrentFastRepeated ? "Đã hỏi nhanh" : "Hỏi nhanh"}
            </button>
            <button
              className="whitespace-nowrap rounded-full border border-[#2f5d50] bg-white px-4 py-3 text-sm font-black text-[#2f5d50] transition hover:bg-[#eff7f2] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isAiLoading || isLoading || isCurrentDeepRepeated}
              onClick={() => handleGenerateAiInsight(undefined, "deep")}
              type="button"
            >
              {isCurrentDeepRepeated
                ? "Đã hỏi sâu"
                : isAiLoading
                  ? "Đang hỏi..."
                  : "AI sâu"}
            </button>
          </div>
        </form>
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
