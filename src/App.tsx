import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SectionMode, ArtItem, JewelryItem, CartItem } from './types';
import { Header } from './components/Header';
import { ShopView } from './components/ShopView';
import { PortfolioView } from './components/PortfolioView';
import { BackOfficeView } from './components/BackOfficeView';
import { CartDrawer } from './components/CartDrawer';
import { ContactModal } from './components/ContactModal';
import { ShieldCheck, Mail, MapPin, ExternalLink, Lock } from 'lucide-react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from './firebase';

export const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<SectionMode>('shop');
  const hasInitializedHistory = useRef(false);
  const selectMode = useCallback((mode: SectionMode) => {
    const hash = mode === 'shop' ? '#shop' : mode === 'portfolio' ? '#portfolio' : '#admin';
    if (window.location.hash !== hash) window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
    setCurrentMode(mode);
  }, []);
  
  // Cart state persisted in localStorage
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('aram_boutique_cart');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? Array.from(new Map(parsed.filter(entry => entry?.item?.id).map(entry => [entry.item.id, { ...entry, quantity: 1 }])).values()) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartIds = cartItems.map(entry => entry.item.id).sort().join(',');
  useEffect(() => {
    const unsubscribes = cartIds.split(',').filter(Boolean).map(id => onSnapshot(doc(db, 'jewelry', id), snapshot => {
      setCartItems(items => items.map(entry => entry.item.id === id ? { ...entry, item: snapshot.exists() ? { ...entry.item, ...snapshot.data(), id } : { ...entry.item, stock: 0, status: 'Μη διαθέσιμο' } } : entry));
    }, () => {}));
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, [cartIds]);

  // Contact artist modal
  const [contactArtItem, setContactArtItem] = useState<ArtItem | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('aram_boutique_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.warn('LocalStorage save cart error:', e);
    }
  }, [cartItems]);

  // Handle URL hash #admin and secret keyboard shortcut (Ctrl+Alt+A)
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin') {
        setCurrentMode('admin');
      } else if (window.location.hash.startsWith('#portfolio')) {
        setCurrentMode('portfolio');
      } else {
        setCurrentMode('shop');
      }
    };
    if (!window.history.state?.aramShop) window.history.replaceState({ ...(window.history.state || {}), aramShop: true }, '', `${window.location.pathname}${window.location.search}${window.location.hash || '#shop'}`);
    hasInitializedHistory.current = true;
    handleHash();
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('popstate', handleHash);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'a' || e.key === 'A' || e.key === 'α' || e.key === 'Α')) {
        selectMode(window.location.hash === '#admin' ? 'shop' : 'admin');
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('popstate', handleHash);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectMode, currentMode]);

  const handleAddToCart = (item: JewelryItem, customInscription?: string) => {
    const max = Math.max(0, Number(item.stock ?? item.stockCount ?? 1));
    if (!max || item.status !== 'Διαθέσιμο') return;
    setCartItems((prev) => {
      const existingIdx = prev.findIndex((ci) => ci.item.id === item.id);
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], quantity: 1 };
        if (customInscription) {
          next[existingIdx].customInscription = customInscription;
        }
        return next;
      } else {
        return [...prev, { item, quantity: 1, customInscription }];
      }
    });
    setIsCartOpen(true);
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((ci) => ci.item.id !== itemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleContactArtist = (item?: ArtItem) => {
    setContactArtItem(item || null);
    setIsContactOpen(true);
  };

  const totalCartCount = cartItems.reduce((acc, ci) => acc + ci.quantity, 0);

  return (
    <div data-section={currentMode} className="aram-site min-h-screen w-full min-w-0 flex flex-col bg-white text-[#1c1917]">
      {/* Discreet owner banner when admin view is active */}
      {currentMode === 'admin' && (
        <div className="bg-stone-900 text-stone-200 border-b border-stone-800 px-4 py-2.5 flex flex-wrap gap-3 items-center justify-between text-xs z-50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wider uppercase text-[11px] text-white">
              Aram Creations • Περιβάλλον Διαχείρισης (Back Office)
            </span>
          </div>
          <button
            onClick={() => {
              selectMode('shop');
            }}
            className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 transition flex items-center gap-1.5 border border-stone-600 font-bold text-xs"
          >
            <span>← Επιστροφή στο Κατάστημα</span>
          </button>
        </div>
      )}

      {/* Header (clean for customers: Shop | Portfolio only) */}
      <Header
        currentMode={currentMode}
        onSelectMode={selectMode}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onContactArtist={() => handleContactArtist()}
      />

      {/* Main Content Body */}
      <main className="flex-1 min-w-0 w-full">
        {currentMode === 'shop' && (
          <ShopView onAddToCart={handleAddToCart} />
        )}

        {currentMode === 'portfolio' && (
          <PortfolioView onContactArtist={handleContactArtist} />
        )}

        {currentMode === 'admin' && (
          <BackOfficeView
            onExit={() => selectMode('shop')}
          />
        )}
      </main>

      {/* Cart Drawer Slide-over */}
      <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            items={cartItems}
            onRemoveItem={handleRemoveItem}
            onCompleted={handleClearCart}
          />

      {/* Contact Artist Modal */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        artItem={contactArtItem}
      />

      {/* Footer */}
      <footer className="site-footer bg-[#fafafa] border-t border-stone-200/90 text-stone-600 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img 
                src={currentMode === 'portfolio' ? '/logo-portfolio.png' : '/logo.png'}
                alt="Aram Creations" 
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.endsWith('/logo.png')) target.src = '/logo.svg';
                }}
              />
              <span className="font-bold uppercase tracking-tight text-stone-900 text-base" style={{ fontFamily: 'Jura, sans-serif' }}>
                aram.creations
              </span>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed font-sans">
              Χειροποίητες δημιουργίες, γλυπτά, κοσμήματα και ψηφιακό design. Κάθε έργο δημιουργείται με αγάπη και έμφαση στη διαχρονική αισθητική.
            </p>
          </div>

          {/* Quick links - Clean & Customer-focused */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-stone-900 mb-3">Πλοήγηση</h4>
            <div>
              <button onClick={() => selectMode('shop')} className="hover:text-stone-900 transition font-medium">
                Shop (Κοσμήματα)
              </button>
            </div>
            <div>
              <button onClick={() => selectMode('portfolio')} className="hover:text-stone-900 transition font-medium">
                Portfolio Έργων (Wix Archive)
              </button>
            </div>
          </div>

          {/* Contact Atelier */}
          <div className="space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-stone-900 mb-3">Επικοινωνία</h4>
            <div className="flex items-center gap-2 text-stone-600">
              <Mail className="w-3.5 h-3.5 text-stone-800" />
              <span>aristeaamnta@gmail.com</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600">
              <MapPin className="w-3.5 h-3.5 text-stone-800" />
              <span>Βόλος</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>BoxNow, ACS & IRIS Payments</span>
            </div>
          </div>

          {/* External Shops */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-stone-900 mb-3">Επίσημα Κανάλια</h4>
            <div className="flex flex-col gap-2">
              <a
                href="https://www.vinted.gr/member/231329281"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-100 transition"
              >
                <span>Vinted Boutique</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href="https://www.instagram.com/aram.creations/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-stone-800 text-xs font-bold hover:bg-stone-100 transition"
              >
                <span>Instagram Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 gap-4">
          <div>
            © {new Date().getFullYear()} Aram Creations. Με επιφύλαξη παντός δικαιώματος.
          </div>
          <div className="flex items-center gap-3">
            <span>Χειροποίητα Ελληνικά Κοσμήματα</span>
            <span>•</span>
            <span>Artisan Crafts</span>
            <span className="opacity-30">•</span>
            {/* Discreet atelier owner access */}
            <button
              onClick={() => selectMode('admin')}
              title="Atelier Access"
              className="text-stone-400 hover:text-stone-700 transition p-0.5 opacity-40 hover:opacity-100 flex items-center gap-1 cursor-pointer"
            >
              <Lock className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
