import assert from 'node:assert/strict';
import {isVideoUrl,portfolioMedia,videoLink} from '../src/lib/video-links';
import {normalizePortfolioDesign,portfolioStatusLabel,validatePortfolioDesign} from '../src/lib/portfolio-settings';
import {fetchWixProject,parseWixProject,wixProjectUrl,WIX_BASE} from '../server/wix-project';
import wixHandler from '../netlify/functions/wix-project';
const id='M7lc1UVf-VE';
for(const url of [`https://youtu.be/${id}?si=test`,`https://youtube.com/watch?v=${id}`,`https://youtube.com/shorts/${id}`,`https://youtube.com/live/${id}`,`https://www.youtube-nocookie.com/embed/${id}`]) {
  assert.equal(videoLink(url)?.id,id); assert.equal(isVideoUrl(url),true);
}
assert.equal(videoLink(`https://youtube.com.evil.test/watch?v=${id}`),null);
assert.equal(videoLink('javascript:alert(1)'),null);
assert.equal(isVideoUrl('https://cdn.test/movie.mp4?alt=media'),true);
const media=portfolioMedia({mediaList:[{url:'https://cdn.test/photo.jpg',type:'image'},{url:`https://youtu.be/${id}`,type:'image'}],videoUrl:`https://youtube.com/watch?v=${id}`});
assert.equal(media.length,2); assert.equal(media[1].type,'video');
assert.equal(portfolioMedia({mediaList:[{url:'https://cdn.test/photo.jpg',type:'image'}],videoUrl:'https://cdn.test/movie.webm'}).length,2);
const design=normalizePortfolioDesign();
const renamed={...design,categories:[...design.categories].reverse(),statuses:design.statuses.map(s=>s.id==='Διαθέσιμο'?{...s,label:'Έτοιμο για έκθεση'}:s)};
validatePortfolioDesign(renamed);
assert.equal(portfolioStatusLabel(renamed,'Διαθέσιμο'),'Έτοιμο για έκθεση');
assert.equal(renamed.categories[0].id,design.categories.at(-1)!.id);
assert.throws(()=>validatePortfolioDesign({...design,categories:[design.categories[0],design.categories[0]]}));
assert.throws(()=>wixProjectUrl('https://evil.test/-aristea-amountzia'));
assert.throws(()=>wixProjectUrl('https://aristeaamnta.wixsite.com/other-site'));
const project=parseWixProject(`<title>Test</title><main><h1>&Delta;&omicron;&kappa;&iota;&mu;ή</h1><p>Κείμενο &#0; με &amp;.</p><img src="https://static.wixstatic.com/media/art.jpg/v1/fill/w_100/art.jpg" alt="Έργο"><img src="https://static.wixstatic.com/media/art.jpg/v1/fill/w_500/art.jpg"><iframe src="https://youtube.com/embed/${id}"></iframe></main>`,WIX_BASE);
assert.equal(project.title,'Δοκιμή'); assert.ok(!project.text.includes('\0'));
assert.equal(project.media.length,1); assert.equal(project.media[0].url,'https://static.wixstatic.com/media/art.jpg');
assert.equal(project.links[0],`https://youtube.com/embed/${id}`);
const galleryId='b04928b7-af24-4ab4-9501-736d70ebafb2',componentId='comp-gallery';
const item=(n:number)=>({itemId:`photo-${n}`,mediaUrl:`original-${n}.png`,metaData:{fileName:`Φωτογραφία ${n}.png`,description:`Περιγραφή ${n}`}});
const galleryHtml=`<main><div id="${componentId}"><img src="https://static.wixstatic.com/media/original-1.png/v1/fill/w_100/photo.png"></div><img data-src="https://static.wixstatic.com/media/lazy.gif"></main><script type="application/json" id="wix-warmup-data">${JSON.stringify({appsWarmupData:{'14271d6f-ba62-d045-549b-ab972ae1f70e':{[componentId+'_appSettings']:{galleryId},[componentId+'_galleryData']:{items:[item(1)],totalItemsCount:3},'comp-another-page_galleryData':{items:[item(9)],totalItemsCount:1}}}})}</script>`;
const partial=parseWixProject(galleryHtml,WIX_BASE);
assert.equal(partial.complete,false);assert.equal(partial.media.length,2);assert.equal(partial.media[0].filename,'Φωτογραφία 1.png');
const originalFetch=globalThis.fetch;let paged=false;
globalThis.fetch=(async(input:any,init?:RequestInit)=>{
 const url=new URL(String(input));
 if(url.pathname.endsWith('/access-tokens'))return Response.json({apps:{'14271d6f-ba62-d045-549b-ab972ae1f70e':'public-visitor'}});
 if(url.pathname.includes('/pro-gallery-webapp/')){
  assert.equal(url.searchParams.get('offset'),'1');assert.equal((init?.headers as any).Authorization,'public-visitor');paged=true;
  return Response.json({gallery:{items:[{id:'photo-2',mediaUrl:'https://static.wixstatic.com/media/original-2.png',name:'Δεύτερη.png'},{id:'photo-3',mediaUrl:'https://static.wixstatic.com/media/original-3.png'}]}});
 }
 return new Response(galleryHtml);
}) as typeof fetch;
try{const full=await fetchWixProject();assert.ok(paged);assert.equal(full.complete,true);assert.equal(full.media.length,4);assert.equal(full.galleries[0].loaded,3);assert.ok(!full.media.some(m=>m.url.includes('original-9')));}finally{globalThis.fetch=originalFetch;}
assert.equal((await wixHandler(new Request('https://local/api/wix-project',{method:'POST'}))).status,401);
assert.equal((await wixHandler(new Request('https://local/api/wix-project'))).status,405);
console.log('Portfolio media, settings, Wix parsing and endpoint authorization checks passed.');
