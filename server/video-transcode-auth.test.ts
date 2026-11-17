import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeVideoTranscode } from './video-transcode';

test('legacy video endpoint rejects anonymous requests before parsing a large body or starting ffmpeg', async () => {
  for (const header of ['', 'Basic example', 'Bearer ']) {
    let status = 0, continued = false;
    const request = { get: () => header, get body() { throw new Error('Body read before authentication'); } };
    const response = { status(value: number) { status = value; return this; }, json(value: unknown) { return value; } };
    await authorizeVideoTranscode(request as any, response as any, () => { continued = true; });
    assert.equal(status, 401);
    assert.equal(continued, false);
  }
});
