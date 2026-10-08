import { requestMedia } from './media-files';
export type ProjectArchive = {title:string;text:string;source:string;media:{url:string;type:'image'|'video';title?:string;filename?:string;description?:string}[];pages?:string[];links?:string[];warnings?:string[];complete?:boolean};
const encoder=new TextEncoder();
const escape=(v:string)=>v.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]!));
function crc32(bytes:Uint8Array){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function zipArchive(files:{name:string;bytes:Uint8Array}[]) {
  const locals:BlobPart[]=[],centrals:BlobPart[]=[];let offset=0,centralSize=0;
  for(const file of files){const name=encoder.encode(file.name),crc=crc32(file.bytes);const local=new Uint8Array(30),l=new DataView(local.buffer);l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint32(14,crc,true);l.setUint32(18,file.bytes.length,true);l.setUint32(22,file.bytes.length,true);l.setUint16(26,name.length,true);locals.push(local,name,file.bytes as BlobPart);
    const central=new Uint8Array(46),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint32(16,crc,true);c.setUint32(20,file.bytes.length,true);c.setUint32(24,file.bytes.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);centrals.push(central,name);offset+=30+name.length+file.bytes.length;centralSize+=46+name.length;
  }
  const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);return new Blob([...locals,...centrals,end],{type:'application/zip'});
}
export const ZIP_PART_BYTES=120*1024*1024;
const downloadArchive=(zip:Blob,name:string)=>{const url=URL.createObjectURL(zip),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);};
export async function exportProject(project:ProjectArchive,onProgress:(message:string)=>void,saveArchive:(zip:Blob,name:string)=>void|Promise<void>=downloadArchive) {
  let files:{name:string;bytes:Uint8Array}[]=[],mediaNames:{name:string;type:string;title:string;description:string}[]=[],total=0,part=0,downloaded=0;
  const failed:string[]=[],basename=project.title.replace(/[<>:"/\\|?*]/g,'-').slice(0,90)||'wix-project';
  const flush=async(final:boolean)=>{
    const warnings=[...(project.warnings||[]),...failed];
    files.push({name:'project.txt',bytes:encoder.encode(`${project.title}\n${project.source}\n\n${project.text}\n\n${(project.links||[]).join('\n')}`)},{name:'project.json',bytes:encoder.encode(JSON.stringify({...project,exportedAt:new Date().toISOString(),archivePart:part+1,filesInThisArchive:mediaNames,failed},null,2))});
    if(warnings.length)files.push({name:'files-not-downloaded.txt',bytes:encoder.encode(warnings.join('\n\n'))});
    files.push({name:'index.html',bytes:encoder.encode(`<!doctype html><html lang="el"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(project.title)}</title><style>body{font-family:system-ui;max-width:960px;margin:40px auto;padding:20px}p{white-space:pre-wrap;line-height:1.6}img,video{max-width:100%;max-height:80vh;display:block;margin:24px auto}</style><h1>${escape(project.title)}</h1><p>${escape(project.text)}</p>${(project.links||[]).map(link=>`<p><a href="${escape(link)}">${escape(link)}</a></p>`).join('')}${mediaNames.map(m=>`<figure>${m.type==='video'?`<video src="${m.name}" controls></video>`:`<img src="${m.name}" alt="${escape(m.title)}">`}<figcaption>${escape(m.title)}<p>${escape(m.description)}</p></figcaption></figure>`).join('')}</html>`)});
    await saveArchive(zipArchive(files),basename+(part||!final?`.part-${String(part+1).padStart(2,'0')}`:'')+'.zip');
    part++;files=[];mediaNames=[];total=0;
  };
  for(let i=0;i<project.media.length;i++){
    const media=project.media[i];onProgress(`Λήψη αρχείου ${i+1} / ${project.media.length}…`);
    try {
      // Wix CDN supports CORS. Download original public files directly, avoiding the function's binary response limit.
      const url=new URL(media.url),direct=url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&((url.hostname==='static.wixstatic.com'&&url.pathname.startsWith('/media/'))||(url.hostname==='video.wixstatic.com'&&url.pathname.startsWith('/video/')));
      let response=direct?await fetch(url,{signal:AbortSignal.timeout(120000)}):await requestMedia(media.url,'download',`media-${i+1}`);
      if(response.headers.get('content-type')?.includes('application/json')){const data=await response.json();response=await fetch(data.url,{signal:AbortSignal.timeout(45000)});}
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const type=response.headers.get('content-type')||'';if(!/^(image|video)\//.test(type))throw new Error('Δεν είναι αρχείο media.');
      const blob=await response.blob(); if(files.length&&total+blob.size>ZIP_PART_BYTES)await flush(false); total+=blob.size;
      const extension=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif','image/gif':'gif','video/mp4':'mp4','video/webm':'webm'} as Record<string,string>)[type.split(';')[0]]||'bin';
      const original=(media.filename||'').normalize('NFKC').replace(/[\x00-\x1f<>:"/\\|?*]/g,'-').replace(/\.[a-z0-9]{1,5}$/i,'').slice(0,80).replace(/^\.+/,'');
      const name=`media/${String(i+1).padStart(3,'0')}${original?'-'+original:''}.${extension}`;files.push({name,bytes:new Uint8Array(await blob.arrayBuffer())});mediaNames.push({name,type:media.type,title:media.title||'',description:media.description||''});downloaded++;
    } catch(error:any){failed.push(`${media.url}\n${error.message}`);}
  }
  await flush(true);
  const incomplete=failed.length||project.warnings?.length;
  onProgress(`${part===1?'Το ZIP κατέβηκε':`Κατέβηκαν ${part} ZIP`}: κείμενα και ${downloaded} από ${project.media.length} αρχεία.${incomplete?' Η εξαγωγή είναι ελλιπής· δες το files-not-downloaded.txt.':''}`);
}
