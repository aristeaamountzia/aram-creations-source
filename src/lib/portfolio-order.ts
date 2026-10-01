export function sortPortfolio<T extends { id: string; portfolioOrder?: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ item, index })).sort((a, b) => {
    const first = Number.isFinite(a.item.portfolioOrder) ? a.item.portfolioOrder! : Number.MAX_SAFE_INTEGER;
    const second = Number.isFinite(b.item.portfolioOrder) ? b.item.portfolioOrder! : Number.MAX_SAFE_INTEGER;
    return first - second || a.index - b.index;
  }).map(row => row.item);
}
export function movePortfolio<T extends { id: string }>(items: T[], movingId: string, targetId: string): T[] {
  const from = items.findIndex(item => item.id === movingId), to = items.findIndex(item => item.id === targetId);
  if (from < 0 || to < 0 || from === to) return items;
  const result = [...items], [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}
