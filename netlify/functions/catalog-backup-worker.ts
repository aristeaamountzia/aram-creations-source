import { runBackupJob } from '../../server/catalog-backups';

export default async function handler(request: Request) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const body = await request.json();
  await runBackupJob(body.id, body.token);
  return new Response(null, { status: 204 });
}

export const config = { background: true };
