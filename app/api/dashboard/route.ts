import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/dashboard-summary";
import { hasRole } from "@/lib/server-auth";

export async function GET() {
  try {
    const isAdmin = await hasRole(["ADMIN"]);

    if (!isAdmin) {
      return NextResponse.json(
        { message: "Ban khong co quyen xem dashboard." },
        { status: 403 },
      );
    }

    return NextResponse.json({
      data: await getDashboardSummary(),
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Không thể tải thống kê dashboard." },
      { status: 500 },
    );
  }
}
