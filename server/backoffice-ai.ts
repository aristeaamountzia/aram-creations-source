import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKeys } from "./gemini-config";

type AiProvider = "gemini" | "openai";

type AiEnvironment = {
  AI_PROVIDER?: string;
  AI_PROVIDER_ORDER?: string;
  AI_ACCESS_CODE?: string;
  AI_BACKOFFICE_SECRET?: string;
  GEMINI_API_KEYS?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  GEMINI_MODEL?: string;
  GEMINI_MODEL_ORDER?: string;
  GOOGLE_GEMINI_BASE_URL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_MODEL_ORDER?: string;
};

export class BackofficeAiConfigurationError extends Error {}

export class BackofficeAiGenerationError extends Error {}

type FailureReason = 'authentication' | 'quota' | 'model' | 'timeout' | 'unavailable' | 'invalid_response' | 'request' | 'network';
class ProviderFailure extends Error {
  constructor(readonly reason: FailureReason, readonly status?: number) { super(reason); }
}

function providerFailure(error: unknown): ProviderFailure {
  if (error instanceof ProviderFailure) return error;
  const value = error as { status?: unknown; code?: unknown; name?: string; message?: string };
  const httpCode = Number(value?.status || value?.code);
  const status = httpCode >= 100 && httpCode <= 599 ? httpCode : undefined;
  if (status === 504 || value?.name === 'TimeoutError' || value?.name === 'AbortError' || /timed? ?out|timeout/i.test(value?.message || '')) return new ProviderFailure('timeout', status);
  if (status === 401 || status === 403 || /API_KEY_INVALID|API key not valid/i.test(value?.message || '')) return new ProviderFailure('authentication', status);
  if (status === 429) return new ProviderFailure('quota', status);
  if (status === 404) return new ProviderFailure('model', status);
  if (status && status >= 500) return new ProviderFailure('unavailable', status);
  if (status) return new ProviderFailure('request', status);
  if (error instanceof SyntaxError) return new ProviderFailure('invalid_response');
  return new ProviderFailure('network');
}

function failureMessage(provider: AiProvider, failure: ProviderFailure): string {
  const reasons: Record<FailureReason, string> = {
    authentication: 'το API key απορρίφθηκε ή δεν έχει δικαίωμα πρόσβασης',
    quota: 'εξαντλήθηκε το όριο χρήσης ή τα διαθέσιμα credits',
    model: 'το μοντέλο δεν είναι διαθέσιμο',
    timeout: 'ξεπεράστηκε ο χρόνος αναμονής',
    unavailable: 'ο πάροχος είναι προσωρινά μη διαθέσιμος',
    invalid_response: 'ο πάροχος δεν επέστρεψε έγκυρο JSON',
    request: 'ο πάροχος απέρριψε τα δεδομένα του αιτήματος',
    network: 'απέτυχε η σύνδεση με τον πάροχο',
  };
  return `${provider === 'gemini' ? 'Gemini' : 'OpenAI'}${failure.status ? ` HTTP ${failure.status}` : ''}: ${reasons[failure.reason]}.`;
}

export function getBackofficeAiAccessCode(environment: AiEnvironment = process.env): string {
  return environment.AI_ACCESS_CODE?.trim() || environment.AI_BACKOFFICE_SECRET?.trim() || "";
}

export function getAiProviderPlan(environment: AiEnvironment = process.env): AiProvider[] {
  const configuredProvider = environment.AI_PROVIDER?.trim().toLowerCase() || "auto";
  if (configuredProvider !== "auto" && configuredProvider !== "gemini" && configuredProvider !== "openai") {
    throw new BackofficeAiConfigurationError("AI_PROVIDER must be auto, gemini, or openai.");
  }

  const configuredOrder = environment.AI_PROVIDER_ORDER?.split(",").map(provider => provider.trim().toLowerCase()).filter(Boolean);
  const order = configuredProvider === "auto"
    ? configuredOrder?.length ? configuredOrder : ["gemini", "openai"]
    : [configuredProvider];
  const providers = [...new Set(order.filter((provider): provider is AiProvider => provider === "gemini" || provider === "openai"))];
  if (!providers.length) throw new BackofficeAiConfigurationError("AI_PROVIDER_ORDER must include gemini or openai.");

  const available: AiProvider[] = [];
  for (const provider of providers) {
    const hasKey = provider === "gemini"
      ? getGeminiApiKeys(environment).length > 0
      : Boolean(environment.OPENAI_API_KEY?.trim());
    if (hasKey) available.push(provider);
  }
  if (!available.length) {
    throw new BackofficeAiConfigurationError("Set GEMINI_API_KEYS, GEMINI_API_KEY (or GOOGLE_API_KEY), or OPENAI_API_KEY in the server environment.");
  }
  if (configuredProvider !== "auto" && available[0] !== configuredProvider) {
    const variable = configuredProvider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY";
    throw new BackofficeAiConfigurationError(`Set ${variable} to use the selected AI provider.`);
  }
  return available;
}

