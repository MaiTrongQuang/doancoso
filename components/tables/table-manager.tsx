"use client";

import { FormEvent, useEffect, useState } from "react";
import QRCode from "qrcode";

type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED";

type CafeTable = {
  id: number;
  name: string;
  status: TableStatus;
  qrCodeUrl: string | null;
  orderCount: number;
  createdAt: string;
  updatedAt: string;
};

type TableForm = {
  name: string;
  status: TableStatus;
};

const appUrlFromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

const emptyForm: TableForm = {
  name: "",
  status: "AVAILABLE",
};

const statusOptions: Array<{
  value: TableStatus;
  label: string;
  className: string;
}> = [
  {
    value: "AVAILABLE",
    label: "Bàn trống",
    className: "bg-emerald-50 text-emerald-700",
  },
  {
    value: "OCCUPIED",
    label: "Đang có khách",
    className: "bg-amber-50 text-amber-700",
  },
  {
    value: "RESERVED",
    label: "Đã đặt trước",
    className: "bg-sky-50 text-sky-700",
  },
];

const statusLabel = statusOptions.reduce<Record<TableStatus, string>>(
  (labels, option) => {
    labels[option.value] = option.label;
    return labels;
  },
  {
    AVAILABLE: "Bàn trống",
    OCCUPIED: "Đang có khách",
    RESERVED: "Đã đặt trước",
  },
);

