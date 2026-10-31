import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BackofficeAiConfigurationError,
  getAiModelOrder,
  getAiProviderPlan,
  getBackofficeAiAccessCode,
  generateBackofficeAiJson,
} from './backoffice-ai.ts';

test('auto mode tries configured providers in order and skips providers without keys', () => {
  assert.deepEqual(getAiProviderPlan({
    AI_PROVIDER: 'auto',
    AI_PROVIDER_ORDER: 'openai,gemini',
    GEMINI_API_KEY: 'gemini-key',
  }), ['gemini']);
  assert.deepEqual(getAiProviderPlan({
    AI_PROVIDER: 'auto',
    AI_PROVIDER_ORDER: 'openai,gemini',
    GEMINI_API_KEY: 'gemini-key',
    OPENAI_API_KEY: 'openai-key',
  }), ['openai', 'gemini']);
});

test('explicit provider selection does not silently switch providers', () => {
  assert.throws(() => getAiProviderPlan({ AI_PROVIDER: 'openai', GEMINI_API_KEY: 'gemini-key' }), BackofficeAiConfigurationError);
  assert.deepEqual(getAiProviderPlan({ AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'gemini-key', OPENAI_API_KEY: 'openai-key' }), ['gemini']);
});

test('rejects unknown provider settings and missing provider keys', () => {
  assert.throws(() => getAiProviderPlan({ AI_PROVIDER: 'unknown' }), BackofficeAiConfigurationError);
  assert.throws(() => getAiProviderPlan({ AI_PROVIDER_ORDER: 'unknown' }), BackofficeAiConfigurationError);
  assert.throws(() => getAiProviderPlan({}), BackofficeAiConfigurationError);
});

test('supports model order, configured preferred model, and safe defaults', () => {
  assert.deepEqual(getAiModelOrder('gemini', { GEMINI_MODEL_ORDER: 'model-a, model-b', GEMINI_MODEL: 'model-c' }), ['model-a', 'model-b', 'model-c', 'gemini-2.5-flash']);
  assert.deepEqual(getAiModelOrder('openai', { OPENAI_MODEL: 'model-x' }), ['model-x', 'gpt-4o-mini']);
});

test('accepts the environment sample access-code name as a fallback', () => {
  assert.equal(getBackofficeAiAccessCode({ AI_BACKOFFICE_SECRET: 'secret' }), 'secret');
  assert.equal(getBackofficeAiAccessCode({ AI_ACCESS_CODE: 'legacy', AI_BACKOFFICE_SECRET: 'secret' }), 'legacy');
});

test('OpenAI success returns parsed JSON and sends image data as multimodal input', async () => {
  let requestBody: Record<string, unknown> | undefined;
  const result = await generateBackofficeAiJson('prompt', ['data:image/png;base64,abc'], {
    AI_PROVIDER: 'openai',
    OPENAI_API_KEY: 'test-key',
  }, async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json({ choices: [{ message: { content: '{"title":"Test"}' } }] });
  });
  assert.deepEqual(result, { title: 'Test' });
  const messages = requestBody?.messages as Array<{ content: Array<{ type: string }> }>;
  assert.deepEqual(messages[0].content.map(part => part.type), ['text', 'image_url']);
});

test('auto mode falls back from Gemini when only OpenAI is configured', () => {
  assert.deepEqual(getAiProviderPlan({
    AI_PROVIDER: 'auto',
    AI_PROVIDER_ORDER: 'gemini,openai',
    OPENAI_API_KEY: 'openai-key',
  }), ['openai']);
});

test('auto mode uses Gemini by default when its key is configured', () => {
  assert.deepEqual(getAiProviderPlan({ GEMINI_API_KEY: 'gemini-key' }), ['gemini']);
});
