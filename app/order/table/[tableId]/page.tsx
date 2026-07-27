import { notFound } from "next/navigation";
import { DiningSessionStatus } from "@prisma/client";
import { CustomerOrder } from "@/components/orders";
import { getCustomerMenuCategories } from "@/lib/customer-menu-catalog";
import { prisma } from "@/lib/prisma";
import { hashTableQrToken, isValidTableQrToken } from "@/lib/table-qr";

type CustomerOrderPageProps = {
  params: Promise<{
    tableId: string;
  }>;
};

export default async function CustomerOrderPage({
  params,
}: CustomerOrderPageProps) {
  const { tableId: tableIdParam } = await params;
  const qrToken = decodeURIComponent(tableIdParam);

  if (!isValidTableQrToken(qrToken)) {
    notFound();
  }

  const [table, categories] = await Promise.all([
    prisma.qrConfig.findFirst({
      where: {
        tokenHash: hashTableQrToken(qrToken),
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: {
        table: {
          select: {
            id: true,
            name: true,
            sessions: {
              where: {
                status: DiningSessionStatus.OPEN,
              },
              take: 1,
              select: {
                id: true,
              },
            },
          },
        },
      },
    }),
    getCustomerMenuCategories(),
  ]);

  if (!table) {
    notFound();
  }

  const activeSessionId = table.table.sessions[0]?.id ?? null;

  if (!activeSessionId) {
    notFound();
  }

  return (
    <CustomerOrder
      categories={categories}
      table={{
        id: table.table.id,
        name: table.table.name,
        activeSessionId,
        qrToken,
      }}
    />
  );
}
