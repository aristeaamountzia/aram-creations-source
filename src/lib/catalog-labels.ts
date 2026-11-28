export const catalogLabelKey = (label: string) =>
  label.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('el').replace(/ς/g, 'σ').trim().replace(/\s+/g, ' ');

export function catalogLabelCounts(labels: Array<string | undefined>, displayedLabels: string[]) {
  const counts = new Map<string, number>();
  for (const label of labels) {
    if (typeof label !== 'string' || !label.trim()) continue;
    const key = catalogLabelKey(label);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Object.fromEntries(displayedLabels.map(label => [label, counts.get(catalogLabelKey(label)) || 0]));
}

export const colorKey = (label: string) => {
  const key = catalogLabelKey(label);
  return key === 'μοβ' ? 'μωβ' : key;
};

export const materialKey = (label: string) => {
  const key = catalogLabelKey(label);
  return key === 'υγρο γυαλι (resin)' ? 'υγρο γυαλι' : key;
};

export function uniqueCatalogLabels(labels: Array<string | undefined>, key = catalogLabelKey) {
  const seen = new Set<string>();
  return labels.flatMap(label => {
    if (typeof label !== 'string' || !label.trim()) return [];
    const normalized = key(label);
    if (seen.has(normalized)) return [];
    seen.add(normalized);
    return [label.trim()];
  });
}

const colorSwatches: Record<string, string> = {
  'Διάφανο': '#f8fafc', 'Μαύρο': '#171717', 'Λευκό': '#f8fafc', 'Χρυσό': '#c9a35e',
  'Ασημί': '#cbd5e1', 'Κόκκινο': '#b91c1c', 'Μπλε': '#2563eb', 'Πράσινο': '#2f855a',
  'Ροζ': '#ec9fb4', 'Μωβ': '#8b5cf6', 'Κίτρινο': '#eab308', 'Πολύχρωμο': '#d1d5db',
  'Μέντα': '#98d9bc', 'Λιλά': '#c8a2dc',
};
const defaultSwatches = new Map(Object.entries(colorSwatches).map(([label, hex]) => [colorKey(label), hex]));

export function catalogColorSwatch(label: string, palette: Record<string, string> = {}) {
  const key = colorKey(label);
  return (Object.hasOwn(palette, label) ? palette[label] : '') ||
    Object.entries(palette).find(([name]) => colorKey(name) === key)?.[1] ||
    defaultSwatches.get(key) || '#d6d3d1';
}

export function publicProductDescription(item: { description?: string; notes?: string }) {
  if (typeof item.description === 'string') return item.description.trim();
  if (typeof item.notes !== 'string') return '';
  return item.notes.split(/\r?\n/)
    .filter(line => !line.startsWith('Προσοχή: Δεν αντιγράφηκαν όλες οι Vinted εικόνες'))
    .join('\n').trim();
}
