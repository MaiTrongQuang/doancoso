"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Alert,
  CountPill,
  PageHero,
  PageShell,
  Panel,
  PanelHeader,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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

type CategoryResponse = {
  message?: string;
  data?: Category;
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
  const [pendingDeleteCategory, setPendingDeleteCategory] =
    useState<Category | null>(null);
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
      const result = (await response.json()) as CategoryResponse;

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
      if (result.data) {
        setCategories((currentCategories) =>
          editingCategory
            ? currentCategories.map((category) =>
                category.id === result.data!.id ? result.data! : category,
              )
            : [result.data!, ...currentCategories],
        );
      } else {
        await loadCategories();
      }
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
      setCategories((currentCategories) =>
        currentCategories.filter(
          (currentCategory) => currentCategory.id !== category.id,
        ),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể xóa danh mục.",
      );
    } finally {
      setDeletingCategoryId(null);
      setPendingDeleteCategory(null);
    }
  }

  return (
    <PageShell maxWidthClassName="max-w-6xl">
      <PageHero
        eyebrow="Admin"
        title="Quản lý danh mục"
        description="Thêm, sửa và xóa danh mục sản phẩm trong menu quán cà phê."
      />

      {message ? <Alert tone="success">{message}</Alert> : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <section className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <form
            className="pos-panel h-fit p-5"
            onSubmit={handleSubmit}
          >
            <h2 className="text-lg font-bold text-[#1f2933]">
              {editingCategory ? "Sửa danh mục" : "Thêm danh mục"}
            </h2>

            <label className="mt-5 flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Tên danh mục
              <input
                className="pos-input"
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
                className="pos-input min-h-28"
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
                className="pos-button-primary disabled:cursor-not-allowed disabled:opacity-70"
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
              title="Danh sách danh mục"
              aside={<CountPill>{categories.length} danh mục</CountPill>}
            />

            <div className="grid gap-4 p-4 md:grid-cols-2">
              {isLoading ? (
                <div className="pos-empty text-left">
                  Đang tải danh mục...
                </div>
              ) : null}

              {!isLoading && categories.length === 0 ? (
                <div className="pos-empty text-left">
                  Chưa có danh mục nào.
                </div>
              ) : null}

              {categories.map((category) => {
                const cannotDelete = category.productCount > 0;

                return (
                  <article
                    className="flex min-w-0 flex-col rounded-2xl border border-[#eadfce] bg-white p-4 shadow-sm"
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
                        className="pos-button-secondary min-h-10"
                        onClick={() => startEdit(category)}
                        type="button"
                      >
                        Sửa
                      </button>
                      <button
                        className="pos-button-danger min-h-10 disabled:cursor-not-allowed disabled:border-[#ded8cc] disabled:text-[#9b948a] disabled:hover:bg-transparent"
                        disabled={
                          cannotDelete ||
                          deletingCategoryId === category.id
                        }
                        onClick={() => setPendingDeleteCategory(category)}
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
          </Panel>
      </section>

      <ConfirmDialog
        confirmLabel="Xóa danh mục"
        description="Danh mục sẽ bị xóa khỏi hệ thống. Chỉ thực hiện khi chắc chắn danh mục không còn dùng cho menu."
        isConfirming={
          pendingDeleteCategory
            ? deletingCategoryId === pendingDeleteCategory.id
            : false
        }
        onCancel={() => setPendingDeleteCategory(null)}
        onConfirm={() => {
          if (pendingDeleteCategory) {
            handleDelete(pendingDeleteCategory);
          }
        }}
        open={pendingDeleteCategory !== null}
        title={`Xóa "${pendingDeleteCategory?.name ?? ""}"?`}
      />
    </PageShell>
  );
}
