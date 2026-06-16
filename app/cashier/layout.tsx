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
        title="Quầy vận hành"
        description="Xác nhận thanh toán, tạo hóa đơn và chuyển đơn sang pha chế."
        userName={session?.name}
      />
      {children}
    </div>
  );
}
