import { CatalogControls } from './CatalogControls';
import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { ORDER_STATUSES } from '../../server/orders-core';
import { ExternalLink, CreditCard, RefreshCw, Send, ArrowLeft } from 'lucide-react';

type Status = keyof typeof ORDER_STATUSES;
type Order = {
  id: string; number: string; status: Status; createdAt: string; total: number; shippingCost: number;
  shippingMethod: string; paymentMethod: string; tracking?: string; emailNotification?: string;
  stripeSessionId?: string; stripeCheckoutUrl?: string;
  customer: { name: string; phone: string; email: string; address: string; city: string; postalCode: string; notes?: string };
  items: Array<{ id: string; name: string; price: number; quantity: number; customInscription?: string }>;
};
const transitions: Record<Status, Status[]> = { pending: ['waiting_payment', 'paid', 'cancelled'], waiting_payment: ['paid', 'cancelled'], paid: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
const money = (n: number) => new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' }).format(n);

export function OrdersManager({ onBack }: { onBack: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [mailMessage, setMailMessage] = useState('');
  const [tracking, setTracking] = useState<Record<string, string>>({});

  async function request(path: string, init: RequestInit = {}) {
    if (!auth.currentUser) throw new Error('Συνδέσου ξανά στο Back Office.');
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Η ενέργεια απέτυχε.');
    return body;
  }

  async function load(more = false) {
    setLoading(true); setError('');
    try {
      const result = await request(`/api/orders${more && cursor ? `?after=${encodeURIComponent(cursor)}` : ''}`);
      setOrders(current => more ? [...current, ...result.orders.filter((order: Order) => !current.some(existing => existing.id === order.id))] : result.orders);
      setCursor(result.nextCursor);
    } catch (error) { setError(error instanceof Error ? error.message : 'Αποτυχία φόρτωσης.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function update(order: Order, status: Status) {
    if (status === 'cancelled' && !window.confirm('Ακύρωση παραγγελίας και επαναφορά αποθέματος; Αν έχει πληρωθεί, η επιστροφή χρημάτων γίνεται χειροκίνητα.')) return;
    setBusy(order.id); setError('');
    try {
      const value = tracking[order.id] ?? order.tracking ?? '';
      await request('/api/orders', { method: 'PATCH', body: JSON.stringify({ id: order.id, status, tracking: value }) });
      setOrders(current => current.map(entry => entry.id === order.id ? { ...entry, status, tracking: value } : entry));
    } catch (error) { setError(error instanceof Error ? error.message : 'Η αλλαγή απέτυχε.'); }
    finally { setBusy(''); }
  }

  const shown = orders.filter(order => (filter === 'all' || order.status === filter) && `${order.number} ${order.customer.name} ${order.customer.email} ${order.customer.phone}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="backoffice-view mx-auto min-h-screen max-w-7xl space-y-5 p-4 pb-16 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-5 shadow-xs">
        <div>
          <button type="button" onClick={onBack} className="mb-2 text-xs uppercase tracking-wider font-bold text-stone-500 hover:text-stone-900 transition flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Επιστροφή στον Κατάλογο
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">Διαχείριση Παραγγελιών</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://dashboard.stripe.com/payments"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-4 py-2 text-xs font-bold transition shadow-xs flex items-center gap-1.5 text-stone-700"
          >
            <CreditCard className="w-3.5 h-3.5 text-stone-600" />
            <span>Stripe Dashboard</span>
            <ExternalLink className="w-3 h-3 text-stone-400" />
          </a>
          <button
            type="button"
            disabled={loading}
            onClick={() => void load()}
            className="rounded-xl border border-stone-200 bg-white hover:bg-stone-50 px-4 py-2 text-xs font-bold transition shadow-xs flex items-center gap-1.5 text-stone-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Φόρτωση…' : 'Ανανέωση'}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs">
        <p className="text-stone-600 max-w-2xl leading-relaxed">
          Οι νέες παραγγελίες δεσμεύουν αυτόματα το απόθεμα. Για πληρωμές μέσω Stripe, η παραγγελία τίθεται αυτόματα ως «Πληρωμένη» μόλις ολοκληρωθεί η συναλλαγή.
        </p>
        <button
          disabled={!!busy}
          onClick={async () => {
            setBusy('mail-test'); setError('');
            try {
              await request('/api/order-email-test', { method: 'POST' });
              setMailMessage('Η δοκιμαστική ειδοποίηση στάλθηκε στο aristeaamnta@gmail.com.');
            } catch(err: any) {
              setError(err.message);
            } finally {
              setBusy('');
            }
          }}
          type="button"
          className="rounded-xl border border-stone-200 bg-white hover:bg-stone-100 px-3 py-1.5 text-xs font-bold transition shadow-xs flex items-center gap-1.5 text-stone-700"
        >
          <Send className="w-3 h-3 text-stone-500" />
          <span>Δοκιμή email ειδοποίησης</span>
        </button>
      </div>
      {mailMessage && <p role="status" className="text-sm text-emerald-700">{mailMessage}</p>}
      <CatalogControls label="Φίλτρα παραγγελιών" search={search} onSearch={setSearch} placeholder="Κωδικός, όνομα, email ή τηλέφωνο" categories={[]} selectedCategory={filter} onCategory={setFilter} actions={<><select aria-label="Κατάσταση παραγγελιών" value={filter} onChange={e => setFilter(e.target.value)} className="max-w-full rounded-lg border p-3"><option value="all">Όλες οι καταστάσεις</option>{Object.entries(ORDER_STATUSES).map(([status, name]) => <option key={status} value={status}>{name}</option>)}</select></>} />
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-800">{error}</p>}
      {!loading && !shown.length && !error && <p className="py-8 text-center text-stone-600">Δεν υπάρχουν παραγγελίες σε αυτή την επιλογή.</p>}
      {shown.map(order => (
        <article key={order.id} className="space-y-4 rounded-xl border bg-white p-4 sm:p-5">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <h2 className="break-words font-bold text-base text-stone-900">{order.number}</h2>
              {order.paymentMethod === 'stripe' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-900 text-white">
                  <CreditCard className="w-3 h-3" /> Stripe
                </span>
              )}
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700">{ORDER_STATUSES[order.status]}</span>
          </div>
          <p className="text-xs text-stone-500">Ειδοποίηση email: {order.emailNotification === 'sent' ? 'Στάλθηκε' : order.emailNotification === 'pending' ? 'Αναμονή / αυτόματη επανάληψη' : 'Παλαιότερη παραγγελία'}</p>
          <p className="text-xs text-stone-500">{new Date(order.createdAt).toLocaleString('el-GR')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1 text-sm">
              <p className="font-bold text-stone-900">{order.customer.name}</p>
              <p className="break-words text-stone-600"><a href={`mailto:${order.customer.email}`} className="hover:underline">{order.customer.email}</a> · <a href={`tel:${order.customer.phone}`} className="font-semibold text-stone-900 hover:underline">{order.customer.phone}</a></p>
              <p className="text-stone-600">{order.customer.address}, {order.customer.city} {order.customer.postalCode}</p>
              <p className="text-stone-700">Αποστολή: {({ boxnow: 'BoxNow', courier: 'Courier', pickup: 'Παραλαβή' } as Record<string, string>)[order.shippingMethod]}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-stone-700">Πληρωμή: {({ iris: 'IRIS Payments', bank: 'Τραπεζική Κατάθεση', stripe: 'Stripe (Κάρτα / Apple Pay / Revolut)', cod: 'Αντικαταβολή' } as Record<string, string>)[order.paymentMethod] || order.paymentMethod}</span>
                {order.paymentMethod === 'stripe' && order.stripeSessionId && (
                  <a
                    href="https://dashboard.stripe.com/payments"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-stone-600 hover:text-stone-900 underline inline-flex items-center gap-0.5"
                    title={`Stripe Session ID: ${order.stripeSessionId}`}
                  >
                    <span>Άνοιγμα στο Stripe</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              {order.customer.notes && <p className="break-words text-stone-500 text-xs mt-1">Σημειώσεις: {order.customer.notes}</p>}
            </div>
            <div className="space-y-2 text-sm bg-stone-50 p-3 rounded-xl border border-stone-200">
              {order.items.map(item => <p key={item.id} className="break-words text-stone-800">{item.name} × {item.quantity} — {money(item.price * item.quantity)}{item.customInscription && ` · Χάραξη: ${item.customInscription}`}</p>)}
              <p className="text-xs text-stone-500 pt-1 border-t border-stone-200">Μεταφορικά: {money(order.shippingCost)}</p>
              <p className="font-bold text-base text-stone-900">Σύνολο: {money(order.total)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input aria-label={`Κωδικός αποστολής ${order.number}`} value={tracking[order.id] ?? order.tracking ?? ''} onChange={e => setTracking(current => ({ ...current, [order.id]: e.target.value }))} maxLength={200} placeholder="Κωδικός / στοιχεία αποστολής (π.χ. Tracking Number)" className="min-w-0 flex-1 rounded-lg border p-2 text-xs" />
            <button disabled={!!busy} onClick={() => void update(order, order.status)} className="rounded-lg border px-3 py-2 text-xs font-bold hover:bg-stone-50 transition">Αποθήκευση στοιχείων</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(order.paymentMethod === 'cod' && ['pending', 'waiting_payment'].includes(order.status) ? [...transitions[order.status], 'shipped' as Status] : transitions[order.status]).map(status => <button key={status} disabled={!!busy} onClick={() => void update(order, status)} className={`rounded-lg px-3 py-2 text-xs font-bold transition disabled:opacity-40 ${status === 'cancelled' ? 'border border-rose-200 text-rose-800 hover:bg-rose-50' : 'bg-stone-900 text-white hover:bg-stone-800'}`}>{busy === order.id ? 'Αποθήκευση…' : ORDER_STATUSES[status]}</button>)}
          </div>
        </article>
      ))}
      {cursor && <button disabled={loading} onClick={() => void load(true)} className="rounded-lg border px-4 py-3 text-xs font-bold">Παλαιότερες παραγγελίες</button>}
    </div>
  );
}
