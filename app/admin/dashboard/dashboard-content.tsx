"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/format-money";

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
};

type OrderStatusStat = {
  status: string;
  label: string;
  count: number;
};

type DashboardSummary = {
  todayRevenue: number;
  todayOrders: number;
  todayPaidOrders: number;
  availableProducts: number;
  totalTables: number;
  dailyRevenue: DailyRevenue[];
  topProducts: TopProduct[];
  paymentStats: PaymentStat[];
  orderStatusStats: OrderStatusStat[];
  recentOrders: RecentOrder[];
};

const statusLabel: Record<string, string> = {
  PENDING: "Đơn mới",
  CONFIRMED: "Bếp đã nhận",
  PREPARING: "Đang chuẩn bị",
  SERVED: "Đã phục vụ",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
};

const statusClassName: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-sky-50 text-sky-700",
  PREPARING: "bg-violet-50 text-violet-700",
  SERVED: "bg-emerald-50 text-emerald-700",
  PAID: "bg-stone-100 text-stone-700",
  CANCELLED: "bg-red-50 text-red-700",
};

const paymentClassName: Record<string, string> = {
  CASH: "bg-emerald-50 text-emerald-700",
  BANK_TRANSFER: "bg-sky-50 text-sky-700",
  QR_PAYMENT: "bg-violet-50 text-violet-700",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getBarHeight(revenue: number, maxRevenue: number) {
  if (maxRevenue <= 0 || revenue <= 0) {
    return 8;
  }

  return Math.max(12, Math.round((revenue / maxRevenue) * 150));
}

export function DashboardContent() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      try {
        const response = await fetch("/api/dashboard/summary", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message ?? "Không thể tải dashboard.");
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
  }, []);

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

  const cards = [
    {
      label: "Doanh thu hôm nay",
      value: data ? formatMoney(data.todayRevenue) : "--",
    },
    {
      label: "Số đơn hôm nay",
      value: data ? data.todayOrders.toString() : "--",
    },
    {
      label: "Số đơn đã thanh toán",
      value: data ? data.todayPaidOrders.toString() : "--",
    },
    {
      label: "Tổng sản phẩm đang bán",
      value: data ? data.availableProducts.toString() : "--",
    },
    {
      label: "Tổng số bàn",
      value: data ? data.totalTables.toString() : "--",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-[#24231f] sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="rounded-lg border border-[#ded8cc] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2f5d50]">
            Admin
          </p>
          <h1 className="mt-3 text-2xl font-bold text-[#1f2933] sm:text-3xl">
            Dashboard thống kê
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#625b50]">
            Theo dõi doanh thu, đơn hàng, món bán chạy và phương thức thanh toán từ dữ liệu thật.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-lg border border-[#ded8cc] bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6b6254]">
                {card.label}
              </p>
              <p className="mt-3 text-2xl font-bold text-[#1f2933]">
                {isLoading ? "Đang tải..." : card.value}
              </p>
            </div>
          ))}
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
          <div className="min-w-0 rounded-lg border border-[#ded8cc] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#1f2933]">
                  Doanh thu 7 ngày
                </h2>
                <p className="mt-1 text-sm text-[#625b50]">
                  Tổng 7 ngày: {formatMoney(totalRevenueInChart)}
                </p>
              </div>
              <span className="rounded-full bg-[#eff7f2] px-3 py-1 text-sm font-bold text-[#2f5d50]">
                {data?.dailyRevenue.reduce(
                  (total, item) => total + item.paidOrderCount,
                  0,
                ) ?? 0}{" "}
                hóa đơn
              </span>
            </div>

            <div className="mt-6 grid h-56 grid-cols-7 items-end gap-3 border-b border-[#eee7dd] pb-4">
              {isLoading
                ? Array.from({ length: 7 }, (_, index) => (
                    <div
                      className="flex h-full items-end justify-center"
                      key={index}
                    >
                      <div className="h-16 w-full max-w-16 rounded-t-md bg-[#eee7dd]" />
                    </div>
                  ))
                : data?.dailyRevenue.map((item) => (
                    <div
                      className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
                      key={item.date}
                      title={`${item.label}: ${formatMoney(item.revenue)}`}
                    >
                      <span className="text-center text-xs font-semibold text-[#625b50]">
                        {item.paidOrderCount}
                      </span>
                      <div
                        className="w-full max-w-16 rounded-t-md bg-[#2f5d50]"
                        style={{
                          height: `${getBarHeight(item.revenue, maxRevenue)}px`,
                        }}
                      />
                    </div>
                  ))}
            </div>

            <div className="mt-3 grid grid-cols-7 gap-3">
              {(data?.dailyRevenue ?? []).map((item) => (
                <div className="min-w-0 text-center" key={item.date}>
                  <p className="truncate text-xs font-bold text-[#1f2933]">
                    {item.label}
                  </p>
                  <p className="mt-1 truncate text-xs text-[#625b50]">
                    {formatMoney(item.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-[#ded8cc] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#1f2933]">
              Top món bán chạy
            </h2>

            <div className="mt-4 flex flex-col gap-3">
              {isLoading ? (
                <div className="rounded-lg border border-dashed border-[#d6d1c7] p-5 text-sm text-[#625b50]">
                  Đang tải thống kê món bán chạy...
                </div>
              ) : null}

              {!isLoading && data?.topProducts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#d6d1c7] p-5 text-sm text-[#625b50]">
                  Chưa có món nào trong hóa đơn đã thanh toán.
                </div>
              ) : null}

              {data?.topProducts.map((product, index) => (
                <article
                  className="rounded-lg border border-[#eee7dd] p-4"
                  key={product.productId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#6b6254]">
                        #{index + 1} · {product.categoryName}
                      </p>
                      <h3 className="mt-1 truncate font-bold text-[#1f2933]">
                        {product.productName}
                      </h3>
                    </div>
                    <span className="rounded-full bg-[#f7f7f2] px-3 py-1 text-xs font-bold text-[#625b50]">
                      {product.quantity} món
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#2f5d50]">
                    {formatMoney(product.revenue)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-[#ded8cc] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#1f2933]">
              Phương thức thanh toán
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(data?.paymentStats ?? []).map((payment) => (
                <div
                  className="rounded-lg border border-[#eee7dd] p-4"
                  key={payment.paymentMethod}
                >
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${paymentClassName[payment.paymentMethod] ?? "bg-stone-100 text-stone-700"}`}
                  >
                    {payment.label}
                  </span>
                  <p className="mt-3 text-2xl font-bold text-[#1f2933]">
                    {payment.invoiceCount}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#2f5d50]">
                    {formatMoney(payment.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#ded8cc] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#1f2933]">
              Trạng thái đơn hàng
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(data?.orderStatusStats ?? []).map((item) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg border border-[#eee7dd] p-4"
                  key={item.status}
                >
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${statusClassName[item.status] ?? "bg-stone-100 text-stone-700"}`}
                  >
                    {item.label}
                  </span>
                  <span className="text-xl font-bold text-[#1f2933]">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="min-w-0 rounded-lg border border-[#ded8cc] bg-white shadow-sm">
          <div className="border-b border-[#eee7dd] p-4">
            <h2 className="text-lg font-bold text-[#1f2933]">
              5 đơn hàng gần nhất
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="bg-[#f7f7f2] text-left text-xs uppercase tracking-wide text-[#6b6254]">
                <tr>
                  <th className="px-4 py-3">Mã đơn</th>
                  <th className="px-4 py-3">Bàn</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Số món</th>
                  <th className="px-4 py-3">Tổng tiền</th>
                  <th className="px-4 py-3">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-5 text-[#625b50]" colSpan={6}>
                      Đang tải đơn hàng...
                    </td>
                  </tr>
                ) : null}

                {!isLoading && data?.recentOrders.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-[#625b50]" colSpan={6}>
                      Chưa có đơn hàng nào.
                    </td>
                  </tr>
                ) : null}

                {data?.recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-[#eee7dd]">
                    <td className="px-4 py-3 font-semibold text-[#1f2933]">
                      #{order.id}
                    </td>
                    <td className="px-4 py-3 text-[#3b352d]">
                      {order.table.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${statusClassName[order.status] ?? "bg-stone-100 text-stone-700"}`}
                      >
                        {statusLabel[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#3b352d]">
                      {order.itemCount}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#2f5d50]">
                      {formatMoney(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-[#625b50]">
                      {formatDateTime(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
