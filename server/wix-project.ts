import { HTML_ENTITIES } from './html-entities';
export const WIX_BASE = 'https://aristeaamnta.wixsite.com/-aristea-amountzia';
export function wixProjectUrl(raw = WIX_BASE) {
  const url = new URL(raw, WIX_BASE + '/');
  if (url.origin !== new URL(WIX_BASE).origin || (url.pathname !== '/-aristea-amountzia' && !url.pathname.startsWith('/-aristea-amountzia/')) || url.username || url.password || url.port) throw new Error('Επίλεξε σελίδα από το υπάρχον Wix portfolio.');
  url.hash = ''; url.search = ''; return url.href;
}
const decode = (value: string) => value.replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => { const code = n[0].toLowerCase()==='x' ? parseInt(n.slice(1),16) : parseInt(n,10); return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : ''; }).replace(/&([a-z][a-z0-9]+);/gi, (m, name) => HTML_ENTITIES[name] ?? m).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const text = (html: string) => decode(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<\/(?:p|h[1-6]|div|li)>|<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'')).replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
export function parseWixProject(html: string, source: string) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if (!main) throw new Error('Το Wix δεν επέστρεψε περιεχόμενο σελίδας.');
  const title = text(main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'Wix project');
  const media = new Map<string,{url:string;type:'image'|'video';title:string}>();
  for (const tag of main.match(/<img\b[^>]*>/gi) || []) {
    const src = decode(tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] || '');
    if (!src.startsWith('https://static.wixstatic.com/media/')) continue;
    const url = src.split('/v1/')[0];
    media.set(url,{url,type:'image',title:decode(tag.match(/\balt=["']([^"']*)["']/i)?.[1] || '')});
  }
  for (const match of main.matchAll(/https:\/\/video\.wixstatic\.com\/video\/[^\s"'<>]+/g)) {
    const url = decode(match[0]); media.set(url,{url,type:'video',title:''});
  }
  const pages = [...new Set((html.match(/href=["'][^"']+["']/gi) || []).map(attr => decode(attr.slice(6,-1))).filter(url => url.startsWith(WIX_BASE + '/') && !url.includes('#') && !url.includes('?')))];
  const links = [...new Set((main.match(/(?:https?:\/\/)(?:www\.)?(?:youtube(?:-nocookie)?\.com|youtu\.be|player\.vimeo\.com|vimeo\.com)\/[^\s"'<>]+/gi) || []).map(decode))];
  return { title, links, text:text(main), source:wixProjectUrl(source), media:[...media.values()], pages };
}
export async function fetchWixProject(raw?: string) {
  const source = wixProjectUrl(raw);
  const response = await fetch(source,{redirect:'error',signal:AbortSignal.timeout(25000),headers:{Accept:'text/html','User-Agent':'Mozilla/5.0'}});
  if (!response.ok) throw new Error(`Το Wix επέστρεψε HTTP ${response.status}.`);
  const reader = response.body?.getReader(); if (!reader) throw new Error('Δεν παραλήφθηκε σελίδα.');
  let length=0; const chunks:Uint8Array[]=[];
  while(true) { const {done,value}=await reader.read(); if(done) break; length+=value.length; if(length>6*1024*1024){await reader.cancel();throw new Error('Η σελίδα Wix είναι πολύ μεγάλη.');} chunks.push(value); }
  const bytes=new Uint8Array(length); let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return parseWixProject(new TextDecoder().decode(bytes),source);
}
