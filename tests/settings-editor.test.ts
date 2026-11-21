import assert from 'node:assert/strict';
import test from 'node:test';
import { galleryHeroCss } from '../src/lib/hero-appearance';
import { mergeSettings, settingsChanges } from '../src/lib/settings-changes';

test('settings updates preserve unchanged design fields and concurrent edits', () => {
  const initial = { designStudio: { brandName: 'Aram', ink: '#191919' }, shippingSettings: { boxnowPrice: 2.5 }, heroTitle: 'Before' };
  const draft = { ...initial, designStudio: { ...initial.designStudio, brandName: 'Aram Creations' }, heroTitle: 'After' };
  const changes = settingsChanges(initial, draft);
  assert.deepEqual(changes, { designStudio: { brandName: 'Aram Creations' }, heroTitle: 'After' });
  assert.deepEqual(mergeSettings({ ...initial, designStudio: { ...initial.designStudio, ink: '#222222' }, shippingSettings: { boxnowPrice: 3 } }, changes),
    { designStudio: { brandName: 'Aram Creations', ink: '#222222' }, shippingSettings: { boxnowPrice: 3 }, heroTitle: 'After' });
});

test('gallery accepts bounded layout controls and ignores legacy color settings', () => {
  assert.deepEqual(galleryHeroCss({ heroMinHeight: '510px', heroOverlay: '9', heroTopPadding: '10px', heroTitleSize: '', heroTitleInk: '#ff0000' }),
    { '--gallery-hero-min-height': '510px', '--gallery-hero-top-padding': '72px', '--gallery-hero-overlay': '1' });
});
