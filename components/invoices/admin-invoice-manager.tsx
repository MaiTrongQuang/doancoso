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
    <PageShell>
      <PageHero
        eyebrow="Admin"
        title="Quản lý hóa đơn"
        description="Xem hóa đơn đã thanh toán, lọc theo ngày và kiểm tra phương thức thanh toán."
      />

      <section className="grid gap-4 md:grid-cols-[1fr_280px]">
        <Panel className="p-4">
          <div className="grid gap-3 md:grid-cols-[220px_120px]">
            <label className="flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Ngày thanh toán
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
              onClick={() => loadInvoices()}
              type="button"
            >
              Lọc
            </button>
          </div>
        </Panel>

        <Panel className="p-4">
          <p className="text-sm font-bold text-[#6d645a]">
            Tổng tiền trong danh sách
          </p>
          <p className="mt-2 text-2xl font-black text-[#2f5d50]">
            {formatMoney(totalRevenue)}
          </p>
        </Panel>
      </section>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel className="min-w-0 overflow-hidden">
          <PanelHeader
            title="Danh sách hóa đơn"
            aside={<CountPill>{invoices.length} hóa đơn</CountPill>}
          />

          <div className="overflow-x-auto">
            <table className="pos-table min-w-[860px]">
              <thead>
                <tr>
                  <th>Mã hóa đơn</th>
                  <th>Đơn hàng</th>
                  <th>Bàn</th>
                  <th>Thanh toán</th>
                  <th>Thời gian</th>
                  <th className="text-right">Tổng tiền</th>
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
                        ? "cursor-pointer border-t border-[#eadfce] bg-[#eff7f2]"
                        : "cursor-pointer border-t border-[#eadfce] hover:bg-[#fff7ea]"
                    }
                    key={invoice.id}
                    onClick={() => setSelectedInvoiceId(invoice.id)}
                  >
                    <td className="font-bold text-[#172027]">#{invoice.id}</td>
                    <td className="text-[#3b352d]">Đơn #{invoice.orderId}</td>
                    <td className="text-[#3b352d]">
                      {invoice.order.table.name}
                    </td>
                    <td>
                      <span
                        className={`pos-badge ${paymentClassName[invoice.paymentMethod]}`}
                      >
                        {paymentLabel[invoice.paymentMethod]}
                      </span>
                    </td>
                    <td className="text-[#6d645a]">
                      {formatDateTime(invoice.paidAt)}
                    </td>
                    <td className="text-right font-black text-[#2f5d50]">
                      {formatMoney(invoice.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="h-fit p-5">
          {!selectedInvoice ? (
            <div className="pos-empty">Chọn một hóa đơn để xem chi tiết.</div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#6d645a]">
                    Hóa đơn #{selectedInvoice.id}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-[#172027]">
                    {selectedInvoice.order.table.name}
                  </h2>
                  <p className="mt-1 text-sm text-[#6d645a]">
                    Đơn #{selectedInvoice.orderId}
                  </p>
                </div>
                <span
                  className={`pos-badge ${paymentClassName[selectedInvoice.paymentMethod]}`}
                >
                  {paymentLabel[selectedInvoice.paymentMethod]}
                </span>
              </div>

              <div className="mt-4 rounded-2xl bg-[#f8f3ea] p-3">
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6d645a]">
                  Thời gian thanh toán
                </p>
                <p className="mt-1 text-sm font-bold text-[#172027]">
                  {formatDateTime(selectedInvoice.paidAt)}
                </p>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-[#eadfce]">
                {selectedInvoice.order.items.map((item) => (
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

              <div className="mt-4 flex items-center justify-between border-t border-[#eadfce] pt-4">
                <span className="text-sm font-medium text-[#6d645a]">
                  Tổng tiền
                </span>
                <span className="text-xl font-black text-[#2f5d50]">
                  {formatMoney(selectedInvoice.totalAmount)}
                </span>
              </div>
            </div>
          )}
        </Panel>
      </section>
    </PageShell>
  );
}
