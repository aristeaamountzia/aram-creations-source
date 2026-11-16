export interface ConfirmedStripePayment {
  orderNumber: string;
  total?: number;
}

export async function confirmStripePayment(
  sessionId: string,
  orderId: string | null,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch
): Promise<ConfirmedStripePayment> {
  const timeout = AbortSignal.timeout(30_000);
  const response = await fetcher('/api/stripe-confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, orderId }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok !== true || data?.paid !== true) {
    const reason = typeof data?.error === 'string' ? data.error
      : typeof data?.message === 'string' ? data.message : '';
    throw new Error(reason || `Η επιβεβαίωση πληρωμής επέστρεψε μη έγκυρη απάντηση (HTTP ${response.status}).`);
  }
  if (typeof data.orderNumber !== 'string' || !data.orderNumber.trim()) {
    throw new Error('Η επιβεβαίωση πληρωμής δεν επέστρεψε αριθμό παραγγελίας.');
  }
  return {
    orderNumber: data.orderNumber,
    total: typeof data.total === 'number' && Number.isFinite(data.total) && data.total >= 0 ? data.total : undefined
  };
}
