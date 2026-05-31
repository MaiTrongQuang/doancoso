"use client";

import { useEffect, useMemo, useState } from "react";
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
  { value: "PENDING", label: "Đơn mới" },
  { value: "CONFIRMED", label: "Bếp đã nhận" },
  { value: "PREPARING", label: "Đang chuẩn bị" },
  { value: "SERVED", label: "Đã phục vụ" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "CANCELLED", label: "Đã hủy" },
];

const statusLabel: Record<OrderStatus, string> = {
  PENDING: "Đơn mới",
  CONFIRMED: "Bếp đã nhận",
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
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-[#24231f] sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="rounded-lg border border-[#ded8cc] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2f5d50]">
            Admin
          </p>
          <h1 className="mt-3 text-2xl font-bold text-[#1f2933] sm:text-3xl">
            Quản lý đơn hàng
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#625b50]">
            Xem toàn bộ đơn hàng, lọc theo trạng thái hoặc ngày tạo, và kiểm tra chi tiết từng đơn.
          </p>
        </div>

        <section className="rounded-lg border border-[#ded8cc] bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_120px]">
            <label className="flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Trạng thái
              <select
                className="rounded-md border border-[#d6d1c7] px-3 py-2 outline-none focus:border-[#2f5d50]"
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
                className="rounded-md border border-[#d6d1c7] px-3 py-2 outline-none focus:border-[#2f5d50]"
                onChange={(event) => setDateFilter(event.target.value)}
                type="date"
                value={dateFilter}
              />
            </label>

            <button
              className="mt-auto rounded-md bg-[#2f5d50] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#24483e] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              onClick={() => loadOrders()}
              type="button"
            >
              Lọc
            </button>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 rounded-lg border border-[#ded8cc] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#eee7dd] p-4">
              <h2 className="text-lg font-bold text-[#1f2933]">
                Danh sách đơn
              </h2>
              <span className="rounded-full bg-[#f7f7f2] px-3 py-1 text-sm font-semibold text-[#625b50]">
                {orders.length} đơn
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead className="bg-[#f7f7f2] text-left text-xs uppercase tracking-wide text-[#6b6254]">
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
                          ? "cursor-pointer border-t border-[#eee7dd] bg-[#eff7f2]"
                          : "cursor-pointer border-t border-[#eee7dd] hover:bg-[#f7f7f2]"
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
          </div>

          <aside className="h-fit rounded-lg border border-[#ded8cc] bg-white p-5 shadow-sm">
            {!selectedOrder ? (
              <div className="rounded-lg border border-dashed border-[#d6d1c7] p-6 text-center text-sm text-[#625b50]">
                Chọn một đơn hàng để xem chi tiết.
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#625b50]">
                      Đơn #{selectedOrder.id}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-[#1f2933]">
                      {selectedOrder.table.name}
                    </h2>
                    <p className="mt-1 text-sm text-[#625b50]">
                      {formatDateTime(selectedOrder.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${statusClassName[selectedOrder.status]}`}
                  >
                    {statusLabel[selectedOrder.status]}
                  </span>
                </div>

                <div className="mt-5 rounded-md border border-[#eee7dd]">
                  {selectedOrder.items.map((item) => (
                    <div
                      className="flex justify-between gap-3 border-b border-[#eee7dd] px-3 py-3 last:border-b-0"
                      key={item.id}
                    >
                      <div>
                        <p className="font-semibold text-[#1f2933]">
                          {item.productName}
                        </p>
                        <p className="mt-1 text-xs text-[#625b50]">
                          {formatMoney(item.price)} x {item.quantity}
                        </p>
                      </div>
                      <span className="font-bold text-[#2f5d50]">
                        {formatMoney(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-md bg-[#f7f7f2] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#625b50]">
                    Ghi chú
                  </p>
                  <p className="mt-1 text-sm text-[#3b352d]">
                    {selectedOrder.note || "Không có ghi chú."}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#eee7dd] pt-4">
                  <span className="text-sm font-medium text-[#625b50]">
                    Tổng tiền
                  </span>
                  <span className="text-xl font-bold text-[#2f5d50]">
                    {formatMoney(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>
            )}
          </aside>
        </section>
      </section>
    </main>
  );
}
