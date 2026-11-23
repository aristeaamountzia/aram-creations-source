import { languageSwitchPath, publicPath } from '../lib/public-locale';
import { usePublicLanguage } from "../lib/use-public-language";
import React, { useEffect, useRef, useState } from 'react';
import { SectionMode } from '../types';
import { ShoppingBag, Mail } from 'lucide-react';
import { DesignStudio } from '../lib/design-studio';

interface HeaderProps {
  currentMode: SectionMode;
  onSelectMode: (mode: SectionMode) => void;
  cartCount: number;
  onOpenCart: () => void;
  onContactArtist: () => void;
  design?: DesignStudio;
}

export const Header: React.FC<HeaderProps> = ({ currentMode, onSelectMode, cartCount, onOpenCart, onContactArtist, design }) => {
  const { locale, t } = usePublicLanguage();
  const headerRef = useRef<HTMLElement>(null);
  const isPortfolio = currentMode === 'portfolio';

  const section = isPortfolio ? 'portfolio' : 'shop';
  const alternate = locale === 'en' ? 'el' : 'en';
  const [, setLocation] = useState(() => window.location.href);
  const { search, hash } = window.location;
  const languageHref = languageSwitchPath(alternate, section, search, hash);

  useEffect(() => {
    const syncLocation = () => setLocation(window.location.href);
    window.addEventListener('hashchange', syncLocation);
    window.addEventListener('popstate', syncLocation);
    return () => {
      window.removeEventListener('hashchange', syncLocation);
      window.removeEventListener('popstate', syncLocation);
    };
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const updateHeight = () => document.documentElement.style.setProperty('--aram-header-height', `${header.getBoundingClientRect().height}px`);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <header ref={headerRef} className="site-header sticky top-0 z-40 border-b" data-section={isPortfolio ? 'portfolio' : 'shop'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="header-row">
          <button id="header-brand" type="button" onClick={() => { onSelectMode('shop'); window.scrollTo({ top: 0, behavior: 'instant' }); }}
            aria-label={t("Aram Creations, αρχική σελίδα", "Aram Creations home")}
            className="header-brand flex min-w-0 items-center gap-2.5 text-left cursor-pointer">
            <img src={isPortfolio ? "/logo-portfolio.png" : "/logo.png"} alt="Aram Creations"
              referrerPolicy="no-referrer"
              decoding="async"
              width="36" height="48"
              className="h-10 w-auto sm:h-11 shrink-0 object-contain"
              onError={(event) => {
                const img = event.currentTarget;
                const fallback = isPortfolio ? '/logo-portfolio.svg' : '/logo.svg';
                if (!img.src.endsWith(fallback)) img.src = fallback;
              }} />
            <span className="min-w-0">
              <span className="brand-name block text-lg sm:text-xl font-semibold tracking-tight">{design?.brandName || 'aram.creations'}</span>
            </span>
          </button>
          <nav aria-label={t("Shop και Portfolio", "Shop and Portfolio")} className="section-entrances">
            <a id="nav-btn-shop" href={publicPath(locale)}
              aria-current={currentMode === 'shop' ? 'page' : undefined} className="section-entrance entrance-shop cursor-pointer">
              <span>{(locale === 'el' && design?.shopNavLabel) || 'Shop'}</span>
            </a>
            <a id="nav-btn-portfolio" href={publicPath(locale, "portfolio")}
              aria-current={currentMode === 'portfolio' ? 'page' : undefined} className="section-entrance entrance-portfolio cursor-pointer">
              <span>{(locale === 'el' && design?.portfolioNavLabel) || 'Portfolio'}</span>
            </a>
          </nav>
          <div className="header-actions flex items-center gap-1">
          <a href={languageHref} hrefLang={alternate} lang={alternate} aria-label={alternate === 'en' ? 'English' : 'Ελληνικά'} className="header-action grid min-h-11 min-w-9 place-items-center rounded-lg border text-xs font-semibold">
            {alternate === 'en' ? 'EN' : 'ΕΛ'}
          </a>
          {isPortfolio ? (
            <button type="button" onClick={onContactArtist} aria-label={t("Επικοινωνία με την Aram Creations", "Contact Aram Creations")}
              className="header-action flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium cursor-pointer">
              <Mail className="h-4 w-4" /><span className="hidden sm:inline">{(locale === 'el' && design?.contactLabel) || t("Επικοινωνία", "Contact")}</span>
            </button>
          ) : (
            <button type="button" onClick={onOpenCart}
              aria-label={t(`Προβολή καλαθιού${cartCount ? `, ${cartCount} προϊόντα` : ''}`, `View bag${cartCount ? `, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}` : ''}`)}
              className="header-action flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium cursor-pointer">
              <ShoppingBag className="h-4 w-4" /><span className="hidden sm:inline">{(locale === 'el' && design?.cartLabel) || t("Καλάθι", "Bag")}</span>
              {cartCount > 0 && <span className="rounded-full bg-stone-900 text-white w-5 h-5 text-[10px] flex items-center justify-center">{cartCount}</span>}
            </button>
          )}
          </div>
        </div>
      </div>
    </header>
  );
};
