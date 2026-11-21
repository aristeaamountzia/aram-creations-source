import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Pause } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { heroPosterFor } from '../../lib/hero-media';
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

export function CollectionHero({ collection, title, description, videoUrl, appearance, preview = false, children }: CollectionHeroProps) {
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const target = collection === 'shop' ? 'shop-catalog' : 'portfolio-catalog';
  const titleId = useId();
  const isShop = collection === 'shop';
  const poster = isShop ? '/assets/hero/shop-gallery.webp' : heroPosterFor(videoUrl) || '/assets/hero/portfolio-hero-v1.jpg';
  const externalVideo = videoLink(videoUrl);
  const autoplay = Boolean(videoUrl) && !preview && !reducedMotion && !paused && !failed;

  return (
    <section className={`collection-hero gallery-hero gallery-hero--${collection}${preview ? ' gallery-hero--preview' : ''}`}
      aria-labelledby={titleId} style={galleryHeroCss(appearance) as CSSProperties}>
      <div className="collection-hero-copy">
        {preview ? <h3 className="collection-title" id={titleId}>{title}</h3> : <h1 className="collection-title" id={titleId}>{title}</h1>}
        {description && <p className="collection-intro">{description}</p>}
        <div className="collection-hero-actions">
          {preview ? <span className="studio-primary">{isShop ? 'Δείτε τη συλλογή' : 'Δείτε τα έργα'}</span> : <a className="studio-primary" href={`#${target}`} onClick={(event) => {
            const catalog = document.getElementById(target);
            if (!catalog) return;
            event.preventDefault();
            catalog.focus({ preventScroll: true });
            catalog.scrollIntoView({ block: 'start' });
          }}>{isShop ? 'Δείτε τη συλλογή' : 'Δείτε τα έργα'}</a>}
          {children}
          {autoplay && (playing || externalVideo) && (
            <button className="gallery-motion-pause" type="button" aria-label="Παύση βίντεο" onClick={(event) => {
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
            <VideoPlayer url={videoUrl} title={`Βίντεο ${collection}`} autoPlay background />
          </div>
        ) : (
          <video src={videoUrl} autoPlay muted loop playsInline aria-hidden="true"
            className={playing ? undefined : 'opacity-0'} onPlaying={() => setPlaying(true)}
            onError={() => { setPlaying(false); setFailed(true); }} />
        ))}
      </div>
    </section>
  );
}
