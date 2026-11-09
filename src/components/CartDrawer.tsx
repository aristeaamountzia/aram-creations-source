import React, { useState, useMemo } from 'react';
import { CartItem, OrderCustomerInfo } from '../types';
import { ShippingSettings } from '../shopSettings';
import { notifyOperationSuccess, notifyOperationError } from '../lib/sound-notifications';
import {
  X,
  Trash2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Truck,
  CreditCard,
  ChevronLeft,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
  Package
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
  const shippingOptions = useMemo(() => [
    {
      id: 'boxnow',
      label: 'BoxNow Locker 24/7',
      price: Number(shippingSettings?.boxnowPrice ?? 2.5),
      freeThreshold: Number(shippingSettings?.boxnowFreeThreshold ?? 45)
    },
    {
      id: 'courier',
      label: 'Courier (ACS / Speedex)',
      price: Number(shippingSettings?.courierPrice ?? 4.0),
      freeThreshold: Number(shippingSettings?.courierFreeThreshold ?? 50)
    }
  ], [shippingSettings]);

  const [selectedShipping, setSelectedShipping] = useState('boxnow');
  const [isCheckoutStep, setIsCheckoutStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState('');
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);
  const [orderError, setOrderError] = useState('');
  const [savedTotal, setSavedTotal] = useState<number | null>(null);
  const [website, setWebsite] = useState('');
  const [copiedField, setCopiedField] = useState<'number' | 'phone' | null>(null);

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
    if (!customer.name.trim() || !customer.phone.trim() || !customer.email.trim() || !customer.address.trim() || !customer.city.trim()) {
      alert('Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία αποστολής (Ονοματεπώνυμο, Τηλέφωνο, Email, Διεύθυνση, Πόλη).');
      return;
    }

    setIsSubmitting(true);
    setOrderError('');
    setSubmittingStep('1/3 Έλεγχος διαθεσιμότητας & στοιχείων...');
    try {
      const payload = {
        customer,
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

      setSubmittingStep('2/3 Καταχώρηση παραγγελίας στο εργαστήριο...');
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, requestId })
      });
      const result = await response.json().catch(() => ({ ok: false, error: 'Ο διακομιστής δεν επέστρεψε έγκυρη απάντηση JSON.' }));

      if (!response.ok || !result.ok) {
        const errMessage = result.error || result.message || 'Η παραγγελία δεν μπόρεσε να καταχωρηθεί.';
        const errReason = result.reason ? ` (${result.reason})` : '';
        throw new Error(`${errMessage}${errReason}`);
      }

      if (result.checkoutUrl) {
        setSubmittingStep('3/3 Μετάβαση στην ασφαλή πύλη Stripe (Apple Pay, Google Pay, Κάρτες)...');
        window.location.href = result.checkoutUrl;
        return;
      }

      setSubmittingStep('3/3 Επιβεβαίωση παραγγελίας...');
      setCompletedOrderNumber(result.order.number);
      notifyOperationSuccess('Ολοκλήρωση Παραγγελίας', `Η παραγγελία σας #${result.order.number} καταχωρήθηκε επιτυχώς!`);
      setSavedTotal(result.order.total);
      onCompleted();
      setCustomer({ name: '', email: '', phone: '', address: '', city: '', postalCode: '', notes: '' });
      try { localStorage.removeItem('aram_checkout_request'); } catch { /* Optional storage. */ }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Η σύνδεση διακόπηκε. Δοκιμάστε ξανά.';
      setOrderError(errMsg);
      notifyOperationError('Σφάλμα Παραγγελίας', errMsg);
    } finally {
      setIsSubmitting(false);
      setSubmittingStep('');
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setIsCheckoutStep(false);
    setCompletedOrderNumber(null);
    setOrderError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
      <div 
        className="w-full max-w-lg bg-white border-l border-stone-200 text-stone-900 h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isCheckoutStep && !completedOrderNumber && (
              <button
                onClick={() => setIsCheckoutStep(false)}
                className="p-1 rounded-lg text-stone-500 hover:text-stone-900"
                title="Επιστροφή στην Τσάντα"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-stone-900" style={{ fontFamily: 'Jura, sans-serif' }}>
                {completedOrderNumber
                  ? 'Επιβεβαίωση Παραγγελίας'
                  : isCheckoutStep
                  ? 'Στοιχεία Αποστολής'
                  : 'Τσάντα Αγορών'}
              </h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Κλείσιμο καλαθιού"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reassuring Luxury Assurance Banner */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-2.5 flex items-center justify-between text-[11px] text-stone-600">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-stone-800 shrink-0" />
            <span>Ασφαλείς πληρωμές & πιστοποιημένο εργαστήριο</span>
          </div>
          <div className="flex items-center gap-1.5 text-stone-500">
            <Truck className="w-3.5 h-3.5 text-stone-700 shrink-0" />
            <span>BoxNow 24/7 & Courier</span>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {completedOrderNumber ? (
            /* Success confirmation view */
            <div className="py-6 space-y-5">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Jura, sans-serif' }}>
                  Η παραγγελία καταχωρήθηκε!
                </h3>
                <p className="text-xs text-stone-500">
                  Τα κοσμήματα δεσμεύτηκαν αποκλειστικά για εσάς στο εργαστήριό μας.
                </p>
              </div>

              {/* Order reference box */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500 font-medium">Κωδικός Παραγγελίας:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-stone-900 text-sm">#{completedOrderNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(completedOrderNumber, 'number')}
                      className="p-1 rounded-md hover:bg-stone-200 text-stone-600 transition"
                      title="Αντιγραφή κωδικού"
                    >
                      {copiedField === 'number' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                {savedTotal !== null && (
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-stone-200">
                    <span className="text-stone-500 font-medium">Σύνολο Πληρωμής:</span>
                    <span className="font-bold text-stone-900 text-base" style={{ fontFamily: 'Jura, sans-serif' }}>
                      €{savedTotal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment confirmation */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-stone-900">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Πληρωμή μέσω Stripe</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Η πληρωμή σας διεκπεραιώνεται με ασφάλεια μέσω της πλατφόρμας Stripe. Σας έχει αποσταλεί ηλεκτρονική επιβεβαίωση.
                </p>
              </div>

              {/* Workshop and packaging card */}
              <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 space-y-2 text-xs text-stone-600">
                <div className="flex items-start gap-2">
                  <Package className="w-4 h-4 text-stone-700 shrink-0 mt-0.5" />
                  <span>Κάθε κόσμημα ετοιμάζεται σε πολυτελή χειροποίητη συσκευασία δώρου Aram Creations.</span>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Θα λάβετε ενημέρωση με τον κωδικό αποστολής αμέσως μόλις παραδοθεί στην εταιρεία ταχυμεταφορών.</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleClose}
                  className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition shadow-sm"
                >
                  Συνέχεια Περιήγησης
                </button>
              </div>
            </div>
          ) : isCheckoutStep ? (
            /* Checkout Form */
            <form id="order-form" onSubmit={handleSubmitOrder} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">
                  Ονοματεπώνυμο *
                </label>
                <input
                  type="text"
                  required
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="π.χ. Μαρία Παπαδοπούλου"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">
                    Τηλέφωνο *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    placeholder="69XXXXXXXX"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">
                  Διεύθυνση & Αριθμός *
                </label>
                <input
                  type="text"
                  required
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  placeholder={selectedShipping === 'boxnow' ? 'Οδός/αριθμός ή σημείο BoxNow Locker' : 'Οδός και αριθμός κατοικίας ή γραφείου'}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
                />
                {selectedShipping === 'boxnow' && (
                  <p className="text-[11px] text-stone-500 mt-1">
                    Για παραλαβή από BoxNow Locker, σημειώστε τη διεύθυνση ή το όνομα/αριθμό του επιθυμητού Locker.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">
                    Πόλη / Περιοχή *
                  </label>
                  <input
                    type="text"
                    required
                    value={customer.city}
                    onChange={(e) => setCustomer({ ...customer, city: e.target.value })}
                    placeholder="π.χ. Αθήνα, Θεσσαλονίκη, Πάτρα"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">
                    Τ.Κ.
                  </label>
                  <input
                    type="text"
                    value={customer.postalCode}
                    onChange={(e) => setCustomer({ ...customer, postalCode: e.target.value })}
                    placeholder="38500"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Payment selection */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-500 mb-2 font-bold flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-stone-800" />
                  <span>Τρόπος Πληρωμής</span>
                </label>
                <div className="w-full p-3.5 rounded-xl border border-stone-900 bg-stone-900 text-white shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold flex items-center gap-2">
                      <CreditCard className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>Κάρτα / Apple Pay / Google Pay / Revolut</span>
                    </div>
                    <div className="text-[10px] mt-0.5 text-stone-300">
                      Άμεση & ασφαλής πληρωμή μέσω Stripe (Visa, Mastercard, Revolut κ.α.)
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-stone-800 text-stone-200 border border-stone-700">
                    Stripe
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-500 mb-1 font-bold">
                  Σημειώσεις / Οδηγίες Παράδοσης
                </label>
                <textarea
                  maxLength={1000}
                  value={customer.notes}
                  onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                  placeholder="π.χ. Κουδούνι, όροφος, επιθυμητή ώρα παράδοσης"
                  rows={2}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 outline-none focus:border-stone-900"
                />
              </div>
              <label className="hidden" aria-hidden="true">Website<input value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" /></label>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Τα στοιχεία σας χρησιμοποιούνται αποκλειστικά για την εκτέλεση της παραγγελίας σας.
              </p>
            </form>
          ) : items.length === 0 ? (
            /* Empty Cart */
            <div className="py-24 text-center text-stone-400">
              <p className="text-base font-bold text-stone-700">Η τσάντα αγορών σας είναι άδεια.</p>
              <p className="text-xs text-stone-500 mt-2 max-w-xs mx-auto">
                Εξερευνήστε τη συλλογή χειροποίητων κοσμημάτων και μοναδικών έργων τέχνης.
              </p>
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
                      alt={item.name || item.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      className="w-16 h-16 rounded-xl object-cover bg-stone-100 shrink-0 border border-stone-200"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-stone-900 truncate">
                        {item.name || item.title}
                      </h4>
                      {customInscription && (
                        <p className="text-[10px] text-stone-500 truncate italic">
                          Custom: {customInscription}
                        </p>
                      )}
                      <div className="text-xs font-bold text-stone-900 mt-0.5" style={{ fontFamily: 'Jura, sans-serif' }}>
                        €{item.price}
                      </div>

                      <p className="mt-1 text-[11px] text-stone-500">Μοναδικό κομμάτι · 1 τεμάχιο</p>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-stone-400 hover:text-rose-600 p-1.5 transition"
                      title="Αφαίρεση"
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
                  <span>Επιλογή Τρόπου Αποστολής</span>
                </label>
                <div className="space-y-2">
                  {shippingOptions.map((opt) => {
                    const isFree = opt.freeThreshold > 0 && subtotal >= opt.freeThreshold;
                    const priceLabel = isFree ? 'ΔΩΡΕΑΝ' : opt.price === 0 ? 'ΔΩΡΕΑΝ' : `+€${opt.price.toFixed(2)}`;
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
                  <p className="text-[10px] text-stone-500 mt-2 leading-relaxed">
                    *Τα αναγραφόμενα κόστη αφορούν βασικές διαστάσεις δεμάτων/θυρίδων. Για ογκώδη αντικείμενα ή μεγαλύτερες θυρίδες ενδέχεται να υπάρξει ειδική συνεννόηση.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {orderError && (
          <div role="alert" className="mx-6 my-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Σφάλμα Καταχώρησης Παραγγελίας</span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed font-medium">{orderError}</p>
            <p className="text-[11px] text-stone-500 pt-1 border-t border-rose-100">
              Συμβουλή: Βεβαιωθείτε ότι όλα τα πεδία έχουν συμπληρωθεί σωστά (ονοματεπώνυμο, τηλέφωνο, διεύθυνση) ή επιλέξτε διαφορετικό τρόπο πληρωμής.
            </p>
          </div>
        )}

        {/* Drawer Footer */}
        {!completedOrderNumber && items.length > 0 && (
          <div className="sticky bottom-0 z-10 p-5 sm:p-6 border-t border-stone-200 bg-stone-50/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.06)] space-y-4">
            <div className="space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Υποσύνολο:</span>
                <span className="font-bold text-stone-900">€{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Μεταφορικά ({activeShippingObj.label.split(' ')[0]}):</span>
                <span className="font-bold text-stone-900">
                  {shippingCost === 0 ? 'ΔΩΡΕΑΝ' : `€${shippingCost.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-200">
                <span>Τελικό Σύνολο:</span>
                <span className="text-xl font-bold text-stone-900" style={{ fontFamily: 'Jura, sans-serif' }}>
                  €{total.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Χειροποίητη συσκευασία δώρου & ασφαλής αποστολή</span>
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
                  <p className="text-[10px] text-stone-500 text-center leading-relaxed">
                    Με την παραγγελία αποδέχεστε τους{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegal('terms')}
                      className="underline text-stone-700 hover:text-stone-900 font-medium cursor-pointer"
                    >
                      Όρους Χρήσης
                    </button>
                    {', '}
                    <button
                      type="button"
                      onClick={() => onOpenLegal('privacy')}
                      className="underline text-stone-700 hover:text-stone-900 font-medium cursor-pointer"
                    >
                      Πολιτική Απορρήτου
                    </button>
                    {' & '}
                    <button
                      type="button"
                      onClick={() => onOpenLegal('returns')}
                      className="underline text-stone-700 hover:text-stone-900 font-medium cursor-pointer"
                    >
                      Επιστροφών
                    </button>
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
                    <span>Καταχώρηση παραγγελίας σε εξέλιξη...</span>
                  ) : paymentMethod === 'stripe' ? (
                    <>
                      <span>Μετάβαση σε ασφαλή πληρωμή (Stripe)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Καταχώρηση παραγγελίας</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsCheckoutStep(true)}
                className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>Στοιχεία και επιβεβαίωση</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
