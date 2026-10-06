import { ArtItem, ArtMediaItem } from '../types';

export function videoLink(raw: string) {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  let id = '';
  if (host === 'youtu.be') id = url.pathname.split('/')[1] || '';
  if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) {
    id = url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/)?.[1] || '';
  }
  if (/^[\w-]{11}$/.test(id)) return { provider: 'youtube', id, embed: `https://www.youtube-nocookie.com/embed/${id}`, original: `https://www.youtube.com/watch?v=${id}` };
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    id = url.pathname.match(/(?:\/video)?\/(\d+)(?:\/|$)/)?.[1] || '';
    if (id) return { provider: 'vimeo', id, embed: `https://player.vimeo.com/video/${id}${url.searchParams.has('h') ? '?h=' + encodeURIComponent(url.searchParams.get('h')!) : ''}`, original: url.href };
  }
  if (host === 'drive.google.com') {
    id = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || url.searchParams.get('id') || '';
    if (id) return { provider: 'drive', id, embed: `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`, original: url.href };
  }
  return null;
}

export function isVideoUrl(url: string) {
  return Boolean(videoLink(url)) || /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(url);
}

export function portfolioMedia(item: Partial<ArtItem> & { imageUrl?: string; fileType?: string }): ArtMediaItem[] {
  const list: ArtMediaItem[] = (Array.isArray(item.mediaList) ? item.mediaList : []).filter(m => m?.url).map(m => ({ ...m, type: m.type === 'video' || isVideoUrl(m.url) ? 'video' : 'image' }));
  if (!list.length && (item.imageUrl || item.image)) {
    const url = item.imageUrl || item.image!;
    list.push({ url, type: item.fileType === 'video' || isVideoUrl(url) ? 'video' : 'image', title: item.title });
  }
  if (item.videoUrl && !list.some(m => m.url === item.videoUrl || (videoLink(m.url)?.embed && videoLink(m.url)?.embed === videoLink(item.videoUrl!)?.embed))) list.push({ url: item.videoUrl, type: 'video', title: item.title });
  return list;
}
