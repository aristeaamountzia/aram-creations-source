type Inventory = { status?: string; stock?: number | string | null; stockCount?: number | string | null; isDeleted?: boolean; deletedAt?: unknown; checkoutReservations?: Record<string, number> };

export const hasActiveReservations = (item: Inventory) => Object.values(item.checkoutReservations || {}).some(quantity => Number(quantity) > 0);
export const isArchivedJewelry = (item: Pick<Inventory, 'isDeleted' | 'deletedAt'>) => Boolean(item.isDeleted || item.deletedAt);

export function assertInventoryChangeAllowed(latest: Inventory, patch?: Inventory) {
  if (patch && Object.keys(patch).some(key => key === 'checkoutReservations' || key.startsWith('checkoutReservations.'))) {
    throw new Error('Οι δεσμεύσεις αποθέματος αλλάζουν μόνο από τις παραγγελίες.');
  }
  if (!hasActiveReservations(latest)) return;
  if (!patch || ('stock' in patch && patch.stock !== latest.stock) || ('status' in patch && patch.status !== latest.status) || isArchivedJewelry(patch)) {
    throw new Error('Υπάρχει ενεργή παραγγελία. Ολοκλήρωσέ την ή ακύρωσέ την πριν αλλάξεις το απόθεμα, την κατάσταση ή αρχειοθετήσεις ή διαγράψεις το προϊόν.');
  }
}

export function duplicateJewelryData(item: Record<string, any>) {
  const { id, createdAt, updatedAt, checkoutReservations, ...data } = item;
  return { ...data, ...(hasActiveReservations(item) ? { stock: 0, status: 'Μη διαθέσιμο' } : {}) };
}

export function inventoryStock(item: Inventory) {
  return Number(item.stock ?? item.stockCount ?? 1);
}

export function isAvailableForSale(item: Inventory) {
  const stock = inventoryStock(item);
  return !isArchivedJewelry(item) && item.status === 'Διαθέσιμο' && Number.isInteger(stock) && stock > 0;
}

export function isSoldItem(item: Inventory) {
  return item.status === 'Πουλήθηκε' || ((!item.status || item.status === 'Διαθέσιμο') && inventoryStock(item) <= 0);
}

export function inventoryLabel(item: Inventory) {
  if (isSoldItem(item)) return 'Πουλήθηκε';
  if (item.status === 'Διαθέσιμο' && !Number.isInteger(inventoryStock(item))) return 'Μη διαθέσιμο';
  return item.status || 'Μη διαθέσιμο';
}

export function stockForSelectedStatus(status: string, stock: number) {
  if (status === 'Πουλήθηκε') return 0;
  return status === 'Διαθέσιμο' && !(stock > 0) ? 1 : stock;
}

export function statusForEditedStock(status: string | undefined, stock: number) {
  if (stock === 0 && (!status || status === 'Διαθέσιμο')) return 'Πουλήθηκε';
  if (stock > 0 && status === 'Πουλήθηκε') return 'Διαθέσιμο';
  return status;
}

export function inventoryEditorPatch(original: Inventory | null, status: string, stock: number) {
  if (original && status === inventoryLabel(original) && stock === inventoryStock(original)) return {};
  return {
    status: stock === 0 && status === 'Διαθέσιμο' ? 'Πουλήθηκε' : status,
    stock: status === 'Πουλήθηκε' ? 0 : stock,
  };
}

export function compareSoldLast(a: Inventory, b: Inventory) {
  return Number(isSoldItem(a)) - Number(isSoldItem(b));
}

export function assertUnchangedInventory(original: Inventory, latest: Inventory) {
  const reservations = (item: Inventory) => Object.entries(item.checkoutReservations || {})
    .sort(([a], [b]) => a.localeCompare(b));
  if (latest.stock !== original.stock || latest.stockCount !== original.stockCount || latest.status !== original.status ||
      JSON.stringify(reservations(latest)) !== JSON.stringify(reservations(original))) {
    throw new Error('Το απόθεμα ή η κατάσταση άλλαξε από άλλη ενέργεια. Κλείστε τη φόρμα και ανοίξτε ξανά το προϊόν.');
  }
}
