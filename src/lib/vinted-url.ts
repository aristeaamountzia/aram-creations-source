const domains = new Set(['gr', 'fr', 'com', 'de', 'it', 'es', 'nl', 'pl', 'be', 'pt', 'co.uk', 'cz', 'sk', 'at', 'lt', 'lu', 'hu', 'ro', 'hr', 'se', 'dk', 'fi', 'ie']);
export function isVintedHost(host: string) {
  const normalized = host.toLowerCase().replace(/^www\./, '');
  return normalized.startsWith('vinted.') && domains.has(normalized.slice('vinted.'.length));
}

