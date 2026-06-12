import { unstable_cache } from "next/cache";
import { ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const menuCatalogCacheTag = "customer-menu-catalog";

export type CustomerMenuProduct = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  categoryId: number;
};

export type CustomerMenuCategory = {
  id: number;
  name: string;
  products: CustomerMenuProduct[];
};

export function toCustomerMenuCategories(
  categories: CustomerMenuCategory[],
): CustomerMenuCategory[] {
  return categories
    .filter((category) => category.products.length > 0)
    .map((category) => ({
      id: category.id,
      name: category.name,
      products: category.products,
    }));
}

export const getCustomerMenuCategories = unstable_cache(
  async () => {
    const categories = await prisma.category.findMany({
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
    });

    return toCustomerMenuCategories(categories);
  },
  [menuCatalogCacheTag],
  {
    tags: [menuCatalogCacheTag],
    revalidate: 300,
  },
);
