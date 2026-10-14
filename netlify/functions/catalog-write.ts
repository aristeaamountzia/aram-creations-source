import { requireAdmin } from '../../server/admin-database';
import { CatalogError, commitCatalog, requirePrivacyRuntime } from '../../server/catalog-publication';
export default async function handler(request: Request) {
  try {
    requirePrivacyRuntime();
    const services = await requireAdmin(request);
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const token = request.headers.get('authorization')!.slice(7), user = await services.auth.verifyIdToken(token);
    const text = await request.text(); if (text.length > 8 * 1024 * 1024) throw new CatalogError('Η συναλλαγή είναι πολύ μεγάλη.');
    return Response.json(await commitCatalog(JSON.parse(text), user, services), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) { return Response.json({ error: error.message === 'ADMIN_REQUIRED' ? 'Απαιτείται διαχειριστής.' : error instanceof CatalogError ? error.message : 'Η αποθήκευση δεν ολοκληρώθηκε. Δοκίμασε ξανά με το ίδιο αίτημα.', code: error.code }, { status: error.message === 'ADMIN_REQUIRED' ? 403 : error instanceof CatalogError ? error.status : 503 }); }
}
