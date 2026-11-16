type Inventory = { status?: string; stock?: number; checkoutReservations?: Record<string, number> };

export function isSoldItem(item: Inventory) {
  return item.status === 'Πουλήθηκε' || ((!item.status || item.status === 'Διαθέσιμο') && item.stock != null && Number(item.stock) <= 0);
}

export function inventoryLabel(item: Inventory) {
  return isSoldItem(item) ? 'Πουλήθηκε' : item.status || 'Μη διαθέσιμο';
}

export function stockForSelectedStatus(status: string, stock: number) {
  if (status === 'Πουλήθηκε') return 0;
  return status === 'Διαθέσιμο' && !(stock > 0) ? 1 : stock;
}

export function compareSoldLast(a: Inventory, b: Inventory) {
  return Number(isSoldItem(a)) - Number(isSoldItem(b));
}

export function assertUnchangedInventory(original: Inventory, latest: Inventory) {
  const reservations = (item: Inventory) => Object.entries(item.checkoutReservations || {})
    .sort(([a], [b]) => a.localeCompare(b));
  if (latest.stock !== original.stock || latest.status !== original.status ||
      JSON.stringify(reservations(latest)) !== JSON.stringify(reservations(original))) {
    throw new Error('Το απόθεμα ή η κατάσταση άλλαξε από άλλη ενέργεια. Κλείστε τη φόρμα και ανοίξτε ξανά το προϊόν.');
  }
}
