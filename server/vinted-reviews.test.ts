import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatGreekDate,
  BUNDLED_VINTED_REVIEWS,
  BUNDLED_VINTED_STATS,
  getVintedReviews
} from './vinted-reviews';

test('formatGreekDate converts ISO timestamps to Greek date format', () => {
  const result = formatGreekDate('2026-10-27T16:18:36+01:00');
  assert.equal(result, '27 Οκτωβρίου 2026');

  const septResult = formatGreekDate('2026-09-03T17:28:19+02:00');
  assert.equal(septResult, '3 Σεπτεμβρίου 2026');
});

test('bundled Vinted reviews preserve authentic customer emojis and strip condition boilerplate', () => {
  assert.equal(BUNDLED_VINTED_REVIEWS.length, 8, 'Only customer-written reviews should be bundled');

  for (const review of BUNDLED_VINTED_REVIEWS) {
    assert.ok(review.id, 'Review must have an id');
    assert.equal(review.rating, 5, 'Every Aram Creations review is 5 stars');
    assert.ok(review.userLogin, 'Review must have buyer userLogin');
    assert.ok(review.feedback, 'Review must have feedback text');
    assert.equal(review.systemFeedback, false, 'Automated platform feedback must not reach the payload');

    // Rule 5: No boilerplate condition phrases
    assert.doesNotMatch(review.feedback, /καινούργιο με ετικέτα/i);
    assert.doesNotMatch(review.feedback, /new with tags/i);
    assert.doesNotMatch(review.feedback, /very good/i);
  }

  // Verify that authentic customer emojis are preserved
  const emojiPattern = /[\p{Extended_Pictographic}\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const reviewsWithEmoji = BUNDLED_VINTED_REVIEWS.filter(r => emojiPattern.test(r.feedback));
  assert.ok(reviewsWithEmoji.length > 0, 'Customer reviews should preserve real emojis (e.g. ❤️, 🌸, ✨, 😍)');
});

test('bundled Vinted stats match authentic seller profile metrics', () => {
  assert.equal(BUNDLED_VINTED_STATS.login, 'aramcreations');
  assert.equal(BUNDLED_VINTED_STATS.ratingScore, 5.0);
  assert.equal(BUNDLED_VINTED_STATS.feedbackCount, 10);
  assert.equal(BUNDLED_VINTED_STATS.positiveFeedbackCount, 10);
  assert.equal(BUNDLED_VINTED_STATS.negativeFeedbackCount, 0);
  assert.equal(BUNDLED_VINTED_STATS.neutralFeedbackCount, 0);
});

test('getVintedReviews returns valid payload with fallback', async () => {
  const payload = await getVintedReviews();
  assert.equal(payload.ok, true);
  assert.equal(payload.reviews.length, 8);
  assert.equal(payload.stats.ratingScore, 5.0);
  assert.ok(['live', 'firestore', 'bundle', 'cache'].includes(payload.source));
});