export function getAiModelOrder(provider: AiProvider, environment: AiEnvironment = process.env): string[] {
  const [configuredModels, preferredModel, defaultModel] = provider === "gemini"
    ? [environment.GEMINI_MODEL_ORDER, environment.GEMINI_MODEL, "gemini-3.1-flash-lite"]
    : [environment.OPENAI_MODEL_ORDER, environment.OPENAI_MODEL, "gpt-4o-mini"];
  const models = [
    ...(configuredModels?.split(",").map(model => model.trim()).filter(Boolean) ?? []),
    ...(preferredModel?.trim() ? [preferredModel.trim()] : []),
    defaultModel,
    ...(provider === "gemini" ? ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"] : []),
  ];
  return [...new Set(models)];
}

function imageData(image: string): { mimeType: string; data: string } | undefined {
  const match = image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  return match ? { mimeType: match[1], data: match[2] } : undefined;
}

function parseJsonObject(text: string): Record<string, unknown> {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed: unknown = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ProviderFailure('invalid_response');
  }
  return parsed as Record<string, unknown>;
}

async function generateWithGemini(prompt: string, images: string[], model: string, apiKey: string, environment: AiEnvironment, fetcher: typeof fetch, timeoutMs: number): Promise<Record<string, unknown>> {
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      ...(environment.GOOGLE_GEMINI_BASE_URL ? { baseUrl: environment.GOOGLE_GEMINI_BASE_URL } : {}),
      timeout: timeoutMs,
      retryOptions: { attempts: 1 },
      fetch: fetcher,
    },
  });
  const contents: Array<string | { inlineData: { mimeType: string; data: string } }> = images
    .map(imageData)
    .filter((image): image is { mimeType: string; data: string } => Boolean(image))
    .slice(0, 3)
    .map(image => ({ inlineData: image }));
  contents.push(prompt);
  const response = await ai.models.generateContent({
    model,
    contents,
    config: { responseMimeType: "application/json", abortSignal: AbortSignal.timeout(timeoutMs) },
  });
  if (!response.text) throw new ProviderFailure('invalid_response');
  return parseJsonObject(response.text);
}

async function generateWithOpenAi(prompt: string, images: string[], model: string, environment: AiEnvironment, fetcher: typeof fetch, timeoutMs: number): Promise<Record<string, unknown>> {
  const apiKey = environment.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new BackofficeAiConfigurationError("Set OPENAI_API_KEY to use OpenAI.");
  const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
  for (const image of images.slice(0, 3)) {
    if (imageData(image)) content.push({ type: "image_url", image_url: { url: image } });
  }
  const response = await fetcher("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      response_format: { type: "json_object" },
      temperature: 0.6,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw providerFailure({ status: response.status });
  const result = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
  const text = result.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new ProviderFailure('invalid_response');
  return parseJsonObject(text);
}

export async function generateBackofficeAiJson(
  prompt: string,
  images: string[],
  environment: AiEnvironment = process.env,
  fetcher: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const providers = getAiProviderPlan(environment);
  const deadline = Date.now() + 50_000;
  const failures = new Map<AiProvider, ProviderFailure>();
  for (const [index, provider] of providers.entries()) {
    // Reserve time for the next provider instead of exhausting the Function's
    // execution limit in SDK retries or an unbounded model loop.
    const providerDeadline = Date.now() + Math.floor((deadline - Date.now()) / (providers.length - index));
    const geminiKeys = provider === "gemini" ? getGeminiApiKeys(environment) : [""];
    let stopProvider = false;
    for (const model of getAiModelOrder(provider, environment)) {
      let tryNextModel = false;
      for (const apiKey of geminiKeys) {
        const timeoutMs = Math.min(20_000, providerDeadline - Date.now());
        if (timeoutMs <= 0) { failures.set(provider, new ProviderFailure('timeout')); stopProvider = true; break; }
        try {
          return provider === "gemini"
            ? await generateWithGemini(prompt, images, model, apiKey, environment, fetcher, timeoutMs)
            : await generateWithOpenAi(prompt, images, model, environment, fetcher, timeoutMs);
        } catch (error) {
          if (error instanceof BackofficeAiConfigurationError) throw error;
          const failure = providerFailure(error);
          failures.set(provider, failure);
          console.warn('Back Office AI provider failed', { provider, status: failure.status, reason: failure.reason });
          if (provider === 'gemini' && (failure.reason === 'authentication' || failure.reason === 'quota')) {
            // Try the next configured key when this key is rejected or has no quota.
            continue;
          }
          // A 400/404 can reflect model-specific capabilities or configuration.
          // Try the next configured model before falling back to another provider.
          if (failure.reason === 'model' || failure.reason === 'invalid_response' || failure.status === 400) {
            tryNextModel = true;
            break;
          }
          stopProvider = true;
          break;
        }
      }
      if (stopProvider) break;
      if (!tryNextModel && provider === 'gemini') break;
    }
  }
  throw new BackofficeAiGenerationError(`Δεν ολοκληρώθηκε η πρόταση από τον πάροχο AI. ${[...failures].map(([provider, failure]) => failureMessage(provider, failure)).join(' ')}`);
}
