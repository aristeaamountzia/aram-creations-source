let favoritesQueue = Promise.resolve();
export function trackShopMetric(itemId: string, action: 'view' | 'favorite', liked?: boolean) {
  const send = async () => {
    let visitorId = localStorage.getItem('aram_shop_visitor');
    if (!visitorId) { visitorId = crypto.randomUUID(); localStorage.setItem('aram_shop_visitor', visitorId); }
    const response = await fetch('/api/shop-metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, visitorId, action, ...(liked !== undefined ? { liked } : {}) }), signal: AbortSignal.timeout(15_000) });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
  };
  if (action === 'favorite') { favoritesQueue = favoritesQueue.then(send, send); return favoritesQueue; }
  return send();
}
