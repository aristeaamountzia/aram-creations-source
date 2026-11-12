const FORMULA_PREFIX = /^[\s]*[=+\-@]/;

export function csvCell(value: unknown): string {
  const raw = String(value ?? '').replace(/\0/g, '');
  const safe = FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildCsv(headers: unknown[], rows: unknown[][], delimiter = ','): string {
  return [headers, ...rows]
    .map(row => row.map(csvCell).join(delimiter))
    .join('\r\n');
}

export function downloadCsv(content: string, filename: string): void {
  const url = URL.createObjectURL(new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
