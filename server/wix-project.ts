import { HTML_ENTITIES } from './html-entities';
export const WIX_BASE = 'https://aristeaamnta.wixsite.com/-aristea-amountzia';
export function wixProjectUrl(raw = WIX_BASE) {
  const url = new URL(raw, WIX_BASE + '/');
  if (url.origin !== new URL(WIX_BASE).origin || (url.pathname !== '/-aristea-amountzia' && !url.pathname.startsWith('/-aristea-amountzia/')) || url.username || url.password || url.port) throw new Error('Επίλεξε σελίδα από το υπάρχον Wix portfolio.');
  url.hash = ''; url.search = ''; return url.href;
}
const decode = (value: string) => value.replace(/&#(x[\da-f]+|\d+);/gi, (_, n) => { const code = n[0].toLowerCase()==='x' ? parseInt(n.slice(1),16) : parseInt(n,10); return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : ''; }).replace(/&([a-z][a-z0-9]+);/gi, (m, name) => HTML_ENTITIES[name] ?? m).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const text = (html: string) => decode(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<\/(?:p|h[1-6]|div|li)>|<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'')).replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
type WixItem = { mediaUrl?:string; itemId?:string; id?:string; dataType?:string; title?:string; alt?:string; name?:string; description?:string; metaData?:any; videoMetadata?:any };
type WixGallery = { componentId:string; id:string; total:number; items:WixItem[] };
function scriptJson(html:string,id:string):any {
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if(match[1].match(/\bid=["']([^"']+)["']/i)?.[1]!==id)continue;
    try{return JSON.parse(match[2]);}catch{return null;}
  }
  return null;
}
function wixGalleries(html:string):WixGallery[] {
  const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||'';
  const data=scriptJson(html,'wix-warmup-data')?.appsWarmupData?.['14271d6f-ba62-d045-549b-ab972ae1f70e']||{};
  const galleries:WixGallery[]=[];
  for(const [key,value]of Object.entries(data)) {
    if(!key.endsWith('_galleryData'))continue;
    const componentId=key.slice(0,-'_galleryData'.length),gallery=value as any;
    if(!main.includes(componentId)||!Array.isArray(gallery?.items))continue;
    galleries.push({componentId,id:data[componentId+'_appSettings']?.galleryId||'',total:Number(gallery.totalItemsCount)||gallery.items.length,items:gallery.items});
  }
  return galleries;
}
function wixMediaUrl(raw:string,type:'image'|'video') {
  if(raw.startsWith('wix:image://v1/'))raw=raw.slice('wix:image://v1/'.length).split('/')[0];
  if(!raw.startsWith('https://')&&/^[\w~.-]+$/.test(raw))raw=(type==='video'?'https://video.wixstatic.com/video/':'https://static.wixstatic.com/media/')+raw;
  try {
    const url=new URL(raw);
    if(url.username||url.password||url.port||url.protocol!=='https:')return null;
    if(type==='image'&&url.hostname==='static.wixstatic.com'&&url.pathname.startsWith('/media/'))return url.origin+url.pathname.split('/v1/')[0];
    if(type==='video'&&url.hostname==='video.wixstatic.com'&&url.pathname.startsWith('/video/'))return url.origin+url.pathname;
  }catch{}
  return null;
}
export function parseWixProject(html: string, source: string, hydrated:Record<string,WixItem[]> = {}) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if (!main) throw new Error('Το Wix δεν επέστρεψε περιεχόμενο σελίδας.');
  const title = text(main.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'Wix project');
  const media = new Map<string,{url:string;type:'image'|'video';title:string;filename?:string;description?:string}>();
  const links=new Set<string>(),posters=new Set<string>();
  const galleries=wixGalleries(html),warnings:string[]=[];
  for(const gallery of galleries) {
    gallery.items=hydrated[gallery.componentId]||gallery.items;
    if(gallery.items.length<gallery.total)warnings.push(`Το gallery ${gallery.componentId} επέστρεψε ${gallery.items.length} από ${gallery.total} καταχωρίσεις. Η εξαγωγή δεν είναι πλήρης.`);
    for(const item of gallery.items) {
      const meta=item.metaData||{},type=(meta.type==='video'||item.dataType==='Video')?'video':'image';
      let raw=item.mediaUrl||'';
      if(type==='video') {
        const metadata=item.videoMetadata||meta;
        for(const poster of metadata.posters||[]){const url=wixMediaUrl(poster.url||'','image');if(url)posters.add(url);}
        const resolutions=metadata.resolutions||metadata.qualities||[];
        const best=[...resolutions].filter(r=>r.urls?.mp4||r.formats?.includes('mp4')).sort((a,b)=>(b.height||0)-(a.height||0))[0];
        if(best?.urls?.mp4)raw=best.urls.mp4;
        else if(best?.quality&&!raw.startsWith('https://'))raw=`https://video.wixstatic.com/video/${raw}/${best.quality}/mp4/file.mp4`;
        if(meta.isExternal){if(/^https:\/\/(?:www\.)?(?:youtube(?:-nocookie)?\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)\//i.test(raw))links.add(raw);continue;}
      }
      const url=wixMediaUrl(raw,type);
      if(url)media.set(url,{url,type,title:decode(item.title||meta.title||item.alt||meta.alt||''),filename:item.name||meta.fileName||meta.name||'',description:decode(item.description||meta.description||'')});
      else warnings.push(`Δεν αναγνωρίστηκε αρχείο στο gallery ${gallery.componentId}: ${item.name||meta.fileName||item.itemId||item.id||'άγνωστο αρχείο'}.`);
    }
  }
  for (const tag of main.match(/<img\b[^>]*>/gi) || []) {
    for(const attr of ['src','data-src','data-original','srcset']) {
      const value=decode(tag.match(new RegExp(`\\b${attr}=["']([^"']+)["']`,'i'))?.[1]||'');
      for(const src of value.match(/(?:https:\/\/static\.wixstatic\.com\/media\/|wix:image:\/\/v1\/)[^\s]+/g)||[]) {
        const url=wixMediaUrl(src,'image');if(!url||posters.has(url)||media.has(url))continue;
        media.set(url,{url,type:'image',title:decode(tag.match(/\balt=["']([^"']*)["']/i)?.[1]||'')});
      }
    }
  }
  for (const match of main.matchAll(/https:\/\/video\.wixstatic\.com\/video\/[^\s"'<>]+/g)) {
    const url = decode(match[0]); media.set(url,{url,type:'video',title:''});
  }
  const pages = [...new Set((html.match(/href=["'][^"']+["']/gi) || []).map(attr => decode(attr.slice(6,-1))).filter(url => url.startsWith(WIX_BASE + '/') && !url.includes('#') && !url.includes('?')))];
  for(const link of (main.match(/(?:https?:\/\/)(?:www\.)?(?:youtube(?:-nocookie)?\.com|youtu\.be|player\.vimeo\.com|vimeo\.com)\/[^\s"'<>]+/gi)||[]).map(decode))links.add(link);
  return { title, links:[...links], text:text(main), source:wixProjectUrl(source), media:[...media.values()], pages, galleries:galleries.map(g=>({id:g.componentId,loaded:g.items.length,total:g.total})),warnings,complete:warnings.length===0 };
}
export async function fetchWixProject(raw?: string) {
  const source = wixProjectUrl(raw);
  const response = await fetch(source,{redirect:'error',signal:AbortSignal.timeout(25000),headers:{Accept:'text/html','User-Agent':'Mozilla/5.0'}});
  if (!response.ok) throw new Error(`Το Wix επέστρεψε HTTP ${response.status}.`);
  const reader = response.body?.getReader(); if (!reader) throw new Error('Δεν παραλήφθηκε σελίδα.');
  let length=0; const chunks:Uint8Array[]=[];
  while(true) { const {done,value}=await reader.read(); if(done) break; length+=value.length; if(length>6*1024*1024){await reader.cancel();throw new Error('Η σελίδα Wix είναι πολύ μεγάλη.');} chunks.push(value); }
  const bytes=new Uint8Array(length); let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const html=new TextDecoder().decode(bytes),galleries=wixGalleries(html),hydrated:Record<string,WixItem[]>={};
  const pending=galleries.filter(g=>g.items.length<g.total);
  if(pending.length) {
    // This is Wix's anonymous visitor token for the published site, never an owner credential.
    const visitor=await fetch(WIX_BASE+'/_api/v1/access-tokens',{redirect:'error',signal:AbortSignal.timeout(10000)}).then(r=>r.ok?r.json():null).catch(()=>null);
    const app=visitor?.apps?.['14271d6f-ba62-d045-549b-ab972ae1f70e'];
    const instance=typeof app==='string'?app:app?.instance||app?.accessToken;
    if(typeof instance==='string')for(const gallery of pending) {
      const items=[...gallery.items],seen=new Set(items.map(i=>i.itemId||i.id));
      try {
        if(!/^[\da-f-]{36}$/i.test(gallery.id))continue;
        while(items.length<gallery.total) {
          const url=new URL('/pro-gallery-webapp/v1/galleries/'+gallery.id,new URL(WIX_BASE).origin);
          url.search=new URLSearchParams({offset:String(items.length),limit:'100',state:'PUBLISHED'}).toString();
          const result=await fetch(url,{redirect:'error',headers:{Authorization:instance},signal:AbortSignal.timeout(10000)});
          if(!result.ok)break;
          const data=await result.json(),next=data.gallery?.items;
          if(!Array.isArray(next)||!next.length)break;
          const before=items.length;
          for(const item of next){const id=item.itemId||item.id;if(id&&!seen.has(id)){seen.add(id);items.push(item);}}
          if(items.length===before)break;
        }
      }catch{}
      hydrated[gallery.componentId]=items;
    }
  }
  return parseWixProject(html,source,hydrated);
}
