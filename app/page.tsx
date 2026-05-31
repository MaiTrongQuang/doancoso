import Link from "next/link";
import { getHomeAccessModel } from "@/lib/home-access";
import { getCurrentSession } from "@/lib/server-auth";

export default async function Home() {
  const session = await getCurrentSession();
  const accessModel = getHomeAccessModel(session?.role ?? null);
  const customerRoute = accessModel.customerRoutes[0];
  const primaryInternalRoute = accessModel.internalGroups[0]?.routes[0];

  return (
    <main className="min-h-dvh bg-[#f5f1ea] text-[#1f2428]">
      <section className="mx-auto grid min-h-dvh w-full max-w-7xl content-start gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8 lg:py-10">
        <div className="flex flex-col justify-center gap-8">
          <nav className="flex items-center justify-between gap-4">
            <Link
              className="inline-flex min-h-11 items-center rounded-full border border-[#d6cabc] bg-white/75 px-4 text-sm font-extrabold text-[#2f5d50] shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#2f5d50]"
              href={primaryInternalRoute?.href ?? accessModel.loginHref}
            >
              {session ? "Vào khu vực làm việc" : "Đăng nhập hệ thống"}
            </Link>
            <Link
              className="inline-flex min-h-11 items-center rounded-full bg-[#ff9f0a] px-4 text-sm font-extrabold text-[#2b1700] shadow-sm transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#885200]"
              href={customerRoute.href}
            >
              {customerRoute.label}
            </Link>
          </nav>

          <div>
            <p className="text-sm font-extrabold uppercase text-[#2f5d50]">
              Đồ án cơ sở công nghệ phần mềm
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight text-[#182027] sm:text-5xl lg:text-6xl">
              Cafe POS QR Order
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#60584e] sm:text-lg">
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
                className="border-l-4 border-[#ff9f0a] bg-white/70 px-4 py-3 shadow-sm"
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

        <div className="relative min-h-[430px] overflow-hidden rounded-[28px] border border-[#d6cabc] bg-[#182027] p-5 text-white shadow-[0_24px_70px_rgba(31,36,40,0.22)]">
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

            <div className="grid gap-3">
              {[
                ["Bàn 1", "Khách đang chọn món", "QR"],
                ["Bếp", "Có đơn mới cần xác nhận", "Staff"],
                ["Thu ngân", "Theo dõi thanh toán", "Pay"],
              ].map(([title, detail, tag]) => (
                <div
                  className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-white/12 bg-white/12 p-4 backdrop-blur"
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
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold uppercase text-[#2f5d50]">
                Lối vào hợp lệ
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-[#182027]">
                {session
                  ? "Khu vực làm việc theo tài khoản"
                  : "Khách gọi món hoặc nhân sự đăng nhập"}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[#60584e]">
              Trang public chỉ mở luồng gọi món cho khách. Các khu vực quản trị,
              nhân viên và thu ngân chỉ xuất hiện sau khi đăng nhập đúng quyền.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <section className="flex min-h-[280px] flex-col rounded-[20px] border border-[#d6cabc] bg-white p-4 shadow-[0_14px_34px_rgba(31,36,40,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase text-[#a45700]">
                    Customer
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold text-[#182027]">
                    Khách gọi món
                  </h3>
                </div>
                <span
                  aria-hidden="true"
                  className="h-12 w-12 rounded-2xl border border-[#eadfd3] bg-[#fff9f0]"
                  style={{
                    backgroundImage: 'url("/images/menu/all.svg")',
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "28px 28px",
                  }}
                />
              </div>

              <p className="mt-4 text-sm leading-6 text-[#60584e]">
                Luồng public dành cho khách tại bàn: mở menu QR, chọn món,
                ghi chú và gửi đơn mà không cần tài khoản nội bộ.
              </p>

              <Link
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-extrabold text-white transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#2f5d50]"
                href={customerRoute.href}
                style={{ backgroundColor: "#a45700" }}
              >
                {customerRoute.label}
              </Link>
            </section>

            <section className="rounded-[20px] border border-[#d6cabc] bg-white p-4 shadow-[0_14px_34px_rgba(31,36,40,0.08)]">
              {!session ? (
                <div className="flex h-full min-h-[280px] flex-col justify-between gap-6">
                  <div>
                    <p className="text-xs font-extrabold uppercase text-[#2f5d50]">
                      Internal
                    </p>
                    <h3 className="mt-2 text-2xl font-extrabold text-[#182027]">
                      Khu vực nhân sự
                    </h3>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-[#60584e]">
                      Quản trị, nhân viên và thu ngân là dữ liệu nội bộ. Vui
                      lòng đăng nhập để hệ thống hiển thị đúng khu vực theo vai
                      trò tài khoản.
                    </p>
                  </div>
                  <Link
                    className="inline-flex min-h-11 w-fit items-center justify-center rounded-xl bg-[#2f5d50] px-5 text-sm font-extrabold text-white transition hover:bg-[#24483e] focus:outline-none focus:ring-2 focus:ring-[#2f5d50]"
                    href={accessModel.loginHref}
                  >
                    Đăng nhập để xem khu vực nội bộ
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {accessModel.internalGroups.map((group) => (
                    <section
                      key={group.title}
                      className="flex min-h-[300px] flex-col rounded-2xl border border-[#eadfd3] bg-[#fffdf9] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p
                            className="text-xs font-extrabold uppercase"
                            style={{ color: group.accent }}
                          >
                            {group.eyebrow}
                          </p>
                          <h3 className="mt-2 text-xl font-extrabold text-[#182027]">
                            {group.title}
                          </h3>
                        </div>
                        <span
                          aria-hidden="true"
                          className="h-11 w-11 rounded-2xl border border-[#eadfd3] bg-[#fff9f0]"
                          style={{
                            backgroundImage: `url("${group.image}")`,
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            backgroundSize: "26px 26px",
                          }}
                        />
                      </div>

                      <p className="mt-4 text-sm leading-6 text-[#60584e]">
                        {group.description}
                      </p>

                      <Link
                        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-extrabold text-white transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[#2f5d50]"
                        href={group.routes[0].href}
                        style={{ backgroundColor: group.accent }}
                      >
                        {group.cta}
                      </Link>

                      {group.routes.length > 1 ? (
                        <div className="mt-4 flex flex-col gap-2 border-t border-[#eadfd3] pt-4">
                          {group.routes.map((route) => (
                            <Link
                              key={route.href}
                              href={route.href}
                              className="flex min-h-10 items-center justify-between rounded-xl border border-[#eadfd3] px-3 text-sm font-bold text-[#31574e] transition hover:border-[#2f5d50] hover:bg-[#f4fbf7] focus:outline-none focus:ring-2 focus:ring-[#2f5d50]"
                            >
                              <span>{route.label}</span>
                              <span aria-hidden="true">›</span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-auto border-t border-[#eadfd3] pt-4 text-sm font-bold text-[#7a7066]">
                          Một lối vào chính cho ca làm việc này.
                        </p>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
