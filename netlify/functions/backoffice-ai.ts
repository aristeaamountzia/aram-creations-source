import { timingSafeEqual } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

type AiInput = {
  product?: Record<string, unknown>;
  task?: string;
  prompt?: string;
  mode?: string;
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

  const configured = process.env.AI_ACCESS_CODE || "";
  const provided = request.headers.get("x-aram-ai-secret") || "";
  if (!configured) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function promptFor(input: AiInput): string {
  const product = input.product || {};
  const field = (key: string) => String(product[key] ?? "(κενό)");
  const extra = input.prompt ? `\nΕιδική απαίτηση: ${input.prompt}` : "";
  if (input.mode === "portfolio_item") {
    return `Είσαι επιμελητής εικαστικού Portfolio για το Aram Creations. Γράψε στα Ελληνικά με ακρίβεια, χωρίς να εφευρίσκεις χαρακτηριστικά.
Τίτλος: ${field("name")}; κατηγορία: ${field("category")}; έτος: ${field("year")}; υλικό/τεχνική: ${field("medium")}; διαστάσεις: ${field("dimensions")}; περιγραφή: ${field("description")}.
Εργασία: ${input.task || "full"}.${extra}
Απάντησε αποκλειστικά με έγκυρο JSON: title, description, shortDescription, tags (array), altText. Χωρίς Markdown.`;
  }
  const colors = Array.isArray(product.colors) ? product.colors.join(", ") : "(κενό)";
  const materials = Array.isArray(product.materials) ? product.materials.join(", ") : "(κενό)";
  return `Είσαι copywriter και catalog manager για τα χειροποίητα κοσμήματα Aram Creations. Γράψε κομψά, στα Ελληνικά, χωρίς να επινοείς μη διαθέσιμα στοιχεία.
Τίτλος: ${field("name")}; κατηγορία: ${field("category")}; συλλογή: ${field("collection")}; περιγραφή: ${field("description")}; τιμή: ${field("price")}; υλικά: ${materials}; χρώματα: ${colors}.
Εργασία: ${input.task || "full"}.${extra}
Απάντησε αποκλειστικά με έγκυρο JSON με πεδία title, description, category, status, colors (array), materials (array), tags (array), shortDescription, instagramCaption, altText. Χωρίς Markdown.`;
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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return json({ error: "Το AI Gateway δεν είναι διαθέσιμο σε αυτή τη Function." }, 503);

    const images = Array.isArray(input.imageDataUrls) && input.imageDataUrls.length
      ? input.imageDataUrls : input.imageDataUrl ? [input.imageDataUrl] : [];
    const contents: Array<string | { inlineData: { mimeType: string; data: string } }> = [];
    for (const image of images.slice(0, 3)) {
      const match = typeof image === "string" && image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) contents.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
    contents.push(promptFor(input));
    const ai = new GoogleGenAI({
      apiKey,
      ...(process.env.GOOGLE_GEMINI_BASE_URL ? { httpOptions: { baseUrl: process.env.GOOGLE_GEMINI_BASE_URL } } : {}),
    });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: { responseMimeType: "application/json", temperature: 0.6 },
    });
    const result = response.text?.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim() || "{}";
    try {
      return json(JSON.parse(result));
    } catch {
      return json({ error: "Το AI επέστρεψε μη έγκυρη απάντηση. Δοκίμασε ξανά." }, 502);
    }
  } catch (error) {
    console.error("Back Office AI failed", error);
    return json({ error: "Η δημιουργία AI απέτυχε προσωρινά." }, 500);
  }
}

