import React, { useState } from 'react';
import { CartItem, OrderCustomerInfo } from '../types';
import { X, Trash2, ArrowRight, ShieldCheck, CheckCircle2, Truck, CreditCard, ChevronLeft } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (itemId: string) => void;
  onCompleted: () => void;
}

const SHIPPING_OPTIONS = [
  { id: 'boxnow', label: 'BoxNow Locker 24/7', price: 2.5, freeThreshold: 45 },
  { id: 'courier', label: 'Courier (ACS / Speedex)', price: 4.0, freeThreshold: 50 }
];

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onCompleted,
}) => {
  const [selectedShipping, setSelectedShipping] = useState(SHIPPING_OPTIONS[0].id);
  const [isCheckoutStep, setIsCheckoutStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);
  const [orderError, setOrderError] = useState('');
  const [savedTotal, setSavedTotal] = useState<number | null>(null);
  const [website, setWebsite] = useState('');

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
  const [paymentMethod, setPaymentMethod] = useState('iris');

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + (Number(item.item.price) || 0) * item.quantity, 0);
  const activeShippingObj = SHIPPING_OPTIONS.find((s) => s.id === selectedShipping) || SHIPPING_OPTIONS[0];
  const shippingCost = (activeShippingObj.freeThreshold > 0 && subtotal >= activeShippingObj.freeThreshold) ? 0 : activeShippingObj.price;
  const total = subtotal + shippingCost;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !items.length) return;
    if (!customer.name || !customer.phone || !customer.email || (!customer.address || !customer.city)) {
      alert('Παρακαλώ συμπληρώστε όλα τα απαιτούμενα πεδία αποστολής.');
      return;
    }

    setIsSubmitting(true);
    setOrderError('');
    try {
      const payload = { customer, expectedTotal: Math.round(total * 100) / 100, shippingMethod: selectedShipping, paymentMethod, website, items: items.map(({ item, quantity, customInscription }) => ({ id: item.id, quantity, customInscription: customInscription || item.customInscription || '' })) };
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload))))).map(n => n.toString(16).padStart(2, '0')).join('');
      let requestId = crypto.randomUUID();
      try {
        const prior = JSON.parse(localStorage.getItem('aram_checkout_request') || 'null');
        if (prior?.hash === hash && prior?.requestId) requestId = prior.requestId;
        localStorage.setItem('aram_checkout_request', JSON.stringify({ hash, requestId }));
      } catch { /* Browser storage is optional. */ }
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, requestId }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Η παραγγελία δεν καταχωρήθηκε. Δοκίμασε ξανά.');
      setCompletedOrderNumber(result.order.number);
      setSavedTotal(result.order.total);
      onCompleted();
      setCustomer({ name: '', email: '', phone: '', address: '', city: '', postalCode: '', notes: '' });
      try { localStorage.removeItem('aram_checkout_request'); } catch { /* Optional storage. */ }
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'Η σύνδεση διακόπηκε. Δοκίμασε ξανά.');
    } finally { setIsSubmitting(false); }
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
                  : 'Τσάντα Αγορών (Cart)'}
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

        <p role="note" className="border-b-2 border-red-200 bg-red-50 px-6 py-3 text-xs font-bold leading-relaxed text-red-800">Σημαντικό: για περισσότερη προστασία κατά την πληρωμή, προτείνουμε οι αγορές να γίνονται μέσω Vinted, από τον σύνδεσμο κάθε προϊόντος. Η προστασία ισχύει σύμφωνα με τους όρους της πλατφόρμας.</p>{/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {completedOrderNumber ? (
            /* Success confirmation */
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Jura, sans-serif' }}>
                Η παραγγελία καταχωρήθηκε
              </h3>
              <p className="text-sm font-bold text-stone-700" style={{ fontFamily: 'Jura, sans-serif' }}>
                Κωδικός αναφοράς: #{completedOrderNumber}
              </p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                Λάβαμε την παραγγελία και κρατήσαμε τα προϊόντα. Θα επικοινωνήσουμε μαζί σας για επιβεβαίωση και οδηγίες πληρωμής. Δεν έχει γίνει αυτόματη χρέωση. Κρατήστε τον κωδικό παραγγελίας σας.
              </p>
              <p className="font-bold">Σύνολο: €{savedTotal?.toFixed(2)}</p>
              <div className="pt-6">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition shadow-sm"
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
                  placeholder="Οδός και αριθμός ή σημείο BoxNow Locker"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition"
                />
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
                    placeholder="π.χ. Αθήνα, Θεσσαλονίκη"
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
                    placeholder="12345"
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('iris')}
                    className={`p-2.5 rounded-xl border text-xs text-center transition ${
                      paymentMethod === 'iris'
                        ? 'border-stone-900 bg-stone-100 text-stone-900 font-bold'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    IRIS Payments
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank')}
                    className={`p-2.5 rounded-xl border text-xs text-center transition ${
                      paymentMethod === 'bank'
                        ? 'border-stone-900 bg-stone-100 text-stone-900 font-bold'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    Κατάθεση
                  </button>

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
                  placeholder="π.χ. Κουδούνι, όροφος, επιθυμητή ώρα"
                  rows={2}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-900 outline-none focus:border-stone-900"
                />
              </div>
              <label className="hidden" aria-hidden="true">Website<input value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" /></label>
              <p className="text-xs text-stone-500">Τα στοιχεία σας αποθηκεύονται για την εξυπηρέτηση της παραγγελίας. Η πληρωμή επιβεβαιώνεται από το εργαστήριο.</p>
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

                      <p className="mt-2 text-xs text-stone-500">Μοναδικό κομμάτι · 1 τεμάχιο</p>
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
                  {SHIPPING_OPTIONS.map((opt) => {
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
                        <span>{opt.label}</span>
                        <span className={`font-bold ${isFree || opt.price === 0 ? 'text-emerald-700' : 'text-stone-900'}`}>
                          {priceLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {orderError && <p role="alert" className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{orderError}</p>}
        {/* Drawer Footer */}
        {!completedOrderNumber && items.length > 0 && (
          <div className="p-6 border-t border-stone-200 bg-stone-50 space-y-4">
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
              <button
                type="submit"
                form="order-form"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {isSubmitting ? (
                  <span>Καταχώρηση...</span>
                ) : (
                  <>
                    <span>Καταχώρηση παραγγελίας</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
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
