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
  return JSON.stringify([item.price ?? null, item.status ?? null, item.stock ?? null, item.checkoutReservations ?? {}, item.lastVintedRefreshAt ?? null, item.sourceUrl ?? null, item.purchaseLinks ?? null, item.postedPlatforms ?? null]);
}

