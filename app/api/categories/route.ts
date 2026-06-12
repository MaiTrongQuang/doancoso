import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { menuCatalogCacheTag } from "@/lib/customer-menu-catalog";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/server-auth";

function normalizeDescription(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const description = value.trim();
  return description.length > 0 ? description : null;
}

function normalizeName(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function serializeCategory(category: {
  id: number;
  name: string;
  description: string | null;
  _count: {
    products: number;
  };
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    productCount: category._count.products,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    return NextResponse.json({
      data: categories.map(serializeCategory),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tải danh sách danh mục." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Bạn không có quyền thêm danh mục." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const name = normalizeName(body?.name);
    const description = normalizeDescription(body?.description);

    if (!name) {
      return NextResponse.json(
        { message: "Tên danh mục là bắt buộc." },
        { status: 400 },
      );
    }

    const existingCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { message: "Tên danh mục đã tồn tại." },
        { status: 409 },
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
    revalidateTag(menuCatalogCacheTag, "max");

    return NextResponse.json(
      {
        message: "Thêm danh mục thành công.",
        data: serializeCategory(category),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể thêm danh mục." },
      { status: 500 },
    );
  }
}
