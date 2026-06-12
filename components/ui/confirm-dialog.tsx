"use client";

import type { ReactNode } from "react";

type ConfirmDialogProps = {
  cancelLabel?: string;
  children?: ReactNode;
  confirmLabel: string;
  description: string;
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  tone?: "danger" | "warning";
};

const toneClassName: Record<NonNullable<ConfirmDialogProps["tone"]>, string> = {
  danger: "bg-red-700 text-white hover:bg-red-800",
  warning: "bg-[#172027] text-white hover:bg-[#0f171d]",
};

export function ConfirmDialog({
  cancelLabel = "Giữ lại",
  children,
  confirmLabel,
  description,
  isConfirming = false,
  onCancel,
  onConfirm,
  open,
  title,
  tone = "danger",
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      aria-labelledby="confirm-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#172027]/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#eadfce] bg-white p-5 shadow-[0_24px_80px_rgba(23,32,39,0.28)]">
        <p
          className="text-xs font-black uppercase tracking-[0.12em] text-red-700"
          id="confirm-dialog-title"
        >
          Xác nhận thao tác
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#172027]">{title}</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#625b50]">
          {description}
        </p>
        {children ? (
          <div className="mt-4 rounded-xl border border-[#eadfce] bg-[#fff9f0] p-3 text-sm font-semibold leading-6 text-[#6d4d16]">
            {children}
          </div>
        ) : null}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className="rounded-md border border-[#d6d1c7] px-4 py-3 text-sm font-black text-[#3b352d] transition hover:bg-[#f8f3ea] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isConfirming}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`rounded-md px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClassName[tone]}`}
            disabled={isConfirming}
            onClick={onConfirm}
            type="button"
          >
            {isConfirming ? "Đang xử lý..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

