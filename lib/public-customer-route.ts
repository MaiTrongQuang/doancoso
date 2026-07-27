import { TableStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildOrderPath } from "@/components/tables/table-links";

export async function getPublicCustomerRoute() {
  try {
    const table = await prisma.cafeTable.findFirst({
      where: {
        status: { not: TableStatus.RESERVED },
        qrConfig: {
          is: {
            active: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        },
      },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        qrCodeUrl: true,
      },
    });

    if (!table?.qrCodeUrl) {
      return null;
    }

    const href = buildOrderPath(table);

    if (href === "/admin/tables") {
      return null;
    }

    return {
      href,
      label: `Gọi món ${table.name}`,
    };
  } catch {
    return null;
  }
}
