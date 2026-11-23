import { adminDatabase, requireAdmin } from '../../server/admin-database';
import { MAX_CV_BYTES, validateBiography, validateCv } from '../../server/artist-profile';
import { artistProfileResponse, loadArtistProfile, saveArtistProfile } from '../../server/artist-profile-store';

const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });

export default async function handler(request: Request) {
  if (!['GET', 'POST'].includes(request.method)) return reply({ error: 'Μη επιτρεπτή μέθοδος.' }, 405);
  try {
    if (request.method === 'GET') {
      const services = adminDatabase();
      const profile = await loadArtistProfile(services);
      if (new URL(request.url).searchParams.get('cv') !== '1') return reply(artistProfileResponse(profile));
      if (!profile.cvKey) return reply({ error: 'Δεν υπάρχει διαθέσιμο βιογραφικό.' }, 404);
      try {
        const [file] = await services.bucket.file(profile.cvKey).download();
        const encodedName = encodeURIComponent(profile.cvName || 'artist-cv.pdf');
        return new Response(Uint8Array.from(file), { headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': "inline; filename=artist-cv.pdf; filename*=UTF-8''" + encodedName,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        } });
      } catch (error: any) {
        if (Number(error?.code) === 404) return reply({ error: 'Το αρχείο δεν βρέθηκε.' }, 404);
        throw error;
      }
    }

    const services = await requireAdmin(request);
    if (Number(request.headers.get('content-length')) > MAX_CV_BYTES + 100000) return reply({ error: 'Το αρχείο είναι πολύ μεγάλο.' }, 413);
    const form = await request.formData();
    const upload = form.get('cv');
    let biography: string;
    let biographyEn: string | undefined;
    let cv: { name: string; bytes: Uint8Array } | undefined;
    try {
      biography = validateBiography(form.get('biography'));
      if (form.has('biographyEn')) biographyEn = validateBiography(form.get('biographyEn'));
      if (upload instanceof File && upload.size) cv = { name: upload.name, bytes: await validateCv(upload) };
    } catch (error: any) {
      return reply({ error: error.message }, 400);
    }
    const profile = await saveArtistProfile(services, { biography, biographyEn, cv, removeCv: form.get('removeCv') === 'true' });
    if (!profile) throw new Error('Artist profile was not saved.');
    return reply(artistProfileResponse(profile));
  } catch (error: any) {
    if (error?.message === 'ADMIN_REQUIRED') return reply({ error: 'Απαιτείται σύνδεση διαχειριστή.' }, 403);
    return reply({ error: 'Δεν φορτώθηκε ή αποθηκεύτηκε η παρουσίαση. Δοκίμασε ξανά.' }, 503);
  }
}
