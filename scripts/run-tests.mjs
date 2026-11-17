import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Credentialed Firestore integration is explicitly opt-in; all offline tests are discovered.
const integration = new Set(['server/orders-integration.test.ts']);
function discover(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? discover(path) : path.endsWith('.test.ts') ? [path.replaceAll('\\', '/')] : [];
  });
}
const files = ['server', 'tests'].flatMap(discover).filter(path => !integration.has(path)).sort();
if (!files.length) throw new Error('No offline tests were found.');
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
