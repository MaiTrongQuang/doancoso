import { notFound } from "next/navigation";
import { ProductStatus } from "@prisma/client";
import { CustomerOrder } from "@/components/orders";
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
      },
    }),
    prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        products: {
          where: {
            status: ProductStatus.AVAILABLE,
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            categoryId: true,
          },
        },
      },
    }),
  ]);

  if (!table) {
    notFound();
  }

  return (
    <CustomerOrder
      categories={categories
        .filter((category) => category.products.length > 0)
        .map((category) => ({
          id: category.id,
          name: category.name,
          products: category.products,
        }))}
      table={table}
    />
  );
}
