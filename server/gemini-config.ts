type GeminiEnvironment = {
  GEMINI_API_KEYS?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
};

export function getGeminiApiKeys(environment: GeminiEnvironment = process.env): string[] {
  const configuredKeys = environment.GEMINI_API_KEYS?.split(/[\\s,;]+/g) ?? [];
  const legacyKeys = [environment.GEMINI_API_KEY, environment.GOOGLE_API_KEY];
  return [...new Set([...configuredKeys, ...legacyKeys].map(key => key?.trim()).filter((key): key is string => Boolean(key)))];
}

export function getGeminiApiKey(environment: GeminiEnvironment = process.env): string | undefined {
  return getGeminiApiKeys(environment)[0];
}
