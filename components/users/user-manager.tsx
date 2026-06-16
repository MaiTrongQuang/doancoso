"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Alert,
  CountPill,
  PageHero,
  PageShell,
  Panel,
  PanelHeader,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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

type UserResponse = {
  message?: string;
  data?: User;
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
    label: "Quầy vận hành",
    description: "Xác nhận thanh toán, cập nhật đơn và tạo hóa đơn.",
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
    CASHIER: "Quầy vận hành",
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
  const [pendingDeleteUser, setPendingDeleteUser] = useState<User | null>(null);
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
      const result = (await response.json()) as UserResponse;

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
      if (result.data) {
        setUsers((currentUsers) =>
          editingUser
            ? currentUsers.map((user) =>
                user.id === result.data!.id ? result.data! : user,
              )
            : [result.data!, ...currentUsers],
        );
      } else {
        await loadUsers();
      }
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
      setUsers((currentUsers) =>
        currentUsers.filter((currentUser) => currentUser.id !== user.id),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể xóa người dùng.",
      );
    } finally {
      setDeletingUserId(null);
      setPendingDeleteUser(null);
    }
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Admin"
        title="Quản lý nhân viên"
        description="Tạo tài khoản nội bộ, cập nhật vai trò và quản lý quyền truy cập hệ thống POS."
      />

        <section className="grid gap-3 sm:grid-cols-3">
          {roleOptions.map((option) => (
            <div
              className="rounded-2xl border border-[#eadfce] bg-white p-4 shadow-sm"
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

      {message ? <Alert tone="success">{message}</Alert> : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <form
            className="pos-panel h-fit p-5"
            onSubmit={handleSubmit}
          >
            <h2 className="text-lg font-bold text-[#1f2933]">
              {editingUser ? "Sửa tài khoản" : "Thêm tài khoản"}
            </h2>

            <label className="mt-5 flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Họ tên
              <input
                className="pos-input"
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
                className="pos-input"
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
                className="pos-input"
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
                className="pos-input"
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
                className="pos-button-primary disabled:cursor-not-allowed disabled:opacity-70"
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
                  className="pos-button-secondary"
                  onClick={resetForm}
                  type="button"
                >
                  Hủy sửa
                </button>
              ) : null}
            </div>
          </form>

          <Panel className="min-w-0 overflow-hidden">
            <PanelHeader
              title="Danh sách tài khoản"
              aside={<CountPill>{users.length} tài khoản</CountPill>}
            />

            <div className="overflow-x-auto">
              <table className="pos-table min-w-[820px]">
                <thead>
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
                            onClick={() => setPendingDeleteUser(user)}
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
          </Panel>
      </section>

      <ConfirmDialog
        confirmLabel="Xóa tài khoản"
        description="Tài khoản này sẽ mất quyền đăng nhập vào hệ thống POS. Không thể xóa tài khoản đang đăng nhập hoặc admin cuối cùng."
        isConfirming={
          pendingDeleteUser ? deletingUserId === pendingDeleteUser.id : false
        }
        onCancel={() => setPendingDeleteUser(null)}
        onConfirm={() => {
          if (pendingDeleteUser) {
            handleDelete(pendingDeleteUser);
          }
        }}
        open={pendingDeleteUser !== null}
        title={`Xóa "${pendingDeleteUser?.email ?? ""}"?`}
      />
    </PageShell>
  );
}
