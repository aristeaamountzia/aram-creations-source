import { adminDatabase } from '../server/admin-database';
import { MAX_CV_BYTES, validateBiography, validateCv } from '../server/artist-profile';
import { saveArtistProfile } from '../server/artist-profile-store';

const source = 'https://aramcreationsofficialgamw.netlify.app/api/artist-profile';
const args = process.argv.slice(2);
if (args.some(flag => flag !== '--apply')) throw new Error('Usage: tsx scripts/migrate-artist-profile.ts [--apply]');

async function readSource(url: string) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('Previous profile endpoint returned HTTP ' + response.status);
  return response;
}

const record = await (await readSource(source)).json() as Record<string, unknown>;
const biography = validateBiography(record.biography);
if (typeof record.hasCv !== 'boolean') throw new Error('Previous profile response has an invalid CV status.');

let cv: { name: string; bytes: Uint8Array } | undefined;
if (record.hasCv) {
  const response = await readSource(source + '?cv=1');
  if (Number(response.headers.get('content-length')) > MAX_CV_BYTES) throw new Error('The previous CV exceeds the PDF size limit.');
  const name = typeof record.cvName === 'string' && record.cvName ? record.cvName : 'artist-cv.pdf';
  cv = { name, bytes: await validateCv(new File([await response.arrayBuffer()], name)) };
}
if (!biography && !cv) throw new Error('The previous profile has no biography or CV to migrate.');

console.log('Validated legacy profile. Biography characters: ' + biography.length + ', PDF bytes: ' + (cv?.bytes.length ?? 0));
if (args.includes('--apply')) {
  const saved = await saveArtistProfile(adminDatabase(), { biography, cv }, true);
  console.log(saved ? 'Artist profile initialized in Firebase.' : 'Firebase profile already exists. Skipped the import.');
} else {
  console.log('Dry run complete. No Firebase writes.');
}
