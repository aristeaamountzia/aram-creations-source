export class OrderError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const shipping = { boxnow: { cents: 250, free: 4500 }, courier: { cents: 400, free: 5000 } };
const field = (value: unknown, max: number, required = false) => {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new OrderError('Έλεγξε τα στοιχεία επικοινωνίας και αποστολής.');
  return value.trim();
};
export function normalizeOrder(raw: any) {
  if (!raw || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(raw.requestId || '') || raw.website) throw new OrderError('Μη έγκυρο αίτημα παραγγελίας.');
  if (typeof raw.expectedTotal !== 'number' || !Number.isFinite(raw.expectedTotal) || raw.expectedTotal <= 0) throw new OrderError('Μη έγκυρο σύνολο παραγγελίας.');
  if (!Object.hasOwn(shipping, raw.shippingMethod) || !['iris', 'bank'].includes(raw.paymentMethod)) throw new OrderError('Επίλεξε BoxNow ή courier και πληρωμή με IRIS ή κατάθεση.');
  if (!Array.isArray(raw.items) || raw.items.length < 1 || raw.items.length > 20) throw new OrderError('Επίλεξε από 1 έως 20 διαφορετικά προϊόντα.');
  const ids = new Set<string>();
  const items = raw.items.map((item: any) => {
    if (typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(item.id) || ids.has(item.id) || !Number.isInteger(item.quantity) || item.quantity !== 1) throw new OrderError('Μη έγκυρα προϊόντα ή ποσότητες.');
    ids.add(item.id);
    return { id: item.id as string, quantity: item.quantity as number, customInscription: field(item.customInscription ?? '', 300) };
  });
  const c = raw.customer || {};
  const customer = { name: field(c.name, 100, true), email: field(c.email, 254, true), phone: field(c.phone, 30, true), address: field(c.address ?? '', 250, true), city: field(c.city ?? '', 100, true), postalCode: field(c.postalCode ?? '', 20), notes: field(c.notes ?? '', 1000) };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) || customer.phone.replace(/\D/g, '').length < 8) throw new OrderError('Συμπλήρωσε έγκυρο email και τηλέφωνο.');
  return { requestId: raw.requestId as string, expectedTotalCents: Math.round(raw.expectedTotal * 100), items, customer, shippingMethod: raw.shippingMethod as keyof typeof shipping, paymentMethod: raw.paymentMethod as string };
}
export function priceOrder(input: ReturnType<typeof normalizeOrder>, catalog: Array<any | null>) {
  let subtotalCents = 0;
  const items = input.items.map((requested, index) => {
    const product = catalog[index];
    const stock = Number(product?.stock ?? product?.stockCount ?? 1);
    if (!product || product.isDeleted || product.deletedAt || product.status !== 'Διαθέσιμο' || Object.values(product.checkoutReservations || {}).some(q => Number(q) > 0) || !Number.isInteger(stock) || stock < requested.quantity) throw new OrderError(`Το προϊόν «${product?.name || product?.title || requested.id}» δεν είναι διαθέσιμο στην ποσότητα που επέλεξες.`, 409);
    const cents = Math.round(Number(product.price) * 100);
    if (!Number.isFinite(cents) || cents <= 0) throw new OrderError('Ένα προϊόν δεν έχει έγκυρη τιμή. Επικοινώνησε μαζί μας.', 409);
    subtotalCents += cents * requested.quantity;
    return { ...requested, name: String(product.name || product.title || 'Χειροποίητη δημιουργία'), price: cents / 100, imageUrl: String(product.imageUrl || product.src || '') };
  });
  const option = shipping[input.shippingMethod];
  const shippingCents = option.free > 0 && subtotalCents >= option.free ? 0 : option.cents;
  return { items, subtotal: subtotalCents / 100, shippingCost: shippingCents / 100, total: (subtotalCents + shippingCents) / 100 };
}
export const ORDER_STATUSES = { pending: 'Νέα', waiting_payment: 'Αναμονή πληρωμής', paid: 'Πληρωμένη', shipped: 'Απεστάλη', delivered: 'Παραδόθηκε', cancelled: 'Ακυρωμένη' };
export function nextStatus(previous: string, next: string, paymentMethod = '') {
  const transitions: Record<string, string[]> = { pending: ['waiting_payment', 'paid', 'cancelled'], waiting_payment: ['paid', 'cancelled'], paid: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
  const cashOnDelivery = paymentMethod === 'cod' && ['pending', 'waiting_payment'].includes(previous) && next === 'shipped';
  if (previous !== next && !cashOnDelivery && !transitions[previous]?.includes(next)) throw new OrderError('Αυτή η αλλαγή κατάστασης δεν επιτρέπεται.', 409);
}
