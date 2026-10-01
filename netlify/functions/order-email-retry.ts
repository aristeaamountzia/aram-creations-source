import { adminDatabase } from '../../server/admin-database';
import { retryNotifications } from '../../server/order-notifications';
export default async function handler() { await retryNotifications(adminDatabase().db); return new Response(null, { status: 204 }); }
export const config = { schedule: '*/10 * * * *' };
