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
    <PageShell maxWidthClassName="max-w-7xl">
      <PageHero
        eyebrow="Staff"
        title="Bếp nhận đơn tức thì"
        description="Đơn khách gửi sẽ tự vào màn hình bếp. Nhân viên tập trung vào món cần làm, chuyển trạng thái nhanh và không bỏ sót ghi chú."
        actions={
          <button
            className="pos-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            onClick={loadOrders}
            type="button"
          >
            Làm mới
          </button>
        }
        meta={
          <section className="grid gap-3 sm:grid-cols-2">
            {statusCards.map((card) => (
              <div
                className="rounded-2xl border border-[#eadfce] bg-white/78 p-4 shadow-sm"
                key={card.key}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-[#6d645a]">
                      {card.label}
                    </p>
                    <p className="mt-2 text-3xl font-black text-[#172027]">
                      {orderCountByStatus[card.key]}
                    </p>
                  </div>
                  <span
                    className={
                      card.key === "RECEIVED"
                        ? "pos-badge bg-sky-50 text-sky-700"
                        : "pos-badge bg-violet-50 text-violet-700"
                    }
                  >
                    Đang mở
                  </span>
                </div>
              </div>
            ))}
          </section>
        }
      />

      {message ? <Alert tone="success">{message}</Alert> : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {isLoading ? (
        <Panel className="p-5 text-sm font-semibold text-[#6d645a]">
          Đang tải danh sách đơn hàng...
        </Panel>
      ) : null}

      {!isLoading && orders.length === 0 ? (
        <div className="pos-empty">Hiện chưa có đơn nào cần xử lý.</div>
      ) : null}

      <Panel className="overflow-hidden">
        <PanelHeader
          title="Hàng đợi bếp"
          description="Ưu tiên các đơn mới nhất, kiểm tra ghi chú trước khi chuyển trạng thái."
          aside={<CountPill>{orders.length} đơn</CountPill>}
        />

        <section className="grid items-start gap-4 p-4 xl:grid-cols-2">
          {orders.map((order) => {
            const primaryAction = primaryActionByStatus[order.status];
            const canCancel = visibleStatuses.includes(
              order.status as StaffOrderStatus,
            );

            return (
              <article
                className="flex h-full flex-col overflow-hidden rounded-[18px] border border-[#eadfce] bg-white shadow-[0_14px_34px_rgba(31,36,40,0.06)]"
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
                      <p className="text-xs font-black uppercase tracking-[0.1em] text-[#6d645a]">
                        Đơn #{order.id}
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-[#172027]">
                        {order.table.name}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-[#6d645a]">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`pos-badge ${statusClassName[order.status]}`}
                    >
                      {statusLabel[order.status]}
                    </span>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-[#eadfce] bg-[#fffdf9]">
                    {order.items.map((item) => (
                      <div
                        className="grid grid-cols-[minmax(0,1fr)_92px] gap-3 border-b border-[#eadfce] px-4 py-4 last:border-b-0"
                        key={item.id}
                      >
                        <div className="min-w-0">
                          <p className="text-base font-black text-[#172027]">
                            {item.productName}
                          </p>
                          {item.note ? (
                            <p className="mt-1 text-xs font-bold text-[#8a5a11]">
                              Ghi chú món: {item.note}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-[#172027]">
                            x{item.quantity}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-[#6d645a]">
                            {formatMoney(item.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl bg-[#f8f3ea] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.1em] text-[#6d645a]">
                      Ghi chú đơn
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#3b352d]">
                      {order.note || "Không có ghi chú."}
                    </p>
                  </div>

                  <div className="mt-auto pt-5">
                    <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-bold text-[#6d645a]">
                          Tổng tiền
                        </span>
                        <span className="text-xl font-black text-[#2f5d50]">
                          {formatMoney(order.totalAmount)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                        {primaryAction ? (
                          <button
                            className="pos-button-primary disabled:cursor-not-allowed disabled:opacity-60"
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
                            className="pos-button-danger disabled:cursor-not-allowed disabled:opacity-60"
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
      </Panel>
    </PageShell>
  );
}
