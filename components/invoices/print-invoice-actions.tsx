"use client";

export function PrintInvoiceActions() {
  return (
    <div className="print:hidden flex flex-wrap gap-2">
      <button
        className="pos-button-primary"
        onClick={() => window.print()}
        type="button"
      >
        In hóa đơn
      </button>
      <button
        className="pos-button-secondary"
        onClick={() => window.history.back()}
        type="button"
      >
        Quay lại
      </button>
    </div>
  );
}
