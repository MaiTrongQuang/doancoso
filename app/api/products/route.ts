import { NextResponse } from "next/server";
import { ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasRole } from "@/lib/server-auth";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = normalizeCategoryId(searchParams.get("categoryId"));
  const search = normalizeText(
    searchParams.get("search") ?? searchParams.get("q"),
  );

  try {
    const products = await prisma.product.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(search
          ? {
              name: {
                contains: search,
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: {
        createdAt: "desc",
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

    return NextResponse.json({
      data: products.map((product) => ({
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
      })),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tải danh sách sản phẩm." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Bạn không có quyền thêm sản phẩm." },
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

    const [category, duplicatedProduct] = await Promise.all([
      prisma.category.findUnique({
        where: { id: categoryId },
      }),
      prisma.product.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
      }),
    ]);

    if (!category) {
      return NextResponse.json(
        { message: "Danh muc khong ton tai." },
        { status: 404 },
      );
    }

    if (duplicatedProduct) {
      return NextResponse.json(
        { message: "Tên sản phẩm đã tồn tại." },
        { status: 409 },
      );
    }

    const product = await prisma.product.create({
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
      },
    });

    return NextResponse.json(
      {
        message: "Thêm sản phẩm thành công.",
        data: product,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể thêm sản phẩm." },
      { status: 500 },
    );
  }
}
