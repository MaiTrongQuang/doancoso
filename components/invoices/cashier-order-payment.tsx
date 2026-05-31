"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/format-money";

type PaymentMethod = "CASH" | "BANK_TRANSFER" | "QR_PAYMENT";

type CashierOrder = {
  id: number;
  status: string;
  totalAmount: number;
  note: string | null;
  createdAt: string;
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

type Invoice = {
  id: number;
  orderId: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paidAt: string;
  order: CashierOrder;
};

type InvoiceResponse = {
  message?: string;
  data?: Invoice;
};

const paymentOptions: Array<{
  value: PaymentMethod;
  label: string;
  description: string;
}> = [
  {
    value: "CASH",
    label: "Tiền mặt",
    description: "Khách thanh toán trực tiếp tại quầy.",
  },
  {
    value: "BANK_TRANSFER",
    label: "Chuyển khoản",
    description: "Thu ngân xác nhận khách đã chuyển khoản.",
  },
  {
    value: "QR_PAYMENT",
    label: "QR Payment",
    description: "Mô phỏng thanh toán bằng mã QR.",
  },
];

const paymentLabel: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  QR_PAYMENT: "QR Payment",
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

async function fetchServedOrders() {
  const response = await fetch("/api/orders?statuses=SERVED", {
    cache: "no-store",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(result, "Không thể tải đơn đã phục vụ."));
  }

  return (result.data ?? []) as CashierOrder[];
}

function InvoicePreview({ invoice }: { invoice: Invoice }) {
  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Hóa đơn vừa tạo
      </p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#1f2933]">
            Hóa đơn #{invoice.id}
          </h2>
          <p className="mt-1 text-sm text-emerald-700">
            Đơn #{invoice.orderId} - {invoice.order.table.name}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700">
          {paymentLabel[invoice.paymentMethod]}
        </span>
      </div>

      <div className="mt-4 rounded-md bg-white p-3">
        {invoice.order.items.map((item) => (
          <div
            className="flex justify-between gap-3 border-b border-emerald-100 py-2 text-sm last:border-b-0"
            key={item.id}
          >
            <span className="text-[#3b352d]">
              {item.productName} x{item.quantity}
            </span>
            <span className="font-semibold text-[#1f2933]">
              {formatMoney(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-medium text-emerald-800">
          Thời gian thanh toán
        </span>
        <span className="text-sm font-semibold text-[#1f2933]">
          {formatDateTime(invoice.paidAt)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-medium text-emerald-800">Tổng tiền</span>
        <span className="text-xl font-bold text-[#2f5d50]">
          {formatMoney(invoice.totalAmount)}
        </span>
      </div>
    </section>
  );
}

export function CashierOrderPayment() {
  const [orders, setOrders] = useState<CashierOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paidInvoice, setPaidInvoice] = useState<Invoice | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  async function loadOrders() {
    setIsLoading(true);
    setError("");

    try {
      setOrders(await fetchServedOrders());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể tải đơn đã phục vụ.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialOrders() {
      try {
        const nextOrders = await fetchServedOrders();

        if (isMounted) {
          setOrders(nextOrders);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Không thể tải đơn đã phục vụ.",
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

  async function handlePay() {
    if (!selectedOrder) {
      setError("Vui lòng chọn đơn cần thanh toán.");
      return;
    }

    setMessage("");
    setError("");
    setIsPaying(true);

    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          paymentMethod,
        }),
      });
      const result = (await response.json()) as InvoiceResponse;

      if (!response.ok || !result.data) {
        throw new Error(getErrorMessage(result, "Không thể thanh toán đơn."));
      }

      setMessage(result.message ?? "Thanh toán thành công.");
      setPaidInvoice(result.data);
      setSelectedOrderId(null);
      await loadOrders();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể thanh toán đơn.",
      );
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <main className="bg-[#f7f7f2] px-4 py-8 text-[#24231f] sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="rounded-lg border border-[#ded8cc] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2f5d50]">
                Cashier
              </p>
              <h1 className="mt-3 text-2xl font-bold text-[#1f2933] sm:text-3xl">
                Thanh toán đơn hàng
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#625b50]">
                Chọn đơn đã phục vụ, xác nhận phương thức thanh toán và tạo hóa đơn.
              </p>
            </div>
            <button
              className="rounded-md border border-[#d6d1c7] px-4 py-2 text-sm font-semibold text-[#3b352d] transition hover:bg-[#f7f7f2] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              onClick={loadOrders}
              type="button"
            >
              Làm mới
            </button>
          </div>
        </div>

        {message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {paidInvoice ? <InvoicePreview invoice={paidInvoice} /> : null}

        <section className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="h-fit min-w-0 rounded-lg border border-[#ded8cc] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#eee7dd] p-4">
              <h2 className="text-lg font-bold text-[#1f2933]">
                Đơn đã phục vụ
              </h2>
              <span className="rounded-full bg-[#f7f7f2] px-3 py-1 text-sm font-semibold text-[#625b50]">
                {orders.length} đơn
              </span>
            </div>

            <div className="flex max-h-[680px] flex-col gap-3 overflow-y-auto p-4">
              {isLoading ? (
                <p className="text-sm text-[#625b50]">Đang tải đơn hàng...</p>
              ) : null}

              {!isLoading && orders.length === 0 ? (
                <p className="text-sm text-[#625b50]">
                  Chưa có đơn nào sẵn sàng thanh toán.
                </p>
              ) : null}

              {orders.map((order) => (
                <button
                  className={
                    selectedOrderId === order.id
                      ? "rounded-lg border border-[#2f5d50] bg-[#eff7f2] p-4 text-left shadow-sm"
                      : "rounded-lg border border-[#ded8cc] bg-white p-4 text-left shadow-sm transition hover:bg-[#f7f7f2]"
                  }
                  key={order.id}
                  onClick={() => {
                    setSelectedOrderId(order.id);
                    setPaidInvoice(null);
                    setMessage("");
                    setError("");
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#625b50]">
                        Đơn #{order.id}
                      </p>
                      <p className="mt-1 text-lg font-bold text-[#1f2933]">
                        {order.table.name}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      SERVED
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[#625b50]">
                    {formatDateTime(order.createdAt)}
                  </p>
                  <p className="mt-2 text-base font-bold text-[#2f5d50]">
                    {formatMoney(order.totalAmount)}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <section className="min-w-0 rounded-lg border border-[#ded8cc] bg-white p-5 shadow-sm">
            {!selectedOrder ? (
              <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed border-[#d6d1c7] p-6 text-center">
                <div>
                  <h2 className="text-xl font-bold text-[#1f2933]">
                    Chọn một đơn để thanh toán
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#625b50]">
                    Đơn đã được nhân viên chuyển sang trạng thái đã phục vụ sẽ xuất hiện ở danh sách bên trái.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#625b50]">
                      Chi tiết đơn #{selectedOrder.id}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-[#1f2933]">
                      {selectedOrder.table.name}
                    </h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    Đã phục vụ
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-[#eee7dd]">
                  <table className="w-full min-w-[620px] border-collapse text-sm">
                    <thead className="bg-[#f7f7f2] text-left text-xs uppercase tracking-wide text-[#6b6254]">
                      <tr>
                        <th className="px-4 py-3">Món</th>
                        <th className="px-4 py-3 text-right">Số lượng</th>
                        <th className="px-4 py-3 text-right">Đơn giá</th>
                        <th className="px-4 py-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item) => (
                        <tr className="border-t border-[#eee7dd]" key={item.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-[#1f2933]">
                              {item.productName}
                            </p>
                            {item.note ? (
                              <p className="mt-1 text-xs text-[#625b50]">
                                {item.note}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-[#3b352d]">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right text-[#3b352d]">
                            {formatMoney(item.price)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#2f5d50]">
                            {formatMoney(item.price * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-md bg-[#f7f7f2] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#625b50]">
                    Ghi chú đơn
                  </p>
                  <p className="mt-1 text-sm text-[#3b352d]">
                    {selectedOrder.note || "Không có ghi chú."}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_260px]">
                  <label className="flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
                    Phương thức thanh toán
                    <select
                      className="rounded-md border border-[#d6d1c7] px-3 py-2 outline-none focus:border-[#2f5d50]"
                      onChange={(event) =>
                        setPaymentMethod(event.target.value as PaymentMethod)
                      }
                      value={paymentMethod}
                    >
                      {paymentOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs leading-5 text-[#625b50]">
                      {
                        paymentOptions.find(
                          (option) => option.value === paymentMethod,
                        )?.description
                      }
                    </span>
                  </label>

                  <div className="rounded-md border border-[#eee7dd] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#625b50]">
                        Tổng tiền
                      </span>
                      <span className="text-xl font-bold text-[#2f5d50]">
                        {formatMoney(selectedOrder.totalAmount)}
                      </span>
                    </div>
                    <button
                      className="mt-4 w-full rounded-md bg-[#2f5d50] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#24483e] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isPaying}
                      onClick={handlePay}
                      type="button"
                    >
                      {isPaying ? "Đang thanh toán..." : "Thanh toán"}
                    </button>
                  </div>
                </div>

                {paymentMethod === "QR_PAYMENT" ? (
                  <div className="rounded-lg border border-[#ded8cc] bg-[#f7f7f2] p-4">
                    <p className="text-sm font-bold text-[#1f2933]">
                      QR Payment mô phỏng
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#625b50]">
                      Khi demo, thu ngân chỉ cần chọn QR Payment và bấm thanh toán sau khi xác nhận khách đã quét mã.
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}
