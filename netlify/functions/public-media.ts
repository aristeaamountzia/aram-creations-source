import { Readable } from 'node:stream';
import { adminDatabase } from '../../server/admin-database';
import { requirePrivacyRuntime } from '../../server/catalog-publication';
export default async function handler(request: Request) {
  try {
    requirePrivacyRuntime();
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    const asset = new URL(request.url).searchParams.get('asset') || '';
    const match = asset.match(/^publicMedia\/(jewelry|portfolio|settings)\/([A-Za-z0-9_-]{1,128})\/[a-f0-9-]{36}-[a-f0-9]{64}$/);
    if (!match) return new Response('Not found', { status: 404 });
    const { db, bucket } = adminDatabase();
    const path = match[1] === 'jewelry' ? `publicCatalog/${match[2]}` : match[1] === 'portfolio' ? `publicPortfolio/${match[2]}` : 'publicSettings/shop';
    const record = (await db.doc(path).get()).data();
    const expected = `/api/public-media?asset=${encodeURIComponent(asset)}`;
    const links = [...(record?.mediaList || []).map((m: any) => m.url), record?.heroVideoUrl, record?.portfolioHeroVideoUrl];
    if (!record || match[1] !== 'settings' && record.showInShop !== true || !links.includes(expected)) return new Response('Not found', { status: 404 });
    const file = bucket.file(asset), [metadata] = await file.getMetadata(), size = Number(metadata.size);
    const headers: Record<string, string> = { 'Content-Type': metadata.contentType || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" };
    let start = 0, end = size - 1, status = 200;
    const range = request.headers.get('range');
    if (range) {
      const bytes = range.match(/^bytes=(\d*)-(\d*)$/);
      if (!bytes || !bytes[1] && !bytes[2]) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
      if (!bytes[1]) start = Math.max(0, size - Number(bytes[2]));
      else { start = Number(bytes[1]); if (bytes[2]) end = Math.min(end, Number(bytes[2])); }
      if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
      status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    }
    headers['Content-Length'] = String(end - start + 1);
    return new Response(request.method === 'HEAD' ? null : Readable.toWeb(file.createReadStream({ start, end })) as ReadableStream, { status, headers });
  } catch { return new Response('Not found', { status: 404 }); }
}
