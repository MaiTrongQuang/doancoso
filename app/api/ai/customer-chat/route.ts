import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import {
  buildCustomerChatPrompt,
  customerAiSampleQuestions,
  selectCustomerChatSuggestedProducts,
} from "@/lib/ai-insights";
import { getCustomerMenuCategories } from "@/lib/customer-menu-catalog";
import { generateGeminiContent } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type TopProductRow = {
  productName: string;
  quantity: number;
};

function normalizeId(value: unknown) {
  const id = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeMessage(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const message = value.trim();

  if (!message || message.length > 500) {
    return null;
  }

  return message;
}

async function getTopProducts() {
  const rows = await prisma.$queryRaw<TopProductRow[]>`
    SELECT
      p.name AS "productName",
      SUM(oi.quantity)::int AS quantity
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi.order_id
    INNER JOIN products p ON p.id = oi.product_id
    WHERE o.status::text = ${OrderStatus.PAID}
    GROUP BY p.id, p.name
    ORDER BY quantity DESC, p.name ASC
    LIMIT 5
  `;

  return rows.map((row) => ({
    name: row.productName,
    quantity: Number(row.quantity),
  }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const tableId = normalizeId(body?.tableId);
    const message = normalizeMessage(body?.message);

    if (!tableId) {
      return NextResponse.json(
        { message: "Mã bàn không hợp lệ." },
        { status: 400 },
      );
    }

    if (!message) {
      return NextResponse.json(
        { message: "Vui lòng nhập câu hỏi ngắn hơn 500 ký tự." },
        { status: 400 },
      );
    }

    const [table, categories, topProducts] = await Promise.all([
      prisma.cafeTable.findUnique({
        where: { id: tableId },
        select: {
          id: true,
          name: true,
        },
      }),
      getCustomerMenuCategories(),
      getTopProducts(),
    ]);

    if (!table) {
      return NextResponse.json(
        { message: "Bàn không tồn tại." },
        { status: 404 },
      );
    }

    const menuItems = categories.flatMap((category) =>
      category.products.map((product) => ({
        categoryName: category.name,
        id: product.id,
        imageUrl: product.imageUrl,
        name: product.name,
        price: product.price,
      })),
    );
    const reply = await generateGeminiContent({
      prompt: buildCustomerChatPrompt({
        menuItems,
        message,
        tableName: table.name,
        topProducts,
      }),
      systemInstruction:
        "Bạn là trợ lý gọi món cho khách quán cà phê. Trả lời tự nhiên, ngắn gọn, không dùng markdown phức tạp.",
    });
    const suggestedProducts = selectCustomerChatSuggestedProducts({
      menuItems,
      message,
      reply,
      topProducts,
    });

    return NextResponse.json({
      data: {
        reply,
        sampleQuestions: customerAiSampleQuestions,
        suggestedProducts,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tư vấn bằng AI lúc này. Vui lòng thử lại sau." },
      { status: 500 },
    );
  }
}
