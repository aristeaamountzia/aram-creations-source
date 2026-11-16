type Inventory = { status?: string; stock?: number; checkoutReservations?: Record<string, number> };

export const hasActiveReservations = (item: Inventory) => Object.values(item.checkoutReservations || {}).some(quantity => Number(quantity) > 0);

export function assertInventoryChangeAllowed(latest: Inventory, patch?: Inventory) {
  if (patch && Object.keys(patch).some(key => key === 'checkoutReservations' || key.startsWith('checkoutReservations.'))) {
    throw new Error('Οι δεσμεύσεις αποθέματος αλλάζουν μόνο από τις παραγγελίες.');
  }
  if (!hasActiveReservations(latest)) return;
  if (!patch || ('stock' in patch && patch.stock !== latest.stock) || ('status' in patch && patch.status !== latest.status)) {
    throw new Error('Υπάρχει ενεργή παραγγελία. Άλλαξε ή ακύρωσε την παραγγελία πριν αλλάξεις το απόθεμα, την κατάσταση ή διαγράψεις το προϊόν.');
  }
}

export function duplicateJewelryData(item: Record<string, any>) {
  const { id, createdAt, updatedAt, checkoutReservations, ...data } = item;
  return { ...data, ...(hasActiveReservations(item) ? { stock: 0, status: 'Μη διαθέσιμο' } : {}) };
}

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
