import React, { useEffect, useRef, useState } from 'react';
import { Mail, Pause, Play } from 'lucide-react';

export function portfolioHeroVideoUrl(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  try {
    const url = new URL(text);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

export function PortfolioHero({ videoUrl = '', itemCount, categoryCount, videoCount, onContactArtist, showContact = true, showStats = true }: {
  videoUrl?: string; itemCount: number; categoryCount: number; videoCount: number; onContactArtist: () => void; showContact?: boolean; showStats?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const source = portfolioHeroVideoUrl(videoUrl);
  const hasVideo = Boolean(source) && !failed;
  useEffect(() => { setFailed(false); setPaused(true); }, [source]);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (reducedMotion) videoRef.current?.pause();
  }, [reducedMotion]);
  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { try { await video.play(); } catch { setPaused(true); } }
    else video.pause();
  };
  return <section className="portfolio-hero relative overflow-hidden border-b border-[#e5def3] bg-white px-4 py-16 text-center sm:px-6 sm:py-20">
    {hasVideo && <>
      <video key={source} ref={videoRef} src={source} autoPlay={!reducedMotion} muted loop playsInline preload="metadata"
        aria-hidden="true" className="absolute inset-0 h-full w-full object-cover"
        onError={() => setFailed(true)} onLoadedData={event => setPaused(event.currentTarget.paused)} onPause={() => setPaused(true)} onPlay={() => setPaused(false)} />
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
    </>}
    <div className="relative mx-auto max-w-4xl">
      <h1 className={`mt-4 text-3xl font-bold tracking-tight md:text-4xl ${hasVideo ? 'text-white' : 'text-[#252134]'}`}>Έργα & Δημιουργίες</h1>
      <p className={`mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base ${hasVideo ? 'text-white' : 'text-[#675f79]'}`}>
        Γλυπτική, σχέδιο, φωτογραφία και ψηφιακές δημιουργίες. Κάθε έργο έχει τη δική του ιστορία.
      </p>
      {showStats && <div className="mt-5 flex flex-wrap justify-center gap-2.5 text-[11px] font-bold">
        {[`${itemCount} έργα`, `${categoryCount} κατηγορίες`, `${videoCount} έργα με βίντεο`].map(label => <span key={label}
          className={`rounded-full border px-3.5 py-1 ${hasVideo ? 'border-white/30 bg-white/10 text-white' : 'border-[#e5def3] bg-[#f7f5fd] text-[#675f79]'}`}>{label}</span>)}
      </div>}
      {showContact && <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onContactArtist} className="flex items-center gap-2 rounded-lg bg-[#6253ae] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#544695] sm:text-sm">
          <Mail className="h-4 w-4" /><span>Ανάθεση Έργου / Επικοινωνία</span>
        </button>
      </div>}
    </div>
    {hasVideo && <button type="button" onClick={togglePlayback} aria-label={paused ? 'Αναπαραγωγή βίντεο Portfolio' : 'Παύση βίντεο Portfolio'}
      className="absolute bottom-3 right-3 flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/40 bg-black/40 p-2 text-white">
      {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
    </button>}
  </section>;
}
