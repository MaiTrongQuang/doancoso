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

  return prisma.$transaction(async (tx) => {
    const qrConfig = await tx.qrConfig.findFirst({
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
          },
        },
      },
    });

    if (!qrConfig) {
      return null;
    }

    // Serialize first access so two customers scanning the same QR cannot
    // create two open sessions for one table.
    await tx.$queryRaw`SELECT id FROM cafe_tables WHERE id = ${qrConfig.table.id} FOR UPDATE`;

    const table = await tx.cafeTable.findUnique({
      where: { id: qrConfig.table.id },
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
    });

    if (!table || table.status === TableStatus.RESERVED) {
      return null;
    }

    const activeSession = table.sessions[0];

    if (activeSession) {
      return {
        id: table.id,
        name: table.name,
        activeSessionId: activeSession.id,
      };
    }

    const session = await tx.diningSession.create({
      data: {
        tableId: table.id,
        status: DiningSessionStatus.OPEN,
      },
      select: { id: true },
    });

    await tx.cafeTable.update({
      where: { id: table.id },
      data: { status: TableStatus.OCCUPIED },
    });

    return {
      id: table.id,
      name: table.name,
      activeSessionId: session.id,
    };
  });
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
