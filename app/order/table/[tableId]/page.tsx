import { notFound } from "next/navigation";
import { DiningSessionStatus, TableStatus } from "@prisma/client";
import { CustomerOrder } from "@/components/orders";
import { getCustomerMenuCategories } from "@/lib/customer-menu-catalog";
import { prisma } from "@/lib/prisma";
import { hashTableQrToken, isValidTableQrToken } from "@/lib/table-qr";

async function getCustomerTableContext(qrToken: string) {
  if (!isValidTableQrToken(qrToken)) {
    return null;
  }

  const qrConfig = await prisma.qrConfig.findFirst({
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
          status: true,
          sessions: {
            where: { status: DiningSessionStatus.OPEN },
            orderBy: { startedAt: "desc" },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  });

  if (!qrConfig || qrConfig.table.status === TableStatus.RESERVED) {
    return null;
  }

  return {
    id: qrConfig.table.id,
    name: qrConfig.table.name,
    activeSessionId: qrConfig.table.sessions[0]?.id ?? null,
  };
}

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
    getCustomerTableContext(qrToken),
    getCustomerMenuCategories(),
  ]);

  if (!table) {
    notFound();
  }

  return (
    <CustomerOrder
      categories={categories}
      table={{
        id: table.id,
        name: table.name,
        activeSessionId: table.activeSessionId,
        qrToken,
      }}
    />
  );
}
