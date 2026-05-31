"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type UserRole = "ADMIN" | "STAFF" | "CASHIER";

type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

type UserForm = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

const emptyForm: UserForm = {
  name: "",
  email: "",
  password: "",
  role: "STAFF",
};

const roleOptions: Array<{
  value: UserRole;
  label: string;
  description: string;
  className: string;
}> = [
  {
    value: "ADMIN",
    label: "Admin",
    description: "Quản trị toàn bộ hệ thống.",
    className: "bg-[#eff7f2] text-[#2f5d50]",
  },
  {
    value: "STAFF",
    label: "Nhân viên",
    description: "Xử lý đơn và cập nhật trạng thái.",
    className: "bg-sky-50 text-sky-700",
  },
  {
    value: "CASHIER",
    label: "Thu ngân",
    description: "Thanh toán và tạo hóa đơn.",
    className: "bg-violet-50 text-violet-700",
  },
];

const roleLabel = roleOptions.reduce<Record<UserRole, string>>(
  (labels, option) => {
    labels[option.value] = option.label;
    return labels;
  },
  {
    ADMIN: "Admin",
    STAFF: "Nhân viên",
    CASHIER: "Thu ngân",
  },
);

function getRoleClassName(role: UserRole) {
  return (
    roleOptions.find((option) => option.value === role)?.className ??
    "bg-stone-100 text-stone-700"
  );
}

function getErrorMessage(value: unknown, fallback: string) {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }

  return fallback;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function fetchUsers() {
  const response = await fetch("/api/users", {
    cache: "no-store",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(result, "Không thể tải người dùng."));
  }

  return (result.data ?? []) as User[];
}

export function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  const userCountByRole = useMemo(() => {
    return roleOptions.reduce<Record<UserRole, number>>(
      (counts, option) => {
        counts[option.value] = users.filter(
          (user) => user.role === option.value,
        ).length;
        return counts;
      },
      {
        ADMIN: 0,
        STAFF: 0,
        CASHIER: 0,
      },
    );
  }, [users]);

  async function loadUsers() {
    setIsLoading(true);
    setError("");

    try {
      setUsers(await fetchUsers());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể tải người dùng.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialUsers() {
      try {
        const nextUsers = await fetchUsers();

        if (isMounted) {
          setUsers(nextUsers);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Không thể tải người dùng.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingUser(null);
  }

  function startEdit(user: User) {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
    const method = editingUser ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            result,
            editingUser
              ? "Không thể cập nhật người dùng."
              : "Không thể thêm người dùng.",
          ),
        );
      }

      setMessage(result.message ?? "Lưu người dùng thành công.");
      resetForm();
      await loadUsers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể lưu người dùng.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(user: User) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa tài khoản "${user.email}"?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");
    setDeletingUserId(user.id);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(result, "Không thể xóa người dùng."));
      }

      setMessage(result.message ?? "Xóa người dùng thành công.");
      if (editingUser?.id === user.id) {
        resetForm();
      }
      await loadUsers();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể xóa người dùng.",
      );
    } finally {
      setDeletingUserId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-[#24231f] sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="rounded-lg border border-[#ded8cc] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2f5d50]">
            Admin
          </p>
          <h1 className="mt-3 text-2xl font-bold text-[#1f2933] sm:text-3xl">
            Quản lý nhân viên
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#625b50]">
            Tạo tài khoản nội bộ, cập nhật vai trò và quản lý quyền truy cập hệ thống POS.
          </p>
        </div>

        <section className="grid gap-3 sm:grid-cols-3">
          {roleOptions.map((option) => (
            <div
              className="rounded-lg border border-[#ded8cc] bg-white p-4 shadow-sm"
              key={option.value}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#625b50]">
                    {option.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#6b6254]">
                    {option.description}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${option.className}`}
                >
                  {userCountByRole[option.value]}
                </span>
              </div>
            </div>
          ))}
        </section>

        {message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <form
            className="h-fit rounded-lg border border-[#ded8cc] bg-white p-5 shadow-sm"
            onSubmit={handleSubmit}
          >
            <h2 className="text-lg font-bold text-[#1f2933]">
              {editingUser ? "Sửa tài khoản" : "Thêm tài khoản"}
            </h2>

            <label className="mt-5 flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Họ tên
              <input
                className="rounded-md border border-[#d6d1c7] px-3 py-2 outline-none focus:border-[#2f5d50]"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Ví dụ: Nguyễn Văn A"
                required
                type="text"
                value={form.name}
              />
            </label>

            <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Email
              <input
                className="rounded-md border border-[#d6d1c7] px-3 py-2 outline-none focus:border-[#2f5d50]"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="staff@gmail.com"
                required
                type="email"
                value={form.email}
              />
            </label>

            <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              {editingUser ? "Mật khẩu mới" : "Mật khẩu"}
              <input
                className="rounded-md border border-[#d6d1c7] px-3 py-2 outline-none focus:border-[#2f5d50]"
                minLength={editingUser ? undefined : 6}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder={editingUser ? "Bỏ trống nếu không đổi" : "Tối thiểu 6 ký tự"}
                required={!editingUser}
                type="password"
                value={form.password}
              />
            </label>

            <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Vai trò
              <select
                className="rounded-md border border-[#d6d1c7] px-3 py-2 outline-none focus:border-[#2f5d50]"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    role: event.target.value as UserRole,
                  }))
                }
                value={form.role}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="rounded-md bg-[#2f5d50] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#24483e] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting
                  ? "Đang lưu..."
                  : editingUser
                    ? "Cập nhật"
                    : "Thêm tài khoản"}
              </button>

              {editingUser ? (
                <button
                  className="rounded-md border border-[#d6d1c7] px-4 py-2 text-sm font-semibold text-[#3b352d] transition hover:bg-[#f7f7f2]"
                  onClick={resetForm}
                  type="button"
                >
                  Hủy sửa
                </button>
              ) : null}
            </div>
          </form>

          <div className="min-w-0 rounded-lg border border-[#ded8cc] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee7dd] p-4">
              <h2 className="text-lg font-bold text-[#1f2933]">
                Danh sách tài khoản
              </h2>
              <span className="rounded-full bg-[#f7f7f2] px-3 py-1 text-sm font-semibold text-[#625b50]">
                {users.length} tài khoản
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead className="bg-[#f7f7f2] text-left text-xs uppercase tracking-wide text-[#6b6254]">
                  <tr>
                    <th className="px-4 py-3">Người dùng</th>
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3">Ngày tạo</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-5 text-[#625b50]" colSpan={4}>
                        Đang tải danh sách người dùng...
                      </td>
                    </tr>
                  ) : null}

                  {!isLoading && users.length === 0 ? (
                    <tr>
                      <td className="px-4 py-5 text-[#625b50]" colSpan={4}>
                        Chưa có người dùng nào.
                      </td>
                    </tr>
                  ) : null}

                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-[#eee7dd]">
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#1f2933]">{user.name}</p>
                        <p className="mt-1 text-xs text-[#625b50]">
                          {user.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getRoleClassName(user.role)}`}
                        >
                          {roleLabel[user.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#625b50]">
                        {formatDateTime(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-md border border-[#2f5d50] px-3 py-2 text-sm font-semibold text-[#2f5d50] transition hover:bg-[#eff7f2]"
                            onClick={() => startEdit(user)}
                            type="button"
                          >
                            Sửa
                          </button>
                          <button
                            className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={deletingUserId === user.id}
                            onClick={() => handleDelete(user)}
                            type="button"
                          >
                            {deletingUserId === user.id ? "Đang xóa..." : "Xóa"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
