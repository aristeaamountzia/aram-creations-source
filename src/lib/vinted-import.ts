import { isVintedHost } from './vinted-url';

type VintedImportLike = Record<string, any>;

export interface VintedDuplicateMatch {
  item: VintedImportLike;
  key: string;
  reason: 'listing' | 'media';
}

function candidateUrls(item: VintedImportLike): string[] {
  const links = [
    ...(Array.isArray(item.purchaseLinks) ? item.purchaseLinks : []),
    ...(Array.isArray(item.productLinks) ? item.productLinks : []),
    ...(Array.isArray(item.postedPlatforms) ? item.postedPlatforms : []),
  ];
  return [item.vintedUrl, item.sourceUrl, ...links.map(link => link?.url)]
    .map(value => String(value || '').trim())
    .filter(Boolean);
}

function listingIdFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !isVintedHost(url.hostname)) return null;
    return url.pathname.match(/^\/items\/(\d+)(?:-|\/|$)/i)?.[1] || null;
  } catch {
    return null;
  }
}

function directListingId(item: VintedImportLike): string | null {
  const vintedId = String(item.vintedId || '').trim();
  if (/^\d+$/.test(vintedId)) return vintedId;
  const belongsToVinted = String(item.sourcePlatform || '').toLowerCase() === 'vinted'
    || candidateUrls(item).some(url => listingIdFromUrl(url));
  const sourceId = String(item.sourceId || '').trim();
  return belongsToVinted && /^\d+$/.test(sourceId) ? sourceId : null;
}

function mediaUrls(item: VintedImportLike): string[] {
  const media = [
    ...(Array.isArray(item.mediaList) ? item.mediaList : []),
    ...(Array.isArray(item.media) ? item.media : []),
  ];
  return [
    item.imageUrl,
    item.src,
    ...(Array.isArray(item.images) ? item.images : []),
    ...media.map(entry => typeof entry === 'string' ? entry : entry?.url),
  ].map(value => String(value || '').trim()).filter(Boolean);
}

function vintedMediaKey(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || !/^images\d*\.vinted\.net$/.test(host)) return null;
    return `media:${host}${decodeURIComponent(url.pathname).toLowerCase()}`;
  } catch {
    return null;
  }
}

export function vintedImportIdentityKeys(item: VintedImportLike): string[] {
  const listingIds = new Set<string>();
  const directId = directListingId(item);
  if (directId) listingIds.add(directId);
  for (const url of candidateUrls(item)) {
    const id = listingIdFromUrl(url);
    if (id) listingIds.add(id);
  }

  const keys = [...listingIds].map(id => `listing:${id}`);
  for (const url of mediaUrls(item)) {
    const key = vintedMediaKey(url);
    if (key) keys.push(key);
  }
  return [...new Set(keys)];
}

export function findVintedImportDuplicate(
  candidate: VintedImportLike,
  existingItems: VintedImportLike[],
): VintedDuplicateMatch | null {
  const candidateKeys = new Set(vintedImportIdentityKeys(candidate));
  if (!candidateKeys.size) return null;

  for (const item of existingItems) {
    for (const key of vintedImportIdentityKeys(item)) {
      if (!candidateKeys.has(key)) continue;
      return {
        item,
        key,
        reason: key.startsWith('listing:') ? 'listing' : 'media',
      };
    }
  }
  return null;
}
