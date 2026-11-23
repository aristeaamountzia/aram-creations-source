import { ArtistProfileDialog } from './components/ArtistProfile';
import { initialHeroSnapshot } from './lib/hero-media';
import React, { useState, useEffect, useCallback } from 'react';
import { SectionMode, ArtItem, JewelryItem, CartItem } from './types';
import { searchPage, SITE_URL, searchStructuredData } from './lib/search-content';
import { localeFromPath, modeFromLocation, publicPath } from './lib/public-locale';
import { localizedName } from './lib/public-copy';
import { PublicLanguage, usePublicLanguage } from './lib/use-public-language';
import { Header } from './components/Header';
import { ShopView } from './components/ShopView';
const PortfolioView = React.lazy(() =>
  import('./components/PortfolioView').then((module) => ({
    default: module.PortfolioView,
  }))
);
const BackOfficeView = React.lazy(() =>
  import('./components/BackOfficeView').then((module) => ({
    default: module.BackOfficeView,
  }))
);
import { CartDrawer } from './components/CartDrawer';
import { ContactModal } from './components/ContactModal';
import { PaymentSuccessModal } from './components/PaymentSuccessModal';
import { LegalModal, LegalPolicyType } from './components/LegalModal';
import { Lock, X } from 'lucide-react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from './firebase';
import { normalizeShopSettings, ShopSettings, DEFAULT_SHOP_SETTINGS } from './shopSettings';
import { designStudioCss } from './lib/design-studio';
import { DEFAULT_DESIGN_STUDIO, DesignStudio, normalizeDesignStudio, normalizeVisualTheme, type VisualTheme } from './lib/design-studio';
import { GlobalNotificationToast } from './components/GlobalNotificationToast';
import { notifyOperationSuccess } from './lib/sound-notifications';
import { confirmStripePayment } from './lib/stripe-confirmation';

// Synchronous theme cache resolver to eliminate FOUC (Flash of Unstyled/Old Theme)
const getInitialThemeState = () => {
  try {
    const saved = localStorage.getItem('aram_theme_cache');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.designStudio) {
        const ds = normalizeDesignStudio(parsed.designStudio);
        return {
          visualTheme: normalizeVisualTheme(parsed.visualTheme),
          designStudioContent: ds,
          designStudioCss: designStudioCss(ds)
        };
      }
    }
  } catch {}
  return {
    visualTheme: initialHeroSnapshot().visualTheme || 'atelier',
    designStudioContent: normalizeDesignStudio(initialHeroSnapshot().designStudio),
    designStudioCss: designStudioCss(initialHeroSnapshot().designStudio)
  };
};

export const App: React.FC = () => (
  <PublicLanguage.Provider value={localeFromPath(window.location.pathname)}><Site /></PublicLanguage.Provider>
);

