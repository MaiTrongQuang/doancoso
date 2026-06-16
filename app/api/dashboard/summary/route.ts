import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/dashboard-summary";
import { hasRole } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Bạn không có quyền xem dashboard." },
        { status: 403 },
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const days = searchParams.get("days");
    const date = searchParams.get("date");
    const month = searchParams.get("month");

    return NextResponse.json(
      await getDashboardSummary({ date, days: Number(days), month }),
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message:
          "Không thể tải thống kê dashboard. Hãy kiểm tra DATABASE_URL và database Supabase.",
      },
      { status: 500 },
    );
  }
}
