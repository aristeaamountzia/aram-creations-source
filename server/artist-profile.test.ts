import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBiography, validateCv, MAX_CV_BYTES } from './artist-profile';

test('artist profile preserves Greek text, allows clearing and limits biography size', () => {
  assert.equal(validateBiography('  Εικαστική δημιουργία\nκαι γλυπτική.  '), 'Εικαστική δημιουργία\nκαι γλυπτική.');
  assert.equal(validateBiography(''), '');
  assert.throws(() => validateBiography('α'.repeat(12001)));
  assert.throws(() => validateBiography(null));
});

test('CV upload validates actual PDF bytes and rejects oversized or disguised files', async () => {
  const pdf = new File(['%PDF-1.7\nexample'], 'βιογραφικό.pdf', { type: 'application/pdf' });
  assert.equal(new TextDecoder().decode(await validateCv(pdf)), '%PDF-1.7\nexample');
  await assert.rejects(validateCv(new File(['<script>bad</script>'], 'fake.pdf', { type: 'application/pdf' })));
  await assert.rejects(validateCv(new File([], 'empty.pdf')));
  await assert.rejects(validateCv(new File([new Uint8Array(MAX_CV_BYTES + 1)], 'large.pdf')));
});
