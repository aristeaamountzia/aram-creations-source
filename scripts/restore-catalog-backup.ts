import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { adminDatabase } from '../server/admin-database';
import { downloadBackup } from '../server/catalog-backups';
import { recoverBackup } from '../server/backup-recovery';

const args = process.argv.slice(2);
const value = (name: string) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const file = value('--file'), name = value('--backup');
if (!file && !name) throw new Error('Χρήση: npm run backup:restore -- --file backup.json[.gz] [--prefix recovery_test_] [--apply]. Προεπιλογή: μόνο έλεγχος.');
const data = file ? await readFile(file) : await downloadBackup(name!);
const json = data[0] === 0x1f && data[1] === 0x8b ? gunzipSync(data) : data;
const production = args.includes('--production-empty');
if (production && value('--prefix')) throw new Error('Διάλεξε --prefix ή --production-empty, όχι και τα δύο.');
const prefix = production ? '' : value('--prefix') || `recovery_${Date.now()}_`;
const result = await recoverBackup(JSON.parse(json.toString()), adminDatabase(), {
  prefix, apply: args.includes('--apply'), allowPartial: args.includes('--allow-partial'), mediaOnly: args.includes('--media-only')
});
console.log(JSON.stringify(result, null, 2));
