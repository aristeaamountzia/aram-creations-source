import { requireAdmin } from '../../server/admin-database';
import { createBackup, listBackups, downloadBackup } from '../../server/catalog-backups';
export default async function handler(request: Request) {
  try {
    await requireAdmin(request);
    if (request.method === 'POST') return Response.json({ ok: true, backup: await createBackup() }, { headers: { 'Cache-Control': 'no-store' } });
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
    const name = new URL(request.url).searchParams.get('name');
    if (name) return new Response(new Uint8Array(await downloadBackup(name)), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Content-Disposition': 'attachment; filename="aram-backup.json"' } });
    return Response.json({ backups: await listBackups() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) { return Response.json({ error: error.message === 'ADMIN_REQUIRED' ? 'Συνδέσου ως διαχειριστής.' : 'Το backup δεν ολοκληρώθηκε. Δοκίμασε ξανά.' }, { status: error.message === 'ADMIN_REQUIRED' ? 403 : 503 }); }
}
