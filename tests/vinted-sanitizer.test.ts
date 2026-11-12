import test from 'node:test';
import assert from 'node:assert/strict';
import { isAuthenticVintedReview, sanitizeVintedDescription } from '../src/lib/vinted-sanitizer';

test('Vinted Content Sanitization (GEMINI.md Rule 5)', async (t) => {
  await t.test('strips Greek condition boilerplate "Καινούργιο με ετικέτα"', () => {
    const input = 'Χειροποίητο κολιέ με αχάτη.\nΚαινούργιο με ετικέτα\nΙδανικό για δώρο.';
    const result = sanitizeVintedDescription(input);
    assert.strictEqual(result, 'Χειροποίητο κολιέ με αχάτη.\n\nΙδανικό για δώρο.');
  });

  await t.test('strips English condition boilerplate "New with tags" and "Very good"', () => {
    const input = 'Handmade ring.\nNew with tags\nVery good condition.\nSilver 925.';
    const result = sanitizeVintedDescription(input);
    assert.ok(!result.includes('New with tags'));
    assert.ok(!result.includes('Very good'));
    assert.ok(result.includes('Handmade ring'));
    assert.ok(result.includes('Silver 925'));
  });

  await t.test('strips "Πολύ καλή κατάσταση" and "Κατάσταση: Καινούργιο"', () => {
    const input = 'Κατάσταση: Καινούργιο\nΌμορφα σκουλαρίκια.\nΠολύ καλή κατάσταση';
    const result = sanitizeVintedDescription(input);
    assert.ok(!result.includes('Καινούργιο'));
    assert.ok(!result.includes('Πολύ καλή'));
    assert.strictEqual(result, 'Όμορφα σκουλαρίκια.');
  });

  await t.test('handles empty, null, and undefined values safely', () => {
    assert.strictEqual(sanitizeVintedDescription(''), '');
    assert.strictEqual(sanitizeVintedDescription(null), '');
    assert.strictEqual(sanitizeVintedDescription(undefined), '');
  });

  await t.test('strips raw emojis from descriptions (GEMINI.md Rule 9)', () => {
    const input = '✨ Χαρακτηριστικά:\nΥλικό: Ρητίνη 🎬\nΙδανικό για layering ✨';
    const result = sanitizeVintedDescription(input);
    assert.strictEqual(result, 'Χαρακτηριστικά:\nΥλικό: Ρητίνη\nΙδανικό για layering');
  });
});

test('filters automated Vinted feedback by flag or exact platform text', () => {
  assert.equal(isAuthenticVintedReview({ feedback: 'Υπέροχη συσκευασία, ευχαριστώ!', systemFeedback: false }), true);
  assert.equal(isAuthenticVintedReview({ feedback: 'Προσωπικό σχόλιο', systemFeedback: true }), false);
  assert.equal(isAuthenticVintedReview({ feedback: 'Επιβεβαιωμένη παράδοση παραγγελίας μέσω Vinted' }), false);
  assert.equal(isAuthenticVintedReview({ feedback: 'Automatic positive feedback from Vinted.' }), false);
  assert.equal(isAuthenticVintedReview({ feedback: '   ' }), false);
});

