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
import { formatMoney } from "@/lib/format-money";

type ProductStatus = "AVAILABLE" | "UNAVAILABLE";

type Category = {
  id: number;
  name: string;
  description: string | null;
  productCount: number;
};

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  status: ProductStatus;
  categoryId: number;
  category: {
    id: number;
    name: string;
  };
  orderItemCount: number;
};

type ProductForm = {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  status: ProductStatus;
  categoryId: string;
};

const emptyForm: ProductForm = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  status: "AVAILABLE",
  categoryId: "",
};

const statusLabel: Record<ProductStatus, string> = {
  AVAILABLE: "AVAILABLE",
  UNAVAILABLE: "UNAVAILABLE",
};

function toSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

async function fetchProducts() {
  const response = await fetch("/api/products", {
    cache: "no-store",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(result, "Không thể tải sản phẩm."));
  }

  return (result.data ?? []) as Product[];
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

export function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(
    null,
  );
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  const filteredProducts = useMemo(() => {
    const keyword = toSearchText(searchQuery.trim());

    return products.filter((product) => {
      const matchesCategory =
        categoryFilter === "ALL" ||
        product.categoryId === Number(categoryFilter);
      const matchesKeyword =
        keyword.length === 0 || toSearchText(product.name).includes(keyword);

      return matchesCategory && matchesKeyword;
    });
  }, [categoryFilter, products, searchQuery]);

  async function loadProducts() {
    setIsLoading(true);
    setError("");

    try {
      const [nextProducts, nextCategories] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ]);
      setProducts(nextProducts);
      setCategories(nextCategories);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể tải dữ liệu sản phẩm.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [nextProducts, nextCategories] = await Promise.all([
          fetchProducts(),
          fetchCategories(),
        ]);

        if (isMounted) {
          setProducts(nextProducts);
          setCategories(nextCategories);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Không thể tải dữ liệu sản phẩm.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingProduct(null);
  }

  function startEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description ?? "",
      price: String(product.price),
      imageUrl: product.imageUrl ?? "",
      status: product.status,
      categoryId: String(product.categoryId),
    });
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    const url = editingProduct
      ? `/api/products/${editingProduct.id}`
      : "/api/products";
    const method = editingProduct ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          categoryId: Number(form.categoryId),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            result,
            editingProduct
              ? "Không thể cập nhật sản phẩm."
              : "Không thể thêm sản phẩm.",
          ),
        );
      }

      setMessage(result.message ?? "Lưu sản phẩm thành công.");
      resetForm();
      await loadProducts();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể lưu sản phẩm.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa sản phẩm "${product.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");
    setDeletingProductId(product.id);

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(result, "Không thể xóa sản phẩm."));
      }

      setMessage(result.message ?? "Xóa sản phẩm thành công.");
      if (editingProduct?.id === product.id) {
        resetForm();
      }
      await loadProducts();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể xóa sản phẩm.",
      );
    } finally {
      setDeletingProductId(null);
    }
  }

  async function handleToggleStatus(product: Product) {
    const nextStatus =
      product.status === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE";

    setMessage("");
    setError("");
    setUpdatingStatusId(product.id);

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: product.name,
          description: product.description ?? "",
          price: product.price,
          imageUrl: product.imageUrl ?? "",
          status: nextStatus,
          categoryId: product.categoryId,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Không thể cập nhật trạng thái sản phẩm."),
        );
      }

      setMessage(
        nextStatus === "AVAILABLE"
          ? "Đã bật lại trạng thái đang bán."
          : "Đã tạm ngừng bán sản phẩm.",
      );
      await loadProducts();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể cập nhật trạng thái sản phẩm.",
      );
    } finally {
      setUpdatingStatusId(null);
    }
  }

  return (
    <PageShell>
      <PageHero
        eyebrow="Admin"
        title="Quản lý sản phẩm"
        description="Thêm, sửa, xóa món trong menu và quản lý trạng thái đang bán."
      />

      {message ? <Alert tone="success">{message}</Alert> : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <form
            className="pos-panel h-fit p-5"
            onSubmit={handleSubmit}
          >
            <h2 className="text-lg font-bold text-[#1f2933]">
              {editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm"}
            </h2>

            <label className="mt-5 flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Tên sản phẩm
              <input
                className="pos-input"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Ví dụ: Cà phê sữa"
                required
                type="text"
                value={form.name}
              />
            </label>

            <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Danh mục
              <select
                className="pos-input"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
                required
                value={form.categoryId}
              >
                <option value="">Chọn danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Giá bán
              <input
                className="pos-input"
                min={0}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                placeholder="25000"
                required
                step={1000}
                type="number"
                value={form.price}
              />
            </label>

            <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Trạng thái
              <select
                className="pos-input"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as ProductStatus,
                  }))
                }
                value={form.status}
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="UNAVAILABLE">UNAVAILABLE</option>
              </select>
            </label>

            <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Ảnh sản phẩm
              <input
                className="pos-input"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    imageUrl: event.target.value,
                  }))
                }
                placeholder="https://..."
                type="url"
                value={form.imageUrl}
              />
            </label>

            <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Mô tả
              <textarea
                className="pos-input min-h-24"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Mô tả ngắn về sản phẩm"
                value={form.description}
              />
            </label>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="pos-button-primary disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSubmitting || categories.length === 0}
                type="submit"
              >
                {isSubmitting
                  ? "Đang lưu..."
                  : editingProduct
                    ? "Cập nhật"
                    : "Thêm sản phẩm"}
              </button>

              {editingProduct ? (
                <button
                  className="pos-button-secondary"
                  onClick={resetForm}
                  type="button"
                >
                  Hủy sửa
                </button>
              ) : null}
            </div>

            {categories.length === 0 && !isLoading ? (
              <p className="mt-3 text-sm text-red-700">
                Cần tạo danh mục trước khi thêm sản phẩm.
              </p>
            ) : null}
          </form>

          <Panel className="min-w-0 overflow-hidden">
            <PanelHeader
              title="Danh sách sản phẩm"
              description={`${filteredProducts.length} / ${products.length} sản phẩm`}
              aside={<CountPill>{products.length} món</CountPill>}
            />
            <div className="flex flex-wrap items-center justify-end gap-3 border-b border-[#eadfce] p-4">
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <input
                  className="pos-input w-full text-sm sm:w-56"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tìm theo tên sản phẩm"
                  type="search"
                  value={searchQuery}
                />
                <select
                  className="pos-input text-sm"
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  value={categoryFilter}
                >
                  <option value="ALL">Tất cả danh mục</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 p-4 2xl:grid-cols-2">
              {isLoading ? (
                <div className="pos-empty text-left">
                  Đang tải sản phẩm...
                </div>
              ) : null}

              {!isLoading && filteredProducts.length === 0 ? (
                <div className="pos-empty text-left">
                  Không tìm thấy sản phẩm phù hợp.
                </div>
              ) : null}

              {filteredProducts.map((product) => (
                <article
                  className="flex min-w-0 flex-col rounded-2xl border border-[#eadfce] bg-white p-4 shadow-sm"
                  key={product.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#2f5d50] text-base font-black text-white">
                        {product.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold uppercase tracking-wide text-[#6b6254]">
                          #{product.id} · {product.category.name}
                        </p>
                        <h3 className="mt-1 truncate text-lg font-bold text-[#1f2933]">
                          {product.name}
                        </h3>
                      </div>
                    </div>
                    <span
                      className={
                        product.status === "AVAILABLE"
                          ? "shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                          : "shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600"
                      }
                    >
                      {statusLabel[product.status]}
                    </span>
                  </div>

                  <p className="mt-4 line-clamp-3 min-h-[60px] text-sm leading-5 text-[#625b50]">
                    {product.description || "Không có mô tả"}
                  </p>

                  <dl className="mt-4 grid gap-3 rounded-md bg-[#f7f7f2] p-3 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[#6b6254]">
                        Giá
                      </dt>
                      <dd className="mt-1 font-bold text-[#2f5d50]">
                        {formatMoney(product.price)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[#6b6254]">
                        Danh mục
                      </dt>
                      <dd className="mt-1 truncate font-semibold text-[#3b352d]">
                        {product.category.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[#6b6254]">
                        Đơn hàng
                      </dt>
                      <dd className="mt-1 font-semibold text-[#3b352d]">
                        {product.orderItemCount}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#eee7dd] pt-4">
                    <button
                      className="rounded-md border border-[#d6d1c7] px-3 py-2 text-sm font-semibold text-[#3b352d] transition hover:bg-[#f7f7f2] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={updatingStatusId === product.id}
                      onClick={() => handleToggleStatus(product)}
                      type="button"
                    >
                      {updatingStatusId === product.id
                        ? "Đang đổi..."
                        : product.status === "AVAILABLE"
                          ? "Tắt bán"
                          : "Bật bán"}
                    </button>
                    <button
                      className="rounded-md border border-[#2f5d50] px-3 py-2 text-sm font-semibold text-[#2f5d50] transition hover:bg-[#eff7f2]"
                      onClick={() => startEdit(product)}
                      type="button"
                    >
                      Sửa
                    </button>
                    <button
                      className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={deletingProductId === product.id}
                      onClick={() => handleDelete(product)}
                      type="button"
                    >
                      {deletingProductId === product.id
                        ? "Đang xóa..."
                        : "Xóa"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
      </section>
    </PageShell>
  );
}
