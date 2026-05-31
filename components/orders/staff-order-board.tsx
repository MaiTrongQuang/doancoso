"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/format-money";

type StaffOrderStatus = "PENDING" | "CONFIRMED" | "PREPARING";
type OrderStatus = StaffOrderStatus | "SERVED" | "PAID" | "CANCELLED";

type StaffOrder = {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  table: {
    id: number;
    name: string;
  };
  items: Array<{
    id: number;
    productId: number;
    productName: string;
    quantity: number;
    price: number;
    note: string | null;
  }>;
};

type OrderAction = {
  label: string;
  nextStatus: OrderStatus;
};

type StatusCardKey = "RECEIVED" | "PREPARING";

const visibleStatuses: StaffOrderStatus[] = ["PENDING", "CONFIRMED", "PREPARING"];

const statusCards: Array<{
  key: StatusCardKey;
  label: string;
  statuses: StaffOrderStatus[];
}> = [
  {
    key: "RECEIVED",
    label: "Bếp đã nhận",
    statuses: ["PENDING", "CONFIRMED"],
  },
  {
    key: "PREPARING",
    label: "Đang chuẩn bị",
    statuses: ["PREPARING"],
  },
];

const statusLabel: Record<OrderStatus, string> = {
  PENDING: "Bếp đã nhận",
  CONFIRMED: "Bếp đã nhận",
  PREPARING: "Đang chuẩn bị",
  SERVED: "Đã phục vụ",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
};

const statusClassName: Record<OrderStatus, string> = {
  PENDING: "bg-sky-50 text-sky-700",
  CONFIRMED: "bg-sky-50 text-sky-700",
  PREPARING: "bg-violet-50 text-violet-700",
  SERVED: "bg-emerald-50 text-emerald-700",
  PAID: "bg-stone-100 text-stone-700",
  CANCELLED: "bg-red-50 text-red-700",
};

const primaryActionByStatus: Partial<Record<OrderStatus, OrderAction>> = {
  PENDING: {
    label: "Bắt đầu chuẩn bị",
    nextStatus: "PREPARING",
  },
  CONFIRMED: {
    label: "Bắt đầu chuẩn bị",
    nextStatus: "PREPARING",
  },
  PREPARING: {
    label: "Đã phục vụ",
    nextStatus: "SERVED",
  },
};

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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function fetchStaffOrders() {
  const response = await fetch(
    `/api/orders?statuses=${visibleStatuses.join(",")}`,
    {
      cache: "no-store",
    },
  );
  const result = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(result, "Không thể tải đơn hàng."));
  }

  return (result.data ?? []) as StaffOrder[];
}

