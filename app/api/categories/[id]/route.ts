import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { menuCatalogCacheTag } from "@/lib/customer-menu-catalog";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

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

export async function PUT(request: Request, { params }: RouteContext) {
  const { id: idParam } = await params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json(
      { message: "Mã danh mục không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Bạn không có quyền cập nhật danh mục." },
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

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json(
        { message: "Danh mục không tồn tại." },
        { status: 404 },
      );
    }

    const duplicatedCategory = await prisma.category.findFirst({
      where: {
        id: {
          not: id,
        },
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (duplicatedCategory) {
      return NextResponse.json(
        { message: "Tên danh mục đã tồn tại." },
        { status: 409 },
      );
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
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

    return NextResponse.json({
      message: "Cập nhật danh mục thành công.",
      data: serializeCategory(updatedCategory),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể cập nhật danh mục." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id: idParam } = await params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json(
      { message: "Mã danh mục không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Bạn không có quyền xóa danh mục." },
        { status: 403 },
      );
    }

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { message: "Danh mục không tồn tại." },
        { status: 404 },
      );
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        {
          message:
            "Không thể xóa danh mục vì vẫn còn sản phẩm thuộc danh mục này.",
        },
        { status: 409 },
      );
    }

    await prisma.category.delete({
      where: { id },
    });
    revalidateTag(menuCatalogCacheTag, "max");

    return NextResponse.json({
      message: "Xóa danh mục thành công.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể xóa danh mục." },
      { status: 500 },
    );
  }
}
