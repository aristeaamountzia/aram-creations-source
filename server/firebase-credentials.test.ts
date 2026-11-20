import test from 'node:test';
import assert from 'node:assert/strict';
import { firebaseCredentials, FirebaseConfigurationError } from './firebase-credentials';

const account = { project_id: 'aramcreations-e1529', client_email: 'fixture@example.com', private_key: '-----BEGIN PRIVATE KEY-----\\nfixture' };
test('Firebase credentials handle JSON, double-encoded JSON and escaped PEM lines', () => {
  for (const raw of [JSON.stringify(account), JSON.stringify(JSON.stringify(account))]) {
    assert.deepEqual(firebaseCredentials(raw), { projectId: account.project_id, clientEmail: account.client_email, privateKey: '-----BEGIN PRIVATE KEY-----\nfixture' });
  }
});
test('Firebase configuration failures are specific and do not include supplied secrets', () => {
  for (const raw of ['', 'private-secret-invalid-json', JSON.stringify({ ...account, project_id: 'another-project' }), JSON.stringify({ project_id: account.project_id })]) {
    assert.throws(() => firebaseCredentials(raw), error => error instanceof FirebaseConfigurationError && !error.message.includes('private-secret'));
  }
});
