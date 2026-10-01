import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeApp as initializeAdmin, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
const base = process.env.DEPLOY_VERIFY_URL;
if (!base || !/^https:\/\/(?:[a-f0-9]+--)?lovely-bienenstitch-b6079c\.netlify\.app$/.test(base)) throw new Error('Set the verified site URL.');
const path = process.env.ORDER_TEST_CREDENTIAL_PATH;
if (!path) throw new Error('Set a local credential path.');
const admin = initializeAdmin({ credential: cert(JSON.parse(readFileSync(path, 'utf8'))) }, 'deploy-verification');
const app = initializeApp({ apiKey: 'AIzaSyCbOy-d0naXBGw6TR-2dGS5Wb4IEkZYDKU', projectId: 'aramcreations-e1529' }, 'deploy-verification');
const auth = getAuth(app);
try {
  for (const path of ['/api/orders','/api/catalog-backups']) {
    const response=await fetch(base+path); assert.ok([401,403].includes(response.status), `${path} anonymous access must be denied`);
  }
  const user=await getAdminAuth(admin).getUserByEmail('aristeaamnta@gmail.com');
  await signInWithCustomToken(auth,await getAdminAuth(admin).createCustomToken(user.uid));
  const headers = { Authorization: 'Bearer '+await auth.currentUser!.getIdToken() };
  const orders = await fetch(base+'/api/orders',{headers}); assert.equal(orders.status,200); assert.ok(Array.isArray((await orders.json()).orders));
  const backups = await fetch(base+'/api/catalog-backups',{headers}); assert.equal(backups.status,200);
  const body = await backups.json(); assert.ok(body.backups.length);
  const downloaded=await fetch(base+'/api/catalog-backups?name='+encodeURIComponent(body.backups[0].name),{headers}); assert.equal(downloaded.status,200); assert.equal((await downloaded.json()).format,'aram-catalog-v1');
  const invalid=await fetch(base+'/api/catalog-backups?name='+encodeURIComponent('../private.json'),{headers}); assert.notEqual(invalid.status,200);
  if(process.env.SEND_OWNER_EMAIL_TEST==='1') {
    const mail=await fetch(base+'/api/order-email-test',{method:'POST',headers});
    const result=await mail.json(); assert.equal(mail.status,200,JSON.stringify(result)); assert.equal(result.ok,true);
    console.log('PASS: real owner email test accepted by Resend.');
  }
  console.log('PASS: deployed admin authentication, order list, private backup list/download, path validation.');
} finally { await signOut(auth); await deleteApp(app); await admin.delete(); }
