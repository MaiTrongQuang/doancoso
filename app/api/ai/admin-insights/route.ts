import { NextResponse } from "next/server";
import {
  buildAdminInsightPrompt,
  parseGeminiJsonObject,
  toAdminInsight,
} from "@/lib/ai-insights";
import { getDashboardSummary } from "@/lib/dashboard-summary";
import { generateGeminiContent } from "@/lib/gemini";
import { hasRole } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

const adminInsightSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    bestShifts: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
    promotionIdeas: { type: "array", items: { type: "string" } },
  },
  required: [
    "summary",
    "bestShifts",
    "risks",
    "recommendations",
    "promotionIdeas",
  ],
} as const;

function normalizeDays(value: unknown) {
  const days = typeof value === "number" ? value : Number(value);

  return days === 30 ? 30 : 7;
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Bạn không có quyền dùng AI dashboard." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const dashboardSummary = await getDashboardSummary({
      date: normalizeOptionalString(body?.date),
      days: normalizeDays(body?.days),
      month: normalizeOptionalString(body?.month),
    });
    const text = await generateGeminiContent({
      prompt: buildAdminInsightPrompt(dashboardSummary),
      responseJsonSchema: adminInsightSchema,
      systemInstruction:
        "Bạn là chuyên gia vận hành POS quán cà phê. Trả lời đúng JSON schema, không thêm markdown.",
    });
    const insight = toAdminInsight(parseGeminiJsonObject(text));

    return NextResponse.json({ data: insight });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tạo phân tích AI. Vui lòng thử lại sau." },
      { status: 500 },
    );
  }
}
