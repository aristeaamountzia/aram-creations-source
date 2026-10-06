import {cert,getApps,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {fetchWixProject} from '../../server/wix-project';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export default async function handler(request:Request) {
  if(request.method!=='POST')return json({error:'Method not allowed'},405);
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return json({error:'Συνδέσου στο Back Office.'},401);
  try {
    const credentials=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT||'{}');
    if(credentials.project_id!=='aramcreations-e1529')return json({error:'Η εξαγωγή Wix δεν είναι διαθέσιμη.'},503);
    const app=getApps().find(a=>a.name==='wix-project')||initializeApp({credential:cert(credentials)},'wix-project');
    const user=await getAuth(app).verifyIdToken(token).catch(()=>null);
    if(!user||!(user.admin===true||user.email?.toLowerCase()==='aristeaamnta@gmail.com'))return json({error:'Δεν επιτρέπεται η πρόσβαση.'},403);
    const raw=await request.text();if(raw.length>3000)return json({error:'Μη έγκυρο αίτημα.'},400);
    const body=JSON.parse(raw);
    return json(await fetchWixProject(typeof body.url==='string'?body.url:undefined));
  } catch(error:any) { return json({error:error.message||'Δεν ολοκληρώθηκε η ανάγνωση του Wix.'},502); }
}
