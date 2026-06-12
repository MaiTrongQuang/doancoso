export const maxProductImageSizeBytes = 3 * 1024 * 1024;

const productImageExtensionsByType = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

export function getProductImageExtension(contentType: string) {
  return productImageExtensionsByType.get(contentType.toLowerCase()) ?? null;
}

export function isAllowedProductImageType(contentType: string) {
  return getProductImageExtension(contentType) !== null;
}

function slugifyFileBase(originalName: string) {
  const withoutExtension = originalName.replace(/\.[^/.]+$/, "");
  const slug = withoutExtension
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return slug || "san-pham";
}

export function buildProductImageFilename({
  originalName,
  contentType,
  token,
}: {
  originalName: string;
  contentType: string;
  token: string;
}) {
  const extension = getProductImageExtension(contentType);

  if (!extension) {
    return null;
  }

  return `${slugifyFileBase(originalName)}-${token}${extension}`;
}
