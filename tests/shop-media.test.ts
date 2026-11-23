import assert from 'node:assert/strict';
import test from 'node:test';
import { getItemMediaList } from '../src/components/ShopView';

test('a video-first Shop listing preserves its photos as images', () => {
  const result = getItemMediaList({
    id: 'mixed-media',
    fileType: 'video',
    src: '/primary-video',
    mediaList: [{ url: '/primary-video', type: 'video' }, { url: '/typed-photo', type: 'image' }],
    images: ['/extra-photo.jpg'],
  });
  assert.deepEqual(result, [
    { url: '/primary-video', type: 'video' },
    { url: '/typed-photo', type: 'image' },
    { url: '/extra-photo.jpg', type: 'image' },
  ]);
});
