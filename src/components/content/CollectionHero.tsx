import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Pause, Play } from 'lucide-react';
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
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const target = collection === 'shop' ? 'shop-catalog' : 'portfolio-catalog';
  const titleId = useId();
  const isShop = collection === 'shop';
  const poster = isShop ? '/assets/hero/shop-gallery.webp' : heroPosterFor(videoUrl) || '/assets/hero/portfolio-hero-v1.jpg';
  const externalVideo = videoLink(videoUrl);

  return (
    <section className={`collection-hero gallery-hero gallery-hero--${collection}${preview ? ' gallery-hero--preview' : ''}`}
      aria-labelledby={titleId} style={galleryHeroCss(appearance) as CSSProperties}>
      <div className="collection-hero-copy">
        {!isShop && <p className="collection-kicker">Aram Creations / Portfolio</p>}
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
        </div>
      </div>
      <div className="collection-hero-media">
        <img src={poster} alt="" fetchPriority="high" decoding="async" />
        {playing && !failed && (externalVideo ? (
          <div className="hero-embed absolute inset-0">
            <VideoPlayer url={videoUrl} title={`Βίντεο ${collection}`} autoPlay background />
          </div>
        ) : (
          <video src={videoUrl} autoPlay muted loop playsInline aria-label={`Βίντεο ${collection}`}
            onError={() => { setPlaying(false); setFailed(true); }} />
        ))}
        {videoUrl && !failed && (
          <button className="collection-video-toggle" type="button" onClick={() => setPlaying(value => !value)}
            aria-label={playing ? 'Παύση βίντεο' : 'Αναπαραγωγή βίντεο'}>
            {playing ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
          </button>
        )}
      </div>
    </section>
  );
}
