// Stage-one proposal only. Not imported by the production UI or functions.
const PUBLIC_FIELDS = ['name', 'title', 'subtitle', 'description', 'category', 'collection', 'status', 'price', 'originalPrice', 'stock', 'stockCount', 'inStock', 'badge', 'weight', 'dimensions', 'materials', 'colors', 'shopOrder', 'showInNewCollection', 'shopFavorites', 'views', 'viewCount', 'createdAt'];
export function splitForReview(original: Record<string, any>) {
  const publicData: Record<string, any> = { showInShop: original.showInShop !== false && !original.isDeleted && !original.deletedAt };
  for (const key of PUBLIC_FIELDS) if (original[key] !== undefined) publicData[key] = original[key];
  // Never revive legacy images/imageUrl/src/videoUrl if explicitly hidden in mediaList.
  const blocked = new Set((original.mediaList || []).filter((m: any) => m.showInShop === false).flatMap((m: any) => [m.url, m.originalUrl]).filter(Boolean));
  const candidates = [...(original.mediaList || []), ...(original.images || []).map((url: string) => ({ url })), ...['imageUrl', 'src', 'videoUrl'].filter(k => original[k]).map(k => ({ url: original[k], type: k === 'videoUrl' ? 'video' : 'image' }))];
  const seen = new Set<string>();
  publicData.mediaList = candidates.filter(m => m.url && m.showInShop !== false && !blocked.has(m.url) && !seen.has(m.url) && seen.add(m.url)).map(m => ({ url: m.url, type: m.type === 'video' ? 'video' : 'image' }));
  const publicLinks = (original.postedPlatforms || []).filter((p: any) => p.showInShop !== false);
  const hiddenLinks = new Set((original.postedPlatforms || []).filter((p: any) => p.showInShop === false).map((p: any) => p.url));
  publicData.purchaseLinks = [...(original.purchaseLinks || original.productLinks || []), ...publicLinks].filter(p => p.url && !hiddenLinks.has(p.url)).map(p => ({ site: p.site || '', url: p.url }));
  // Lossless source is retained for admin adapters/backup; notes are mixed-use and pending review.
  const adminData = { original, notesReview: { state: 'pending', legacyValue: original.notes ?? '' } };
  return { publicData, adminData };
}
export function adminCompatibilityView(id: string, adminData: ReturnType<typeof splitForReview>['adminData']) {
  return { ...adminData.original, id };
}
