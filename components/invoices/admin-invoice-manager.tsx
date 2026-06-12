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
import { getRecentDateRangeInputValue } from "@/lib/date-input";
import { formatMoney } from "@/lib/format-money";
import { getInvoicePrintHref } from "@/lib/invoice-links";
import {
  formatInvoiceCode,
  getPaymentLabel,
  receiptStoreInfo,
  receiptThankYouMessage,
} from "@/lib/invoice-print";

type PaymentMethod = "CASH" | "BANK_TRANSFER" | "QR_PAYMENT";

type AdminInvoice = {
  id: number;
  orderId: number;
  sessionId: number | null;
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

type InvoiceDateFilter = {
  dateFrom: string;
  dateTo: string;
};

function getDefaultDateFilter(): InvoiceDateFilter {
  return getRecentDateRangeInputValue(1);
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function fetchInvoices(dateFilter: InvoiceDateFilter) {
  const params = new URLSearchParams();

  if (dateFilter.dateFrom) {
    params.set("dateFrom", dateFilter.dateFrom);
  }

  if (dateFilter.dateTo) {
    params.set("dateTo", dateFilter.dateTo);
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

function InvoiceQuickPreview({
  invoice,
  onClose,
}: {
  invoice: AdminInvoice;
  onClose: () => void;
}) {
  return (
    <>
      <button
        aria-label="Đóng xem nhanh hóa đơn"
        className="fixed inset-0 z-40 block cursor-default border-0 bg-transparent p-0"
        onClick={onClose}
        type="button"
      />

      <div
        aria-label={`Xem nhanh hóa đơn ${formatInvoiceCode(invoice.id)}`}
        className="fixed inset-x-4 top-4 z-50 mx-auto w-[min(390px,calc(100vw-2rem))] rounded-2xl border border-[#d8cdbc] bg-white p-3 shadow-[0_18px_52px_rgba(31,36,40,0.18)] lg:left-auto lg:right-8 lg:mx-0"
        role="dialog"
      >
        <div className="mb-2 flex items-center justify-between gap-3 border-b border-[#eadfce] pb-2">
          <p className="text-sm font-black text-[#172027]">Xem hóa đơn</p>
          <button
            className="min-h-9 rounded-full border border-[#eadfce] px-4 py-1 text-sm font-bold text-[#625b50] transition hover:bg-[#f8f3ea]"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>

        <div className="rounded-xl bg-[#faf7f1] p-3">
          <article className="mx-auto w-full max-w-[300px] bg-white px-4 py-5 text-[11px] leading-[1.35] text-[#172027] shadow-sm">
            <header className="text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2f5d50]">
                {receiptStoreInfo.name}
              </p>
              <p className="mt-2 font-semibold">
                ĐC: {receiptStoreInfo.address}
              </p>
              <p className="font-semibold">SĐT: {receiptStoreInfo.phone}</p>
              <div className="my-2 border-t border-dashed border-[#756a5d]" />
              <h3 className="text-[13px] font-black uppercase">
                Hóa đơn thanh toán
              </h3>
              <p className="mt-1 font-bold">
                Số: {formatInvoiceCode(invoice.id)}
              </p>
              <p className="font-semibold">
                Ngày: {formatDateTime(invoice.paidAt)}
              </p>
            </header>

            <section className="my-2 space-y-1 border-y border-dashed border-[#756a5d] py-2">
              <div className="flex justify-between gap-3">
                <span>Bàn</span>
                <span className="text-right font-bold">
                  {invoice.order.table.name}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Khách hàng</span>
                <span className="text-right font-semibold">Khách lẻ</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Thanh toán</span>
                <span className="text-right font-semibold">
                  {getPaymentLabel(invoice.paymentMethod)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>{invoice.sessionId ? "Phiên phục vụ" : "Đơn hàng"}</span>
                <span className="text-right font-semibold">
                  #{invoice.sessionId ?? invoice.orderId}
                </span>
              </div>
            </section>

            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="border-b border-[#756a5d] text-left font-black">
                  <th className="w-[44%] py-1 pr-1">Tên hàng</th>
                  <th className="w-[18%] px-1 py-1 text-right">SL</th>
                  <th className="w-[38%] py-1 pl-1 text-right">TT</th>
                </tr>
              </thead>
              <tbody>
                {invoice.order.items.map((item) => (
                  <tr className="border-b border-[#d8cdbc]" key={item.id}>
                    <td className="break-words py-1.5 pr-1 align-top font-semibold">
                      {item.productName}
                    </td>
                    <td className="px-1 py-1.5 text-right align-top font-semibold">
                      {item.quantity}
                    </td>
                    <td className="py-1.5 pl-1 text-right align-top font-bold">
                      {formatMoney(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <section className="mt-2 space-y-1 border-t border-[#756a5d] pt-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-black">Tổng cộng</span>
                <span className="font-black">
                  {formatMoney(invoice.totalAmount)}
                </span>
              </div>
            </section>

            <footer className="mt-3 border-t border-dashed border-[#756a5d] pt-2 text-center font-bold">
              {receiptThankYouMessage}
            </footer>
          </article>
        </div>
      </div>
    </>
  );
}

export function AdminInvoiceManager() {
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(
    null,
  );
  const [dateFilter, setDateFilter] = useState(getDefaultDateFilter);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [invoices, selectedInvoiceId],
  );

  const totalRevenue = useMemo(
    () =>
      invoices.reduce((total, invoice) => total + invoice.totalAmount, 0),
    [invoices],
  );

  async function applyQuickFilter(days: number) {
    const nextFilter = getRecentDateRangeInputValue(days);

    setDateFilter(nextFilter);
    await loadInvoices(nextFilter);
  }

  async function loadInvoices(nextFilter = dateFilter) {
    if (
      nextFilter.dateFrom &&
      nextFilter.dateTo &&
      nextFilter.dateFrom > nextFilter.dateTo
    ) {
      setError("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const nextInvoices = await fetchInvoices(nextFilter);
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
    const initialDateFilter = getDefaultDateFilter();

    async function loadInitialInvoices() {
      try {
        const nextInvoices = await fetchInvoices(initialDateFilter);

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
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                className="pos-button-secondary min-h-10 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                onClick={() => applyQuickFilter(1)}
                type="button"
              >
                Hôm nay
              </button>
              <button
                className="pos-button-secondary min-h-10 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                onClick={() => applyQuickFilter(3)}
                type="button"
              >
                3 ngày
              </button>
              <button
                className="pos-button-secondary min-h-10 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                onClick={() => applyQuickFilter(7)}
                type="button"
              >
                1 tuần
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-[220px_220px_120px]">
              <label className="flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
                Từ ngày
                <input
                  className="pos-input"
                  onChange={(event) =>
                    setDateFilter((currentFilter) => ({
                      ...currentFilter,
                      dateFrom: event.target.value,
                    }))
                  }
                  type="date"
                  value={dateFilter.dateFrom}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
                Đến ngày
                <input
                  className="pos-input"
                  onChange={(event) =>
                    setDateFilter((currentFilter) => ({
                      ...currentFilter,
                      dateTo: event.target.value,
                    }))
                  }
                  type="date"
                  value={dateFilter.dateTo}
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

          <div className="overflow-hidden">
            <table className="pos-table w-full table-fixed">
              <thead>
                <tr>
                  <th className="w-[22%]">Hóa đơn</th>
                  <th className="w-[14%]">Bàn</th>
                  <th className="w-[20%]">Thanh toán</th>
                  <th className="w-[24%]">Thời gian</th>
                  <th className="w-[20%] text-right">Tổng tiền</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-5 text-[#625b50]" colSpan={5}>
                      Đang tải hóa đơn...
                    </td>
                  </tr>
                ) : null}

                {!isLoading && invoices.length === 0 ? (
                  <tr>
                    <td className="px-4 py-5 text-[#625b50]" colSpan={5}>
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
                    onClick={() => {
                      setSelectedInvoiceId(invoice.id);
                      setIsInvoicePreviewOpen(false);
                    }}
                  >
                    <td className="font-bold text-[#172027]">
                      <p>#{invoice.id}</p>
                      <p className="mt-1 text-xs font-semibold text-[#6d645a]">
                        {invoice.sessionId
                          ? `Phiên #${invoice.sessionId}`
                          : `Đơn #${invoice.orderId}`}
                      </p>
                    </td>
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

        <Panel className="relative h-fit p-5">
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
                    {selectedInvoice.sessionId
                      ? `Phiên #${selectedInvoice.sessionId}`
                      : `Đơn #${selectedInvoice.orderId}`}
                  </p>
                </div>
                <span
                  className={`pos-badge ${paymentClassName[selectedInvoice.paymentMethod]}`}
                >
                  {paymentLabel[selectedInvoice.paymentMethod]}
                </span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  className="pos-button-secondary w-full"
                  onClick={() => setIsInvoicePreviewOpen(true)}
                  type="button"
                >
                  Xem hóa đơn
                </button>
                <a
                  className="pos-button-primary w-full"
                  href={getInvoicePrintHref(selectedInvoice.id, {
                    plain: true,
                  })}
                  rel="noreferrer"
                  target="_blank"
                >
                  Xuất hóa đơn
                </a>
              </div>

              {isInvoicePreviewOpen ? (
                <InvoiceQuickPreview
                  invoice={selectedInvoice}
                  onClose={() => setIsInvoicePreviewOpen(false)}
                />
              ) : null}

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
