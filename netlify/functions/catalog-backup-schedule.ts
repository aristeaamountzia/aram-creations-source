import { createBackup, dispatchBackupJob, type BackupContext } from '../../server/catalog-backups';
export default async function handler(_request: Request, context?: BackupContext) {
  await createBackup(new Date(), undefined, (id, token) => dispatchBackupJob(id, token, context));
  return new Response(null, { status: 204 });
}
export const config = { schedule: '*/30 * * * *' };
