"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminRoutes } from "@/lib/app-routes";
import { LogoutButton } from "./logout-button";

function isActiveRoute(pathname: string, href: string) {
  if (href === "/admin/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-black/10 bg-[#172027] text-white shadow-[18px_0_50px_rgba(23,32,39,0.12)] md:sticky md:top-0 md:h-dvh md:w-72 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r md:border-white/10">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 px-4 py-4 md:px-5 md:py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ff9f0a] text-sm font-black text-[#2b1700] shadow-[0_14px_28px_rgba(255,159,10,0.22)]">
              N
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#9fd3c7]">
                Admin
              </p>
              <h2 className="truncate text-xl font-black">NaNa POS</h2>
            </div>
          </div>
          <p className="mt-4 max-w-56 text-sm leading-6 text-white/68">
            Quản trị danh mục, sản phẩm, bàn, đơn hàng và hóa đơn.
          </p>
        </div>

        <nav
          aria-label="Admin menu"
          className="flex gap-2 overflow-x-auto px-3 py-3 md:flex-1 md:flex-col md:overflow-visible md:px-4 md:py-5"
        >
          {adminRoutes.map((route) => {
            const isActive = isActiveRoute(pathname, route.href);

            return (
              <Link
                className={
                  isActive
                    ? "shrink-0 rounded-2xl bg-white px-3 py-2 text-sm font-black text-[#172027] shadow-sm md:shrink md:px-4 md:py-3"
                    : "shrink-0 rounded-2xl px-3 py-2 text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white md:shrink md:px-4 md:py-3"
                }
                href={route.href}
                aria-current={isActive ? "page" : undefined}
                key={route.href}
              >
                {route.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3 md:p-4">
          <LogoutButton
            className="w-full rounded-2xl border border-white/18 px-3 py-2 text-left text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 md:px-4 md:py-3"
          />
        </div>
      </div>
    </aside>
  );
}
