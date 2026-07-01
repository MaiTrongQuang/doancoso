import { NextResponse } from "next/server";
import {
  buildAdminInsightPrompt,
  buildFastAdminInsight,
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
    headline: { type: "string" },
    narrative: { type: "string" },
    likelyCauses: { type: "array", items: { type: "string" } },
    priorityActions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          reason: { type: "string" },
          action: { type: "string" },
        },
        required: ["title", "reason", "action"],
      },
    },
    riskAlerts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          evidence: { type: "string" },
          action: { type: "string" },
        },
        required: ["title", "evidence", "action"],
      },
    },
    followUpQuestions: { type: "array", items: { type: "string" } },
  },
  required: [
    "headline",
    "narrative",
    "likelyCauses",
    "priorityActions",
    "riskAlerts",
    "followUpQuestions",
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
    const question = normalizeOptionalString(body?.question);
    const dashboardSummary = await getDashboardSummary({
      date: normalizeOptionalString(body?.date),
      days: normalizeDays(body?.days),
      month: normalizeOptionalString(body?.month),
    });
    const promptSummary = {
      ...dashboardSummary,
      question,
    };
    const fastInsight = buildFastAdminInsight(promptSummary);

    try {
      const text = await generateGeminiContent({
        prompt: buildAdminInsightPrompt(promptSummary),
        responseJsonSchema: adminInsightSchema,
        systemInstruction:
          "Bạn là cố vấn vận hành POS quán cà phê. Trả lời đúng JSON schema, ngắn nhưng đủ nghĩa, không thêm markdown, không bịa số liệu hoặc tên nhân viên.",
      });
      const insight = toAdminInsight(parseGeminiJsonObject(text));

      return NextResponse.json({ data: insight, source: "gemini" });
    } catch (geminiError) {
      console.error(geminiError);

      return NextResponse.json({
        data: fastInsight,
        message: "Đang dùng bản trả lời nhanh từ dữ liệu POS.",
        source: "fast",
      });
    }
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tạo phân tích AI. Vui lòng thử lại sau." },
      { status: 500 },
    );
  }
}