export function StaffOrderBoard() {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [processingKey, setProcessingKey] = useState("");

  const orderCountByStatus = useMemo(() => {
    return statusCards.reduce<Record<StatusCardKey, number>>(
      (counts, card) => {
        counts[card.key] = orders.filter((order) =>
          card.statuses.includes(order.status as StaffOrderStatus),
        ).length;
        return counts;
      },
      {
        RECEIVED: 0,
        PREPARING: 0,
      },
    );
  }, [orders]);

  async function loadOrders() {
    setIsLoading(true);
    setError("");

    try {
      setOrders(await fetchStaffOrders());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể tải đơn hàng.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialOrders() {
      try {
        const nextOrders = await fetchStaffOrders();

        if (isMounted) {
          setOrders(nextOrders);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Không thể tải đơn hàng.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialOrders();
    const intervalId = window.setInterval(async () => {
      try {
        const nextOrders = await fetchStaffOrders();

        if (isMounted) {
          setOrders(nextOrders);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Không thể tải đơn hàng.",
          );
        }
      }
    }, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  async function updateOrderStatus(order: StaffOrder, nextStatus: OrderStatus) {
    const isCancelAction = nextStatus === "CANCELLED";

    if (
      isCancelAction &&
      !window.confirm(`Bạn có chắc muốn hủy đơn #${order.id}?`)
    ) {
      return;
    }

    setMessage("");
    setError("");
    setProcessingKey(`${order.id}-${nextStatus}`);

    try {
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Không thể cập nhật trạng thái đơn."),
        );
      }

      setMessage(result.message ?? "Cập nhật trạng thái đơn thành công.");
      await loadOrders();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể cập nhật trạng thái đơn.",
      );
    } finally {
      setProcessingKey("");
    }
  }

  return (
    <main className="bg-[#f7f7f2] px-4 py-8 text-[#24231f] sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="overflow-hidden rounded-lg border border-[#ded8cc] bg-white shadow-sm">
          <div className="h-1.5 bg-[#2f5d50]" />
          <div className="flex flex-wrap items-start justify-between gap-4 p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2f5d50]">
                Staff
              </p>
              <h1 className="mt-3 text-2xl font-black text-[#1f2933] sm:text-3xl">
                Bếp nhận đơn tức thì
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#625b50]">
                Đơn khách gửi sẽ tự vào màn hình bếp. Nhân viên chỉ cần chuẩn bị món và chuyển sang đã phục vụ.
              </p>
            </div>
            <button
              className="rounded-md border border-[#d6d1c7] bg-white px-4 py-2 text-sm font-bold text-[#3b352d] transition hover:bg-[#f7f7f2] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              onClick={loadOrders}
              type="button"
            >
              Làm mới
            </button>
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-2">
          {statusCards.map((card) => (
            <div
              className="overflow-hidden rounded-lg border border-[#ded8cc] bg-white shadow-sm"
              key={card.key}
            >
              <div
                className={
                  card.key === "RECEIVED"
                    ? "h-1 bg-sky-500"
                    : "h-1 bg-violet-500"
                }
              />
              <div className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-bold text-[#625b50]">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-black text-[#1f2933]">
                    {orderCountByStatus[card.key]}
                  </p>
                </div>
                <span
                  className={
                    card.key === "RECEIVED"
                      ? "rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700"
                      : "rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700"
                  }
                >
                  Đang mở
                </span>
              </div>
            </div>
          ))}
        </section>

        {message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 shadow-sm">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 shadow-sm">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-lg border border-[#ded8cc] bg-white p-5 text-sm text-[#625b50] shadow-sm">
            Đang tải danh sách đơn hàng...
          </div>
        ) : null}

        {!isLoading && orders.length === 0 ? (
          <div className="rounded-lg border border-[#ded8cc] bg-white p-5 text-sm text-[#625b50] shadow-sm">
            Hiện chưa có đơn nào cần xử lý.
          </div>
        ) : null}

        <section className="grid items-stretch gap-4 lg:grid-cols-2">
          {orders.map((order) => {
            const primaryAction = primaryActionByStatus[order.status];
            const canCancel = visibleStatuses.includes(
              order.status as StaffOrderStatus,
            );

            return (
              <article
                className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-lg border border-[#ded8cc] bg-white shadow-sm"
                key={order.id}
              >
                <div
                  className={
                    order.status === "PREPARING"
                      ? "h-1.5 bg-violet-500"
                      : "h-1.5 bg-sky-500"
                  }
                />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black uppercase tracking-wide text-[#625b50]">
                        Đơn #{order.id}
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-[#1f2933]">
                        {order.table.name}
                      </h2>
                      <p className="mt-1 text-sm font-medium text-[#625b50]">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${statusClassName[order.status]}`}
                    >
                      {statusLabel[order.status]}
                    </span>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-lg border border-[#eee7dd]">
                    {order.items.map((item) => (
                      <div
                        className="grid grid-cols-[minmax(0,1fr)_92px] gap-3 border-b border-[#eee7dd] px-4 py-4 last:border-b-0"
                        key={item.id}
                      >
                        <div className="min-w-0">
                          <p className="text-base font-black text-[#1f2933]">
                            {item.productName}
                          </p>
                          {item.note ? (
                            <p className="mt-1 text-xs font-medium text-[#625b50]">
                              Ghi chú món: {item.note}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-[#1f2933]">
                            x{item.quantity}
                          </p>
                          <p className="mt-1 text-xs font-medium text-[#625b50]">
                            {formatMoney(item.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-lg bg-[#f7f7f2] p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-[#625b50]">
                      Ghi chú đơn
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#3b352d]">
                      {order.note || "Không có ghi chú."}
                    </p>
                  </div>

                  <div className="mt-auto pt-5">
                    <div className="rounded-lg border border-[#eee7dd] bg-[#fbfaf7] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-bold text-[#625b50]">
                          Tổng tiền
                        </span>
                        <span className="text-xl font-black text-[#2f5d50]">
                          {formatMoney(order.totalAmount)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                        {primaryAction ? (
                          <button
                            className="min-h-12 rounded-md bg-[#2f5d50] px-5 text-sm font-black text-white transition hover:bg-[#24483e] disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={
                              processingKey ===
                              `${order.id}-${primaryAction.nextStatus}`
                            }
                            onClick={() =>
                              updateOrderStatus(order, primaryAction.nextStatus)
                            }
                            type="button"
                          >
                            {processingKey ===
                            `${order.id}-${primaryAction.nextStatus}`
                              ? "Đang xử lý..."
                              : primaryAction.label}
                          </button>
                        ) : null}

                        {canCancel ? (
                          <button
                            className="min-h-12 rounded-md border border-red-200 bg-white px-5 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={processingKey === `${order.id}-CANCELLED`}
                            onClick={() => updateOrderStatus(order, "CANCELLED")}
                            type="button"
                          >
                            {processingKey === `${order.id}-CANCELLED`
                              ? "Đang hủy..."
                              : "Hủy đơn"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}
