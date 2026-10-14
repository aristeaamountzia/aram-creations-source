import { app, auth, storage, db } from '../../src/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { ref } from 'firebase/storage';
import { uploadBytes } from '../../src/lib/private-upload';
import { doc, getDocFromServer } from 'firebase/firestore';
export async function inspectAnonymous() {
  let denied = false;
  try { await getDocFromServer(doc(db, 'jewelry', 'browser-visible')); } catch { denied = true; }
  return { denied, publicData: (await getDocFromServer(doc(db, 'publicCatalog', 'browser-visible'))).data(), projectId: app.options.projectId };
}
export async function login(token: string) {
  await signInWithCustomToken(auth, token);
  await uploadBytes(ref(storage, 'jewelry/browser-upload.png'), new Uint8Array([1, 2, 3]), { contentType: 'image/png' });
}
