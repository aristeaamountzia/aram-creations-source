type GeminiEnvironment = {
  GEMINI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
};

export function getGeminiApiKey(environment: GeminiEnvironment = process.env): string | undefined {
  return environment.GEMINI_API_KEY?.trim() || environment.GOOGLE_API_KEY?.trim() || undefined;
}
