export const drinkOptionLevels = [0, 25, 50, 75, 100] as const;

export type DrinkOptionLevel = (typeof drinkOptionLevels)[number];

const drinkOptionLevelSet = new Set<number>(drinkOptionLevels);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

export function normalizeDrinkOptionLevel(value: unknown) {
  const level =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(level) || !drinkOptionLevelSet.has(level)) {
    return null;
  }

  return level as DrinkOptionLevel;
}

export function isCustomizableDrink(categoryName: string, productName: string) {
  const normalizedCategory = normalizeText(categoryName);
  const normalizedProduct = normalizeText(productName);

  if (normalizedCategory.includes("banh")) {
    return false;
  }

  return [
    "ca phe",
    "tra",
    "tra sua",
    "sinh to",
    "nuoc ep",
    "do uong",
    "cacao",
    "sua tuoi",
    "set tra",
  ].some(
    (keyword) =>
      normalizedCategory.includes(keyword) || normalizedProduct.includes(keyword),
  );
}

export function formatOrderItemNoteWithOptions({
  iceLevel,
  note,
  sugarLevel,
}: {
  iceLevel: DrinkOptionLevel | null;
  note: string;
  sugarLevel: DrinkOptionLevel | null;
}) {
  return [
    sugarLevel === null ? null : `Đường ${sugarLevel}%`,
    iceLevel === null ? null : `Đá ${iceLevel}%`,
    note.trim() || null,
  ]
    .filter((item): item is string => Boolean(item))
    .join(" · ");
}
