import test from 'node:test';
import assert from 'node:assert/strict';
import { getGeminiApiKey } from './gemini-config.ts';

test('prefers GEMINI_API_KEY when both supported variables are set', () => {
  assert.equal(getGeminiApiKey({ GEMINI_API_KEY: 'gemini-key', GOOGLE_API_KEY: 'google-key' }), 'gemini-key');
});

test('accepts GOOGLE_API_KEY as a fallback', () => {
  assert.equal(getGeminiApiKey({ GOOGLE_API_KEY: 'google-key' }), 'google-key');
});

test('treats missing or blank API keys as unconfigured', () => {
  assert.equal(getGeminiApiKey({}), undefined);
  assert.equal(getGeminiApiKey({ GEMINI_API_KEY: '  ', GOOGLE_API_KEY: '\t' }), undefined);
});
