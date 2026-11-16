import test from 'node:test';
import assert from 'node:assert/strict';
import { replacePortfolioImage, buildPortfolioRecord, type PortfolioRecordForm } from '../src/lib/portfolio-record';

const form = (mediaList: PortfolioRecordForm['mediaList']): PortfolioRecordForm => ({
  title: ' CODEX TEST έργο ',
  category: 'resin-art',
  year: ' 2026 ',
  medium: ' Υγρό γυαλί ',
  dimensions: ' 20 × 30 cm ',
  origin: ' Συλλογή test ',
  status: ' Διαθέσιμο ',
  description: ' Περιγραφή ',
  detailsText: 'Πρώτη λεπτομέρεια\n\n Δεύτερη λεπτομέρεια ',
  featured: true,
  inquiryOnly: false,
  mediaList
});

test('portfolio persistence keeps media order, captions and first media as the cover', () => {
  const record = buildPortfolioRecord(form([
    { url: 'https://example.test/video.mp4', type: 'video', title: 'Κεντρικό βίντεο' },
    { url: 'https://example.test/image.webp', type: 'image', title: 'Λεπτομέρεια έργου' }
  ]), 'timestamp');
  const reloaded = JSON.parse(JSON.stringify(record));

  assert.equal(reloaded.imageUrl, 'https://example.test/video.mp4');
  assert.equal(reloaded.fileType, 'video');
  assert.equal(reloaded.videoUrl, 'https://example.test/video.mp4');
  assert.deepEqual(reloaded.mediaList.map((media: { title?: string }) => media.title), ['Κεντρικό βίντεο', 'Λεπτομέρεια έργου']);
  assert.deepEqual(reloaded.details, ['Πρώτη λεπτομέρεια', 'Δεύτερη λεπτομέρεια']);
});

test('portfolio persistence finds a secondary video without changing the image cover', () => {
  const record = buildPortfolioRecord(form([
    { url: 'https://example.test/cover.jpg', type: 'image', title: 'Κεντρική εικόνα' },
    { url: 'https://example.test/video.mp4', type: 'video', title: 'Βίντεο έργου' }
  ]), 'timestamp');

  assert.equal(record.imageUrl, 'https://example.test/cover.jpg');
  assert.equal(record.fileType, 'image');
  assert.equal(record.videoUrl, 'https://example.test/video.mp4');
});

test('edits keep the earliest original and caption through save, undo and another edit', () => {
  const original = [{ url: 'a.jpg', type: 'image' as const, title: 'Πρώτη' }, { url: 'b.mp4', type: 'video' as const }];
  const first = replacePortfolioImage(original, 0, 'a.jpg', 'v1.jpg');
  const saved = buildPortfolioRecord(form(first), 1);
  const second = replacePortfolioImage(saved.mediaList, 0, 'v1.jpg', 'v2.jpg');
  assert.equal(first[0].originalUrl, 'a.jpg');
  assert.equal(second[0].originalUrl, 'a.jpg');
  assert.equal(second[0].title, 'Πρώτη');
  assert.equal(saved.imageUrl, 'v1.jpg');
  assert.deepEqual(replacePortfolioImage(second, 0, 'v2.jpg', 'a.jpg'), original);
  assert.throws(() => replacePortfolioImage(second, 0, 'v1.jpg', 'stale.jpg'));
  assert.throws(() => replacePortfolioImage(second, 1, 'b.mp4', 'bad.jpg'));
});
