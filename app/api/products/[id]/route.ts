import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { ProductStatus } from "@prisma/client";
import { menuCatalogCacheTag } from "@/lib/customer-menu-catalog";
import { getProductRemovalAction } from "@/lib/destructive-action-policy";
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

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value);
  return text.length > 0 ? text : null;
}

function normalizePrice(value: unknown) {
  const price =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(price) || price < 0) {
    return null;
  }

  return price;
}

function normalizeCategoryId(value: unknown) {
  const categoryId =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return null;
  }

  return categoryId;
}

function normalizeStatus(value: unknown) {
  return value === ProductStatus.UNAVAILABLE
    ? ProductStatus.UNAVAILABLE
    : ProductStatus.AVAILABLE;
}

function serializeProduct(product: {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  status: ProductStatus;
  categoryId: number;
  category: {
    id: number;
    name: string;
  };
  _count: {
    orderItems: number;
  };
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    status: product.status,
    categoryId: product.categoryId,
    category: product.category,
    orderItemCount: product._count.orderItems,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id: idParam } = await params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json(
      { message: "Mã sản phẩm không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Bạn không có quyền cập nhật sản phẩm." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const name = normalizeText(body?.name);
    const description = normalizeOptionalText(body?.description);
    const price = normalizePrice(body?.price);
    const imageUrl = normalizeOptionalText(body?.imageUrl);
    const categoryId = normalizeCategoryId(body?.categoryId);
    const status = normalizeStatus(body?.status);

    if (!name) {
      return NextResponse.json(
        { message: "Tên sản phẩm là bắt buộc." },
        { status: 400 },
      );
    }

    if (price === null) {
      return NextResponse.json(
        { message: "Giá sản phẩm phải là số nguyên không âm." },
        { status: 400 },
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { message: "Danh mục sản phẩm là bắt buộc." },
        { status: 400 },
      );
    }

    const [product, category, duplicatedProduct] = await Promise.all([
      prisma.product.findUnique({
        where: { id },
      }),
      prisma.category.findUnique({
        where: { id: categoryId },
      }),
      prisma.product.findFirst({
        where: {
          id: {
            not: id,
          },
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      }),
    ]);

    if (!product) {
      return NextResponse.json(
        { message: "Sản phẩm không tồn tại." },
        { status: 404 },
      );
    }

    if (!category) {
      return NextResponse.json(
        { message: "Danh mục không tồn tại." },
        { status: 404 },
      );
    }

    if (duplicatedProduct) {
      return NextResponse.json(
        { message: "Tên sản phẩm đã tồn tại." },
        { status: 409 },
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price,
        imageUrl,
        categoryId,
        status,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
    });
    revalidateTag(menuCatalogCacheTag, "max");

    return NextResponse.json({
      message: "Cập nhật sản phẩm thành công.",
      data: serializeProduct(updatedProduct),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể cập nhật sản phẩm." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id: idParam } = await params;
  const id = parseId(idParam);

  if (!id) {
    return NextResponse.json(
      { message: "Mã sản phẩm không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Bạn không có quyền xóa sản phẩm." },
        { status: 403 },
      );
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { message: "Sản phẩm không tồn tại." },
        { status: 404 },
      );
    }

    if (getProductRemovalAction(product._count.orderItems) === "DISABLE") {
      const disabledProduct = await prisma.product.update({
        where: { id },
        data: {
          status: ProductStatus.UNAVAILABLE,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              orderItems: true,
            },
          },
        },
      });
      revalidateTag(menuCatalogCacheTag, "max");

      return NextResponse.json({
        message:
          "Sản phẩm đã từng xuất hiện trong đơn hàng nên đã được chuyển sang ngừng bán thay vì xóa.",
        data: serializeProduct(disabledProduct),
      });
    }

    await prisma.product.delete({
      where: { id },
    });
    revalidateTag(menuCatalogCacheTag, "max");

    return NextResponse.json({
      message: "Xóa sản phẩm thành công.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể xóa sản phẩm." },
      { status: 500 },
    );
  }
}
