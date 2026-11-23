import { usePublicLanguage } from "../../lib/use-public-language";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Pause } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { FALLBACK_HERO_SNAPSHOT, heroPosterFor } from '../../lib/hero-media';
import { videoLink } from '../../lib/video-links';
import { VideoPlayer } from '../VideoPlayer';
import { galleryHeroCss, type HeroAppearance } from '../../lib/hero-appearance';

interface CollectionHeroProps {
  collection: 'shop' | 'portfolio';
  title: string;
  description: string;
  videoUrl: string;
  appearance?: HeroAppearance;
  preview?: boolean;
  children?: ReactNode;
}

function startMutedVideo(video: HTMLVideoElement) {
  video.muted = true;
  video.defaultMuted = true;
  if (video.paused) void video.play().catch(() => {});
}

export function CollectionHero({ collection, title, description, videoUrl, appearance, preview = false, children }: CollectionHeroProps) {
  const { t } = usePublicLanguage();
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const target = collection === 'shop' ? 'shop-catalog' : 'portfolio-catalog';
  const titleId = useId();
  const isShop = collection === 'shop';
  const poster = isShop ? '/assets/hero/shop-gallery.webp' : heroPosterFor(videoUrl) || '/assets/hero/portfolio-hero-v1.jpg';
  const fallback = isShop ? FALLBACK_HERO_SNAPSHOT.heroVideoUrl : FALLBACK_HERO_SNAPSHOT.portfolioHeroVideoUrl;
  const source = useFallback ? fallback : videoUrl;
  const externalVideo = videoLink(source);
  const autoplay = Boolean(videoUrl) && !preview && !reducedMotion && !paused && !failed;
  useEffect(() => {
    if (!autoplay || externalVideo) return;
    const resume = () => {
      if (video.current && !document.hidden) startMutedVideo(video.current);
    };
    resume();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', resume);
    // Some browser settings require a gesture even for muted playback.
    window.addEventListener('pointerdown', resume, { passive: true });
    window.addEventListener('keydown', resume);
    return () => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };
  }, [autoplay, source, Boolean(externalVideo)]);

  return (
    <section className={`collection-hero gallery-hero gallery-hero--${collection}${preview ? ' gallery-hero--preview' : ''}`}
      aria-labelledby={titleId} style={galleryHeroCss(appearance) as CSSProperties}>
      <div className="collection-hero-copy">
        {preview ? <h3 className="collection-title" id={titleId}>{title}</h3> : <h1 className="collection-title" id={titleId}>{title}</h1>}
        {description && <p className="collection-intro">{description}</p>}
        <div className="collection-hero-actions">
          {preview ? <span className="studio-primary">{isShop ? t("Δείτε τη συλλογή", "Explore the collection") : t("Δείτε τα έργα", "View the work")}</span> : <a className="studio-primary" href={`#${target}`} onClick={(event) => {
            const catalog = document.getElementById(target);
            if (!catalog) return;
            event.preventDefault();
            catalog.focus({ preventScroll: true });
            catalog.scrollIntoView({ block: 'start' });
          }}>{isShop ? t("Δείτε τη συλλογή", "Explore the collection") : t("Δείτε τα έργα", "View the work")}</a>}
          {children}
          {autoplay && (playing || externalVideo) && (
            <button className="gallery-motion-pause" type="button" aria-label={t("Παύση βίντεο", "Pause video")} onClick={(event) => {
              setPaused(true);
              event.currentTarget.closest('section')?.querySelector<HTMLElement>('.studio-primary')?.focus();
            }}>
              <Pause size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div className="collection-hero-media">
        <img src={poster} alt="" fetchPriority="high" decoding="async" />
        {autoplay && (externalVideo ? (
          <div className="hero-embed absolute inset-0">
            <VideoPlayer url={videoUrl} title={t(`Βίντεο ${collection}`, `${collection} video`)} autoPlay background />
          </div>
        ) : (
          <video key={source} ref={video} src={source} poster={poster} autoPlay muted loop playsInline preload="auto" aria-hidden="true"
            onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onCanPlay={event => startMutedVideo(event.currentTarget)}
            onError={() => {
              setPlaying(false);
              if (source !== fallback) setUseFallback(true);
              else setFailed(true);
            }} />
        ))}
      </div>
    </section>
  );
}
