import React, { useEffect, useRef, useState } from 'react';
import { Mail, ChevronDown } from 'lucide-react';
import { PortfolioDesign, DEFAULT_PORTFOLIO_DESIGN } from '../lib/portfolio-settings';
import { VideoPlayer } from './VideoPlayer';
import { videoLink } from '../lib/video-links';

export const TRANSCODED_HERO_H264_PATH = '/assets/aistudio/2026-11-04-145207521_d7414d66.mp4';

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
    if (isKnownUnplayableHevcHeroUrl(url.href)) {
      return TRANSCODED_HERO_H264_PATH;
    }
    return url.href;
  } catch { return ''; }
}

export function PortfolioHero({ videoUrl = '', design = DEFAULT_PORTFOLIO_DESIGN, itemCount, categoryCount, videoCount, onContactArtist, showContact = true, showStats = true }: {
  videoUrl?: string; design?: PortfolioDesign; itemCount: number; categoryCount: number; videoCount: number; onContactArtist: () => void; showContact?: boolean; showStats?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const source = portfolioHeroVideoUrl(videoUrl);
  const hasVideo = Boolean(source) && !failed;

  useEffect(() => {
    setFailed(false);
    setRetryCount(0);
  }, [source]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reducedMotion) videoRef.current?.pause();
  }, [reducedMotion]);

  const resolvedSrc = retryCount > 0
    ? (source.includes('?') ? `${source}&_cb=${retryCount}` : `${source}?_cb=${retryCount}`)
    : source;

  return (
    <section className={`portfolio-hero ${hasVideo ? 'portfolio-hero--video bg-stone-950 text-white' : 'bg-stone-950 text-white'} min-h-[520px] h-[62svh] max-h-[680px] flex flex-col justify-center items-center relative overflow-hidden border-b border-stone-800 px-4 py-16 sm:py-24 text-center sm:px-6 lg:px-8 transition-colors`}>
      {hasVideo && (
        <>
          {videoLink(source) ? (
            !reducedMotion && (
              <div className="hero-embed absolute inset-0" aria-hidden="true">
                <VideoPlayer url={source} title="Βίντεο αρχικής Portfolio" autoPlay background />
              </div>
            )
          ) : (
            <video
              key={`${source}-${retryCount}`}
              ref={videoRef}
              src={resolvedSrc}
              autoPlay={!reducedMotion}
              muted
              loop
              playsInline
              preload="metadata"
              referrerPolicy="no-referrer"
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => {
                if (retryCount < 2) {
                  setRetryCount(c => c + 1);
                } else {
                  setFailed(true);
                }
              }}
            />
          )}
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" aria-hidden="true" />
        </>
      )}
      <div className="relative z-10 mx-auto w-full max-w-4xl space-y-4 my-auto">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-sm">
          {design.title}
        </h1>
        <p className="mx-auto max-w-2xl text-sm sm:text-base md:text-lg leading-relaxed text-stone-200 opacity-95 drop-shadow-xs">
          {design.subtitle}
        </p>
        {showContact && (
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onContactArtist}
              className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-stone-100 text-stone-900 border border-stone-200 px-6 py-2.5 text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Mail className="h-4 w-4 text-stone-900" />
              <span>{design.contactLabel}</span>
            </button>
          </div>
        )}
      </div>

      {/* Animated scroll down indicator for mobile & desktop */}
      <button
        type="button"
        onClick={() => {
          const el = document.getElementById('portfolio-catalog') || document.querySelector('.catalog-controls') || document.querySelector('.catalog-content');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 cursor-pointer transition group bg-transparent border-0 p-0 text-white/90 hover:text-white focus:outline-hidden"
        aria-label="Κύλιση για δημιουργίες — προβολή έργων"
      >
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest drop-shadow-md group-hover:scale-105 transition-transform">
          Κύλιση για δημιουργίες
        </span>
        <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg animate-bounce group-hover:bg-black/60 transition">
          <ChevronDown className="w-4 h-4 text-white drop-shadow" />
        </div>
      </button>
    </section>
  );
}
