import { timingSafeEqual } from "node:crypto";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  BackofficeAiConfigurationError,
  generateBackofficeAiJson,
  getBackofficeAiAccessCode,
} from "../../server/backoffice-ai";
import {
  AiSuggestionValidationError,
  BackofficeAiInput,
  buildBackofficeAiPrompt,
  validateBackofficeAiSuggestion,
} from "../../server/ai-suggestion";

type AiInput = BackofficeAiInput & {
  imageDataUrl?: string;
  imageDataUrls?: string[];
};

const json = (data: unknown, status = 200) => Response.json(data, { status });

async function isAuthorized(request: Request): Promise<boolean> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer) {
    try {
      if (!getApps().length) initializeApp({ projectId: "aramcreations-e1529" });
      const user = await getAuth().verifyIdToken(bearer);
      if (user.admin === true || user.email?.toLowerCase() === "aristeaamnta@gmail.com") return true;
    } catch {
      console.warn("Invalid Firebase admin token for AI request");
    }
  }

  const configured = getBackofficeAiAccessCode();
  const provided = request.headers.get("x-aram-ai-secret") || "";
  if (!configured) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export default async function handleRequest(request: Request) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    if (!(await isAuthorized(request))) {
      return json({ error: "Δεν επιβεβαιώθηκε ο διαχειριστής. Συνδέσου ξανά στο Back Office ή έλεγξε τον προαιρετικό κωδικό AI." }, 401);
    }
    let input: AiInput;
    try {
      input = await request.json();
    } catch {
      return json({ error: "Μη έγκυρα δεδομένα AI." }, 400);
    }
    const images = Array.isArray(input.imageDataUrls) && input.imageDataUrls.length
      ? input.imageDataUrls : input.imageDataUrl ? [input.imageDataUrl] : [];
    const suggestion = await generateBackofficeAiJson(buildBackofficeAiPrompt(input), images);
    return json(validateBackofficeAiSuggestion(suggestion, input));
  } catch (error) {
    if (error instanceof BackofficeAiConfigurationError) return json({ error: error.message }, 503);
    if (error instanceof AiSuggestionValidationError) return json({ error: error.message }, 422);
    console.error("Back Office AI generation failed (502).");
    return json({ error: "Δεν λήφθηκε έγκυρη πρόταση από τον πάροχο AI. Δοκίμασε ξανά." }, 502);
  }
}
