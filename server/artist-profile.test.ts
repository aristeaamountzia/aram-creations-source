import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBiography, validateCv, MAX_CV_BYTES } from './artist-profile';
import { artistProfileResponse, loadArtistProfile, saveArtistProfile } from './artist-profile-store';

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

test('profile import preserves existing content, and later edits retain or explicitly remove the CV', async () => {
  let data: Record<string, unknown> | undefined;
  const objects = new Map<string, Buffer>();
  const ref = { get: async () => ({ exists: Boolean(data), data: () => data }) };
  const services = {
    db: {
      doc: () => ref,
      runTransaction: (operation: (transaction: unknown) => Promise<unknown>) => operation({
        get: () => ref.get(),
        set: (_ref: unknown, value: Record<string, unknown>) => { data = value; },
      }),
    },
    bucket: {
      file: (key: string) => ({
        save: async (bytes: Buffer) => { objects.set(key, bytes); },
        delete: async () => { objects.delete(key); },
      }),
    },
  } as unknown as Parameters<typeof saveArtistProfile>[0];

  const cv = { name: 'βιογραφικό.pdf', bytes: new TextEncoder().encode('%PDF-1.7') };
  await saveArtistProfile(services, { biography: 'Original profile', cv }, true);
  assert.equal(await saveArtistProfile(services, { biography: 'Another import', cv }, true), null);
  assert.deepEqual(artistProfileResponse(await loadArtistProfile(services)), {
    biography: 'Original profile', cvName: cv.name, hasCv: true,
  });
  assert.equal(objects.size, 1);

  await saveArtistProfile(services, { biography: 'Updated profile' });
  assert.equal(artistProfileResponse(await loadArtistProfile(services)).hasCv, true);
  await saveArtistProfile(services, { biography: 'Updated profile', removeCv: true });
  assert.equal(artistProfileResponse(await loadArtistProfile(services)).hasCv, false);
  assert.equal(objects.size, 0);
});
