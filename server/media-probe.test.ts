import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMediaProbe } from '../src/lib/media-probe';

test('accepts the WASM ffprobe success sentinel only with complete, valid metadata', () => {
  const valid = { streams: [{ codec_type: 'video', width: 128, height: 96 }], format: { duration: '1.02' } };
  for (const status of [0, -1]) assert.deepEqual(parseMediaProbe(JSON.stringify(valid), status), valid);
  for (const status of [1, 2, -2]) assert.throws(() => parseMediaProbe(JSON.stringify(valid), status));
  for (const value of ['', 'invalid', '{}', '{"streams":[],"format":{}}', '{"streams":[{}]}', JSON.stringify({ ...valid, error: { string: 'Invalid input' } })]) assert.throws(() => parseMediaProbe(value, -1));
});
