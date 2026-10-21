import { isVintedHost } from './vinted-url';
export function vintedRefreshPatch(current: any, row: any, pricing: any) {
  const patch: Record<string, any> = {};
  const notes: string[] = [];
  const amount = Number(row.price);
  if (row.priceKnown !== false && row.price !== null && row.price !== '' && Number.isFinite(amount) && amount > 0 && (!row.currency || row.currency === 'EUR')) {
    if (Number.isFinite(pricing?.sitePrice) && pricing.sitePrice > 0) {
      patch.price = pricing.sitePrice;
      patch.vintedBasePrice = amount;
      patch.vintedPricing = pricing;
    }
  } else notes.push('Δεν βρέθηκε έγκυρη τιμή σε ευρώ· η τιμή μένει ίδια.');
  for (const [target, value] of Object.entries({ vintedFavorites: row.vintedFavorites, vintedViews: row.vintedViews })) {
    if (value !== null && value !== undefined && value !== '' && Number.isInteger(Number(value)) && Number(value) >= 0) patch[target] = Number(value);
  }
  // Images are opt-in during refresh: locally curated images remain untouched unless
  // the editor explicitly accepts the newly discovered Vinted gallery.
  const remoteMedia = Array.isArray(row.mediaList) ? row.mediaList
    .filter((media: any) => media?.url && media.type !== 'video')
    .map((media: any) => ({ url: String(media.url), type: 'image', showInShop: true })) : [];
  if (remoteMedia.length) {
    const currentMedia = Array.isArray(current.mediaList) ? current.mediaList
      .filter((media: any) => media?.url && media.showInShop !== false)
      .map((media: any) => String(media.url)) : [];
    const nextMedia = remoteMedia.map((media: any) => media.url);
    if (JSON.stringify(currentMedia) !== JSON.stringify(nextMedia)) {
      patch.mediaList = remoteMedia;
      patch.imageUrl = remoteMedia[0].url;
      patch.fileType = 'image';
    }
  }
  const reserved = Object.values(current.checkoutReservations || {}).some(q => Number(q) > 0);
  if (reserved) notes.push('Υπάρχει δέσμευση παραγγελίας· η κατάσταση και το απόθεμα προστατεύονται.');
  else if (row.availabilityKnown === true) {
    if (row.isSold === true) { patch.status = 'Πουλήθηκε'; patch.stock = 0; }
    else if (row.isReserved === true) patch.status = 'Κρατημένο';
    else if (row.availability === 'unavailable') { patch.status = 'Μη διαθέσιμο'; patch.stock = 0; }
    else if (row.availability === 'available' && current.status === 'Κρατημένο' && current.lastVintedAvailability === 'reserved') patch.status = 'Διαθέσιμο';
    else if (row.availability === 'available' && current.status !== 'Διαθέσιμο') notes.push('Το Vinted είναι διαθέσιμο· η τοπική κατάσταση δεν επαναφέρεται χωρίς έλεγχο.');
    patch.lastVintedAvailability = row.isSold ? 'sold' : row.isReserved ? 'reserved' : row.availability;
  } else notes.push('Δεν επιβεβαιώθηκε διαθεσιμότητα· κατάσταση και απόθεμα μένουν ίδια.');
  for (const key of Object.keys(patch)) if (JSON.stringify(current[key]) === JSON.stringify(patch[key])) delete patch[key];
  return { patch, notes };
}

export function refreshBaseline(item: any) {
  const stable = (value: any): any => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
  return JSON.stringify(stable([item.price ?? null, item.status ?? null, item.stock ?? null, item.checkoutReservations ?? {}, item.lastVintedRefreshAt ?? null, item.sourceUrl ?? null, item.vintedUrl ?? null, item.purchaseLinks ?? null, item.productLinks ?? null, item.postedPlatforms ?? null, item.vintedPricing ?? null, item.vintedBasePrice ?? null, item.vintedFavorites ?? null, item.vintedViews ?? null, item.lastVintedAvailability ?? null, item.mediaList ?? null, item.imageUrl ?? null]));
}

export type RefreshChoice = { price: boolean; availability: boolean; favorites: boolean; views: boolean; images: boolean; priceValue: string; statusValue: string; stockValue: string };
export function chooseRefreshPatch(item: any, proposed: any, choices: RefreshChoice) {
  const patch: Record<string, any> = {};
  if (choices.price) {
    const price = Number(choices.priceValue);
    if (!choices.priceValue.trim() || !Number.isFinite(price) || price <= 0 || price > 100000) throw new Error('Συμπλήρωσε θετική τιμή έως 100.000 €.');
    patch.price = Math.round(price * 100) / 100;
    if (proposed.vintedBasePrice !== undefined) patch.vintedBasePrice = proposed.vintedBasePrice;
    patch.vintedPricing = patch.price === proposed.price ? proposed.vintedPricing || item.vintedPricing || { sitePrice: patch.price } : { ...(proposed.vintedPricing || item.vintedPricing || {}), sitePrice: patch.price, mode: 'manual' };
  }
  if (choices.availability) {
    if (Object.values(item.checkoutReservations || {}).some(q => Number(q) > 0)) throw new Error('Η καταχώρηση έχει ενεργή παραγγελία.');
    if (!choices.statusValue || !['0','1'].includes(choices.stockValue)) throw new Error('Έλεγξε κατάσταση και απόθεμα (0 ή 1).');
    patch.status = choices.statusValue; patch.stock = ['Πουλήθηκε','Μη διαθέσιμο','Δωρίστηκε'].includes(patch.status) ? 0 : Number(choices.stockValue);
    if (proposed.lastVintedAvailability) patch.lastVintedAvailability = proposed.lastVintedAvailability;
  }
  for (const [enabled, key] of [[choices.favorites, 'vintedFavorites'], [choices.views, 'vintedViews']] as const) if (enabled && proposed[key] !== undefined) patch[key] = proposed[key];
  if (choices.images && Array.isArray(proposed.mediaList)) {
    patch.mediaList = proposed.mediaList;
    patch.imageUrl = proposed.imageUrl || proposed.mediaList[0]?.url || item.imageUrl;
    patch.fileType = proposed.fileType || 'image';
  }
  for (const key of Object.keys(patch)) if (JSON.stringify(item[key]) === JSON.stringify(patch[key])) delete patch[key];
  return patch;
}

export function vintedSourceUrl(item: any) {
  const links = [...(Array.isArray(item?.purchaseLinks) ? item.purchaseLinks : []), ...(Array.isArray(item?.productLinks) ? item.productLinks : []), ...(Array.isArray(item?.postedPlatforms) ? item.postedPlatforms : [])];
  const candidates = [item?.vintedUrl, item?.sourceUrl, ...links.map(link => link?.url)];
  for (const raw of candidates) { try { const url = new URL(String(raw || '').trim()); if (url.protocol === 'https:' && !url.username && !url.password && !url.port && isVintedHost(url.hostname) && /^\/items\/\d+(?:-|\/|$)/.test(url.pathname)) return url.href; } catch {} }
  return '';
}
