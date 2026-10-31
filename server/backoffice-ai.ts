import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "./gemini-config";

type AiProvider = "gemini" | "openai";

type AiEnvironment = {
  AI_PROVIDER?: string;
  AI_PROVIDER_ORDER?: string;
  AI_ACCESS_CODE?: string;
  AI_BACKOFFICE_SECRET?: string;
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
      ? Boolean(getGeminiApiKey(environment))
      : Boolean(environment.OPENAI_API_KEY?.trim());
    if (hasKey) available.push(provider);
  }
  if (!available.length) {
    throw new BackofficeAiConfigurationError("Set GEMINI_API_KEY (or GOOGLE_API_KEY) or OPENAI_API_KEY in the server environment.");
  }
  if (configuredProvider !== "auto" && available[0] !== configuredProvider) {
    const variable = configuredProvider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY";
    throw new BackofficeAiConfigurationError(`Set ${variable} to use the selected AI provider.`);
  }
  return available;
}

export function getAiModelOrder(provider: AiProvider, environment: AiEnvironment = process.env): string[] {
  const [configuredModels, preferredModel, defaultModel] = provider === "gemini"
    ? [environment.GEMINI_MODEL_ORDER, environment.GEMINI_MODEL, "gemini-2.5-flash"]
    : [environment.OPENAI_MODEL_ORDER, environment.OPENAI_MODEL, "gpt-4o-mini"];
  const models = [
    ...(configuredModels?.split(",").map(model => model.trim()).filter(Boolean) ?? []),
    ...(preferredModel?.trim() ? [preferredModel.trim()] : []),
    defaultModel,
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
    throw new Error("The AI provider returned a non-object JSON value.");
  }
  return parsed as Record<string, unknown>;
}

async function generateWithGemini(prompt: string, images: string[], model: string, environment: AiEnvironment): Promise<Record<string, unknown>> {
  const apiKey = getGeminiApiKey(environment);
  if (!apiKey) throw new BackofficeAiConfigurationError("Set GEMINI_API_KEY or GOOGLE_API_KEY to use Gemini.");
  const ai = new GoogleGenAI({
    apiKey,
    ...(environment.GOOGLE_GEMINI_BASE_URL ? { httpOptions: { baseUrl: environment.GOOGLE_GEMINI_BASE_URL } } : {}),
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
    config: { responseMimeType: "application/json", temperature: 0.6 },
  });
  if (!response.text) throw new Error("Gemini returned an empty response.");
  return parseJsonObject(response.text);
}

async function generateWithOpenAi(prompt: string, images: string[], model: string, environment: AiEnvironment, fetcher: typeof fetch): Promise<Record<string, unknown>> {
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
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`OpenAI request failed (HTTP ${response.status}).`);
  const result = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
  const text = result.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("OpenAI returned an empty response.");
  return parseJsonObject(text);
}

export async function generateBackofficeAiJson(
  prompt: string,
  images: string[],
  environment: AiEnvironment = process.env,
  fetcher: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const providers = getAiProviderPlan(environment);
  const failures: string[] = [];

  for (const provider of providers) {
    for (const model of getAiModelOrder(provider, environment)) {
      try {
        return provider === "gemini"
          ? await generateWithGemini(prompt, images, model, environment)
          : await generateWithOpenAi(prompt, images, model, environment, fetcher);
      } catch (error) {
        if (error instanceof BackofficeAiConfigurationError) throw error;
        failures.push(`${provider} (${model}) failed`);
        console.error(`Back Office AI provider ${provider} failed for model ${model}.`, error);
      }
    }
  }
  throw new BackofficeAiGenerationError(`AI generation failed: ${failures.join("; ")}.`);
}