const Site: React.FC = () => {
  const { locale, t } = usePublicLanguage();
  const [currentMode, setCurrentMode] = useState<SectionMode>(() => modeFromLocation(window.location.pathname, window.location.hash));
  const [initialTheme] = useState(getInitialThemeState);
  const [visualTheme, setVisualTheme] = useState<VisualTheme>(initialTheme.visualTheme);
  const [designStudio, setDesignStudio] = useState<Record<string, string>>(initialTheme.designStudioCss);
  const [designStudioContent, setDesignStudioContent] = useState<DesignStudio>(initialTheme.designStudioContent);
  useEffect(() => {
    for (const [key, value] of Object.entries(designStudio)) document.documentElement.style.setProperty(key, value);
  }, [designStudio]);
  useEffect(() => {
    document.documentElement.dataset.visualTheme = visualTheme;
  }, [visualTheme]);
  const selectMode = useCallback((mode: SectionMode) => {
    const target = mode === 'admin' ? publicPath(locale) + '#admin' : publicPath(locale, mode);
    if (`${window.location.pathname}${window.location.hash}` !== target) window.history.pushState(null, '', target);
    setCurrentMode(mode);
  }, [locale]);

  useEffect(() => {
    const section = currentMode === 'portfolio' ? 'portfolio' : 'shop';
    const page = searchPage(section, locale);
    document.documentElement.lang = currentMode === 'admin' ? 'el' : locale;
    document.title = page.title;
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', SITE_URL + page.path);
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) document.querySelector(selector)?.setAttribute('content', page.description);
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) document.querySelector(selector)?.setAttribute('content', page.title);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', SITE_URL + page.path);
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', locale === 'en' ? 'en_GB' : 'el_GR');
    for (const link of document.querySelectorAll<HTMLLinkElement>('link[hreflang]')) {
      link.href = SITE_URL + publicPath(link.hreflang === 'en' ? 'en' : 'el', section);
    }
    for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) document.querySelector(selector)?.setAttribute('content', SITE_URL + page.image);
    for (const selector of ['meta[property="og:image:alt"]', 'meta[name="twitter:image:alt"]']) document.querySelector(selector)?.setAttribute('content', page.imageAlt);
    const schema = document.getElementById('aram-schema-jsonld');
    if (schema) schema.textContent = JSON.stringify(searchStructuredData(page, locale));
  }, [currentMode, locale]);

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
  const [shopSettingsData, setShopSettingsData] = useState<ShopSettings>(DEFAULT_SHOP_SETTINGS);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const closeAbout = useCallback(() => {
    setIsAboutOpen(false);
    if (window.location.hash === '#artist-profile' || window.location.hash === '#about') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);
  const [legalModalType, setLegalModalType] = useState<LegalPolicyType>(null);
  const closeLegalModal = useCallback(() => {
    setLegalModalType(null);
    if (['#terms', '#privacy', '#returns'].includes(window.location.hash)) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    const handleHashSync = () => {
      const hash = window.location.hash;
      if (hash === '#terms') setLegalModalType('terms');
      else if (hash === '#privacy') setLegalModalType('privacy');
      else if (hash === '#returns') setLegalModalType('returns');
      else if (hash === '#artist-profile' || hash === '#about') setIsAboutOpen(true);
      else if (hash === '#contact') setIsContactOpen(true);
    };
    handleHashSync();
    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, []);
  // This listener is intentionally presentation-only: the existing shop settings
  // document remains the single source of truth and no commerce data is touched.
  useEffect(() => onSnapshot(doc(db, 'settings', 'shop'), snapshot => {
    if (!snapshot.exists()) return;
    const settings = normalizeShopSettings(snapshot.data());
    setShopSettingsData(settings);
    const ds = normalizeDesignStudio(settings.designStudio);
    const css = designStudioCss(ds);
    setVisualTheme(settings.visualTheme);
    setDesignStudio(css);
    setDesignStudioContent(ds);
    try {
      localStorage.setItem('aram_theme_cache', JSON.stringify({
        visualTheme: settings.visualTheme,
        designStudio: ds
      }));
    } catch {}
  }, () => {}), []);
  const cartIds = cartItems.map(entry => entry.item.id).sort().join(',');
  useEffect(() => {
    const unsubscribes = cartIds.split(',').filter(Boolean).map(id => onSnapshot(doc(db, 'shopCatalog', id), snapshot => {
      setCartItems(items => items.map(entry => entry.item.id === id ? { ...entry, item: snapshot.exists() ? { ...entry.item, ...snapshot.data(), id } : { ...entry.item, stock: 0, status: 'Μη διαθέσιμο' } } : entry));
    }, () => {}));
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, [cartIds]);

  // Contact artist modal
  const [contactArtItem, setContactArtItem] = useState<ArtItem | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{ number: string; total?: number } | null>(null);
  const [paymentAlert, setPaymentAlert] = useState<string | null>(null);
  const [stripeReturn] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) return null;
    let checkoutRequest: string | null = null;
    try { checkoutRequest = localStorage.getItem('aram_checkout_request'); } catch { /* optional */ }
    return { sessionId, orderId: params.get('order_id'), cartIds: new Set(cartItems.map(entry => entry.item.id)), checkoutRequest };
  });
  const [paymentConfirmation, setPaymentConfirmation] = useState<{ status: 'idle' | 'checking' | 'error'; error?: string }>({ status: 'idle' });
  const [confirmationAttempt, setConfirmationAttempt] = useState(0);

  // Retain return details across StrictMode cleanup and retries until payment is confirmed.
  useEffect(() => {
    if (!stripeReturn) return;
    const controller = new AbortController();
    let active = true;
    setPaymentConfirmation({ status: 'checking' });

    confirmStripePayment(stripeReturn.sessionId, stripeReturn.orderId, controller.signal)
      .then((payment) => {
        if (!active) return;
        // Keep any new items or checkout request created while confirmation was pending.
        setCartItems(items => items.filter(entry => !stripeReturn.cartIds.has(entry.item.id)));
        try {
          if (localStorage.getItem('aram_checkout_request') === stripeReturn.checkoutRequest) {
            localStorage.removeItem('aram_checkout_request');
          }
        } catch { /* optional */ }
        const cleanUrl = new URL(window.location.href);
        if (cleanUrl.searchParams.get('session_id') === stripeReturn.sessionId) {
          cleanUrl.searchParams.delete('session_id');
          cleanUrl.searchParams.delete('order_id');
          window.history.replaceState(window.history.state, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
        }
        setPaymentSuccessData({ number: payment.orderNumber, total: payment.total });
        setPaymentConfirmation({ status: 'idle' });
      })
      .catch((error) => {
        if (!active) return;
        setPaymentConfirmation({ status: 'error', error: t(error instanceof Error ? error.message : String(error), 'The payment could not be confirmed. Try again.') });
      });

    return () => { active = false; controller.abort(); };
  }, [stripeReturn, confirmationAttempt, t]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cancelled = params.get('order_cancelled');
    if (!params.get('session_id') && cancelled) {
      const controller = new AbortController();
      let active = true;
      setPaymentAlert(t("Έλεγχος ακύρωσης της συνεδρίας πληρωμής…", "Checking checkout cancellation…"));
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_unpaid', orderId: cancelled, cancelToken: params.get('cancel_token') }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)])
      }).then(async response => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok) throw new Error(data?.error || `Η ακύρωση επέστρεψε HTTP ${response.status}.`);
        if (!active) return;
        try {
          const previous = JSON.parse(localStorage.getItem('aram_checkout_request') || 'null');
          if (previous?.requestId === cancelled) localStorage.removeItem('aram_checkout_request');
        } catch { /* optional */ }
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('order_cancelled');
        cleanUrl.searchParams.delete('cancel_token');
        window.history.replaceState(window.history.state, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
        setPaymentAlert(t("Η πληρωμή ακυρώθηκε. Τα είδη παραμένουν στην τσάντα αγορών σας.", "Payment was cancelled. Your items are still in your bag."));
        setIsCartOpen(true);
      }).catch(error => {
        if (active) setPaymentAlert(t(`Η ακύρωση δεν επιβεβαιώθηκε: ${error instanceof Error ? error.message : String(error)}`, 'Payment cancellation could not be confirmed. Reload this page to try again.'));
      });
      return () => { active = false; controller.abort(); };
    }
  }, []);

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
      setCurrentMode(modeFromLocation(window.location.pathname, window.location.hash));
    };
    if (!window.history.state?.aramShop) window.history.replaceState({ ...(window.history.state || {}), aramShop: true }, '', `${window.location.pathname}${window.location.search}${window.location.hash}`);
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
    notifyOperationSuccess(t("Προσθήκη στο Καλάθι", "Added to bag"), t(`Το «${localizedName(item, locale) || 'κόσμημα'}» προστέθηκε στο καλάθι.`, `${localizedName(item, locale) || 'Jewelry'} was added to your bag.`));
    setIsCartOpen(true);
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((ci) => ci.item.id !== itemId));
    notifyOperationSuccess(t("Ενημέρωση Καλαθιού", "Bag updated"), t("Το είδος αφαιρέθηκε από το καλάθι.", "The item was removed from your bag."));
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
    <div style={designStudio as React.CSSProperties} data-section={currentMode} data-visual-theme={visualTheme} className="aram-site studio-shell min-h-screen w-full min-w-0 flex flex-col">
      <a href="#main-content" className="studio-skip">{t("Μετάβαση στο περιεχόμενο", "Skip to content")}</a>
      {/* Prominent Global Notification Toast with Luxury Audio Feedback */}
      <GlobalNotificationToast />
      {/* Discreet owner banner when admin view is active */}
      {currentMode === 'admin' && (
        <div className="workspace-topbar bg-stone-900 text-stone-200 border-b border-stone-800 px-4 py-2.5 flex flex-wrap gap-3 items-center justify-between text-xs z-50">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider uppercase text-[11px] text-white">
              Aram Creations / Back Office
            </span>
          </div>
          <button
            onClick={() => {
              selectMode('shop');
            }}
            className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 transition flex items-center gap-1.5 border border-stone-600 font-bold text-xs"
          >
            <span>{t("← Επιστροφή στο Κατάστημα", "← Back to Shop")}</span>
          </button>
        </div>
      )}

      {/* Header (clean for customers: Shop | Portfolio only - hidden in back-office to prevent navigation conflict) */}
      {currentMode !== 'admin' && (
        <Header
          currentMode={currentMode}
          onSelectMode={selectMode}
          cartCount={totalCartCount}
          onOpenCart={() => setIsCartOpen(true)}
          onContactArtist={() => handleContactArtist()}
          design={designStudioContent}
        />
      )}

      {/* Main Content Body */}
      <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 w-full">
        {currentMode === 'shop' && (
          <ShopView onAddToCart={handleAddToCart} />
        )}

        {currentMode === 'portfolio' && (
          <React.Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center p-8 text-stone-500 font-sans">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">{t("Φόρτωση Portfolio...", "Loading portfolio…")}</span>
                </div>
              </div>
            }
          >
            <PortfolioView onContactArtist={handleContactArtist} />
          </React.Suspense>
        )}

        {currentMode === 'admin' && (
          <React.Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center p-8 text-stone-500 font-sans">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">{t("Φόρτωση Back-Office...", "Loading Back Office…")}</span>
                </div>
              </div>
            }
          >
            <PublicLanguage.Provider value="el"><BackOfficeView
              onExit={() => selectMode('shop')}
            /></PublicLanguage.Provider>
          </React.Suspense>
        )}
      </main>

      {/* Cart Drawer Slide-over */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onRemoveItem={handleRemoveItem}
        onCompleted={handleClearCart}
        onOpenLegal={(type) => setLegalModalType(type)}
        shippingSettings={shopSettingsData.shippingSettings}
      />

      {/* Legal Policies Modal (Terms, Privacy, Returns) */}
      <LegalModal
        type={legalModalType}
        onClose={closeLegalModal}
        onSelectType={setLegalModalType}
      />

      {/* Contact Artist Modal */}
      <ContactModal
        key={contactArtItem?.id || 'general'}
        isOpen={isContactOpen}
        onClose={() => {
          setIsContactOpen(false);
          if (window.location.hash === '#contact') {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }}
        artItem={contactArtItem}
      />

      {/* Stripe Payment Success Modal */}
      {paymentSuccessData && (
        <PaymentSuccessModal
          orderNumber={paymentSuccessData.number}
          total={paymentSuccessData.total}
          onClose={() => setPaymentSuccessData(null)}
        />
      )}

      {/* Payment alert toast */}
      {paymentConfirmation.status !== 'idle' && (
        <div
          role={paymentConfirmation.status === 'error' ? 'alert' : 'status'}
          aria-busy={paymentConfirmation.status === 'checking'}
          className="fixed bottom-6 left-6 right-6 sm:left-auto sm:max-w-md z-50 bg-stone-900 text-white text-sm p-4 rounded-2xl shadow-2xl border border-stone-700 space-y-3"
        >
          {paymentConfirmation.status === 'checking' ? (
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 shrink-0 rounded-full border-2 border-stone-500 border-t-white animate-spin" aria-hidden="true" />
              <span>{t("Επιβεβαίωση πληρωμής με τη Stripe…", "Confirming payment with Stripe…")}</span>
            </div>
          ) : (
            <>
              <p>{t("Δεν ολοκληρώθηκε η επιβεβαίωση πληρωμής: ", "Payment confirmation could not be completed: ")}{paymentConfirmation.error}</p>
              <p className="text-xs text-stone-300">{t("Το καλάθι σας παραμένει αποθηκευμένο. Η επανάληψη ελέγχει την ίδια πληρωμή.", "Your bag is saved. Retrying checks the same payment.")}</p>
              <button type="button" onClick={() => setConfirmationAttempt(attempt => attempt + 1)} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-stone-900 hover:bg-stone-100 transition">{t("Επανάληψη ελέγχου", "Try again")}</button>
            </>
          )}
        </div>
      )}
      {paymentAlert && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-stone-700 animate-in slide-in-from-bottom duration-200">
          <span>{paymentAlert}</span>
          <button
            onClick={() => setPaymentAlert(null)}
            className="text-stone-400 hover:text-white transition p-1"
            aria-label={t("Κλείσιμο", "Close")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isAboutOpen && <ArtistProfileDialog onClose={closeAbout} />}
      {/* Footer (hidden in admin mode) */}
      {currentMode !== 'admin' && (
      <footer className="studio-footer">
        <div className="studio-footer-grid">
          <div className="studio-footer-brand">
            <span>{designStudioContent.brandName}</span>
            <p>{currentMode === 'portfolio' ? t(designStudioContent.portfolioCaption, 'Art and design') : t(designStudioContent.shopCaption, 'Handmade jewelry')}</p>
          </div>
          <div>
            <h2>{t("Σελίδες", "Explore")}</h2>
            <a href={publicPath(locale)}>{t(designStudioContent.shopNavLabel, "Shop")}</a>
            <a href={publicPath(locale, "portfolio")}>{t(designStudioContent.portfolioNavLabel, "Portfolio")}</a>
            <a href="#artist-profile" onClick={(e) => { e.preventDefault(); setIsAboutOpen(true); window.location.hash = 'artist-profile'; }}>{t("Βιογραφικό", "About the artist")}</a>
          </div>
          <div>
            <h2>{t(designStudioContent.contactLabel, 'Contact')}</h2>
            <a href="#contact" onClick={(e) => { e.preventDefault(); handleContactArtist(); window.location.hash = 'contact'; }}>{t("Στείλτε μήνυμα", "Send a message")}</a>
            <a href="mailto:aristeaamnta@gmail.com">Email</a>
          </div>
          <div>
            <h2>{t("Πληροφορίες", "Information")}</h2>
            <a href="#terms" onClick={(e) => { e.preventDefault(); setLegalModalType('terms'); window.location.hash = 'terms'; }}>{t("Όροι χρήσης", "Terms of use")}</a>
            <a href="#privacy" onClick={(e) => { e.preventDefault(); setLegalModalType('privacy'); window.location.hash = 'privacy'; }}>{t("Πολιτική απορρήτου", "Privacy policy")}</a>
            <a href="#returns" onClick={(e) => { e.preventDefault(); setLegalModalType('returns'); window.location.hash = 'returns'; }}>{t("Αποστολές και επιστροφές", "Shipping and returns")}</a>
          </div>
        </div>
        <div className="studio-footer-end">
          <span>© {new Date().getFullYear()} Aram Creations</span>
          <nav className="studio-footer-social" aria-label={t("Κοινωνικά δίκτυα", "Social media")}>
            <a href="https://www.instagram.com/aram.creations/">Instagram</a>
            <a href="https://www.vinted.gr/member/231329281">Vinted</a>
            <a href="https://www.tiktok.com/@aram.creations">TikTok</a>
            <a href="https://www.facebook.com/share/1DmHHwXCMC/">Facebook</a>
            <a href="https://linktr.ee/aristeaamnt">{t("Όλα τα κανάλια", "All links")}</a>
          </nav>
          <button type="button" onClick={() => selectMode('admin')}><Lock size={14} aria-hidden="true" /> Back Office</button>
        </div>
      </footer>
      )}
    </div>
  );
};
