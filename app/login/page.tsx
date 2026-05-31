import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 text-[#172027]">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[24px] border border-[#d8cdbc] bg-white shadow-[0_24px_70px_rgba(31,36,40,0.12)] lg:grid-cols-[1fr_440px]">
        <div className="bg-[#172027] p-8 text-white sm:p-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#9fd3c7]">
            NaNa Cafe POS
          </p>
          <h1 className="mt-4 max-w-lg text-4xl font-black leading-tight sm:text-5xl">
            Đăng nhập hệ thống vận hành
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-7 text-white/70">
            Khu vực quản trị, nhân viên và thu ngân được tách quyền để dữ liệu
            vận hành không bị mở công khai.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {["Admin", "Staff", "Cashier"].map((item) => (
              <div
                className="rounded-2xl border border-white/12 bg-white/8 p-4"
                key={item}
              >
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/55">
                  Vai trò
                </p>
                <p className="mt-2 text-lg font-black">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#2f5d50]">
            Internal login
          </p>
          <h2 className="mt-3 text-2xl font-black text-[#172027]">
            Đăng nhập
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6d645a]">
            Dùng tài khoản seed mẫu để vào đúng khu vực theo vai trò.
          </p>
          <Suspense
            fallback={
              <div className="mt-6 rounded-2xl border border-[#d8cdbc] p-4 text-sm text-[#6d645a]">
                Đang tải form đăng nhập...
              </div>
            }
          >
            <LoginForm />
          </Suspense>
          <div className="mt-5 rounded-2xl border border-[#eadfce] bg-[#f8f3ea] p-4 text-xs leading-6 text-[#6d645a]">
            <p className="font-black text-[#172027]">Tài khoản demo</p>
            <p>admin@gmail.com / 123456</p>
            <p>staff@gmail.com / 123456</p>
            <p>cashier@gmail.com / 123456</p>
          </div>
        </div>
      </section>
    </main>
  );
}
