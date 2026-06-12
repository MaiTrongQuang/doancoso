export function formatDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getRecentDateRangeInputValue(days: number, date = new Date()) {
  const normalizedDays = Number.isInteger(days) && days > 0 ? days : 1;
  const startDate = new Date(date);

  startDate.setDate(startDate.getDate() - normalizedDays + 1);

  return {
    dateFrom: formatDateInputValue(startDate),
    dateTo: formatDateInputValue(date),
  };
}
