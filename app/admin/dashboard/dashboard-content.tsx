"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  CountPill,
  PageHero,
  PageShell,
  Panel,
  PanelHeader,
} from "@/components/ui";
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

type DashboardSummary = {
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
  BANK_TRANSFER: "QR SePay",
  QR_PAYMENT: "QR SePay",
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

export function DashboardContent() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [periodDays, setPeriodDays] = useState<7 | 30>(7);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/dashboard/summary?days=${periodDays}`, {
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
  }, [periodDays]);

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
        label: "QR SePay",
        invoiceCount: qrInvoiceCount,
        revenue: qrRevenue,
        share: totalRevenue > 0 ? Math.round((qrRevenue / totalRevenue) * 100) : 0,
      },
    ];
  }, [data]);

  const kpiCards = [
    {
      label: "Doanh thu hôm nay",
      value: data ? formatMoney(data.todayRevenue) : "--",
      subcopy: `${data?.todayPaidOrders ?? 0} hóa đơn đã thanh toán`,
    },
    {
      label: "Số hóa đơn",
      value: data ? data.todayPaidOrders.toString() : "--",
      subcopy: `${data?.todayOrders ?? 0} đơn được tạo hôm nay`,
    },
    {
      label: "Trung bình / hóa đơn",
      value: data ? formatMoney(data.averageInvoiceValue) : "--",
      subcopy: "Giá trị hóa đơn trung bình hôm nay",
    },
    {
      label: "Menu đang bán",
      value: data ? data.availableProducts.toString() : "--",
      subcopy: `${data?.totalTables ?? 0} bàn trong hệ thống`,
    },
  ];

  return (
    <PageShell maxWidthClassName="max-w-[1440px]">
      <PageHero
        eyebrow="Admin"
        title="Dashboard doanh thu"
        description="Bức tranh vận hành theo doanh thu, hóa đơn, bàn hoạt động, món bán chạy và tỷ lệ thanh toán."
        actions={
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
        }
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}

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
            </div>
            <CountPill>{totalInvoicesInChart} hóa đơn</CountPill>
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
                  <div
                    className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
                    key={item.date}
                    title={`${item.label}: ${formatMoney(item.revenue)}`}
                  >
                    <span className="text-[11px] font-black text-[#625b50]">
                      {item.paidOrderCount}
                    </span>
                    <div
                      className="w-full rounded-t-xl bg-[#2f5d50] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
                      style={{
                        height: `${getBarHeight(item.revenue, maxRevenue)}px`,
                      }}
                    />
                  </div>
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
              description="Tính theo doanh thu hóa đơn."
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
              title="Bàn hoạt động nhiều"
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Panel className="min-w-0 p-5">
          <PanelHeader
            className="border-b-0 p-0"
            title="Top món bán chạy"
            description="Xếp theo số lượng và doanh thu đã thanh toán."
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
            description="Thu ngân có thể mở nhanh bản in hóa đơn."
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
