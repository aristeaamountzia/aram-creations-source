import { createBackup } from '../../server/catalog-backups';
export default async function handler() {
  await createBackup();
  return new Response(null, { status: 204 });
}
export const config = { schedule: '*/30 * * * *' };
