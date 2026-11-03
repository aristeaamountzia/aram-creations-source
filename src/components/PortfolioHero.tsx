import React, { useEffect, useRef, useState } from 'react';
import { Mail, ChevronDown } from 'lucide-react';
import { PortfolioDesign, DEFAULT_PORTFOLIO_DESIGN } from '../lib/portfolio-settings';
import { VideoPlayer } from './VideoPlayer';
import { videoLink } from '../lib/video-links';

export function portfolioHeroVideoUrl(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  try {
    const url = new URL(text);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

export function PortfolioHero({ videoUrl = '', design = DEFAULT_PORTFOLIO_DESIGN, itemCount, categoryCount, videoCount, onContactArtist, showContact = true, showStats = true }: {
  videoUrl?: string; design?: PortfolioDesign; itemCount: number; categoryCount: number; videoCount: number; onContactArtist: () => void; showContact?: boolean; showStats?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const source = portfolioHeroVideoUrl(videoUrl);
  const hasVideo = Boolean(source) && !failed;
  useEffect(() => { setFailed(false); }, [source]);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (reducedMotion) videoRef.current?.pause();
  }, [reducedMotion]);
  return (
    <section className={`portfolio-hero ${hasVideo ? 'portfolio-hero--video bg-stone-950 text-white' : 'bg-white text-[#252134]'} min-h-[58vh] sm:min-h-[68vh] flex flex-col justify-center items-center relative overflow-hidden border-b border-[#e5def3] px-4 py-16 sm:py-24 text-center sm:px-6 lg:px-8`}>
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
              key={source}
              ref={videoRef}
              src={source}
              autoPlay={!reducedMotion}
              muted
              loop
              playsInline
              preload="metadata"
              referrerPolicy="no-referrer"
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setFailed(true)}
            />
          )}
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" aria-hidden="true" />
        </>
      )}
      <div className="relative z-10 mx-auto w-full max-w-4xl space-y-4 my-auto">
        <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight ${hasVideo ? 'text-white' : 'text-[#252134]'}`}>
          {design.title}
        </h1>
        <p className={`mx-auto max-w-2xl text-sm sm:text-base md:text-lg leading-relaxed ${hasVideo ? 'text-white/90' : 'text-[#675f79]'}`}>
          {design.subtitle}
        </p>
        {showStats && (
          <div className="pt-2 flex flex-wrap justify-center gap-2.5 text-[11px] font-bold">
            {[`${itemCount} έργα`, `${categoryCount} κατηγορίες`, `${videoCount} έργα με βίντεο`].map(label => (
              <span
                key={label}
                className={`rounded-full border px-3.5 py-1 ${hasVideo ? 'border-white/20 bg-white/10 text-white backdrop-blur-xs' : 'border-[#e5def3] bg-[#f7f5fd] text-[#675f79]'}`}
              >
                {label}
              </span>
            ))}
          </div>
        )}
        {showContact && (
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onContactArtist}
              className="flex items-center gap-2 rounded-xl bg-[#6253ae] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#544695] sm:text-sm shadow-md"
            >
              <Mail className="h-4 w-4" /><span>{design.contactLabel}</span>
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
        className={`absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 cursor-pointer transition group focus:outline-hidden ${
          hasVideo ? 'text-white/90 hover:text-white' : 'text-[#252134] hover:text-stone-900'
        }`}
        aria-label="Κύλιση προς τα κάτω για προβολή έργων"
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
