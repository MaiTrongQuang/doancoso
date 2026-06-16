"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  CountPill,
  PageHero,
  PageShell,
  Panel,
  PanelHeader,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  applyCashierOrderStatusPatch,
  removeSettledBillOrders,
} from "@/lib/cashier-payment-state";
import { formatMoney } from "@/lib/format-money";
import { getInvoicePrintHref } from "@/lib/invoice-links";
import { getPaymentPollingDelay } from "@/lib/payment-polling";

type PaymentMethod = "CASH" | "BANK_TRANSFER" | "QR_PAYMENT";

type CashierOrder = {
  id: number;
  sessionId: number | null;
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

type OrderStatusResponse = {
  message?: string;
  data?: {
    id: number;
    status: string;
    updatedAt: string;
    invoice: {
      id: number;
      paymentMethod: PaymentMethod;
      totalAmount: number;
    } | null;
  };
};

type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";

type SepayPayment = {
  id: number;
  orderId: number;
  provider: "SEPAY";
  status: PaymentStatus;
  amount: number;
  transferCode: string;
  qrUrl: string | null;
  bankCode: string;
  accountNumber: string;
  accountName: string | null;
  transferDescription?: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PaymentPollingResponse = {
  message?: string;
  data?: {
    order: {
      id: number;
      sessionId: number | null;
      status: string;
      totalAmount: number;
      invoice: {
        id: number;
        paymentMethod: PaymentMethod;
      } | null;
    };
    orderStatus: string;
    paymentStatus: PaymentStatus | null;
    payment: SepayPayment | null;
  };
};

type PaymentSuccessDetails = {
  amount: number;
  invoiceId: number | null;
  methodLabel: string;
  orderLabel: string;
  tableName: string;
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
    label: "Thanh toán QR",
    description: "Xác nhận khách đã chuyển khoản hoặc quét QR tại quầy.",
  },
];

const paymentLabel: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Thanh toán QR",
  QR_PAYMENT: "Thanh toán QR",
};
const cashierVisibleStatuses = ["PENDING"] as const;

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

function getBillLabel(order: { id: number; sessionId: number | null }) {
  return order.sessionId ? `Phiên #${order.sessionId}` : `Đơn #${order.id}`;
}

function findSettledBillOrder(
  orders: readonly CashierOrder[],
  bill: { orderId: number; sessionId: number | null },
) {
  return (
    orders.find((order) =>
      bill.sessionId !== null
        ? order.sessionId === bill.sessionId
        : order.id === bill.orderId,
    ) ?? null
  );
}

function getPayButtonLabel({
  isPaying,
}: {
  isPaying: boolean;
}) {
  return isPaying ? "Đang xác nhận..." : "Xác nhận đã thanh toán";
}

async function fetchPendingOrders() {
  const response = await fetch(
    "/api/orders?statuses=PENDING",
    {
      cache: "no-store",
    },
  );
  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      getErrorMessage(result, "Không thể tải đơn chờ thanh toán."),
    );
  }

  return ((result.data ?? []) as CashierOrder[]).map((order) => ({
    ...order,
    items: order.items ?? [],
  }));
}

async function fetchBillDetail(orderId: number) {
  const response = await fetch(`/api/orders/${orderId}?view=bill`, {
    cache: "no-store",
  });
  const result = await response.json();

  if (!response.ok || !result.data) {
    throw new Error(
      getErrorMessage(result, "Không thể tải chi tiết đơn chờ thanh toán."),
    );
  }

  return {
    ...(result.data as CashierOrder),
    items: (result.data as CashierOrder).items ?? [],
  };
}

