export const PUBLIC_JEWELRY_COLLECTION = 'shopCatalog';

const textFields = ['name', 'title', 'subtitle', 'description', 'notes', 'category', 'collection', 'status', 'badge', 'weight', 'dimensions', 'edition', 'condition', 'vintedUrl'] as const;
const numberFields = ['price', 'originalPrice', 'stock', 'stockCount', 'shopOrder', 'shopFavorites', 'shopViews', 'favorites', 'likes', 'views', 'viewCount', 'vintedFavorites', 'vintedViews'] as const;
const booleanFields = ['inStock', 'showInNewCollection', 'showAsHeroVideo', 'showInShop', 'isCustomOrder', 'vintedSynced'] as const;
const publicUrl = (value: unknown) => {
  if (typeof value !== 'string') return '';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? value : ''; } catch { return ''; }
};
const links = (value: unknown) => Array.isArray(value) ? value
  .filter(link => link && typeof link === 'object' && link.showInShop !== false && publicUrl(link.url))
  .map(link => ({ site: String(link.site || ''), url: publicUrl(link.url) })) : [];

/** Explicit customer-facing projection. Internal fields and original/private media never pass through. */
export function publicJewelryRecord(item: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of textFields) if (typeof item[key] === 'string') result[key] = item[key];
  for (const key of numberFields) if (item[key] != null && item[key] !== '' && Number.isFinite(Number(item[key]))) result[key] = Number(item[key]);
  for (const key of booleanFields) if (typeof item[key] === 'boolean') result[key] = item[key];
  for (const key of ['materials', 'colors']) if (Array.isArray(item[key])) result[key] = item[key].filter((value: unknown) => typeof value === 'string');
  for (const key of ['createdAt', 'updatedAt', 'showInNewCollectionAt']) {
    const value = item[key];
    if (typeof value?.toMillis === 'function' && Number.isFinite(value.toMillis())) result[key] = value;
    else if (value && Number.isInteger(value.seconds) && Number.isInteger(value.nanoseconds)) result[key] = { seconds: value.seconds, nanoseconds: value.nanoseconds };
    else if (typeof value === 'string' && Number.isFinite(Date.parse(value))) result[key] = value;
  }

  const media = Array.isArray(item.mediaList) && item.mediaList.length
    ? item.mediaList.filter((entry: any) => entry && entry.showInShop !== false && publicUrl(entry.url))
        .map((entry: any) => ({ url: publicUrl(entry.url), type: entry.type === 'video' || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(entry.url) ? 'video' : 'image', ...(typeof entry.title === 'string' ? { title: entry.title } : {}) }))
    : [...new Set([item.imageUrl, item.src, item.videoUrl, ...(Array.isArray(item.images) ? item.images : [])].map(publicUrl).filter(Boolean))]
        .map(url => ({ url, type: url === item.videoUrl || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || (url === (item.imageUrl || item.src) && item.fileType === 'video') ? 'video' : 'image' }));
  const primary = media.find((entry: any) => entry.url === item.imageUrl) || media[0];
  result.mediaList = media;
  result.imageUrl = primary?.url || '';
  result.src = result.imageUrl;
  result.fileType = primary?.type || 'image';
  result.images = media.filter((entry: any) => entry.type !== 'video').map((entry: any) => entry.url);
  result.purchaseLinks = links(item.purchaseLinks || item.productLinks);
  result.postedPlatforms = links(item.postedPlatforms);
  return result;
}
