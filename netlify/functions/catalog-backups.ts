import { requireAdmin } from '../../server/admin-database';
import { createBackup, listBackups, downloadBackup, backupJobStatus, backupDownloadLink, dispatchBackupJob, type BackupContext } from '../../server/catalog-backups';
export default async function handler(request: Request, context?: BackupContext) {
  try {
    const services = await requireAdmin(request);
    if (request.method === 'POST') return Response.json({ ok: true, backup: await createBackup(new Date(), services, (id, token) => dispatchBackupJob(id, token, context)) }, { headers: { 'Cache-Control': 'no-store' } });
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
    const params = new URL(request.url).searchParams;
    if (params.get('job')) return Response.json({ job: await backupJobStatus(params.get('job')!) }, { headers: { 'Cache-Control': 'no-store' } });
    const name = params.get('name');
    if (name && params.get('link') === '1') return Response.json({ url: await backupDownloadLink(name) }, { headers: { 'Cache-Control': 'no-store' } });
    if (name) return new Response(new Uint8Array(await downloadBackup(name)), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Content-Disposition': 'attachment; filename="aram-backup.json"' } });
    return Response.json({ backups: await listBackups() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) { return Response.json({ error: error.message === 'ADMIN_REQUIRED' ? 'Συνδέσου ως διαχειριστής.' : `Το backup δεν ολοκληρώθηκε: ${error.message}` }, { status: error.message === 'ADMIN_REQUIRED' ? 403 : 503, headers: { 'Cache-Control': 'no-store' } }); }
}
