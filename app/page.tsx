import Link from "next/link";
import { getHomeAccessModel } from "@/lib/home-access";
import { getCurrentSession } from "@/lib/server-auth";

export default async function Home() {
  const session = await getCurrentSession();
  const accessModel = getHomeAccessModel(session?.role ?? null);
  const customerRoute = accessModel.customerRoutes[0];
  const primaryInternalRoute = accessModel.internalGroups[0]?.routes[0];
  const workAreaCards = session
    ? [
        {
          accent: "#a45700",
          cta: customerRoute.label,
          description:
            "Mở menu QR, chọn món, ghi chú và gửi đơn ngay tại bàn.",
          eyebrow: "Customer",
          href: customerRoute.href,
          image: "/images/menu/all.svg",
          title: "Khách gọi món",
        },
        ...accessModel.internalGroups.map((group) => ({
          accent: group.accent,
          cta: group.cta,
          description: group.description,
          eyebrow: group.eyebrow,
          href: group.routes[0].href,
          image: group.image,
          title: group.title,
        })),
      ]
    : [
        {
          accent: "#a45700",
          cta: customerRoute.label,
          description:
            "Mở menu QR, chọn món, ghi chú và gửi đơn ngay tại bàn.",
          eyebrow: "Customer",
          href: customerRoute.href,
          image: "/images/menu/all.svg",
          title: "Khách gọi món",
        },
        {
          accent: "#2f5d50",
          cta: "Đăng nhập hệ thống",
          description:
            "Quản trị, nhân viên và thu ngân sẽ mở đúng theo quyền tài khoản.",
          eyebrow: "Internal",
          href: accessModel.loginHref,
          image: "/images/menu/coffee.svg",
          title: "Khu vực nhân sự",
        },
      ];

  return (
    <main className="min-h-[100svh] overflow-x-hidden bg-[#f5f1ea] text-[#1f2428]">
      <section className="mx-auto grid w-full max-w-7xl content-start gap-6 px-4 pb-8 pt-3 sm:px-6 sm:pt-4 lg:min-h-[100svh] lg:grid-cols-[minmax(0,1fr)_400px] lg:px-8 lg:pb-10 lg:pt-4 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="flex flex-col justify-center gap-6 lg:min-h-[470px]">
          <nav className="flex flex-col items-stretch gap-3 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
            <Link
              className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full border border-[#d6cabc] bg-white/80 px-4 text-sm font-extrabold text-[#2f5d50] shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#2f5d50]"
              href={primaryInternalRoute?.href ?? accessModel.loginHref}
            >
              {session ? "Vào khu vực làm việc" : "Đăng nhập hệ thống"}
            </Link>
            <Link
              className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full bg-[#ff9f0a] px-4 text-sm font-extrabold text-[#2b1700] shadow-sm transition hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#885200]"
              href={customerRoute.href}
            >
              {customerRoute.label}
            </Link>
          </nav>

          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#2f5d50] sm:text-sm">
              Đồ án cơ sở công nghệ phần mềm
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-extrabold leading-[1.04] text-[#182027] text-balance min-[380px]:text-4xl sm:text-5xl lg:text-[4.25rem]">
              Cafe POS QR Order
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#60584e] text-pretty sm:text-lg sm:leading-8">
              Một không gian điều phối cho quán cà phê: khách gọi món bằng QR,
              nhân viên nhận đơn, thu ngân thanh toán và quản trị theo dõi toàn
              bộ dữ liệu vận hành.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["31", "món mẫu"],
              ["QR", "gọi món tại bàn"],
              ["POS", "khu vực nội bộ"],
            ].map(([value, label]) => (
              <div
                className="border-l-4 border-[#ff9f0a] bg-white/72 px-4 py-3 shadow-sm"
                key={label}
              >
                <p className="text-2xl font-extrabold tabular-nums text-[#182027]">
                  {value}
                </p>
                <p className="mt-1 text-sm font-bold text-[#60584e]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[360px] overflow-hidden rounded-[24px] border border-[#d6cabc] bg-[#182027] p-5 text-white shadow-[0_22px_54px_rgba(31,36,40,0.18)] sm:min-h-[390px] lg:min-h-[470px]">
          <div
            aria-label="Ảnh đồ uống NaNa Cafe"
            className="absolute inset-0 opacity-45"
            role="img"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAjyVtJO98Pc71lJgKUEoqc9BkFspIH7-HZLzEp-0UfDVS6DgMSg8aNv-b9UPs7RskpspwRT1DeEHpwCmYucBkGw0CBjaeEbTXT_vmY5xtRjHpx9LSzr0Lp6nt5AMBxFmSxk66XQesWDRiCgK036crU0eQNLHSIJav9fzbhpbPo_dtH21VpwLQ3HmFOTPJx9jPU2fttZ5kTGJP7PiWl9roxzwu43J4--Mk9waWVduOjCRQ_gqyyPSobfWfjtDJoJgnzG5nX3FYoO7Q")',
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,32,39,0.18),rgba(24,32,39,0.96))]" />
          <div className="relative flex h-full min-h-[390px] flex-col justify-between">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white/70">Hôm nay</p>
                <p className="mt-1 text-2xl font-extrabold">Sẵn sàng phục vụ</p>
              </div>
              <span className="rounded-full bg-white/15 px-3 py-2 text-sm font-bold backdrop-blur">
                POS Live
              </span>
            </div>

            <div className="grid gap-3 pb-1">
              {[
                ["Bàn 1", "Khách đang chọn món", "QR"],
                ["Bếp", "Đơn đã thu tiền chờ pha chế", "Staff"],
                ["Quầy", "Xác nhận thanh toán", "Pay"],
              ].map(([title, detail, tag]) => (
                <div
                  className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-white/12 bg-white/12 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur"
                  key={title}
                >
                  <div>
                    <p className="font-extrabold">{title}</p>
                    <p className="mt-1 text-sm font-medium text-white/70">
                      {detail}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#ff9f0a] px-3 py-1 text-xs font-extrabold text-[#2b1700]">
                    {tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="lg:col-span-2">
          <div className="mb-4 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.75fr)] lg:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#2f5d50]">
                Lối vào hợp lệ
              </p>
              <h2 className="mt-1 text-2xl font-extrabold leading-tight text-[#182027] sm:text-3xl">
                {session
                  ? "Khu vực làm việc theo tài khoản"
                  : "Khách gọi món hoặc nhân sự đăng nhập"}
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-[#60584e] lg:text-right">
              Trang public chỉ mở luồng gọi món cho khách. Các khu vực quản trị,
              nhân viên và thu ngân chỉ xuất hiện sau khi đăng nhập đúng quyền.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workAreaCards.map((card) => (
              <section
                key={card.title}
                className="flex min-h-[260px] flex-col rounded-[18px] border border-[#d8cdbc] bg-white/90 p-4 shadow-[0_12px_30px_rgba(31,36,40,0.07)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className="text-xs font-extrabold uppercase tracking-[0.06em]"
                      style={{ color: card.accent }}
                    >
                      {card.eyebrow}
                    </p>
                    <h3 className="mt-2 text-xl font-extrabold leading-tight text-[#182027]">
                      {card.title}
                    </h3>
                  </div>
                  <span
                    aria-hidden="true"
                    className="h-11 w-11 shrink-0 rounded-2xl border border-[#eadfd3] bg-[#fff9f0]"
                    style={{
                      backgroundImage: `url("${card.image}")`,
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "26px 26px",
                    }}
                  />
                </div>

                <p className="mt-4 text-sm leading-6 text-[#60584e]">
                  {card.description}
                </p>

                <Link
                  className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#2f5d50]"
                  href={card.href}
                  style={{ backgroundColor: card.accent }}
                >
                  {card.cta}
                </Link>

              </section>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
