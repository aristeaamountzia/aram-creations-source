import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateVideoInput, videoEncodingPlan, VIDEO_INPUT_LIMIT, VIDEO_UPLOAD_LIMIT } from '../src/lib/video-policy';
test('oversized source is rejected before reading or starting a worker; a source above the upload limit can be compressed', () => {
  assert.throws(() => validateVideoInput({ size: VIDEO_INPUT_LIMIT + 1, type: 'video/mp4' }), /1 GB/);
  assert.throws(() => validateVideoInput({ size: 0, type: 'video/mp4' }));
  assert.doesNotThrow(() => validateVideoInput({ size: VIDEO_UPLOAD_LIMIT + 1, type: 'video/mp4' }));
});
test('portrait and landscape retain orientation without upscaling; bitrate accounts for audio and duration', () => {
  const landscape = videoEncodingPlan(3840, 2160, 30, true);
  const portrait = videoEncodingPlan(2160, 3840, 30, true);
  assert.equal(landscape.width, 1280); assert.equal(landscape.height, 720);
  assert.equal(portrait.width, 720); assert.equal(portrait.height, 1280);
  const small = videoEncodingPlan(320, 240, 3, false);
  assert.equal(small.width, 320); assert.equal(small.height, 240);
  const long = videoEncodingPlan(3840, 2160, 600, true);
  assert.ok((long.bitrate + long.audioBitrate) * 600 / 8 < VIDEO_UPLOAD_LIMIT);
  assert.ok(videoEncodingPlan(3840, 2160, 600, true, true).bitrate < long.bitrate);
  assert.throws(() => videoEncodingPlan(1080, 1920, 601, true), /10 λεπτά/);
});

