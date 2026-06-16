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

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "SERVED"
  | "PAID"
  | "CANCELLED";

type AdminOrder = {
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

const statusOptions: Array<{ value: "ALL" | OrderStatus; label: string }> = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ thanh toán" },
  { value: "CONFIRMED", label: "Đã thu tiền" },
  { value: "PREPARING", label: "Đang chuẩn bị" },
  { value: "SERVED", label: "Đã phục vụ" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "CANCELLED", label: "Đã hủy" },
];

const statusLabel: Record<OrderStatus, string> = {
  PENDING: "Chờ thanh toán",
  CONFIRMED: "Đã thu tiền",
  PREPARING: "Đang chuẩn bị",
  SERVED: "Đã phục vụ",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
};

const statusClassName: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-sky-50 text-sky-700",
  PREPARING: "bg-violet-50 text-violet-700",
  SERVED: "bg-emerald-50 text-emerald-700",
  PAID: "bg-stone-100 text-stone-700",
  CANCELLED: "bg-red-50 text-red-700",
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

async function fetchOrders(statusFilter: string, dateFilter: string) {
  const params = new URLSearchParams();

  if (statusFilter !== "ALL") {
    params.set("status", statusFilter);
  }

  if (dateFilter) {
    params.set("date", dateFilter);
  }

  const query = params.toString();
  const response = await fetch(`/api/orders${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(result, "Không thể tải đơn hàng."));
  }

  return (result.data ?? []) as AdminOrder[];
}

export function AdminOrderManager() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  async function loadOrders(nextStatus = statusFilter, nextDate = dateFilter) {
    setIsLoading(true);
    setError("");

    try {
      const nextOrders = await fetchOrders(nextStatus, nextDate);
      setOrders(nextOrders);
      setSelectedOrderId((currentId) =>
        currentId && nextOrders.some((order) => order.id === currentId)
          ? currentId
          : (nextOrders[0]?.id ?? null),
      );
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
        const nextOrders = await fetchOrders("ALL", "");

        if (isMounted) {
          setOrders(nextOrders);
          setSelectedOrderId(nextOrders[0]?.id ?? null);
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

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <PageShell>
      <PageHero
        eyebrow="Admin"
        title="Quản lý đơn hàng"
        description="Xem toàn bộ đơn hàng, lọc theo trạng thái hoặc ngày tạo, và kiểm tra chi tiết từng đơn."
      />

      <Panel className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_120px]">
            <label className="flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Trạng thái
              <select
                className="pos-input"
                onChange={(event) =>
                  setStatusFilter(event.target.value as "ALL" | OrderStatus)
                }
                value={statusFilter}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Ngày tạo
              <input
                className="pos-input"
                onChange={(event) => setDateFilter(event.target.value)}
                type="date"
                value={dateFilter}
              />
            </label>

            <button
              className="pos-button-primary mt-auto disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              onClick={() => loadOrders()}
              type="button"
            >
              Lọc
            </button>
        </div>
      </Panel>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel className="min-w-0 overflow-hidden">
          <PanelHeader
            title="Danh sách đơn"
            aside={<CountPill>{orders.length} đơn</CountPill>}
          />

            <div className="overflow-x-auto">
              <table className="pos-table min-w-[820px]">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Mã đơn</th>
                    <th className="px-4 py-3">Bàn</th>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Tổng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-5 text-[#625b50]" colSpan={5}>
                        Đang tải đơn hàng...
                      </td>
                    </tr>
                  ) : null}

                  {!isLoading && orders.length === 0 ? (
                    <tr>
                      <td className="px-4 py-5 text-[#625b50]" colSpan={5}>
                        Không tìm thấy đơn hàng phù hợp.
                      </td>
                    </tr>
                  ) : null}

                  {orders.map((order) => (
                    <tr
                      className={
                        selectedOrderId === order.id
                          ? "cursor-pointer border-t border-[#eadfce] bg-[#eff7f2]"
                          : "cursor-pointer border-t border-[#eadfce] hover:bg-[#fff7ea]"
                      }
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <td className="px-4 py-3 font-bold text-[#1f2933]">
                        #{order.id}
                      </td>
                      <td className="px-4 py-3 text-[#3b352d]">
                        {order.table.name}
                      </td>
                      <td className="px-4 py-3 text-[#625b50]">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${statusClassName[order.status]}`}
                        >
                          {statusLabel[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#2f5d50]">
                        {formatMoney(order.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </Panel>

        <Panel className="h-fit p-5">
          {!selectedOrder ? (
            <div className="pos-empty">Chọn một đơn hàng để xem chi tiết.</div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#6d645a]">
                    Đơn #{selectedOrder.id}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-[#172027]">
                    {selectedOrder.table.name}
                  </h2>
                  <p className="mt-1 text-sm text-[#6d645a]">
                    {formatDateTime(selectedOrder.createdAt)}
                  </p>
                </div>
                <span
                  className={`pos-badge ${statusClassName[selectedOrder.status]}`}
                >
                  {statusLabel[selectedOrder.status]}
                </span>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-[#eadfce]">
                {selectedOrder.items.map((item) => (
                  <div
                    className="flex justify-between gap-3 border-b border-[#eadfce] px-3 py-3 last:border-b-0"
                    key={item.id}
                  >
                    <div>
                      <p className="font-bold text-[#172027]">
                        {item.productName}
                      </p>
                      <p className="mt-1 text-xs text-[#6d645a]">
                        {formatMoney(item.price)} x {item.quantity}
                      </p>
                    </div>
                    <span className="font-black text-[#2f5d50]">
                      {formatMoney(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl bg-[#f8f3ea] p-3">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6d645a]">
                  Ghi chú
                </p>
                <p className="mt-1 text-sm text-[#3b352d]">
                  {selectedOrder.note || "Không có ghi chú."}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#eadfce] pt-4">
                <span className="text-sm font-medium text-[#6d645a]">
                  Tổng tiền
                </span>
                <span className="text-xl font-black text-[#2f5d50]">
                  {formatMoney(selectedOrder.totalAmount)}
                </span>
              </div>
            </div>
          )}
        </Panel>
      </section>
    </PageShell>
  );
}
