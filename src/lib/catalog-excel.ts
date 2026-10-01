import type { Worksheet } from 'exceljs';

type RecordData = Record<string, any>;
export type Thumbnail = { base64: string; extension: 'jpeg' | 'png' | 'gif' };
export type ThumbnailLoader = (url: string, signal?: AbortSignal) => Promise<Thumbnail>;
export type ExportProgress = { completed: number; total: number; stage: 'images' | 'file' };
const text = (value: any): string => value == null ? '' : Array.isArray(value) ? value.map(text).join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value);
const number = (value: any): number | null => value === '' || value == null ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const links = (list: any) => (Array.isArray(list) ? list : []).map(item => typeof item === 'string' ? item : [item.site || item.title, item.url].filter(Boolean).join(': ')).join('\n');
const video = (url: string, type?: string) => type?.startsWith('video') || /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(url);
export function thumbnailUrl(item: RecordData): string {
  const media = Array.isArray(item.mediaList) ? item.mediaList : [];
  const primary = item.imageUrl || item.image || item.src;
  if (primary && !video(primary, media.find((m: any) => m.url === primary)?.type || item.fileType) && primary !== item.videoUrl) return primary;
  return media.find((m: any) => m.url && !video(m.url, m.type))?.url || item.posterUrl || item.thumbnailUrl || (item.images || []).find((url: string) => !video(url)) || '';
}
const mediaUrls = (item: RecordData) => [...new Set([item.imageUrl, item.image, item.videoUrl, ...(item.mediaList || []).map((m: any) => m.url), ...(item.images || [])].filter(Boolean))].join('\n');
const archived = (item: RecordData) => item.isDeleted || item.deletedAt ? 'Αρχείο' : 'Ενεργό';
type Column = { header: string; width: number; value: (item: RecordData) => any; money?: boolean };
const shopColumns: Column[] = [
  { header: 'Τίτλος', width: 40, value: i => i.name || i.title },
  { header: 'Κατηγορία', width: 23, value: i => i.category },
  { header: 'Κατάσταση', width: 20, value: i => i.status },
  { header: 'Τιμή (€)', width: 14, value: i => number(i.price), money: true },
  { header: 'Απόθεμα', width: 12, value: i => number(i.stock ?? i.stockCount) },
  { header: 'Συλλογή', width: 27, value: i => i.collection },
  { header: 'Χρώματα', width: 26, value: i => text(i.colors) },
  { header: 'Υλικά', width: 35, value: i => text(i.materials) },
  { header: 'Περιγραφή', width: 65, value: i => i.description },
  { header: 'Σημειώσεις', width: 45, value: i => i.notes },
  { header: 'Κόστος (€)', width: 15, value: i => number(i.cost), money: true },
  { header: 'Αρχική τιμή (€)', width: 18, value: i => number(i.originalPrice), money: true },
  { header: 'Τιμή Vinted (€)', width: 18, value: i => number(i.vintedBasePrice), money: true },
  { header: 'Βάρος', width: 16, value: i => i.weight },
  { header: 'Διαστάσεις', width: 24, value: i => i.dimensions },
  { header: 'Κωδικός αποθήκευσης', width: 25, value: i => i.storage },
  { header: 'Links αγοράς', width: 55, value: i => links(i.purchaseLinks || i.productLinks) },
  { header: 'Αναρτήσεις', width: 55, value: i => links(i.postedPlatforms) },
  { header: 'Ημ. κατασκευής', width: 20, value: i => i.dateCreated || i.manufactureDate || i.creationDate },
  { header: 'Κεντρική εικόνα (URL)', width: 55, value: thumbnailUrl },
  { header: 'Εικόνες / βίντεο (URLs)', width: 55, value: mediaUrls },
  { header: 'Αρχείο καταχώρησης', width: 22, value: archived },
  { header: 'ID', width: 30, value: i => i.id },
  { header: 'Πλήρη στοιχεία (JSON)', width: 65, value: i => JSON.stringify(i) },
];
const portfolioColumns: Column[] = [
  { header: 'Τίτλος', width: 40, value: i => i.title || i.name },
  { header: 'Κατηγορία', width: 25, value: i => i.categoryTitle || i.category },
  { header: 'Κατάσταση', width: 25, value: i => i.status },
  { header: 'Έτος', width: 12, value: i => i.year },
  { header: 'Υλικά / τεχνική', width: 45, value: i => i.medium },
  { header: 'Διαστάσεις', width: 30, value: i => i.dimensions },
  { header: 'Περιγραφή', width: 65, value: i => i.description },
  { header: 'Λεπτομέρειες', width: 55, value: i => (i.details || []).join('\n') },
  { header: 'Προέλευση', width: 30, value: i => i.origin },
  { header: 'Σειρά Portfolio', width: 20, value: i => number(i.portfolioOrder) },
  { header: 'Επικοινωνία για αγορά', width: 24, value: i => i.inquiryOnly === false ? 'Όχι' : 'Ναι' },
  { header: 'Προτεινόμενο', width: 18, value: i => i.featured ? 'Ναι' : 'Όχι' },
  { header: 'Κεντρική εικόνα (URL)', width: 55, value: thumbnailUrl },
  { header: 'Εικόνες / βίντεο (URLs)', width: 55, value: mediaUrls },
  { header: 'Αρχείο καταχώρησης', width: 22, value: archived },
  { header: 'ID', width: 30, value: i => i.id },
  { header: 'Πλήρη στοιχεία (JSON)', width: 65, value: i => JSON.stringify(i) },
];

