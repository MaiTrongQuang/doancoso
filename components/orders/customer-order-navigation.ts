export function getCategoryContextIds(
  ids: string[],
  activeId: string,
  radius = 1,
) {
  if (ids.length === 0) {
    return [];
  }

  const activeIndex = Math.max(0, ids.indexOf(activeId));
  const start = Math.max(0, activeIndex - radius);
  const end = Math.min(ids.length, activeIndex + radius + 1);

  return ids.slice(start, end);
}
