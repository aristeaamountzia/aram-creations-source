// Hero media helpers shared by the browser bundle and the Vite build.
// Keep this file free of React/Firebase imports so vite.config.ts can use it.

export const TRANSCODED_HERO_H264_PATH = '/assets/aistudio/2026-11-04-145207521_d7414d66.mp4';
export const SHOP_HERO_VIDEO_PATH = '/assets/hero/shop-hero-v1.mp4';

/** Locally hosted, web-optimised copies (faststart, no audio, small bitrate) of known heavy hero videos. */
const OPTIMIZED_HERO_VIDEOS: Array<{ match: RegExp; video: string }> = [
  { match: /jewelry(?:%2F|\/)1111111111\.mp4/i, video: SHOP_HERO_VIDEO_PATH },
];

/** First-frame posters, shown instantly while the video downloads. */
const HERO_POSTERS: Record<string, string> = {
  [SHOP_HERO_VIDEO_PATH]: '/assets/hero/shop-hero-v1.jpg',
  [TRANSCODED_HERO_H264_PATH]: '/assets/hero/portfolio-hero-v1.jpg',
};

export function isKnownUnplayableHevcHeroUrl(value: unknown): boolean {
  const text = typeof value === 'string' ? value.trim() : '';
  return /(?:1793907543677-2026-11-04-145207521|2026-11-04-145207521\.mp4|c3301d5fcf6bdfe2784ad9746726db20\.mp4)/i.test(text);
}

export function portfolioHeroVideoUrl(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  if (text.startsWith('/') && !text.startsWith('//') && /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(text)) {
    return text;
  }
  try {
    const url = new URL(text);
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    if (isKnownUnplayableHevcHeroUrl(url.href)) return TRANSCODED_HERO_H264_PATH;
    const optimized = OPTIMIZED_HERO_VIDEOS.find(entry => entry.match.test(url.href));
    if (optimized) return optimized.video;
    return url.href;
  } catch { return ''; }
}

export function heroPosterFor(resolvedVideoUrl: string): string | undefined {
  return HERO_POSTERS[resolvedVideoUrl.split(/[?#]/)[0]];
}

export interface HeroSnapshot {
  heroTitle: string;
  heroSubtitle: string;
  heroTitleSize: string;
  heroVideoUrl: string;
  portfolioHeroVideoUrl: string;
}

export const FALLBACK_HERO_SNAPSHOT: HeroSnapshot = {
  heroTitle: 'Χειροποίητες Δημιουργίες',
  heroSubtitle: 'Μοναδικές δημιουργίες από μια μεγάλη γκάμα υλικών και τεχνικών. Κάθε κομμάτι είναι φτιαγμένο στο χέρι με αγάπη.',
  heroTitleSize: 'text-3xl md:text-4xl',
  heroVideoUrl: SHOP_HERO_VIDEO_PATH,
  portfolioHeroVideoUrl: TRANSCODED_HERO_H264_PATH,
};

const HERO_KEYS = Object.keys(FALLBACK_HERO_SNAPSHOT) as Array<keyof HeroSnapshot>;
const CACHE_KEY = 'aram_hero_cache_v1';

export function pickHeroSnapshot(data: unknown, base: HeroSnapshot = FALLBACK_HERO_SNAPSHOT): HeroSnapshot {
  const source = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const result = { ...base };
  for (const key of HERO_KEYS) {
    if (typeof source[key] === 'string') result[key] = source[key] as string;
  }
  // Store resolved (optimised/local) video URLs so the shell and first render agree.
  result.heroVideoUrl = portfolioHeroVideoUrl(result.heroVideoUrl);
  result.portfolioHeroVideoUrl = portfolioHeroVideoUrl(result.portfolioHeroVideoUrl);
  return result;
}

// Build-time snapshot (set by vite.config.ts) used for the static HTML shell.
let buildSnapshot: HeroSnapshot = FALLBACK_HERO_SNAPSHOT;
export function setBuildHeroSnapshot(snapshot: HeroSnapshot) { buildSnapshot = snapshot; }
export function getBuildHeroSnapshot(): HeroSnapshot { return buildSnapshot; }

declare const __ARAM_HERO_SNAPSHOT__: HeroSnapshot | undefined;

/** Best hero data available synchronously: last-seen settings > build-time snapshot > fallback. */
export function initialHeroSnapshot(): HeroSnapshot {
  const baked = typeof __ARAM_HERO_SNAPSHOT__ !== 'undefined' && __ARAM_HERO_SNAPSHOT__
    ? pickHeroSnapshot(__ARAM_HERO_SNAPSHOT__)
    : FALLBACK_HERO_SNAPSHOT;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
    if (raw) return pickHeroSnapshot(JSON.parse(raw), baked);
  } catch {}
  return baked;
}

export function cacheHeroSnapshot(data: unknown) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(pickHeroSnapshot(data))); } catch {}
}

/** Fetches the public shop settings at build time so the HTML shell shows current hero content. */
export async function fetchHeroSnapshot(projectId: string | undefined): Promise<HeroSnapshot> {
  if (!projectId) return FALLBACK_HERO_SNAPSHOT;
  try {
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/settings/shop`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return FALLBACK_HERO_SNAPSHOT;
    const doc = await response.json() as { fields?: Record<string, { stringValue?: string }> };
    const flat: Record<string, string> = {};
    for (const [key, value] of Object.entries(doc.fields || {})) {
      if (typeof value?.stringValue === 'string') flat[key] = value.stringValue;
    }
    return pickHeroSnapshot(flat);
  } catch {
    return FALLBACK_HERO_SNAPSHOT;
  }
}