export async function buildCatalogExcel({ shop, portfolio, loadThumbnail, signal, onProgress, now = new Date() }: {
  shop: RecordData[]; portfolio: RecordData[]; loadThumbnail: ThumbnailLoader; signal?: AbortSignal;
  onProgress?: (progress: ExportProgress) => void; now?: Date;
}) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Aram Creations'; workbook.created = now;
  let completed = 0, embedded = 0;
  const missing: string[] = [], total = shop.length + portfolio.length;
  let overflow: Worksheet | undefined;
  function cellValue(value: any, section: string, id: string, field: string) {
    if (typeof value === 'number' || value === null) return value;
    const content = text(value);
    if (content.length <= 32767) return content;
    if (!overflow) {
      overflow = workbook.addWorksheet('Πλήρες κείμενο');
      overflow.columns = [{ header: 'Κατάλογος', width: 18 }, { header: 'ID', width: 30 }, { header: 'Πεδίο', width: 28 }, { header: 'Τμήμα', width: 12 }, { header: 'Κείμενο', width: 100 }];
      overflow.views = [{ state: 'frozen', ySplit: 1 }];
    }
    for (let offset = 0; offset < content.length; offset += 30000) overflow.addRow([section, id, field, Math.floor(offset / 30000) + 1, content.slice(offset, offset + 30000)]);
    return content.slice(0, 32000) + '\n[Συνέχεια στο φύλλο «Πλήρες κείμενο»]';
  }
  const rows: { sheet: Worksheet; row: number; item: RecordData; section: string }[] = [];
  for (const [name, items, columns] of [['Shop', shop, shopColumns], ['Portfolio', portfolio, portfolioColumns]] as const) {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = [{ width: 18 }, ...columns.map(c => ({ width: c.width }))];
    sheet.mergeCells(1, 1, 1, columns.length + 1);
    sheet.getCell('A1').value = `Aram Creations — ${name}`;
    sheet.getCell('A1').font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF292524' } };
    sheet.getRow(1).height = 34;
    sheet.mergeCells(2, 1, 2, columns.length + 1);
    sheet.getCell('A2').value = `${items.length} καταχωρήσεις · ${now.toLocaleString('el-GR', { timeZone: 'Europe/Athens' })} · Ενσωματωμένες μικρογραφίες, διαθέσιμες χωρίς internet.`;
    sheet.getCell('A2').font = { name: 'Calibri', size: 11, color: { argb: 'FF57534E' } };
    sheet.getRow(2).height = 24;
    sheet.getRow(4).values = ['Μικρογραφία', ...columns.map(c => c.header)];
    sheet.getRow(4).height = 32;
    sheet.getRow(4).eachCell(cell => { cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }; cell.alignment = { vertical: 'middle', wrapText: true }; });
    sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: 4 }];
    sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: Math.max(4, items.length + 4), column: columns.length + 1 } };
    items.forEach(item => {
      const row = sheet.addRow(['', ...columns.map(c => cellValue(c.value(item), name, item.id, c.header))]);
      row.height = 90;
      row.eachCell({ includeEmpty: true }, cell => {
        cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF292524' } };
        cell.alignment = { vertical: 'top', wrapText: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row.number % 2 ? 'FFFAFAF9' : 'FFFFFFFF' } };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFE7E5E4' } } };
      });
      columns.forEach((c, index) => { if (c.money) row.getCell(index + 2).numFmt = '#,##0.00 "€"'; });
      rows.push({ sheet, row: row.number, item, section: name });
    });
  }
  let cursor = 0;
  // Only two images are decoded at once; originals are released after resizing.
  await Promise.all(Array.from({ length: Math.min(2, rows.length) }, async () => {
    while (cursor < rows.length) {
      signal?.throwIfAborted();
      const { sheet, row, item, section } = rows[cursor++];
      const url = thumbnailUrl(item);
      if (url) {
        try {
          const thumbnail = await loadThumbnail(url, signal);
          signal?.throwIfAborted();
          const id = workbook.addImage(thumbnail);
          sheet.addImage(id, { tl: { col: 0.1, row: row - 1 + 0.07 }, ext: { width: 104, height: 104 }, editAs: 'oneCell' });
          embedded++;
        } catch (error) {
          signal?.throwIfAborted();
          missing.push(`${section}: ${item.name || item.title || item.id}`);
          sheet.getCell(row, 1).value = 'Δεν φορτώθηκε η μικρογραφία';
          sheet.getCell(row, 1).font = { size: 10, color: { argb: 'FFB45309' } };
        }
      } else sheet.getCell(row, 1).value = 'Χωρίς εικόνα';
      completed++; onProgress?.({ completed, total, stage: 'images' });
    }
  }));
  signal?.throwIfAborted(); onProgress?.({ completed, total, stage: 'file' });
  const buffer = await workbook.xlsx.writeBuffer();
  signal?.throwIfAborted();
  return { buffer: new Uint8Array(buffer), embedded, missing, total };
}
