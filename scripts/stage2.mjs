import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// An allowlist avoids inheriting cloud credentials, proxies or provider secrets.
const env = Object.fromEntries(['PATH', 'JAVA_HOME', 'HOME', 'TMPDIR', 'TEMP', 'LANG', 'ARAM_CHROMIUM_EXECUTABLE'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
Object.assign(env, {
  ARAM_TEST_MODE: 'emulator', GCLOUD_PROJECT: 'demo-aram-stage1', GOOGLE_CLOUD_PROJECT: 'demo-aram-stage1',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
  VITE_ARAM_TEST_MODE: 'emulator', VITE_ARAM_TEST_PROJECT: 'demo-aram-stage1',
  VITE_FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', VITE_FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', VITE_FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
  FIREBASE_CLI_DISABLE_TELEMETRY: '1', DOTENV_CONFIG_PATH: '/dev/null',
});
const cli = resolve(root, 'node_modules/firebase-tools/lib/bin/firebase.js');
const worker = `${process.execPath} --import ./tests/stage1/network-guard.mjs --import tsx --test --test-concurrency=1 tests/stage2/*.test.ts`;
const child = spawn(process.execPath, [cli, 'emulators:exec', '--only', 'auth,firestore,storage', '--project', 'demo-aram-stage1', '--config', 'firebase.stage2.json', worker], { cwd: root, env, stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
