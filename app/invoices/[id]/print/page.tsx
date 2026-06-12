import { notFound } from "next/navigation";
import { OrderStatus, PaymentMethod } from "@prisma/client";
import { PrintInvoiceActions } from "@/components/invoices";
import { formatMoney } from "@/lib/format-money";
import {
  formatInvoiceCode,
  getPaymentLabel,
  receiptStoreInfo,
  receiptThankYouMessage,
} from "@/lib/invoice-print";
import { prisma } from "@/lib/prisma";

type PrintInvoicePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    plain?: string;
  }>;
};

type InvoiceOrder = {
  id: number;
  status: OrderStatus;
  note: string | null;
  totalAmount: number;
  createdAt: Date;
  table: {
    id: number;
    name: string;
  };
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    price: number;
    note: string | null;
    product: {
      id: number;
      name: string;
    };
  }>;
};

function parseInvoiceId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function getBillOrders(invoice: {
  order: InvoiceOrder;
  session: {
    orders: InvoiceOrder[];
  } | null;
}) {
  return (
    invoice.session?.orders.filter(
      (order) => order.status !== OrderStatus.CANCELLED,
    ) ?? [invoice.order]
  );
}

export default async function PrintInvoicePage({
  params,
  searchParams,
}: PrintInvoicePageProps) {
  const { id: idParam } = await params;
  const query = (await searchParams) ?? {};
  const id = parseInvoiceId(idParam);

  if (!id) {
    notFound();
  }

  const invoice = await prisma.invoice.findUnique({
    where: {
      id,
    },
    include: {
      order: {
        include: {
          table: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            orderBy: {
              id: "asc",
            },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      session: {
        include: {
          orders: {
            orderBy: {
              createdAt: "asc",
            },
            include: {
              table: {
                select: {
                  id: true,
                  name: true,
                },
              },
              items: {
                orderBy: {
                  id: "asc",
                },
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  const billOrders = getBillOrders(invoice);
  const [firstOrder] = billOrders;

  if (!firstOrder) {
    notFound();
  }

  const items = billOrders.flatMap((order) =>
    order.items.map((item) => ({
      ...item,
      orderId: order.id,
    })),
  );
  const paymentMethod = invoice.paymentMethod as PaymentMethod;
  const isPlainView = query.plain === "1";

  return (
    <main className="min-h-screen bg-[#f5f1ea] px-4 py-6 text-[#172027] print:min-h-0 print:bg-white print:p-0">
      <style>
        {`@media print {
          @page {
            size: 80mm 297mm;
            margin: 0;
          }
        }`}
      </style>

      <div className="mx-auto flex w-full max-w-[360px] flex-col gap-3 print:max-w-[80mm] print:gap-0">
        {isPlainView ? null : <PrintInvoiceActions />}

        <article className="rounded-lg border border-[#d8cdbc] bg-white px-4 py-5 text-[12px] leading-5 shadow-sm print:w-[80mm] print:rounded-none print:border-0 print:px-[4mm] print:py-[3mm] print:text-[10px] print:leading-4 print:shadow-none">
          <header className="text-center">
            <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#2f5d50] print:text-[10px]">
              {receiptStoreInfo.name}
            </p>
            <p className="mt-2 font-semibold text-[#172027]">
              ĐC: {receiptStoreInfo.address}
            </p>
            <p className="font-semibold text-[#172027]">
              SĐT: {receiptStoreInfo.phone}
            </p>
            <div className="my-3 border-t border-dashed border-[#756a5d]" />
            <h1 className="text-[15px] font-black uppercase tracking-[0.04em] print:text-[12px]">
              Hóa đơn thanh toán
            </h1>
            <p className="mt-1 font-bold">
              Số: {formatInvoiceCode(invoice.id)}
            </p>
            <p className="font-semibold">Ngày: {formatDateTime(invoice.paidAt)}</p>
          </header>

          <section className="my-3 space-y-1 border-y border-dashed border-[#756a5d] py-2">
            <div className="flex justify-between gap-3">
              <span>Bàn</span>
              <span className="text-right font-bold">{firstOrder.table.name}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Khách hàng</span>
              <span className="text-right font-semibold">Khách lẻ</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Thanh toán</span>
              <span className="text-right font-semibold">
                {getPaymentLabel(paymentMethod)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span>
                {invoice.sessionId ? "Phiên phục vụ" : "Đơn hàng"}
              </span>
              <span className="text-right font-semibold">
                #{invoice.sessionId ?? invoice.orderId}
              </span>
            </div>
          </section>

          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="border-b border-[#756a5d] text-left font-black">
                <th className="w-[42%] py-1 pr-1">Tên hàng</th>
                <th className="w-[22%] px-1 py-1 text-right">Đ.giá</th>
                <th className="w-[10%] px-1 py-1 text-right">SL</th>
                <th className="w-[26%] py-1 pl-1 text-right">TT</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr className="border-b border-[#d8cdbc]" key={item.id}>
                  <td className="break-words py-1.5 pr-1 align-top font-semibold">
                    {item.product.name}
                    {item.note ? (
                      <p className="mt-0.5 text-[10px] font-normal text-[#625b50] print:text-[9px]">
                        {item.note}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-1 py-1.5 text-right align-top">
                    {formatMoney(item.price)}
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

          <section className="mt-3 space-y-1 border-t border-[#756a5d] pt-2">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold">Tổng thành tiền</span>
              <span className="font-bold">{formatMoney(invoice.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[14px] print:text-[11px]">
              <span className="font-black">Tổng cộng</span>
              <span className="font-black">{formatMoney(invoice.totalAmount)}</span>
            </div>
          </section>

          <footer className="mt-4 border-t border-dashed border-[#756a5d] pt-3 text-center font-bold">
            {receiptThankYouMessage}
          </footer>
        </article>
      </div>
    </main>
  );
}