function SepayQrPanel({ payment }: { payment: SepayPayment }) {
  return (
    <div className="rounded-2xl border border-[#d8cdbc] bg-[#fffdf9] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#1f2933]">
            Quét mã QR
          </p>
          <p className="mt-1 text-sm leading-6 text-[#625b50]">
            Hệ thống đang chờ ngân hàng xác nhận giao dịch.
          </p>
        </div>
        <span className="pos-badge bg-amber-50 text-amber-700">
          {payment.status === "PENDING" ? "Đang chờ" : payment.status}
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-[#eadfce] bg-white p-3">
          {payment.qrUrl ? (
            <Image
              alt={`QR thanh toán ${payment.transferCode}`}
              className="object-contain"
              height={196}
              src={payment.qrUrl}
              width={196}
            />
          ) : (
            <p className="text-center text-sm text-[#625b50]">
              Chưa có ảnh QR.
            </p>
          )}
        </div>

        <div className="grid gap-3 text-sm">
          <div className="rounded-2xl bg-[#f8f3ea] p-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6d645a]">
              Nội dung chuyển khoản
            </p>
            <p className="mt-1 break-all text-lg font-black text-[#172027]">
              {payment.transferDescription ?? payment.transferCode}
            </p>
          </div>

          <div className="grid gap-2 rounded-2xl border border-[#eadfce] p-3">
            <div className="flex justify-between gap-3">
              <span className="text-[#625b50]">Ngân hàng</span>
              <span className="font-semibold text-[#1f2933]">
                {payment.bankCode}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#625b50]">Số tài khoản</span>
              <span className="font-semibold text-[#1f2933]">
                {payment.accountNumber}
              </span>
            </div>
            {payment.accountName ? (
              <div className="flex justify-between gap-3">
                <span className="text-[#625b50]">Chủ tài khoản</span>
                <span className="text-right font-semibold text-[#1f2933]">
                  {payment.accountName}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <span className="text-[#625b50]">Số tiền</span>
              <span className="font-bold text-[#2f5d50]">
                {formatMoney(payment.amount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentSuccessNotice({ details }: { details: PaymentSuccessDetails }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 shadow-lg">
      <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-lg font-black text-white shadow-md">
            OK
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">
              Quầy đã xác nhận thanh toán
            </p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-[#172027] lg:text-4xl">
              ĐƠN ĐÃ CHUYỂN SANG PHA CHẾ
            </h2>
            <p className="mt-2 text-base font-semibold text-emerald-800">
              Hóa đơn đã được tạo. Nhân viên bếp có thể chuẩn bị món ngay.
            </p>
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border border-emerald-200 bg-white p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#625b50]">Bàn</span>
            <span className="text-right font-black text-[#172027]">
              {details.tableName}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#625b50]">Phiên/đơn</span>
            <span className="text-right font-semibold text-[#172027]">
              {details.orderLabel}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#625b50]">Phương thức</span>
            <span className="text-right font-semibold text-[#172027]">
              {details.methodLabel}
            </span>
          </div>
          {details.invoiceId ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#625b50]">Hóa đơn</span>
              <span className="text-right font-semibold text-[#172027]">
                #{details.invoiceId}
              </span>
            </div>
          ) : null}
          <div className="mt-2 border-t border-emerald-100 pt-3">
            <p className="text-sm font-semibold text-[#625b50]">Đã nhận đủ</p>
            <p className="mt-1 text-3xl font-black text-[#2f5d50]">
              {formatMoney(details.amount)}
            </p>
          </div>

          {details.invoiceId ? (
            <a
              className="pos-button-primary mt-2 w-full justify-center bg-emerald-700 text-center hover:bg-emerald-800"
              href={getInvoicePrintHref(details.invoiceId)}
              rel="noreferrer"
              target="_blank"
            >
              In / xuất hóa đơn cho khách
            </a>
          ) : (
            <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-center text-sm font-bold text-emerald-700">
              Đang tạo liên kết hóa đơn...
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export function CashierOrderPayment() {
  const [orders, setOrders] = useState<CashierOrder[]>([]);
  const ordersRef = useRef<CashierOrder[]>([]);
  const selectedOrderRef = useRef<CashierOrder | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentSuccess, setPaymentSuccess] =
    useState<PaymentSuccessDetails | null>(null);
  const [qrPayment, setQrPayment] = useState<SepayPayment | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrderDetail, setIsLoadingOrderDetail] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [pendingCancelOrder, setPendingCancelOrder] =
    useState<CashierOrder | null>(null);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );
  const pollingOrderId =
    qrPayment?.status === "PENDING" ? qrPayment.orderId : null;

  useEffect(() => {
    ordersRef.current = orders;
    selectedOrderRef.current = selectedOrder;
  }, [orders, selectedOrder]);

  async function loadOrders() {
    setIsLoading(true);
    setError("");

    try {
      setOrders(await fetchPendingOrders());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể tải đơn chờ thanh toán.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialOrders() {
      try {
        const nextOrders = await fetchPendingOrders();

        if (isMounted) {
          setOrders(nextOrders);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Không thể tải đơn chờ thanh toán.",
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

  useEffect(() => {
    if (!selectedOrderId) {
      return;
    }

    const selectedOrderSummary =
      orders.find((order) => order.id === selectedOrderId) ?? null;

    if (!selectedOrderSummary || selectedOrderSummary.items.length > 0) {
      return;
    }

    let isMounted = true;

    fetchBillDetail(selectedOrderId)
      .then((orderDetail) => {
        if (!isMounted) {
          return;
        }

        setOrders((currentOrders) =>
          currentOrders.map((order) =>
            order.id === orderDetail.id ? orderDetail : order,
          ),
        );
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Không thể tải chi tiết đơn chờ thanh toán.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingOrderDetail(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (!pollingOrderId) {
      return;
    }

    let isMounted = true;
    let isPolling = false;
    let isSettled = false;
    let timeoutId: number | null = null;
    const pollingStartedAt = Date.now();

    function clearScheduledPoll() {
      if (timeoutId === null) {
        return;
      }

      window.clearTimeout(timeoutId);
      timeoutId = null;
    }

    function scheduleNextPoll() {
      if (!isMounted || isSettled) {
        return;
      }

      clearScheduledPoll();
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        void pollPaymentStatus();
      }, getPaymentPollingDelay(Date.now() - pollingStartedAt));
    }

    async function pollPaymentStatus() {
      if (!isMounted || document.visibilityState !== "visible" || isPolling) {
        return;
      }

      isPolling = true;

      try {
        const response = await fetch(`/api/payments/order/${pollingOrderId}`, {
          cache: "no-store",
        });
        const result = (await response.json()) as PaymentPollingResponse;

        if (!response.ok || !result.data) {
          throw new Error(
            getErrorMessage(result, "Không thể kiểm tra trạng thái thanh toán."),
          );
        }

        if (!isMounted) {
          return;
        }

        if (result.data.payment) {
          setQrPayment(result.data.payment);
        }

        if (
          result.data.paymentStatus === "PAID" ||
          result.data.orderStatus === "PAID"
        ) {
          isSettled = true;
          const settledBill = {
            orderId: result.data.order.id,
            sessionId: result.data.order.sessionId,
          };
          const paidBill =
            findSettledBillOrder(ordersRef.current, settledBill) ??
            selectedOrderRef.current;

          setMessage("");
          setPaymentSuccess({
            amount: paidBill?.totalAmount ?? result.data.order.totalAmount,
            invoiceId: result.data.order.invoice?.id ?? null,
            methodLabel: paymentLabel.QR_PAYMENT,
            orderLabel: getBillLabel({
              id: result.data.order.id,
              sessionId: result.data.order.sessionId,
            }),
            tableName: paidBill?.table.name ?? "Đơn hàng",
          });
          setQrPayment(null);
          setSelectedOrderId(null);
          setIsLoadingOrderDetail(false);
          setOrders((currentOrders) =>
            removeSettledBillOrders(currentOrders, settledBill),
          );
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Không thể kiểm tra trạng thái thanh toán.",
          );
        }
      } finally {
        isPolling = false;
        scheduleNextPoll();
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        clearScheduledPoll();
        void pollPaymentStatus();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void pollPaymentStatus();

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearScheduledPoll();
    };
  }, [pollingOrderId]);

  async function handlePay() {
    if (!selectedOrder) {
      setError("Vui lòng chọn đơn cần thanh toán.");
      return;
    }

    setMessage("");
    setError("");
    setPaymentSuccess(null);
    setIsPaying(true);

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "CONFIRMED",
          paymentMethod,
        }),
      });
      const result = (await response.json()) as OrderStatusResponse;

      if (!response.ok || !result.data) {
        throw new Error(
          getErrorMessage(result, "Không thể xác nhận thanh toán đơn."),
        );
      }

      const invoice = result.data.invoice;

      setMessage("");
      setPaymentSuccess({
        amount: invoice?.totalAmount ?? selectedOrder.totalAmount,
        invoiceId: invoice?.id ?? null,
        methodLabel: paymentLabel[invoice?.paymentMethod ?? paymentMethod],
        orderLabel: getBillLabel(selectedOrder),
        tableName: selectedOrder.table.name,
      });
      setQrPayment(null);
      setSelectedOrderId(null);
      setIsLoadingOrderDetail(false);
      setOrders((currentOrders) =>
        applyCashierOrderStatusPatch(
          currentOrders,
          result.data!,
          cashierVisibleStatuses,
        ),
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể xác nhận thanh toán đơn.",
      );
    } finally {
      setIsPaying(false);
    }
  }

  async function handleCancelPendingOrder() {
    if (!pendingCancelOrder) {
      return;
    }

    const orderToCancel = pendingCancelOrder;

    setMessage("");
    setError("");
    setPaymentSuccess(null);
    setIsCancelling(true);

    try {
      const response = await fetch(`/api/orders/${orderToCancel.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "CANCELLED",
        }),
      });
      const result = (await response.json()) as OrderStatusResponse;

      if (!response.ok || !result.data) {
        throw new Error(
          getErrorMessage(result, "Không thể hủy đơn chưa thanh toán."),
        );
      }

      setOrders((currentOrders) =>
        applyCashierOrderStatusPatch(
          currentOrders,
          result.data!,
          cashierVisibleStatuses,
        ),
      );

      if (selectedOrderId === orderToCancel.id) {
        setSelectedOrderId(null);
      }

      setQrPayment(null);
      setIsLoadingOrderDetail(false);
      setMessage(result.message ?? `Đã hủy đơn #${orderToCancel.id}.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể hủy đơn chưa thanh toán.",
      );
    } finally {
      setIsCancelling(false);
      setPendingCancelOrder(null);
    }
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Cashier"
        title="Quầy xác nhận đơn"
        description="Nhận tiền ngay sau khi khách gọi món, tạo hóa đơn và chuyển đơn đã thanh toán sang bếp."
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
      />

      {paymentSuccess ? <PaymentSuccessNotice details={paymentSuccess} /> : null}

      {message ? <Alert tone="success">{message}</Alert> : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Panel className="h-fit min-w-0 overflow-hidden">
          <PanelHeader
            title="Đơn chờ thanh toán"
            description="Khách gọi món xong sẽ mang mã đơn ra quầy để xác nhận."
            aside={<CountPill>{orders.length} đơn</CountPill>}
          />

          <div className="flex max-h-[680px] flex-col gap-3 overflow-y-auto p-4">
              {isLoading ? (
                <p className="text-sm text-[#625b50]">Đang tải đơn hàng...</p>
              ) : null}

              {!isLoading && orders.length === 0 ? (
                <p className="text-sm text-[#625b50]">
                  Chưa có đơn nào chờ quầy xác nhận.
                </p>
              ) : null}

              {orders.map((order) => (
                <button
                  className={
                    selectedOrderId === order.id
                      ? "rounded-2xl border border-[#2f5d50] bg-[#eff7f2] p-4 text-left shadow-sm"
                      : "rounded-2xl border border-[#eadfce] bg-white p-4 text-left shadow-sm transition hover:bg-[#fff7ea]"
                  }
	                  key={order.id}
	                  onClick={() => {
	                    setSelectedOrderId(order.id);
	                    setIsLoadingOrderDetail(order.items.length === 0);
	                    setQrPayment(null);
                    setPaymentSuccess(null);
                    setMessage("");
                    setError("");
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#625b50]">
                        {order.sessionId
                          ? `Phiên #${order.sessionId}`
                          : `Đơn #${order.id}`}
                      </p>
                      <p className="mt-1 text-lg font-bold text-[#1f2933]">
                        {order.table.name}
                      </p>
                    </div>
                    <span className="pos-badge bg-amber-50 text-amber-700">
                      Chờ thanh toán
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
        </Panel>

        <Panel className="min-w-0 p-5">
            {!selectedOrder ? (
              <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-[#cfc2b2] bg-[#fffdf9] p-6 text-center">
                <div>
                  <h2 className="text-xl font-black text-[#172027]">
                    Chọn một đơn để xác nhận
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#625b50]">
                    Khi khách thanh toán xong, đơn sẽ chuyển sang hàng đợi pha chế.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#6d645a]">
                      {selectedOrder.sessionId
                        ? `Chi tiết phiên #${selectedOrder.sessionId}`
                        : `Chi tiết đơn #${selectedOrder.id}`}
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-[#172027]">
                      {selectedOrder.table.name}
                    </h2>
                  </div>
                  <span className="pos-badge bg-amber-50 text-amber-700">
                    Chờ thanh toán
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#eadfce]">
                  <table className="pos-table min-w-[620px]">
                    <thead>
                      <tr>
                        <th className="px-4 py-3">Món</th>
                        <th className="px-4 py-3 text-right">Số lượng</th>
                        <th className="px-4 py-3 text-right">Đơn giá</th>
                        <th className="px-4 py-3 text-right">Thành tiền</th>
                      </tr>
	                    </thead>
	                    <tbody>
                      {isLoadingOrderDetail && selectedOrder.items.length === 0 ? (
                        <tr className="border-t border-[#eadfce]">
                          <td
                            className="px-4 py-5 text-center text-sm font-semibold text-[#625b50]"
                            colSpan={4}
                          >
                            Đang tải chi tiết món...
                          </td>
                        </tr>
                      ) : null}
	                      {selectedOrder.items.map((item) => (
                        <tr className="border-t border-[#eadfce]" key={item.id}>
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

                <div className="rounded-2xl bg-[#f8f3ea] p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#6d645a]">
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
                      className="pos-input"
                      onChange={(event) => {
                        setPaymentMethod(event.target.value as PaymentMethod);
                        setQrPayment(null);
                        setMessage("");
                        setError("");
                      }}
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

                  <div className="rounded-2xl border border-[#eadfce] bg-[#fffdf9] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#625b50]">
                        Tổng tiền
                      </span>
                      <span className="text-xl font-bold text-[#2f5d50]">
                        {formatMoney(selectedOrder.totalAmount)}
                      </span>
                    </div>
                    <button
                      className="pos-button-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isPaying}
                      onClick={handlePay}
                      type="button"
                    >
                      {getPayButtonLabel({ isPaying })}
                    </button>
                    <button
                      className="pos-button-danger mt-2 w-full disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isPaying || isCancelling}
                      onClick={() => setPendingCancelOrder(selectedOrder)}
                      type="button"
                    >
                      Hủy đơn chưa thanh toán
                    </button>
                  </div>
                </div>

                {qrPayment ? <SepayQrPanel payment={qrPayment} /> : null}
              </div>
            )}
        </Panel>
      </section>

      <ConfirmDialog
        confirmLabel="Hủy đơn"
        description="Chỉ dùng khi khách đổi ý hoặc không thanh toán. Đơn sẽ rời khỏi danh sách quầy và không chuyển sang bếp."
        isConfirming={isCancelling}
        onCancel={() => setPendingCancelOrder(null)}
        onConfirm={handleCancelPendingOrder}
        open={pendingCancelOrder !== null}
        title={`Hủy đơn #${pendingCancelOrder?.id ?? ""}?`}
      >
        {pendingCancelOrder
          ? `${pendingCancelOrder.table.name} · ${formatMoney(pendingCancelOrder.totalAmount)}`
          : null}
      </ConfirmDialog>
    </PageShell>
  );
}
