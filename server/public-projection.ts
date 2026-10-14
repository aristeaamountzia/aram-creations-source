import { createHash } from 'node:crypto';
import { wire } from '../src/lib/catalog-wire';
const TEXT = ['name', 'title', 'subtitle', 'description', 'category', 'collection', 'status', 'weight', 'dimensions', 'condition', 'edition', 'badge'];
const NUMBERS = ['price', 'originalPrice', 'stock', 'stockCount', 'shopOrder', 'shopFavorites', 'favorites', 'likes', 'views', 'viewCount', 'vintedViews', 'vintedFavorites'];
export const notesSourceHash = (data: any) => createHash('sha256').update(JSON.stringify(wire({ notes: data.notes, description: data.description }))).digest('hex');
export function visible(data: any) { return !!data && data.showInShop !== false && !data.isDeleted && !data.deletedAt; }
export function publicMediaCandidates(data: any) {
  const list = Array.isArray(data.mediaList) ? data.mediaList : [];
  const identity = (raw: string) => {
    try { const url = new URL(raw); if (url.protocol === 'gs:') return `${url.host}${decodeURIComponent(url.pathname)}`; const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/); if (match) return `${decodeURIComponent(match[1])}/${decodeURIComponent(match[2])}`; return raw; } catch { return raw; }
  };
  const hidden = new Set(list.flatMap(m => [m?.originalUrl, ...(m?.showInShop === false ? [m.url] : [])]).filter(Boolean).map(identity));
  const candidates = [...list, ...(Array.isArray(data.images) ? data.images : []).map(url => ({ url })), ...['imageUrl', 'src', 'image', 'videoUrl'].filter(k => typeof data[k] === 'string').map(k => ({ url: data[k], type: k === 'videoUrl' ? 'video' : data.fileType }))];
  const seen = new Set<string>();
  return candidates.filter(m => m && typeof m.url === 'string' && m.showInShop !== false && !hidden.has(identity(m.url)) && !seen.has(identity(m.url)) && seen.add(identity(m.url))).map(m => ({ url: m.url, type: m.type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(m.url) ? 'video' : 'image' }));
}
export function projectProduct(data: any, media: { url: string; type: string }[] = [], portfolio = false) {
  if (!visible(data)) return null;
  const result: Record<string, any> = { showInShop: true, schemaVersion: 1 };
  for (const field of [...TEXT, ...(portfolio ? ['year', 'medium', 'categoryTitle', 'origin'] : [])]) if (typeof data[field] === 'string') result[field] = data[field];
  for (const field of [...NUMBERS, ...(portfolio ? ['portfolioOrder'] : [])]) if (typeof data[field] === 'number' && Number.isFinite(data[field])) result[field] = data[field];
  for (const field of ['materials', 'colors']) if (Array.isArray(data[field])) result[field] = data[field].filter((v: any) => typeof v === 'string');
  for (const field of ['inStock', 'isCustomOrder', 'showInNewCollection', 'featured', 'inquiryOnly']) if (typeof data[field] === 'boolean') result[field] = data[field];
  if (typeof data.customInscription === 'string') result.customInscription = data.customInscription;
  if (data.notesReview?.state === 'approved' && data.notesReview.sourceHash === notesSourceHash(data) && typeof data.notesReview.publicDescription === 'string') result.description = data.notesReview.publicDescription;
  result.mediaList = media.map(m => ({ url: m.url, type: m.type }));
  const first = media[0]; if (first) { result.imageUrl = first.url; result.fileType = first.type; if (portfolio) result.image = first.url; }
  const hiddenSites = new Set((Array.isArray(data.postedPlatforms) ? data.postedPlatforms : []).filter((p: any) => p?.showInShop === false).map((p: any) => String(p.site || '').toLowerCase()));
  const hidden = new Set((Array.isArray(data.postedPlatforms) ? data.postedPlatforms : []).filter((p: any) => p?.showInShop === false).map((p: any) => p.url));
  result.purchaseLinks = (Array.isArray(data.purchaseLinks) ? data.purchaseLinks : Array.isArray(data.productLinks) ? data.productLinks : []).filter((p: any) => p && p.showInShop !== false && !hiddenSites.has(String(p.site || '').toLowerCase()) && typeof p.url === 'string' && /^https:\/\//i.test(p.url) && !hidden.has(p.url)).map((p: any) => ({ site: typeof p.site === 'string' ? p.site : '', url: p.url }));
  return result;
}
const SETTINGS_TEXT = ['fontFamily', 'primaryColor', 'bgColor', 'textColor', 'heroBgColor', 'heroTitleColor', 'heroSubtitleColor', 'heroTitleSize', 'borderRadius', 'heroTitle', 'heroSubtitle', 'announcementText', 'announcementLink', 'catalogDensity'];
export function projectSettings(data: any, media: Record<string, string> = {}) {
  if (!data) return null;
  const result: any = { schemaVersion: 1, ...media };
  for (const key of SETTINGS_TEXT) if (typeof data[key] === 'string') result[key] = data[key];
  result.announcementEnabled = data.announcementEnabled === true;
  result.categoryOrder = (Array.isArray(data.categoryOrder) ? data.categoryOrder : []).filter((v: any) => typeof v === 'string');
  for (const key of ['colorPalette', 'fallbackLinks']) result[key] = Object.fromEntries(Object.entries(data[key] || {}).filter(([, v]) => typeof v === 'string' && (key === 'colorPalette' ? /^#[0-9a-f]{3,8}$/i.test(v as string) : /^https:\/\//i.test(v as string))));
  if (data.portfolioDesign) {
    const design = data.portfolioDesign, clean: any = {};
    for (const key of ['title', 'subtitle', 'contactLabel']) if (typeof design[key] === 'string') clean[key] = design[key];
    clean.categories = (Array.isArray(design.categories) ? design.categories : []).map((v: any) => ({ id: String(v.id || ''), title: String(v.title || ''), description: String(v.description || '') }));
    clean.statuses = (Array.isArray(design.statuses) ? design.statuses : []).map((v: any) => ({ id: String(v.id || ''), label: String(v.label || '') }));
    clean.materials = (Array.isArray(design.materials) ? design.materials : []).filter((v: any) => typeof v === 'string');
    clean.labels = Object.fromEntries(['category', 'status', 'medium', 'dimensions', 'year'].filter(k => typeof design.labels?.[k] === 'string').map(k => [k, design.labels[k]]));
    result.portfolioDesign = clean;
  }
  return result;
}
