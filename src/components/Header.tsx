import React, { useEffect, useRef } from 'react';
import { SectionMode } from '../types';
import { ShoppingBag, Palette, Mail } from 'lucide-react';

interface HeaderProps {
  currentMode: SectionMode;
  onSelectMode: (mode: SectionMode) => void;
  cartCount: number;
  onOpenCart: () => void;
  onContactArtist: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentMode, onSelectMode, cartCount, onOpenCart, onContactArtist }) => {
  const headerRef = useRef<HTMLElement>(null);
  const isPortfolio = currentMode === 'portfolio';

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
          <button id="header-brand" type="button" onClick={() => onSelectMode(isPortfolio ? 'portfolio' : 'shop')}
            aria-label={`Aram Creations — ${isPortfolio ? 'Portfolio' : 'επιστροφή στο Shop'}`}
            className="header-brand flex min-w-0 items-center gap-2.5 text-left">
            <img src={isPortfolio ? '/logo-portfolio.png' : '/logo.png'} alt="Aram Creations"
              className="h-11 w-8 sm:h-12 sm:w-9 shrink-0 object-contain"
              onError={(event) => { const img = event.currentTarget; if (!img.src.endsWith('/logo.svg')) img.src = '/logo.svg'; }} />
            <span className="min-w-0">
              <span className="brand-name block text-lg sm:text-xl font-semibold tracking-tight">aram.creations</span>
              <span className="brand-caption block text-[9px] sm:text-[10px] uppercase tracking-wide mt-0.5">
                {isPortfolio ? 'Τέχνη & δημιουργίες' : 'Χειροποίητα κοσμήματα'}
              </span>
            </span>
          </button>
          <nav aria-label="Shop και Portfolio" className="section-entrances">
            <button id="nav-btn-shop" type="button" onClick={() => onSelectMode('shop')}
              aria-pressed={currentMode === 'shop'} className="section-entrance entrance-shop">
              <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden="true" /><span>Shop</span>
            </button>
            <button id="nav-btn-portfolio" type="button" onClick={() => onSelectMode('portfolio')}
              aria-pressed={currentMode === 'portfolio'} className="section-entrance entrance-portfolio">
              <Palette className="h-4 w-4 shrink-0" aria-hidden="true" /><span>Portfolio</span>
            </button>
          </nav>
          {isPortfolio ? (
            <button type="button" onClick={onContactArtist} aria-label="Επικοινωνία με την Aram Creations"
              className="header-action flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium">
              <Mail className="h-4 w-4" /><span className="hidden sm:inline">Επικοινωνία</span>
            </button>
          ) : (
            <button type="button" onClick={onOpenCart}
              aria-label={`Προβολή καλαθιού${cartCount > 0 ? `, ${cartCount} προϊόντα` : ''}`}
              className="header-action flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium">
              <ShoppingBag className="h-4 w-4" /><span className="hidden sm:inline">Καλάθι</span>
              {cartCount > 0 && <span className="rounded-full bg-stone-900 text-white w-5 h-5 text-[10px] flex items-center justify-center">{cartCount}</span>}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
