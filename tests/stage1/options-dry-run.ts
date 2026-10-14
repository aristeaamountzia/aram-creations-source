// Diagnostic only: no database dependency and no write operation.
export function colorDryRun(products: { id: string; colors?: string[] }[], palette: Record<string, string> = {}) {
  const mappings = { 'Μοβ': 'Μωβ' };
  const changes = products.map(p => ({ id: p.id, before: p.colors || [], after: [...new Set((p.colors || []).map(c => mappings[c as keyof typeof mappings] || c))] })).filter(p => JSON.stringify(p.before) !== JSON.stringify(p.after));
  return { mappings, changes, paletteConflict: Boolean(palette['Μοβ'] && palette['Μωβ'] && palette['Μοβ'] !== palette['Μωβ']), applied: false };
}
