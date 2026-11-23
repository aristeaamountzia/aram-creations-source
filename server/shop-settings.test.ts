import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SHOP_SETTINGS, normalizeShopSettings } from '../src/shopSettings';
import { DEFAULT_SHOP_SETTINGS as editorDefaults, MINIMAL_SHOP_SETTINGS } from '../src/components/backoffice/catalog-config';
import { FALLBACK_HERO_SNAPSHOT, pickHeroSnapshot } from '../src/lib/hero-media';

test('editor and public settings share defaults while minimal remains an explicit preset', () => {
  assert.equal(editorDefaults, DEFAULT_SHOP_SETTINGS);
  assert.deepEqual(normalizeShopSettings(undefined), DEFAULT_SHOP_SETTINGS);
  assert.equal(MINIMAL_SHOP_SETTINGS.bgColor, '#ffffff');
  assert.equal(MINIMAL_SHOP_SETTINGS.portfolioDesign, DEFAULT_SHOP_SETTINGS.portfolioDesign);
});

test('modern theme survives normalization and cached hero settings while older themes remain valid', () => {
  for (const visualTheme of ['modern', 'classic', 'atelier'] as const) {
    assert.equal(normalizeShopSettings({ visualTheme }).visualTheme, visualTheme);
    assert.equal(pickHeroSnapshot({ visualTheme }).visualTheme, visualTheme);
  }
  assert.equal(pickHeroSnapshot({}).heroVideoUrl, FALLBACK_HERO_SNAPSHOT.heroVideoUrl);
  assert.equal(pickHeroSnapshot({ heroVideoUrl: '', portfolioHeroVideoUrl: '' }).heroVideoUrl, '');
  assert.equal(pickHeroSnapshot({ heroVideoUrl: '', portfolioHeroVideoUrl: '' }).portfolioHeroVideoUrl, '');
});

test('partial legacy settings preserve saved appearance, false flags, empty links and free shipping', () => {
  const result = normalizeShopSettings({ heroTitle: 'Saved title', announcementEnabled: false,
    borderRadius: 0, fallbackLinks: { Vinted: '' }, categoryOrder: [],
    shippingSettings: { boxnowPrice: 0, boxnowFreeThreshold: 0 },
    portfolioHeroVideoUrl: 'https://example.test/hero.mp4',
    portfolioDesign: { title: 'Saved portfolio', labels: { ...DEFAULT_SHOP_SETTINGS.portfolioDesign.labels, medium: 'Technique' } },
    designStudio: { accent: '#123456' }
  });
  assert.equal(result.heroTitle, 'Saved title');
  assert.equal(result.borderRadius, 0);
  assert.equal(result.fallbackLinks.Vinted, '');
  assert.deepEqual(result.categoryOrder, []);
  assert.equal(result.shippingSettings.boxnowPrice, 0);
  assert.equal(result.shippingSettings.boxnowFreeThreshold, 0);
  assert.equal(result.shippingSettings.courierPrice, DEFAULT_SHOP_SETTINGS.shippingSettings.courierPrice);
  assert.equal(result.portfolioDesign.title, 'Saved portfolio');
  assert.equal(result.portfolioDesign.labels.medium, 'Technique');
  assert.equal(result.portfolioHeroVideoUrl, 'https://example.test/hero.mp4');
  assert.equal(result.designStudio.accent, '#123456');
  assert.equal(result.designStudio.heroMinHeight, DEFAULT_SHOP_SETTINGS.designStudio.heroMinHeight);
});
