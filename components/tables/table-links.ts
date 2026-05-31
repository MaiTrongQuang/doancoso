type TableLinkSource = {
  id: number;
  qrCodeUrl: string | null;
};

function cleanBaseUrl(value: string | null | undefined) {
  return value?.trim().replace(/\/$/, "") ?? "";
}

function isLocalBaseUrl(value: string) {
  try {
    const { hostname } = new URL(value);

    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export function resolveAppBaseUrl(browserOrigin: string, envUrl?: string) {
  const browserBaseUrl = cleanBaseUrl(browserOrigin);
  const envBaseUrl = cleanBaseUrl(envUrl);

  if (browserBaseUrl && !isLocalBaseUrl(browserBaseUrl)) {
    return browserBaseUrl;
  }

  if (envBaseUrl && !isLocalBaseUrl(envBaseUrl)) {
    return envBaseUrl;
  }

  return browserBaseUrl || envBaseUrl;
}

export function buildOrderPath(table: TableLinkSource) {
  const rawPath = table.qrCodeUrl?.trim();

  if (!rawPath) {
    return `/order/table/${table.id}`;
  }

  try {
    const url = new URL(rawPath);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  }
}

export function buildOrderLink(appBaseUrl: string, table: TableLinkSource) {
  const baseUrl = cleanBaseUrl(appBaseUrl);
  const path = buildOrderPath(table);

  return baseUrl ? `${baseUrl}${path}` : path;
}
