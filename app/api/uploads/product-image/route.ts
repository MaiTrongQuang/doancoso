import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  buildProductImageFilename,
  isAllowedProductImageType,
  maxProductImageSizeBytes,
} from "@/lib/product-image-upload";
import { hasRole } from "@/lib/server-auth";

export const runtime = "nodejs";

const uploadDirectory = path.join(process.cwd(), "public", "images", "products");

export async function POST(request: Request) {
  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Bạn không có quyền tải ảnh sản phẩm." },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { message: "Vui lòng chọn file ảnh sản phẩm." },
        { status: 400 },
      );
    }

    if (!isAllowedProductImageType(image.type)) {
      return NextResponse.json(
        { message: "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF." },
        { status: 400 },
      );
    }

    if (image.size > maxProductImageSizeBytes) {
      return NextResponse.json(
        { message: "Ảnh sản phẩm không được vượt quá 3MB." },
        { status: 400 },
      );
    }

    const fileName = buildProductImageFilename({
      originalName: image.name,
      contentType: image.type,
      token: `${Date.now()}-${randomUUID()}`,
    });

    if (!fileName) {
      return NextResponse.json(
        { message: "Định dạng ảnh không hợp lệ." },
        { status: 400 },
      );
    }

    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(
      path.join(uploadDirectory, fileName),
      Buffer.from(await image.arrayBuffer()),
    );

    return NextResponse.json(
      {
        message: "Tải ảnh lên thành công.",
        data: {
          imageUrl: `/images/products/${fileName}`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tải ảnh sản phẩm." },
      { status: 500 },
    );
  }
}
