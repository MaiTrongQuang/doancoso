import { RoleHeader } from "@/components/layout";
import { getCurrentSession } from "@/lib/server-auth";

export default async function CashierLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  return (
    <div className="min-h-screen bg-transparent">
      <RoleHeader
        badge="Cashier"
        title="Khu vực thu ngân"
        description="Thanh toán đơn đã phục vụ và tạo hóa đơn cho khách."
        userName={session?.name}
      />
      {children}
    </div>
  );
}