function getStatusClassName(status: TableStatus) {
  return (
    statusOptions.find((option) => option.value === status)?.className ??
    "bg-stone-100 text-stone-600"
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

function buildOrderPath(table: Pick<CafeTable, "id" | "qrCodeUrl">) {
  return table.qrCodeUrl || `/order/table/${table.id}`;
}

function buildOrderLink(
  appBaseUrl: string,
  table: Pick<CafeTable, "id" | "qrCodeUrl">,
) {
  const path = buildOrderPath(table);
  return appBaseUrl ? `${appBaseUrl}${path}` : path;
}

async function fetchTables() {
  const response = await fetch("/api/tables", {
    cache: "no-store",
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(getErrorMessage(result, "Không thể tải danh sách bàn."));
  }

  return (result.data ?? []) as CafeTable[];
}

function OrderQrCode({ value }: { value: string }) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function generateQrCode() {
      const dataUrl = await QRCode.toDataURL(value, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 160,
        color: {
          dark: "#1f2933",
          light: "#ffffff",
        },
      });

      if (isMounted) {
        setQrDataUrl(dataUrl);
      }
    }

    generateQrCode().catch(() => {
      if (isMounted) {
        setQrDataUrl("");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [value]);

  return (
    <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-md border border-[#d6d1c7] bg-white p-2">
      {qrDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={`QR code ${value}`} className="h-full w-full" src={qrDataUrl} />
      ) : (
        <span className="text-center text-xs font-semibold text-[#625b50]">
          Đang tạo QR...
        </span>
      )}
    </div>
  );
}

export function TableManager() {
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [form, setForm] = useState<TableForm>(emptyForm);
  const [editingTable, setEditingTable] = useState<CafeTable | null>(null);
  const [appBaseUrl, setAppBaseUrl] = useState(appUrlFromEnv ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [deletingTableId, setDeletingTableId] = useState<number | null>(null);

  async function loadTables() {
    setIsLoading(true);
    setError("");

    try {
      setTables(await fetchTables());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể tải danh sách bàn.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!appUrlFromEnv) {
      const timeoutId = window.setTimeout(() => {
        setAppBaseUrl(window.location.origin);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialTables() {
      try {
        const nextTables = await fetchTables();

        if (isMounted) {
          setTables(nextTables);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Không thể tải danh sách bàn.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialTables();

    return () => {
      isMounted = false;
    };
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setEditingTable(null);
  }

  function startEdit(table: CafeTable) {
    setEditingTable(table);
    setForm({
      name: table.name,
      status: table.status,
    });
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    const url = editingTable ? `/api/tables/${editingTable.id}` : "/api/tables";
    const method = editingTable ? "PUT" : "POST";

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
            editingTable ? "Không thể cập nhật bàn." : "Không thể thêm bàn.",
          ),
        );
      }

      setMessage(result.message ?? "Lưu bàn thành công.");
      resetForm();
      await loadTables();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Không thể lưu bàn.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(table: CafeTable, status: TableStatus) {
    if (table.status === status) {
      return;
    }

    setMessage("");
    setError("");
    setUpdatingStatusId(table.id);

    try {
      const response = await fetch(`/api/tables/${table.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: table.name,
          status,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, "Không thể cập nhật trạng thái bàn."),
        );
      }

      setMessage("Cập nhật trạng thái bàn thành công.");
      await loadTables();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Không thể cập nhật trạng thái bàn.",
      );
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function handleCopyLink(link: string) {
    setMessage("");
    setError("");

    try {
      await navigator.clipboard.writeText(link);
      setMessage("Đã copy link gọi món.");
    } catch {
      setError("Không thể copy link. Hãy copy thủ công trên màn hình.");
    }
  }

  async function handleDelete(table: CafeTable) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa bàn "${table.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");
    setDeletingTableId(table.id);

    try {
      const response = await fetch(`/api/tables/${table.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(result, "Không thể xóa bàn."));
      }

      setMessage(result.message ?? "Xóa bàn thành công.");
      if (editingTable?.id === table.id) {
        resetForm();
      }
      await loadTables();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Không thể xóa bàn.",
      );
    } finally {
      setDeletingTableId(null);
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
            Quản lý bàn
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#625b50]">
            Quản lý trạng thái bàn, link gọi món và mã QR Order theo từng bàn.
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

        <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <form
            className="h-fit rounded-lg border border-[#ded8cc] bg-white p-5 shadow-sm"
            onSubmit={handleSubmit}
          >
            <h2 className="text-lg font-bold text-[#1f2933]">
              {editingTable ? "Sửa bàn" : "Thêm bàn"}
            </h2>

            <label className="mt-5 flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Tên bàn
              <input
                className="rounded-md border border-[#d6d1c7] px-3 py-2 outline-none focus:border-[#2f5d50]"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Ví dụ: Bàn 1"
                required
                type="text"
                value={form.name}
              />
            </label>

            <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
              Trạng thái
              <select
                className="rounded-md border border-[#d6d1c7] px-3 py-2 outline-none focus:border-[#2f5d50]"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as TableStatus,
                  }))
                }
                value={form.status}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {editingTable ? (
              <div className="mt-4 rounded-md bg-[#f7f7f2] p-3 text-sm text-[#625b50]">
                <p className="font-semibold text-[#3b352d]">Link gọi món</p>
                <p className="mt-1 break-all">
                  {buildOrderLink(appBaseUrl, editingTable)}
                </p>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className="rounded-md bg-[#2f5d50] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#24483e] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting
                  ? "Đang lưu..."
                  : editingTable
                    ? "Cập nhật"
                    : "Thêm bàn"}
              </button>

              {editingTable ? (
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
                Danh sách bàn
              </h2>
              <span className="rounded-full bg-[#f7f7f2] px-3 py-1 text-sm font-semibold text-[#625b50]">
                {tables.length} bàn
              </span>
            </div>

            <div className="grid gap-4 p-4 2xl:grid-cols-2">
              {isLoading ? (
                <div className="rounded-lg border border-dashed border-[#d6d1c7] p-6 text-sm text-[#625b50]">
                  Đang tải danh sách bàn...
                </div>
              ) : null}

              {!isLoading && tables.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#d6d1c7] p-6 text-sm text-[#625b50]">
                  Chưa có bàn nào.
                </div>
              ) : null}

              {tables.map((table) => {
                const orderLink = buildOrderLink(appBaseUrl, table);

                return (
                  <article
                    className="min-w-0 rounded-lg border border-[#eee7dd] bg-white p-4 shadow-sm"
                    key={table.id}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#6b6254]">
                          #{table.id}
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-[#1f2933]">
                          {table.name}
                        </h3>
                        <p className="mt-1 text-xs text-[#625b50]">
                          /order/table/{table.id}
                        </p>
                      </div>
                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(
                          table.status,
                        )}`}
                      >
                        {statusLabel[table.status]}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_144px]">
                      <div className="min-w-0 space-y-4">
                        <label className="flex flex-col gap-2 text-sm font-medium text-[#3b352d]">
                          Trạng thái
                          <select
                            className="w-full rounded-md border border-[#d6d1c7] px-3 py-2 text-sm outline-none focus:border-[#2f5d50] disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={updatingStatusId === table.id}
                            onChange={(event) =>
                              handleStatusChange(
                                table,
                                event.target.value as TableStatus,
                              )
                            }
                            value={table.status}
                          >
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="rounded-md bg-[#f7f7f2] p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b6254]">
                            Link gọi món
                          </p>
                          <a
                            className="mt-2 block break-all text-sm font-semibold text-[#2f5d50] underline-offset-4 hover:underline"
                            href={orderLink}
                            target="_blank"
                          >
                            {orderLink}
                          </a>
                          <button
                            className="mt-3 rounded-md border border-[#d6d1c7] bg-white px-3 py-2 text-xs font-semibold text-[#3b352d] transition hover:bg-[#f7f7f2]"
                            onClick={() => handleCopyLink(orderLink)}
                            type="button"
                          >
                            Copy link
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-center lg:justify-end">
                        <OrderQrCode value={orderLink} />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 border-t border-[#eee7dd] pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium text-[#625b50]">
                        {table.orderCount} đơn hàng
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-md border border-[#2f5d50] px-3 py-2 text-sm font-semibold text-[#2f5d50] transition hover:bg-[#eff7f2]"
                          onClick={() => startEdit(table)}
                          type="button"
                        >
                          Sửa
                        </button>
                        <button
                          className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={deletingTableId === table.id}
                          onClick={() => handleDelete(table)}
                          type="button"
                        >
                          {deletingTableId === table.id ? "Đang xóa..." : "Xóa"}
                        </button>
                      </div>
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
