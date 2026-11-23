import { localizedName, publicTextLanguage } from '../lib/public-copy';
import { usePublicLanguage } from "../lib/use-public-language";
import { useDialogKeyboard } from '../lib/use-dialog-keyboard';
import React, { useState, useMemo } from 'react';
import { CartItem, OrderCustomerInfo } from '../types';
import { ShippingSettings } from '../shopSettings';
import { normalizeShippingSettings } from '../lib/shipping';
import { notifyOperationSuccess, notifyOperationError } from '../lib/sound-notifications';
import {
  X,
  Trash2,
  CheckCircle2,
  Truck,
  CreditCard,
  ChevronLeft,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (itemId: string) => void;
  onCompleted: () => void;
  onOpenLegal?: (type: 'terms' | 'privacy' | 'returns') => void;
  shippingSettings?: ShippingSettings;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onCompleted,
  onOpenLegal,
  shippingSettings,
}) => {
  const { locale, t } = usePublicLanguage();
  const shippingOptions = useMemo(() => {
    const settings = normalizeShippingSettings(shippingSettings);
    return [
    {
      id: 'boxnow',
      label: 'BoxNow Locker 24/7',
      price: settings.boxnowPrice,
      freeThreshold: settings.boxnowFreeThreshold
    },
    {
      id: 'courier',
      label: 'Courier (ACS / Speedex)',
      price: settings.courierPrice,
      freeThreshold: settings.courierFreeThreshold
    }
    ];
  }, [shippingSettings]);

  const [selectedShipping, setSelectedShipping] = useState('boxnow');
  const [isCheckoutStep, setIsCheckoutStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState('');
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);
  const [orderError, setOrderError] = useState('');
  const [savedTotal, setSavedTotal] = useState<number | null>(null);
  const [website, setWebsite] = useState('');
  const [copiedField, setCopiedField] = useState<'number' | 'phone' | null>(null);
  const [locker, setLocker] = useState({ name: '', area: '' });

  // Customer form state
  const [customer, setCustomer] = useState<OrderCustomerInfo>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    notes: ''
  });
  const paymentMethod = 'stripe';
  const isBoxNow = selectedShipping === 'boxnow';

  const handleClose = () => {
    if (isSubmitting) return;
    setIsCheckoutStep(false);
    setCompletedOrderNumber(null);
    setOrderError('');
    onClose();
  };
  const dialog = useDialogKeyboard(isOpen, handleClose);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + (Number(item.item.price) || 0) * item.quantity, 0);
  const activeShippingObj = shippingOptions.find((s) => s.id === selectedShipping) || shippingOptions[0];
  const shippingCost = (activeShippingObj.freeThreshold > 0 && subtotal >= activeShippingObj.freeThreshold) ? 0 : activeShippingObj.price;
  const total = subtotal + shippingCost;

  const handleCopy = (text: string, field: 'number' | 'phone') => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !items.length) return;
    const deliveryCustomer = isBoxNow
      ? { ...customer, address: locker.name, city: locker.area, postalCode: '' }
      : customer;
    if (!customer.name.trim() || !customer.phone.trim() || !customer.email.trim() || !deliveryCustomer.address.trim() || !deliveryCustomer.city.trim()) {
      setOrderError(isBoxNow ? t("Συμπληρώστε τα στοιχεία επικοινωνίας, τη θυρίδα BOX NOW και την περιοχή.", "Enter your contact details, the BOX NOW locker, and its area.") : t("Συμπληρώστε τα στοιχεία επικοινωνίας, τη διεύθυνση και την πόλη.", "Enter your contact details, street address, and city."));
      return;
    }

    setIsSubmitting(true);
    setOrderError('');
    setSubmittingStep(t("1/3 Έλεγχος διαθεσιμότητας & στοιχείων...", "1/3 Checking availability and details…"));
    try {
      const payload = {
        customer: deliveryCustomer,
        expectedTotal: Math.round(total * 100) / 100,
        shippingMethod: selectedShipping,
        paymentMethod,
        website,
        items: items.map(({ item, quantity, customInscription }) => ({
          id: item.id,
          quantity,
          customInscription: customInscription || item.customInscription || ''
        }))
      };

      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload))))).map(n => n.toString(16).padStart(2, '0')).join('');
      let requestId = crypto.randomUUID();
      try {
        const prior = JSON.parse(localStorage.getItem('aram_checkout_request') || 'null');
        if (prior?.hash === hash && prior?.requestId) requestId = prior.requestId;
        localStorage.setItem('aram_checkout_request', JSON.stringify({ hash, requestId }));
      } catch { /* Browser storage is optional. */ }

      setSubmittingStep(t("2/3 Καταχώρηση παραγγελίας στο εργαστήριο...", "2/3 Creating your order…"));
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, requestId, locale })
      });
      const result = await response.json().catch(() => ({ ok: false, error: t("Ο διακομιστής δεν επέστρεψε έγκυρη απάντηση JSON.", "The server returned an invalid response.") }));

      if (!response.ok || !result.ok) {
        if (result.code === 'ORDER_CANCELLED') {
          try {
            const previous = JSON.parse(localStorage.getItem('aram_checkout_request') || 'null');
            if (previous?.requestId === requestId) localStorage.removeItem('aram_checkout_request');
          } catch { /* optional */ }
        }
        const errMessage = result.error || result.message || t("Η παραγγελία δεν μπόρεσε να καταχωρηθεί.", "The order could not be placed.");
        const errReason = result.reason ? ` (${result.reason})` : '';
        throw new Error(t(`${errMessage}${errReason}`, result.code === 'ORDER_CANCELLED' ? 'This checkout was cancelled. Please try again.' : 'The order could not be placed. Check your details and try again.'));
      }

      if (result.checkoutUrl) {
        setSubmittingStep(t("3/3 Μετάβαση στην ασφαλή πύλη Stripe (Apple Pay, Google Pay, Κάρτες)...", "3/3 Opening secure Stripe checkout…"));
        window.location.href = result.checkoutUrl;
        return;
      }

      setSubmittingStep(t("3/3 Επιβεβαίωση παραγγελίας...", "3/3 Confirming your order…"));
      setCompletedOrderNumber(result.order.number);
      notifyOperationSuccess(t("Ολοκλήρωση Παραγγελίας", "Order complete"), t(`Η παραγγελία σας #${result.order.number} καταχωρήθηκε επιτυχώς!`, `Your order #${result.order.number} was placed.`));
      setSavedTotal(result.order.total);
      onCompleted();
      setCustomer({ name: '', email: '', phone: '', address: '', city: '', postalCode: '', notes: '' });
      try { localStorage.removeItem('aram_checkout_request'); } catch { /* Optional storage. */ }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : t("Η σύνδεση διακόπηκε. Δοκιμάστε ξανά.", "Connection lost. Please try again.");
      setOrderError(errMsg);
      notifyOperationError(t("Σφάλμα Παραγγελίας", "Order error"), errMsg);
    } finally {
      setIsSubmitting(false);
      setSubmittingStep('');
    }
  };



  return (
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabIndex={-1} className="studio-overlay fixed inset-0 z-50 flex justify-end" onClick={event => { if (event.target === event.currentTarget) handleClose(); }}>
      <div 
        className="studio-dialog studio-drawer w-full max-w-lg bg-white border-l border-stone-200 text-stone-900 h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300"
      >
        {/* Drawer Header */}
        <div className="drawer-head p-6 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isCheckoutStep && !completedOrderNumber && (
              <button
                onClick={() => setIsCheckoutStep(false)}
                className="p-1 rounded-lg text-stone-500 hover:text-stone-900"
                title={t("Επιστροφή στην Τσάντα", "Back to bag")}
                aria-label={t("Επιστροφή στο καλάθι", "Back to bag")}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 id="drawer-title" className="drawer-title">
                {completedOrderNumber
                  ? t("Επιβεβαίωση Παραγγελίας", "Order confirmation")
                  : isCheckoutStep
                  ? t("Στοιχεία Αποστολής", "Delivery details")
                  : t("Καλάθι", "Bag")}
              </h2>
              {items.length > 0 && !completedOrderNumber && <p className="drawer-step">{isCheckoutStep ? t("2 από 2 · Ολοκλήρωση", "2 of 2 · Checkout") : t("1 από 2 · Προϊόντα", "1 of 2 · Items")}</p>}
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label={t("Κλείσιμο καλαθιού", "Close bag")}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="drawer-content flex-1 overflow-y-auto p-6 space-y-6">
          {completedOrderNumber ? (
            /* Success confirmation view */
            <div className="py-6 space-y-5">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'inherit' }}>{t("Η παραγγελία καταχωρήθηκε!", "Order placed!")}</h3>
              </div>

              {/* Order reference box */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500 font-medium">{t("Κωδικός Παραγγελίας:", "Order number:")}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-stone-900 text-sm">#{completedOrderNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(completedOrderNumber, 'number')}
                      className="p-1 rounded-md hover:bg-stone-200 text-stone-600 transition"
                      title={t("Αντιγραφή κωδικού", "Copy order number")}
                    >
                      {copiedField === 'number' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                {savedTotal !== null && (
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-stone-200">
                    <span className="text-stone-500 font-medium">{t("Σύνολο Πληρωμής:", "Payment total:")}</span>
                    <span className="font-bold text-stone-900 text-base" style={{ fontFamily: 'inherit' }}>
                      €{savedTotal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment confirmation */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>{t("Πληρωμή μέσω Stripe", "Pay with Stripe")}</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">{t("Η πληρωμή σας διεκπεραιώνεται με ασφάλεια μέσω της πλατφόρμας Stripe. Σας έχει αποσταλεί ηλεκτρονική επιβεβαίωση.", "Your payment is processed securely by Stripe. A confirmation email has been sent.")}</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleClose}
                  className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition shadow-sm"
                >{t("Συνέχεια Περιήγησης", "Continue browsing")}</button>
              </div>
            </div>
          ) : isCheckoutStep ? (
            /* Checkout Form */
            <form id="order-form" onSubmit={handleSubmitOrder} className="space-y-4">
              <div>
                <label htmlFor="checkout-name" className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">{t("Ονοματεπώνυμο *", "Full name *")}</label>
                <input
                  type="text"
                  required
                  id="checkout-name" autoComplete="name" value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  placeholder={t("π.χ. Μαρία Παπαδοπούλου", "e.g. Maria Smith")}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
                />
              </div>

              <div className="checkout-contact-grid grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="checkout-phone" className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">{t("Τηλέφωνο *", "Phone *")}</label>
                  <input
                    type="tel"
                    required
                    id="checkout-phone" autoComplete="tel" value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    placeholder="69XXXXXXXX"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-email" className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    id="checkout-email" autoComplete="email" value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
                  />
                </div>
              </div>

              {isBoxNow ? (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-stone-600">{t("Προτιμώμενη θυρίδα BOX NOW *", "Preferred BOX NOW locker *")}<input required maxLength={250} value={locker.name} onChange={event => setLocker({ ...locker, name: event.target.value })}
                      placeholder={t("Κωδικός ή όνομα σημείου", "Locker code or location name")} className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-stone-900" />
                  </label>
                  <label className="block text-xs font-bold text-stone-600">{t("Περιοχή θυρίδας *", "Locker area *")}<input required maxLength={100} value={locker.area} onChange={event => setLocker({ ...locker, area: event.target.value })}
                      placeholder={t("Πόλη ή περιοχή", "City or area")} className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-stone-900" />
                  </label>
                </div>
              ) : <>
              <div>
                <label htmlFor="checkout-address" className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">{t("Διεύθυνση & Αριθμός *", "Street address and number *")}</label>
                <input
                  type="text"
                  required
                  id="checkout-address" autoComplete="street-address" value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  placeholder={t("Οδός και αριθμός", "Street and number")}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="checkout-city" className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">{t("Πόλη / Περιοχή *", "City or area *")}</label>
                  <input
                    type="text"
                    required
                    id="checkout-city" autoComplete="address-level2" value={customer.city}
                    onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                    placeholder={t("π.χ. Αθήνα, Θεσσαλονίκη, Πάτρα", "e.g. Athens, Thessaloniki, Patras")}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label htmlFor="checkout-postalCode" className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">{t("Τ.Κ.", "Postal code")}</label>
                  <input
                    type="text"
                    id="checkout-postalCode" autoComplete="postal-code" inputMode="numeric" value={customer.postalCode}
                    onChange={(e) => setCustomer({ ...customer, postalCode: e.target.value })}
                    placeholder="38500"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
                  />
                </div>
              </div>

              </>}
              <div>
                <label htmlFor="checkout-notes" className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">{t("Σημειώσεις / Οδηγίες Παράδοσης", "Delivery notes")}</label>
                <textarea
                  maxLength={1000}
                  id="checkout-notes" value={customer.notes}
                  onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                  placeholder={isBoxNow ? t("Προαιρετικές οδηγίες", "Optional instructions") : t("π.χ. Κουδούνι ή όροφος", "e.g. buzzer or floor")}
                  rows={2}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 outline-none focus:border-stone-900"
                />
              </div>
              <label className="hidden" aria-hidden="true">Website<input value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" /></label>
              <p className="text-[11px] text-stone-500 leading-relaxed">{t("Τα στοιχεία σας χρησιμοποιούνται αποκλειστικά για την εκτέλεση της παραγγελίας σας.", "We use your information to fulfill your order.")}</p>
            </form>
          ) : items.length === 0 ? (
            /* Empty Cart */
            <div className="py-24 text-center text-stone-400">
              <p className="text-base font-bold text-stone-700">{t("Η τσάντα αγορών σας είναι άδεια.", "Your bag is empty.")}</p>
              <p className="text-xs text-stone-500 mt-2 max-w-xs mx-auto">{t("Εξερευνήστε τη συλλογή χειροποίητων κοσμημάτων.", "Explore the handmade jewelry collection.")}</p>
              <button type="button" onClick={handleClose} className="mt-5 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white">{t("Συνέχεια στο Shop", "Continue shopping")}</button>
            </div>
          ) : (
            /* Items List */
            <div className="space-y-4">
              {items.map(({ item, quantity, customInscription }) => {
                const img = item.imageUrl || item.src || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80';
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3.5 p-3.5 bg-stone-50 rounded-2xl border border-stone-200 shadow-sm"
                  >
                    <img
                      src={img}
                      alt={localizedName(item, locale)}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      className="w-16 h-16 rounded-xl object-cover bg-stone-100 shrink-0 border border-stone-200"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-stone-900 truncate">
                        <span lang={publicTextLanguage(localizedName(item, locale), locale)}>{localizedName(item, locale)}</span>
                      </h4>
                      {customInscription && (
                        <p className="text-[10px] text-stone-500 truncate italic">
                          Custom: {customInscription}
                        </p>
                      )}
                      <div className="text-xs font-bold text-stone-900 mt-0.5" style={{ fontFamily: 'inherit' }}>
                        €{item.price}
                      </div>

                      <p className="mt-1 text-[11px] text-stone-500">{t("Μοναδικό κομμάτι · 1 τεμάχιο", "One-of-a-kind piece · 1 item")}</p>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-stone-400 hover:text-rose-600 p-1.5 transition"
                      title={t("Αφαίρεση", "Remove")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}

              {/* Shipping method selector */}
              <div className="pt-4 border-t border-stone-200">
                <label className="text-xs uppercase tracking-wider text-stone-500 font-bold mb-2.5 block flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-stone-800" />
                  <span>{t("Επιλογή Τρόπου Αποστολής", "Delivery method")}</span>
                </label>
                <div className="space-y-2">
                  {shippingOptions.map((opt) => {
                    const isFree = opt.freeThreshold > 0 && subtotal >= opt.freeThreshold;
                    const priceLabel = isFree ? t("ΔΩΡΕΑΝ", "FREE") : opt.price === 0 ? t("ΔΩΡΕΑΝ", "FREE") : `+€${opt.price.toFixed(2)}`;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedShipping(opt.id)}
                        className={`w-full p-2.5 rounded-xl border text-xs flex items-center justify-between transition ${
                          selectedShipping === opt.id
                            ? 'border-stone-900 bg-stone-100 text-stone-900 font-bold'
                            : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5 text-stone-600" />
                          <span>{opt.label}</span>
                        </div>
                        <span className={`font-bold ${isFree || opt.price === 0 ? 'text-emerald-700' : 'text-stone-900'}`}>
                          {priceLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {shippingSettings?.customNotes ? (
                  <p className="text-[11px] text-amber-800 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/80 mt-2 leading-relaxed">
                    {shippingSettings.customNotes}
                  </p>
                ) : (
                  <p className="text-[10px] text-stone-500 mt-2 leading-relaxed">{t("*Τα αναγραφόμενα κόστη αφορούν βασικές διαστάσεις δεμάτων/θυρίδων. Για ογκώδη αντικείμενα ή μεγαλύτερες θυρίδες ενδέχεται να υπάρξει ειδική συνεννόηση.", "*Rates apply to standard parcels and lockers. Larger parcels or lockers may require a separate arrangement.")}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {orderError && (
          <div role="alert" className="mx-6 my-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{t("Σφάλμα Καταχώρησης Παραγγελίας", "The order could not be placed")}</span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed font-medium">{orderError}</p>
          </div>
        )}

        {/* Drawer Footer */}
        {!completedOrderNumber && items.length > 0 && (
          <div className="cart-drawer-footer shrink-0 p-5 sm:p-6 border-t border-stone-200 bg-stone-50/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.06)] space-y-4">
            <div className="space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>{t("Υποσύνολο:", "Subtotal:")}</span>
                <span className="font-bold text-stone-900">€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("Μεταφορικά (", "Shipping (")}{activeShippingObj.label.split(' ')[0]}):</span>
                <span className="font-bold text-stone-900">
                  {shippingCost === 0 ? t("ΔΩΡΕΑΝ", "FREE") : `€${shippingCost.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-200">
                <span>{t("Τελικό Σύνολο:", "Total:")}</span>
                <span className="text-xl font-bold text-stone-900" style={{ fontFamily: 'inherit' }}>
                  €{total.toFixed(2)}
                </span>
              </div>
            </div>

            {isCheckoutStep ? (
              <div className="space-y-2">
                {isSubmitting && submittingStep && (
                  <div className="space-y-1.5 bg-stone-100 p-2.5 rounded-xl border border-stone-200">
                    <div className="flex justify-between items-center text-[11px] font-bold text-stone-700">
                      <span>{submittingStep}</span>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-700" />
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-600 h-1.5 rounded-full animate-pulse w-full"></div>
                    </div>
                  </div>
                )}
                {onOpenLegal && (
                  <p className="text-[10px] text-stone-500 text-center leading-relaxed">{t("Με την παραγγελία αποδέχεστε τους", "By placing your order, you agree to the")}{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegal('terms')}
                      className="underline text-stone-700 hover:text-stone-900 font-medium cursor-pointer"
                    >{t("Όρους Χρήσης", "Terms of Use")}</button>
                    {', '}
                    <button
                      type="button"
                      onClick={() => onOpenLegal('privacy')}
                      className="underline text-stone-700 hover:text-stone-900 font-medium cursor-pointer"
                    >{t("Πολιτική Απορρήτου", "Privacy Policy")}</button>
                    {' & '}
                    <button
                      type="button"
                      onClick={() => onOpenLegal('returns')}
                      className="underline text-stone-700 hover:text-stone-900 font-medium cursor-pointer"
                    >{t("Επιστροφών", "Returns Policy")}</button>
                    .
                  </p>
                )}
                <button
                  type="submit"
                  form="order-form"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  {isSubmitting ? (
                    <span>{t("Καταχώρηση παραγγελίας σε εξέλιξη...", "Placing your order…")}</span>
                  ) : paymentMethod === 'stripe' ? (
                    <>
                      <span>{t("Πληρωμή μέσω Stripe", "Pay with Stripe")}</span>
                    </>
                  ) : (
                    <>
                      <span>{t("Καταχώρηση παραγγελίας", "Place order")}</span>
                      </>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCheckoutStep(true)}
                className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>{t("Συνέχεια στην παραγγελία", "Continue to checkout")}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
