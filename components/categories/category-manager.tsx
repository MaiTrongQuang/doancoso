"use client";

import { FormEvent, useEffect, useState } from "react";

type Category = {
  id: number;
  name: string;
  description: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

type CategoryForm = {
  name: string;
  description: string;
};

const emptyForm: CategoryForm = {
  name: "",
  description: "",
};

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

async function fetchCategories() {
  const response = await fetch("/api/categories", {
    cache: "no-store",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(result, "Không thể tải danh mục."));
  }

  return (result.data ?? []) as Category[];
}

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(
    null,
  );

  async function loadCategories() {
    setIsLoading(true);
    setError("");

    try {
      setCategories(await fetchCategories());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể tải danh mục.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialCategories() {
      try {
        const nextCategories = await fetchCategories();

        if (isMounted) {
          setCategories(nextCategories);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Không thể tải danh mục.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingCategory(null);
  }

  function startEdit(category: Category) {
    setEditingCategory(category);
    setForm({
      name: category.name,
      description: category.description ?? "",
    });
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    const url = editingCategory
      ? `/api/categories/${editingCategory.id}`
      : "/api/categories";
    const method = editingCategory ? "PUT" : "POST";

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
            editingCategory
              ? "Không thể cập nhật danh mục."
              : "Không thể thêm danh mục.",
          ),
        );
      }

      setMessage(result.message ?? "Lưu danh mục thành công.");
      resetForm();
      await loadCategories();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể lưu danh mục.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa danh mục "${category.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");
    setDeletingCategoryId(category.id);

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Không thể xóa danh mục."),
        );
      }

      setMessage(result.message ?? "Xóa danh mục thành công.");
      if (editingCategory?.id === category.id) {
        resetForm();
      }
      await loadCategories();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể xóa danh mục.",
      );
    } finally {
      setDeletingCategoryId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-4 py-8 text-[#24231f] sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="rounded-lg border border-[#ded8cc] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2f5d50]">
            Admin
          </p>
          <h1 className="mt-3 text-2xl font-bold text-[#1f2933] sm:text-3xl">
            Quản lý danh mục
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#625b50]">
            Thêm, sửa và xóa danh mục sản phẩm trong menu quán cà phê.
          </p>
        </div>

        {message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <form
            className="h-fit rounded-lg border border-[#ded8cc] bg-white p-5 shadow-sm"
            onSubmit={handleSubmit}
          >
            <h2 className="text-lg font-bold text-[#1f2933]">
              {editingCategory ? "Sửa danh mục" : "Thêm danh mục"}
            </h2>

            <label className="mt-5 flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Tên danh mục
              <input
                className="rounded-md border border-[#d6d1c7] px-3 py-2 outline-none focus:border-[#2f5d50]"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Ví dụ: Cà phê"
                required
                type="text"
                value={form.name}
              />
            </label>

            <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Mô tả
              <textarea
                className="min-h-28 rounded-md border border-[#d6d1c7] px-3 py-2 outline-none focus:border-[#2f5d50]"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Mô tả ngắn về danh mục"
                value={form.description}
              />
            </label>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="rounded-md bg-[#2f5d50] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#24483e] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting
                  ? "Đang lưu..."
                  : editingCategory
                    ? "Cập nhật"
                    : "Thêm danh mục"}
              </button>

              {editingCategory ? (
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
                Danh sách danh mục
              </h2>
              <span className="rounded-full bg-[#f7f7f2] px-3 py-1 text-sm font-semibold text-[#625b50]">
                {categories.length} danh mục
              </span>
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-2">
              {isLoading ? (
                <div className="rounded-lg border border-dashed border-[#d6d1c7] p-6 text-sm text-[#625b50]">
                  Đang tải danh mục...
                </div>
              ) : null}

              {!isLoading && categories.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#d6d1c7] p-6 text-sm text-[#625b50]">
                  Chưa có danh mục nào.
                </div>
              ) : null}

              {categories.map((category) => {
                const cannotDelete = category.productCount > 0;

                return (
                  <article
                    className="flex min-w-0 flex-col rounded-lg border border-[#eee7dd] bg-white p-4 shadow-sm"
                    key={category.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#6b6254]">
                          #{category.id}
                        </p>
                        <h3 className="mt-1 truncate text-lg font-bold text-[#1f2933]">
                          {category.name}
                        </h3>
                      </div>
                      <span className="shrink-0 rounded-full bg-[#f7f7f2] px-3 py-1 text-xs font-semibold text-[#625b50]">
                        {category.productCount} sản phẩm
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-3 min-h-[60px] text-sm leading-5 text-[#625b50]">
                      {category.description || "Không có mô tả"}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[#eee7dd] pt-4">
                      <button
                        className="rounded-md border border-[#2f5d50] px-3 py-2 text-sm font-semibold text-[#2f5d50] transition hover:bg-[#eff7f2]"
                        onClick={() => startEdit(category)}
                        type="button"
                      >
                        Sửa
                      </button>
                      <button
                        className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-[#ded8cc] disabled:text-[#9b948a] disabled:hover:bg-transparent"
                        disabled={
                          cannotDelete ||
                          deletingCategoryId === category.id
                        }
                        onClick={() => handleDelete(category)}
                        title={
                          cannotDelete
                            ? "Không thể xóa danh mục đang có sản phẩm."
                            : undefined
                        }
                        type="button"
                      >
                        {deletingCategoryId === category.id
                          ? "Đang xóa..."
                          : "Xóa"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
