import { randomUUID } from 'node:crypto';
import type { adminDatabase } from './admin-database';

type Services = Pick<ReturnType<typeof adminDatabase>, 'db' | 'bucket'>;
type Profile = { biography: string; cvName: string; cvKey: string | null };
type ProfileUpdate = { biography: string; removeCv?: boolean; cv?: { name: string; bytes: Uint8Array } };

const documentPath = 'artistProfiles/public';

function readProfile(data?: FirebaseFirestore.DocumentData): Profile {
  const cvKey = typeof data?.cvKey === 'string' && /^artist-profile\/cv\/[\da-f-]{36}\.pdf$/.test(data.cvKey) ? data.cvKey : null;
  return {
    biography: typeof data?.biography === 'string' ? data.biography : '',
    cvName: cvKey && typeof data?.cvName === 'string' ? data.cvName : '',
    cvKey,
  };
}

export async function loadArtistProfile({ db }: Services) {
  return readProfile((await db.doc(documentPath).get()).data());
}

export function artistProfileResponse({ biography, cvName, cvKey }: Profile) {
  return { biography, cvName, hasCv: Boolean(cvKey) };
}

export async function saveArtistProfile({ db, bucket }: Services, update: ProfileUpdate, initializeOnly = false) {
  const ref = db.doc(documentPath);
  if (initializeOnly && (await ref.get()).exists) return null;

  const uploadedKey = update.cv ? 'artist-profile/cv/' + randomUUID() + '.pdf' : null;
  if (uploadedKey && update.cv) {
    await bucket.file(uploadedKey).save(Buffer.from(update.cv.bytes), {
      resumable: false,
      metadata: { contentType: 'application/pdf', cacheControl: 'private, no-store' },
    });
  }

  const result = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (initializeOnly && snapshot.exists) return null;
    const previous = readProfile(snapshot.data());
    const cvKey = uploadedKey || (update.removeCv ? null : previous.cvKey);
    const cvName = update.cv
      ? (update.cv.name.replace(/[\x00-\x1f\x7f/\\]/g, '-').slice(0, 240) || 'artist-cv.pdf')
      : cvKey ? previous.cvName : '';
    const profile: Profile = { biography: update.biography, cvName, cvKey };
    transaction.set(ref, profile);
    return { profile, replacedKey: previous.cvKey === cvKey ? null : previous.cvKey };
  });

  const unusedKey = result ? result.replacedKey : uploadedKey;
  if (unusedKey) {
    await bucket.file(unusedKey).delete({ ignoreNotFound: true }).catch(() => {
      console.warn('Could not remove an unreferenced artist CV.');
    });
  }
  return result?.profile ?? null;
}
