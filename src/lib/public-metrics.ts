export async function recordPublicMetric(id: string, kind: 'view' | 'favorite', delta: number) {
  const response = await fetch('/api/catalog-metrics', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, kind, delta, requestId: crypto.randomUUID() }) });
  if (!response.ok) throw Error('Δεν ενημερώθηκε ο μετρητής.');
}
