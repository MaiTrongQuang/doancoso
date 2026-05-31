import Link from "next/link";
import {
  adminRoutes,
  cashierRoutes,
  customerRoutes,
  staffRoutes,
} from "@/lib/app-routes";

const routeGroups = [
  { title: "Admin", routes: adminRoutes },
  { title: "Staff", routes: staffRoutes },
  { title: "Cashier", routes: cashierRoutes },
  { title: "Customer", routes: customerRoutes },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-[#24231f] sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="rounded-lg border border-[#ded8cc] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2f5d50]">
            Đồ án cơ sở công nghệ phần mềm
          </p>
          <h1 className="mt-3 text-3xl font-bold text-[#1f2933] sm:text-4xl">
            Cafe POS QR Order
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#625b50] sm:text-base">
            Website POS quán cà phê: Next.js App Router, TypeScript,
            Tailwind CSS, Prisma ORM và Supabase PostgreSQL.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {routeGroups.map((group) => (
            <section
              key={group.title}
              className="rounded-lg border border-[#ded8cc] bg-white p-4 shadow-sm"
            >
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#6b6254]">
                {group.title}
              </h2>
              <div className="mt-4 flex flex-col gap-2">
                {group.routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    className="rounded-md border border-[#e7e1d8] px-3 py-2 text-sm font-medium text-[#2f5d50] transition hover:border-[#2f5d50] hover:bg-[#eff7f2]"
                  >
                    {route.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <Link
          href="/login"
          className="w-fit rounded-md bg-[#2f5d50] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#24483e]"
        >
          Đi tới đăng nhập
        </Link>
      </section>
    </main>
  );
}
