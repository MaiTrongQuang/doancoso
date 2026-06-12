type InvoiceDateFilterInput = {
  date?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

type InvoiceDateFilterRange = {
  start: Date | null;
  end: Date | null;
};

type InvoiceDateFilterResult =
  | {
      ok: true;
      range: InvoiceDateFilterRange | null;
    }
  | {
      ok: false;
      message: string;
    };

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDateValue(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function parseVietnamDayStart(value: string) {
  if (!datePattern.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000+07:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function getInvoiceDateFilterRange(
  input: InvoiceDateFilterInput,
): InvoiceDateFilterResult {
  const legacyDate = normalizeDateValue(input.date);
  const dateFrom = normalizeDateValue(input.dateFrom) ?? legacyDate;
  const dateTo = normalizeDateValue(input.dateTo) ?? legacyDate;

  if (!dateFrom && !dateTo) {
    return {
      ok: true,
      range: null,
    };
  }

  const start = dateFrom ? parseVietnamDayStart(dateFrom) : null;
  const endDayStart = dateTo ? parseVietnamDayStart(dateTo) : null;

  if ((dateFrom && !start) || (dateTo && !endDayStart)) {
    return {
      ok: false,
      message: "Ngày lọc hóa đơn không hợp lệ.",
    };
  }

  if (start && endDayStart && start.getTime() > endDayStart.getTime()) {
    return {
      ok: false,
      message: "Ngày bắt đầu không được lớn hơn ngày kết thúc.",
    };
  }

  return {
    ok: true,
    range: {
      start,
      end: endDayStart
        ? new Date(endDayStart.getTime() + 24 * 60 * 60 * 1000)
        : null,
    },
  };
}
