import { reconcileCatalog } from '../../server/catalog-publication';
export default async function handler() { const result = await reconcileCatalog(); return Response.json(result, { status: result.errors.length ? 503 : 200 }); }
export const config = { schedule: '*/5 * * * *' };
