const vietnamOffsetMs = 7 * 60 * 60 * 1000;
const monthKeyPattern = /^\d{4}-\d{2}$/;

export const shiftDefinitions = [
  { key: "06-10", label: "06:00-10:00", startHour: 6, endHour: 10 },
  { key: "10-14", label: "10:00-14:00", startHour: 10, endHour: 14 },
  { key: "14-18", label: "14:00-18:00", startHour: 14, endHour: 18 },
  { key: "18-22", label: "18:00-22:00", startHour: 18, endHour: 22 },
  { key: "22-02", label: "22:00-02:00", startHour: 22, endHour: 2 },
  { key: "02-06", label: "02:00-06:00", startHour: 2, endHour: 6 },
] as const;

export type ShiftRevenueKey = (typeof shiftDefinitions)[number]["key"];

export type ShiftRevenueInvoice = {
  paidAt: Date;
  totalAmount: number;
};

type DayRevenue = {
  date: string;
  label: string;
  revenue: number;
};

function parseMonthKey(monthKey: string) {
  if (!monthKeyPattern.test(monthKey)) {
    return null;
  }

  const [year, month] = monthKey.split("-").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return { month, year };
}

function formatMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatDayKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDayLabel(month: number, day: number) {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

function getVietnamDate(value: Date) {
  return new Date(value.getTime() + vietnamOffsetMs);
}

function getVietnamParts(value: Date) {
  const vietnamDate = getVietnamDate(value);

  return {
    day: vietnamDate.getUTCDate(),
    hour: vietnamDate.getUTCHours(),
    month: vietnamDate.getUTCMonth() + 1,
    year: vietnamDate.getUTCFullYear(),
  };
}

export function normalizeShiftRevenueMonth(value: unknown, now = new Date()) {
  if (typeof value === "string" && parseMonthKey(value)) {
    return value;
  }

  const { month, year } = getVietnamParts(now);

  return formatMonthKey(year, month);
}

export function createShiftRevenueMonthRange(monthKey: string) {
  const parsedMonth = parseMonthKey(monthKey);

  if (!parsedMonth) {
    throw new Error(`Invalid shift revenue month: ${monthKey}`);
  }

  const start = new Date(
    Date.UTC(parsedMonth.year, parsedMonth.month - 1, 1) - vietnamOffsetMs,
  );
  const end = new Date(
    Date.UTC(parsedMonth.year, parsedMonth.month, 1) - vietnamOffsetMs,
  );

  return {
    end,
    label: `${String(parsedMonth.month).padStart(2, "0")}/${parsedMonth.year}`,
    month: monthKey,
    start,
  };
}

export function getShiftKeyForVietnamDate(value: Date): ShiftRevenueKey {
  const { hour } = getVietnamParts(value);

  if (hour >= 6 && hour < 10) {
    return "06-10";
  }

  if (hour >= 10 && hour < 14) {
    return "10-14";
  }

  if (hour >= 14 && hour < 18) {
    return "14-18";
  }

  if (hour >= 18 && hour < 22) {
    return "18-22";
  }

  if (hour >= 22 || hour < 2) {
    return "22-02";
  }

  return "02-06";
}

function getVietnamDayRevenue(value: Date, revenue: number): DayRevenue {
  const { day, month, year } = getVietnamParts(value);

  return {
    date: formatDayKey(year, month, day),
    label: formatDayLabel(month, day),
    revenue,
  };
}

export function buildShiftRevenue({
  invoices,
  month,
}: {
  invoices: ShiftRevenueInvoice[];
  month: string;
}) {
  const monthRange = createShiftRevenueMonthRange(month);
  const bucketByShift = new Map(
    shiftDefinitions.map((shift) => [
      shift.key,
      {
        ...shift,
        bestDay: null as string | null,
        bestDayLabel: null as string | null,
        bestDayRevenue: 0,
        dayRevenueByDate: new Map<string, DayRevenue>(),
        invoiceCount: 0,
        revenue: 0,
      },
    ]),
  );

  for (const invoice of invoices) {
    if (invoice.paidAt < monthRange.start || invoice.paidAt >= monthRange.end) {
      continue;
    }

    const shiftKey = getShiftKeyForVietnamDate(invoice.paidAt);
    const bucket = bucketByShift.get(shiftKey);

    if (!bucket) {
      continue;
    }

    bucket.invoiceCount += 1;
    bucket.revenue += invoice.totalAmount;

    const dayRevenue = getVietnamDayRevenue(invoice.paidAt, invoice.totalAmount);
    const currentDayRevenue = bucket.dayRevenueByDate.get(dayRevenue.date);

    bucket.dayRevenueByDate.set(dayRevenue.date, {
      ...dayRevenue,
      revenue: (currentDayRevenue?.revenue ?? 0) + dayRevenue.revenue,
    });
  }

  const shifts = shiftDefinitions.map((shift) => {
    const bucket = bucketByShift.get(shift.key);

    if (!bucket) {
      throw new Error(`Missing shift bucket: ${shift.key}`);
    }

    const bestDay = Array.from(bucket.dayRevenueByDate.values()).sort(
      (left, right) =>
        right.revenue - left.revenue || left.date.localeCompare(right.date),
    )[0];

    return {
      averageInvoiceValue:
        bucket.invoiceCount > 0
          ? Math.round(bucket.revenue / bucket.invoiceCount)
          : 0,
      bestDay: bestDay?.date ?? null,
      bestDayLabel: bestDay?.label ?? null,
      bestDayRevenue: bestDay?.revenue ?? 0,
      endHour: shift.endHour,
      invoiceCount: bucket.invoiceCount,
      key: shift.key,
      label: shift.label,
      revenue: bucket.revenue,
      startHour: shift.startHour,
    };
  });

  return {
    month: monthRange.month,
    monthLabel: monthRange.label,
    shifts,
    totalInvoiceCount: shifts.reduce(
      (total, shift) => total + shift.invoiceCount,
      0,
    ),
    totalRevenue: shifts.reduce((total, shift) => total + shift.revenue, 0),
  };
}
