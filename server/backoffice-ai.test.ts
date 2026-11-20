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
  assert.deepEqual(getAiModelOrder('gemini', { GEMINI_MODEL_ORDER: 'model-a, model-b', GEMINI_MODEL: 'model-c' }), ['model-a', 'model-b', 'model-c', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest']);
  assert.deepEqual(getAiModelOrder('openai', { OPENAI_MODEL: 'model-x' }), ['model-x', 'gpt-4o-mini']);
});

test('quota and credential failures do not retry every model and expose only safe reasons', async t => {
  t.mock.method(console, 'warn', () => {});
  for (const status of [401, 429]) {
    let calls = 0;
    await assert.rejects(generateBackofficeAiJson('prompt', [], {
      AI_PROVIDER: 'openai', OPENAI_API_KEY: 'private-key', OPENAI_MODEL_ORDER: 'first,second,third',
    }, async () => {
      calls++;
      return Response.json({ error: { message: 'private-key provider internals' } }, { status });
    }), error => error instanceof Error && error.message.includes(`HTTP ${status}`) && !error.message.includes('private-key'));
    assert.equal(calls, 1);
  }
});

test('auto mode falls back to OpenAI after one Gemini quota failure', async t => {
  t.mock.method(console, 'warn', () => {});
  const calls: string[] = [];
  const result = await generateBackofficeAiJson('prompt', ['data:image/png;base64,abc'], {
    AI_PROVIDER: 'auto', GEMINI_API_KEY: 'gemini-test', OPENAI_API_KEY: 'openai-test',
  }, async (input, init) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('googleapis.com')) return Response.json({ error: { code: 429, message: 'Quota exceeded', status: 'RESOURCE_EXHAUSTED' } }, { status: 429 });
    assert.ok(JSON.parse(String(init?.body)).messages[0].content.some((part: any) => part.type === 'image_url'));
    return Response.json({ choices: [{ message: { content: '{"title":"Κυκλαδικό ίχνος"}' } }] });
  });
  assert.equal(calls.length, 2);
  assert.deepEqual(result, { title: 'Κυκλαδικό ίχνος' });
});

test('model-not-found errors try the next configured model', async t => {
  t.mock.method(console, 'warn', () => {});
  const models: string[] = [];
  await generateBackofficeAiJson('prompt', [], { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'test', OPENAI_MODEL_ORDER: 'retired,available' }, async (_input, init) => {
    models.push(JSON.parse(String(init?.body)).model);
    return models.length === 1 ? Response.json({}, { status: 404 }) : Response.json({ choices: [{ message: { content: '{"title":"Έργο"}' } }] });
  });
  assert.deepEqual(models, ['retired', 'available']);
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

test('provider errors keep upstream request details out of logs and client messages', async t => {
  const warning = t.mock.method(console, 'warn', () => {});
  const errorLog = t.mock.method(console, 'error', () => {});
  const marker = 'CODEX TEST private upstream detail';
  await assert.rejects(generateBackofficeAiJson('test', [], {
    AI_PROVIDER: 'openai', OPENAI_API_KEY: 'test',
  }, async () => { throw new Error(marker); }), error =>
    error instanceof Error && !error.message.includes(marker) && error.message.includes('πάροχο AI'));
  assert.ok(warning.mock.callCount() > 0);
  assert.equal(errorLog.mock.callCount(), 0);
  assert.ok(warning.mock.calls.every(call => !call.arguments.join(' ').includes(marker)));
});
