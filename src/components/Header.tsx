import React from 'react';
import { SectionMode } from '../types';
import { ShoppingBag, Palette, ExternalLink } from 'lucide-react';

interface HeaderProps {
  currentMode: SectionMode;
  onSelectMode: (mode: SectionMode) => void;
  cartCount: number;
  onOpenCart: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  cartCount,
  onOpenCart,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 text-stone-900 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Brand Identity */}
        <button
          onClick={() => onSelectMode('shop')}
          type="button"
          aria-label="Aram Creations — επιστροφή στο Shop"
          className="cursor-pointer group flex items-center gap-3.5 shrink-0 bg-transparent border-0 text-left p-0"
          id="header-brand"
        >
          <img
            src="/logo.png"
            alt="Aram Creations"
            className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.endsWith('/logo.png')) {
                target.src = '/logo.svg';
              }
            }}
          />
          <div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 group-hover:text-stone-700 transition-colors" style={{ fontFamily: 'Jura, sans-serif' }}>
              aram.creations
            </div>
            <div className="text-[10px] tracking-widest text-stone-500 uppercase font-medium">
              Χειροποίητα Κοσμήματα & Τέχνη
            </div>
          </div>
        </button>

        {/* Navigation: Clean & Elegant (Shop | Portfolio) */}
        <nav className="flex items-center p-1 bg-stone-100 border border-stone-200/80 rounded-xl">
          <button
            id="nav-btn-shop"
            onClick={() => onSelectMode('shop')}
            aria-pressed={currentMode === 'shop'}
            className={`px-4 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              currentMode === 'shop'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Shop</span>
            </span>
          </button>

          <button
            id="nav-btn-portfolio"
            onClick={() => onSelectMode('portfolio')}
            aria-pressed={currentMode === 'portfolio'}
            className={`px-4 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              currentMode === 'portfolio'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" />
              <span>Portfolio</span>
            </span>
          </button>
        </nav>

        {/* Right actions: Cart Drawer trigger & external links */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Cart Bag Button */}
          <button
            onClick={onOpenCart}
            type="button"
            aria-label={`Προβολή καλαθιού${cartCount > 0 ? `, ${cartCount} προϊόντα` : ''}`}
            className="relative flex items-center gap-2 bg-stone-100 hover:bg-stone-200/80 border border-stone-300/80 px-3.5 py-2 rounded-xl text-xs font-bold text-stone-900 transition shadow-sm"
            title="Προβολή Καλαθιού"
          >
            <ShoppingBag className="w-4 h-4 text-stone-800" />
            <span className="hidden sm:inline">Καλάθι</span>
            {cartCount > 0 && (
              <span className="bg-stone-900 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center -ml-0.5">
                {cartCount}
              </span>
            )}
          </button>

          {/* Social links */}
          <div className="hidden lg:flex items-center gap-2 border-l border-stone-200 pl-3">
            <a
              href="https://www.vinted.gr/member/231329281"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] font-bold text-teal-800 hover:text-teal-900 bg-teal-50 border border-teal-200/80 px-3 py-1.5 rounded-lg transition"
              title="Vinted Store"
            >
              <span>Vinted</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href="https://www.instagram.com/aram.creations/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 hover:text-stone-900 bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-lg transition"
              title="Instagram Profile"
            >
              <span>Instagram</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

      </div>
    </header>
  );
};
