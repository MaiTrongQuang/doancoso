import { notFound } from "next/navigation";
import { DiningSessionStatus } from "@prisma/client";
import { CustomerOrder } from "@/components/orders";
import { getCustomerMenuCategories } from "@/lib/customer-menu-catalog";
import { prisma } from "@/lib/prisma";

type CustomerOrderPageProps = {
  params: Promise<{
    tableId: string;
  }>;
};

function parseTableId(value: string) {
  const tableId = Number(value);
  return Number.isInteger(tableId) && tableId > 0 ? tableId : null;
}

export default async function CustomerOrderPage({
  params,
}: CustomerOrderPageProps) {
  const { tableId: tableIdParam } = await params;
  const tableId = parseTableId(tableIdParam);

  if (!tableId) {
    notFound();
  }

  const [table, categories] = await Promise.all([
    prisma.cafeTable.findUnique({
      where: {
        id: tableId,
      },
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
    }),
    getCustomerMenuCategories(),
  ]);

  if (!table) {
    notFound();
  }

  const activeSessionId = table.sessions[0]?.id ?? null;

  return (
    <CustomerOrder
      categories={categories}
      table={{
        id: table.id,
        name: table.name,
        activeSessionId,
      }}
    />
  );
}
