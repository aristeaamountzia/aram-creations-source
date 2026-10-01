const normal = (text: string) => String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_]+/g, ' ');
function categoryIn(text: string) {
  const t = normal(text);
  const rules: [string, RegExp][] = [
    ['Σετ', /(?:^|\s)(?:σετ|σετακι|set|combo|bundle)(?:\s|$)/],
    ['Θήκες Αναπτήρων', /(?:θηκ.*αναπτ|αναπτ.*θηκ|lighter\s*(?:case|cover)|thik.*anapt)/],
    ['Μπρελόκ', /μπρελοκ|keychain|key\s*ring/],
    ['Ribbon Flower Bouquets', /(?:μπουκετ|bouquet|ανθοδεσμ)/],
    ['Σκουλαρίκια', /σκουλαρ|earrings?\b|hoops?\b|skoular/],
    ['Κολιέ', /κολιε|μενταγιον|necklace|pendant|choker|\bkolie\b/],
    ['Βραχιόλια', /βραχιολ|bracelet|bangle|vrachiol/],
    ['Δαχτυλίδια', /δαχτυλ|\brings?\b|signet|daxtyl|dachtyl/],
    ['Καρφίτσες', /καρφιτσ|brooch|\blapel pin\b|karfits/],
    ['Θήκες Κινητών', /(?:θηκ.*κινητ|phone\s*(?:case|cover)|mobile\s*case|iphone.*(?:case|cover))/],
    ['Γούρια', /γουρι|lucky charm/], ['Σελιδοδείκτες', /σελιδοδεικ|bookmark/], ['Μαγνητάκια', /μαγνητ|magnet/]
  ];
  return rules.find(([, re]) => re.test(t))?.[0];
}
export const classifyVintedCategory = (title: string, metadata = '', description = '') => categoryIn(title) || categoryIn(metadata) || categoryIn(description) || 'Άλλα';

export function listingState(item: any): { availability: 'sold' | 'reserved' | 'available' | 'unavailable'; isSold: boolean; isReserved: boolean } | null {
  const status = typeof item.status === 'string' ? item.status.toLowerCase() : '';
  const explicit = String(item.availability || item.item_status || '').toLowerCase();
  const states = [status, explicit];
  if (item.is_sold === true || states.includes('sold')) return { availability: 'sold', isSold: true, isReserved: false };
  if (item.is_reserved === true || states.includes('reserved')) return { availability: 'reserved', isSold: false, isReserved: true };
  if (item.is_closed === true || item.is_hidden === true || states.some(s => ['unavailable', 'closed', 'deleted'].includes(s))) return { availability: 'unavailable', isSold: false, isReserved: false };
  if (states.some(s => ['available', 'active', 'in_stock'].includes(s)) || (item.is_sold === false && item.is_reserved === false && item.is_closed === false)) return { availability: 'available', isSold: false, isReserved: false };
  return null;
}
export function extractListingState(html: string, id: string) {
  if (!/^\d+$/.test(id)) return null;
  const source = html.replace(/\\"/g, '"').replace(/\\u0026/gi, '&');
  const marker = new RegExp(`"id"\\s*:\\s*(?:"${id}"|${id})(?=\\s*[,}])`, 'g');
  let best: ReturnType<typeof listingState> = null;
  for (const match of source.matchAll(marker)) {
    const start = source.lastIndexOf('{', match.index);
    if (start < 0 || match.index! - start > 10000) continue;
    let depth = 0, quoted = false, escaped = false;
    for (let i = start; i < Math.min(source.length, start + 500000); i++) {
      const c = source[i];
      if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue; }
      if (c === '"') quoted = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) {
        try { const item = JSON.parse(source.slice(start, i+1)); if (String(item.id) === id) { const result = listingState(item); if (result?.isSold) return result; if (result && (!best || result.isReserved)) best = result; } } catch {}
        break;
      }
    }
  }
  return best;
}
