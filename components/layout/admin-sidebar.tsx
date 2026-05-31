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
    <aside className="border-b border-[#ded8cc] bg-[#1f2933] text-white md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r md:border-white/10">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 px-4 py-4 md:px-5 md:py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#9fd3c7] text-sm font-black text-[#1f2933]">
              POS
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9fd3c7]">
                Admin
              </p>
              <h2 className="truncate text-xl font-bold">Cafe POS</h2>
            </div>
          </div>
          <p className="mt-3 max-w-52 text-sm leading-6 text-white/65">
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
                    ? "shrink-0 rounded-md bg-white px-3 py-2 text-sm font-bold text-[#1f2933] shadow-sm md:shrink md:px-4 md:py-3"
                    : "shrink-0 rounded-md px-3 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white md:shrink md:px-4 md:py-3"
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
            className="w-full rounded-md border border-white/20 px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 md:px-4 md:py-3"
          />
        </div>
      </div>
    </aside>
  );
}
