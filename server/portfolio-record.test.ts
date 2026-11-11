import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPortfolioRecord, type PortfolioRecordForm } from '../src/lib/portfolio-record';

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
