import { RoleHeader } from "@/components/layout";
import { getCurrentSession } from "@/lib/server-auth";

export default async function StaffLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  return (
    <div className="min-h-screen bg-[#f7f7f2]">
      <RoleHeader
        badge="Staff"
        title="Khu vực nhân viên"
        description="Theo dõi các đơn bếp đã nhận, chuẩn bị món và chuyển sang đã phục vụ."
        userName={session?.name}
      />
      {children}
    </div>
  );
}
