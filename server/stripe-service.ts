import { publicPath, type PublicLocale } from '../src/lib/public-locale';
import { OrderError } from './orders-core';

interface StripeSessionItem {
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CreateSessionParams {
  orderId: string;
  orderNumber: string;
  items: StripeSessionItem[];
  shippingMethod: string;
  shippingCost: number;
  customerEmail: string;
  origin: string;
  cancelToken?: string;
  locale?: PublicLocale;
}

const SHIPPING_LABELS: Record<string, string> = {
  boxnow: 'BoxNow Locker 24/7',
  courier: 'Courier (ACS / Speedex)'
};

export async function createStripeCheckoutSession(params: CreateSessionParams): Promise<{ id: string; url: string }> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new OrderError('Η πληρωμή μέσω Stripe δεν είναι διαθέσιμη αυτή τη στιγμή (απαιτείται κλειδί API).', 503);
  }

  const rawOrigin = (params.origin || process.env.PUBLIC_SITE_URL || process.env.URL || 'https://aramcreationsofficial.netlify.app').trim().replace(/\/$/, '');
  const baseOrigin = rawOrigin || 'https://aramcreationsofficial.netlify.app';
  const locale = params.locale || 'el';
  const returnPath = baseOrigin + publicPath(locale);
  const successUrl = `${returnPath}?session_id={CHECKOUT_SESSION_ID}&order_id=${encodeURIComponent(params.orderId)}#order-success`;
  const cancelUrl = `${returnPath}?order_cancelled=${encodeURIComponent(params.orderId)}${params.cancelToken ? `&cancel_token=${encodeURIComponent(params.cancelToken)}` : ''}#cart`;

  const body = new URLSearchParams();
  body.append('mode', 'payment');
  body.append('locale', locale);
  body.append('success_url', successUrl);
  body.append('cancel_url', cancelUrl);
  body.append('client_reference_id', params.orderId);
  body.append('customer_email', params.customerEmail);
  body.append('metadata[orderId]', params.orderId);
  body.append('metadata[orderNumber]', params.orderNumber);

  // Line items
  params.items.forEach((item, index) => {
    body.append(`line_items[${index}][price_data][currency]`, 'eur');
    body.append(`line_items[${index}][price_data][unit_amount]`, String(Math.round(item.price * 100)));
    body.append(`line_items[${index}][price_data][product_data][name]`, item.name);
    if (item.imageUrl && item.imageUrl.startsWith('http')) {
      body.append(`line_items[${index}][price_data][product_data][images][0]`, item.imageUrl);
    }
    body.append(`line_items[${index}][quantity]`, String(item.quantity));
  });

  // Shipping item if cost > 0
  if (params.shippingCost > 0) {
    const sIndex = params.items.length;
    const shippingLabel = SHIPPING_LABELS[params.shippingMethod] || (locale === 'en' ? 'Delivery' : 'Μεταφορικά');
    body.append(`line_items[${sIndex}][price_data][currency]`, 'eur');
    body.append(`line_items[${sIndex}][price_data][unit_amount]`, String(Math.round(params.shippingCost * 100)));
    body.append(`line_items[${sIndex}][price_data][product_data][name]`, `${locale === 'en' ? 'Shipping' : 'Έξοδα Αποστολής'} (${shippingLabel})`);
    body.append(`line_items[${sIndex}][quantity]`, '1');
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Idempotency-Key': `aram-checkout-${params.orderId}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString(),
    signal: AbortSignal.timeout(20_000)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.id || !data.url) {
    const errorMsg = data?.error?.message || 'Αποτυχία αρχικοποίησης πληρωμής στη Stripe.';
    console.error('Stripe Checkout creation error:', data);
    const definitelyRejected = [400, 401, 403, 404, 422].includes(response.status) && data?.error?.type !== 'idempotency_error';
    throw new OrderError(`Σφάλμα Stripe: ${errorMsg}`, 502, definitelyRejected ? 'STRIPE_SESSION_REJECTED' : undefined);
  }

  return { id: data.id, url: data.url };
}

export async function retrieveStripeCheckoutSession(sessionId: string): Promise<any> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new OrderError('Μη διαθέσιμο κλειδί Stripe.', 503);
  }

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'GET',
    signal: AbortSignal.timeout(20_000),
    headers: {
      'Authorization': `Bearer ${secretKey}`
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.id) {
    const errorMsg = data?.error?.message || 'Αποτυχία ανάκτησης συνεδρίας Stripe.';
    throw new OrderError(`Σφάλμα Stripe: ${errorMsg}`, 502);
  }

  return data;
}

export async function expireStripeCheckoutSession(sessionId: string): Promise<any> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new OrderError('Μη διαθέσιμο κλειδί Stripe.', 503);
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}/expire`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}` },
    signal: AbortSignal.timeout(20_000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status !== 'expired') throw new OrderError(data?.error?.message || 'Η συνεδρία Stripe δεν επιβεβαιώθηκε ως ληγμένη.', 409);
  return data;
}

