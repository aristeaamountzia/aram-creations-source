import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { buildCatalogExcel, thumbnailUrl } from '../src/lib/catalog-excel';
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=';

test('Workbook preserves all records, Unicode, typed prices, raw details and embedded images', async () => {
  const shop = [{ id: 'one', name: '=HYPERLINK("https://example.com")', price: 7.83, stock: 0, colors: ['Μπλε'], mediaList: [{ type: 'video', url: 'https://example.com/video.mp4' }, { type: 'image', url: 'https://example.com/image.png' }], customField: 'Ακριβές στοιχείο' },
    { id: 'two', name: 'Χωρίς εικόνα', price: 0 },
    { id: 'three', name: 'Αποτυχία εικόνας', imageUrl: 'https://example.com/missing.png' }];
  const portfolio = [{ id: 'art', title: 'Γλυπτό', image: 'https://example.com/art.png', isDeleted: true, description: 'α'.repeat(40000) }];
  const output = await buildCatalogExcel({ shop, portfolio, loadThumbnail: async url => { if (url.includes('missing')) throw Error('404'); return { base64: png, extension: 'png' }; }, now: new Date('2026-10-01T19:00:00Z') });
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(output.buffer as any);
  assert.equal(output.total, 4); assert.equal(output.embedded, 2); assert.equal(output.missing.length, 1);
  const sheet = workbook.getWorksheet('Shop')!;
  assert.equal(sheet.rowCount, 7); assert.equal(sheet.getCell('B5').value, shop[0].name);
  assert.equal(sheet.getCell('B5').type, ExcelJS.ValueType.String);
  assert.equal(sheet.getCell('E5').value, 7.83); assert.equal(sheet.getCell('F5').value, 0);
  assert.equal(sheet.getCell('E6').value, 0); assert.equal(sheet.getImages().length, 1);
  assert.match(sheet.getCell('A7').text, /Δεν φορτώθηκε/);
  assert.match(sheet.getRow(5).getCell(25).text, /Ακριβές στοιχείο/);
  const art = workbook.getWorksheet('Portfolio')!;
  assert.equal(art.getImages().length, 1); assert.equal(art.getCell('P5').value, 'Αρχείο');
  assert.ok(workbook.getWorksheet('Πλήρες κείμενο'));
  assert.equal(art.views[0].ySplit, 4);
  assert.equal(thumbnailUrl(shop[0]), 'https://example.com/image.png');
});

test('Cancellation stops before writing a downloadable workbook', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(() => buildCatalogExcel({ shop: [{ imageUrl: 'https://example.com/a.png' }], portfolio: [], signal: controller.signal, loadThumbnail: async () => ({ base64: png, extension: 'png' }) }), { name: 'AbortError' });
});
