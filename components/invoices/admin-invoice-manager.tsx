"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/format-money";

type PaymentMethod = "CASH" | "BANK_TRANSFER" | "QR_PAYMENT";

type AdminInvoice = {
  id: number;
  orderId: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paidAt: string;
  createdAt: string;
  order: {
    id: number;
    status: string;
    note: string | null;
    totalAmount: number;
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
};

const paymentLabel: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  QR_PAYMENT: "QR Payment",
};

const paymentClassName: Record<PaymentMethod, string> = {
  CASH: "bg-emerald-50 text-emerald-700",
  BANK_TRANSFER: "bg-sky-50 text-sky-700",
  QR_PAYMENT: "bg-violet-50 text-violet-700",
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

async function fetchInvoices(dateFilter: string) {
  const params = new URLSearchParams();

  if (dateFilter) {
    params.set("date", dateFilter);
  }

  const query = params.toString();
  const response = await fetch(`/api/invoices${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(result, "Không thể tải hóa đơn."));
  }

  return (result.data ?? []) as AdminInvoice[];
}

export function AdminInvoiceManager() {
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(
    null,
  );
  const [dateFilter, setDateFilter] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [invoices, selectedInvoiceId],
  );

  const totalRevenue = useMemo(
    () =>
      invoices.reduce((total, invoice) => total + invoice.totalAmount, 0),
    [invoices],
  );

  async function loadInvoices(nextDate = dateFilter) {
    setIsLoading(true);
    setError("");

    try {
      const nextInvoices = await fetchInvoices(nextDate);
      setInvoices(nextInvoices);
      setSelectedInvoiceId((currentId) =>
        currentId && nextInvoices.some((invoice) => invoice.id === currentId)
          ? currentId
          : (nextInvoices[0]?.id ?? null),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể tải hóa đơn.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialInvoices() {
      try {
        const nextInvoices = await fetchInvoices("");

        if (isMounted) {
          setInvoices(nextInvoices);
          setSelectedInvoiceId(nextInvoices[0]?.id ?? null);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Không thể tải hóa đơn.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialInvoices();

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
            Quản lý hóa đơn
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#625b50]">
            Xem hóa đơn đã thanh toán, lọc theo ngày và kiểm tra phương thức thanh toán.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-[1fr_260px]">
          <div className="rounded-lg border border-[#ded8cc] bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[220px_120px]">
              <label className="flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
                Ngày thanh toán
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
                onClick={() => loadInvoices()}
                type="button"
              >
                Lọc
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-[#ded8cc] bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-[#625b50]">
              Tổng tiền trong danh sách
            </p>
            <p className="mt-2 text-2xl font-bold text-[#2f5d50]">
              {formatMoney(totalRevenue)}
            </p>
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
                Danh sách hóa đơn
              </h2>
              <span className="rounded-full bg-[#f7f7f2] px-3 py-1 text-sm font-semibold text-[#625b50]">
                {invoices.length} hóa đơn
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead className="bg-[#f7f7f2] text-left text-xs uppercase tracking-wide text-[#6b6254]">
                  <tr>
                    <th className="px-4 py-3">Mã hóa đơn</th>
                    <th className="px-4 py-3">Đơn hàng</th>
                    <th className="px-4 py-3">Bàn</th>
                    <th className="px-4 py-3">Thanh toán</th>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3 text-right">Tổng tiền</th>
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

                  {!isLoading && invoices.length === 0 ? (
                    <tr>
                      <td className="px-4 py-5 text-[#625b50]" colSpan={6}>
                        Không tìm thấy hóa đơn phù hợp.
                      </td>
                    </tr>
                  ) : null}

                  {invoices.map((invoice) => (
                    <tr
                      className={
                        selectedInvoiceId === invoice.id
                          ? "cursor-pointer border-t border-[#eee7dd] bg-[#eff7f2]"
                          : "cursor-pointer border-t border-[#eee7dd] hover:bg-[#f7f7f2]"
                      }
                      key={invoice.id}
                      onClick={() => setSelectedInvoiceId(invoice.id)}
                    >
                      <td className="px-4 py-3 font-bold text-[#1f2933]">
                        #{invoice.id}
                      </td>
                      <td className="px-4 py-3 text-[#3b352d]">
                        Đơn #{invoice.orderId}
                      </td>
                      <td className="px-4 py-3 text-[#3b352d]">
                        {invoice.order.table.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${paymentClassName[invoice.paymentMethod]}`}
                        >
                          {paymentLabel[invoice.paymentMethod]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#625b50]">
                        {formatDateTime(invoice.paidAt)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-[#2f5d50]">
                        {formatMoney(invoice.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="h-fit rounded-lg border border-[#ded8cc] bg-white p-5 shadow-sm">
            {!selectedInvoice ? (
              <div className="rounded-lg border border-dashed border-[#d6d1c7] p-6 text-center text-sm text-[#625b50]">
                Chọn một hóa đơn để xem chi tiết.
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#625b50]">
                      Hóa đơn #{selectedInvoice.id}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-[#1f2933]">
                      {selectedInvoice.order.table.name}
                    </h2>
                    <p className="mt-1 text-sm text-[#625b50]">
                      Đơn #{selectedInvoice.orderId}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${paymentClassName[selectedInvoice.paymentMethod]}`}
                  >
                    {paymentLabel[selectedInvoice.paymentMethod]}
                  </span>
                </div>

                <div className="mt-4 rounded-md bg-[#f7f7f2] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#625b50]">
                    Thời gian thanh toán
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1f2933]">
                    {formatDateTime(selectedInvoice.paidAt)}
                  </p>
                </div>

                <div className="mt-5 rounded-md border border-[#eee7dd]">
                  {selectedInvoice.order.items.map((item) => (
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

                <div className="mt-4 flex items-center justify-between border-t border-[#eee7dd] pt-4">
                  <span className="text-sm font-medium text-[#625b50]">
                    Tổng tiền
                  </span>
                  <span className="text-xl font-bold text-[#2f5d50]">
                    {formatMoney(selectedInvoice.totalAmount)}
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
