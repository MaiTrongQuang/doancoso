export function getInvoicePrintHref(
  invoiceId: number,
  options: { plain?: boolean } = {},
) {
  const baseHref = `/invoices/${invoiceId}/print`;

  return options.plain ? `${baseHref}?plain=1` : baseHref;
}
