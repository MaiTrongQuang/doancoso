import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f2] px-4 py-10 text-[#24231f]">
      <section className="w-full max-w-md rounded-lg border border-[#ded8cc] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#2f5d50]">
          Internal login
        </p>
        <h1 className="mt-3 text-2xl font-bold text-[#1f2933]">Đăng nhập</h1>
        <p className="mt-2 text-sm leading-6 text-[#625b50]">
          Dùng tài khoản seed mẫu để đăng nhập vào khu vực quản trị, nhân viên
          hoặc thu ngân.
        </p>
        <Suspense
          fallback={
            <div className="mt-6 rounded-md border border-[#d6d1c7] p-4 text-sm text-[#625b50]">
              Đang tải form đăng nhập...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
        <div className="mt-5 rounded-md bg-[#f7f7f2] p-3 text-xs leading-6 text-[#625b50]">
          <p>admin@gmail.com / 123456</p>
          <p>staff@gmail.com / 123456</p>
          <p>cashier@gmail.com / 123456</p>
        </div>
      </section>
    </main>
  );
}
