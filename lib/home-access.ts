import {
  adminRoutes,
  cashierRoutes,
  customerRoutes,
  staffRoutes,
} from "@/lib/app-routes";
import type { SessionPayload } from "@/lib/jwt";

export type HomeRoleGroup = {
  title: string;
  eyebrow: string;
  cta: string;
  description: string;
  accent: string;
  image: string;
  routes: Array<{
    href: string;
    label: string;
  }>;
};

const internalGroups: Record<SessionPayload["role"], HomeRoleGroup[]> = {
  ADMIN: [
    {
      title: "Quản trị",
      eyebrow: "Admin",
      cta: "Mở bảng quản trị",
      description: "Theo dõi vận hành, món bán, bàn, nhân sự và hóa đơn.",
      accent: "#2f5d50",
      image: "/images/menu/coffee.svg",
      routes: adminRoutes,
    },
    {
      title: "Nhân viên",
      eyebrow: "Staff",
      cta: "Xem hàng đợi bếp",
      description: "Pha chế và phục vụ các đơn đã được quầy xác nhận.",
      accent: "#8a4f13",
      image: "/images/menu/tea.svg",
      routes: staffRoutes,
    },
    {
      title: "Quầy vận hành",
      eyebrow: "Cashier",
      cta: "Mở quầy xác nhận",
      description: "Nhận tiền, tạo hóa đơn và chuyển đơn sang bếp pha chế.",
      accent: "#7a5d12",
      image: "/images/menu/cake.svg",
      routes: cashierRoutes,
    },
  ],
  STAFF: [
    {
      title: "Nhân viên",
      eyebrow: "Staff",
      cta: "Xem hàng đợi bếp",
      description: "Pha chế và phục vụ các đơn đã được quầy xác nhận.",
      accent: "#8a4f13",
      image: "/images/menu/tea.svg",
      routes: staffRoutes,
    },
  ],
  CASHIER: [
    {
      title: "Quầy vận hành",
      eyebrow: "Cashier",
      cta: "Mở quầy xác nhận",
      description: "Nhận tiền, tạo hóa đơn và chuyển đơn sang bếp pha chế.",
      accent: "#7a5d12",
      image: "/images/menu/cake.svg",
      routes: cashierRoutes,
    },
  ],
  BARISTA: [
    {
      title: "Pha chế",
      eyebrow: "Barista",
      cta: "Mở hàng đợi pha chế",
      description: "Tiếp nhận đơn và cập nhật trạng thái chuẩn bị món.",
      accent: "#8a4f13",
      image: "/images/menu/tea.svg",
      routes: staffRoutes,
    },
  ],
  SERVER: [
    {
      title: "Phục vụ",
      eyebrow: "Server",
      cta: "Mở hàng đợi phục vụ",
      description: "Giao món đã sẵn sàng và xác nhận đã phục vụ khách.",
      accent: "#2f5d50",
      image: "/images/menu/coffee.svg",
      routes: staffRoutes,
    },
  ],
};

export function getHomeAccessModel(role: SessionPayload["role"] | null) {
  return {
    customerRoutes,
    internalGroups: role ? internalGroups[role] : [],
    loginHref: "/login",
  };
}
