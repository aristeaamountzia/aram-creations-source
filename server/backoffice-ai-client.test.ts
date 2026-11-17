import test from 'node:test';
import assert from 'node:assert/strict';
import { requestBackofficeAi } from '../src/lib/backoffice-ai-client';

test('AI client surfaces errors and empty responses even when a custom endpoint returns HTTP 200', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ error: 'Provider quota exhausted' });
    await assert.rejects(() => requestBackofficeAi({}, {}), /quota exhausted/);
    for (const value of [{}, [], { suggestion: {} }, { title: ' ' }]) {
      globalThis.fetch = async () => Response.json(value);
      await assert.rejects(() => requestBackofficeAi({}, {}));
    }
    for (const value of [{ title: 'Νέος τίτλος' }, { description: 'Περιγραφή έργου' }, { colors: ['Μπλε'] }, { suggestion: { name: 'Κόσμημα' } }]) {
      globalThis.fetch = async () => Response.json(value);
      assert.deepEqual(await requestBackofficeAi({}, {}), value);
    }
  } finally { globalThis.fetch = original; }
});
