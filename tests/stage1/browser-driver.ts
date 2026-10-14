// Loaded through Vite, so Firebase imports share the application's SDK instance.
import { app, auth, storage } from '../../src/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { ref, uploadBytes } from 'firebase/storage';
export async function exerciseBrowserServices(token: string) {
  await signInWithCustomToken(auth, token);
  await uploadBytes(ref(storage, 'jewelry/browser-upload.png'), new Uint8Array([1, 2, 3]), { contentType: 'image/png' });
  return app.options.projectId;
}
