import test from 'node:test';
import assert from 'node:assert/strict';
import { assertEmulatorIsolation, emulatorServices } from '../../server/test-isolation';
import { browserEmulatorTarget, EMULATOR_PROJECT } from '../../src/lib/emulator-target';

test('test target rejects production, remote hosts, missing emulators and credential-bearing execution', () => {
  const valid = { ARAM_TEST_MODE: 'emulator', GCLOUD_PROJECT: EMULATOR_PROJECT, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199' };
  assert.equal(assertEmulatorIsolation(valid).projectId, EMULATOR_PROJECT);
  for (const change of [{ GCLOUD_PROJECT: 'aramcreations-e1529' }, { FIRESTORE_EMULATOR_HOST: 'firestore.googleapis.com:443' }, { FIREBASE_STORAGE_EMULATOR_HOST: '' }, { FIREBASE_SERVICE_ACCOUNT: 'forbidden' }, { RESEND_API_KEY: 'forbidden' }]) assert.throws(() => assertEmulatorIsolation({ ...valid, ...change }));
  const browser = { VITE_ARAM_TEST_MODE: 'emulator', VITE_ARAM_TEST_PROJECT: EMULATOR_PROJECT, VITE_FIRESTORE_EMULATOR_HOST: valid.FIRESTORE_EMULATOR_HOST, VITE_FIREBASE_AUTH_EMULATOR_HOST: valid.FIREBASE_AUTH_EMULATOR_HOST, VITE_FIREBASE_STORAGE_EMULATOR_HOST: valid.FIREBASE_STORAGE_EMULATOR_HOST };
  assert.equal(browserEmulatorTarget(browser, '127.0.0.1')!.projectId, EMULATOR_PROJECT);
  assert.throws(() => browserEmulatorTarget(browser, 'lovely-bienenstitch-b6079c.netlify.app'));
  assert.throws(() => browserEmulatorTarget({ ...browser, VITE_ARAM_TEST_PROJECT: 'aramcreations-e1529' }, 'localhost'));
  assert.equal(emulatorServices('isolation-check').app.options.projectId, EMULATOR_PROJECT);
});
test('test worker cannot fetch production or connect to external TCP hosts', async () => {
  await assert.rejects(async () => fetch('https://firestore.googleapis.com/'));
  const { Socket } = await import('node:net');
  assert.throws(() => new Socket().connect({ host: 'firestore.googleapis.com', port: 443 }));
});
