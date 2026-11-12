import { extractListingState, classifyVintedCategory } from './server/vinted-listing';
import { getVintedReviews, fetchLiveVintedReviews, persistVintedReviewsToFirestore } from './server/vinted-reviews';
import { createStripeCheckoutSession, retrieveStripeCheckoutSession } from './server/stripe-service';
import { sendContactEmail } from './server/contact-service';
import catalogBackupsHandler from "./netlify/functions/catalog-backups";
import mediaHandler from "./netlify/functions/media";
import wixProjectHandler from "./netlify/functions/wix-project";
import { handleVideoTranscode } from "./server/video-transcode";
import {
  bridgedOrdersHandler,
  bridgedStripeConfirmHandler,
  bridgedStripeWebhookHandler,
  bridgedCatalogBackupsHandler,
  bridgedOrderEmailTestHandler,
  bridgedContactHandler,
} from "./server/production-bridge";
import orderEmailTestHandler from "./netlify/functions/order-email-test";
import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import path from "path";
import { isVintedHost as validVintedHost } from './src/lib/vinted-url';
import { timingSafeEqual } from "node:crypto";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import {
  BackofficeAiConfigurationError,
  generateBackofficeAiJson,
  getBackofficeAiAccessCode,
} from "./server/backoffice-ai";
import {
  AiSuggestionValidationError,
  buildBackofficeAiPrompt,
  validateBackofficeAiSuggestion,
} from "./server/ai-suggestion";

const app = express();

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// CORS headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Aram-AI-Secret");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// 1. Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    app: "Aram Creations Unified Platform",
    timestamp: new Date().toISOString(),
    firebaseProject: "aramcreations-e1529",
    aiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim()),
    aiGatewayConfigured: Boolean(process.env.GOOGLE_GEMINI_BASE_URL),
  });
});


// 2. Gemini AI Assistant endpoint
async function handleBackofficeAi(req: Request, res: Response) {
  try {
    const configuredAccessCode = getBackofficeAiAccessCode();
    const providedAccessCode = req.get("X-Aram-AI-Secret") || "";
    const bearer = req.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1] || '';
    let verifiedAdmin = false;
    if (bearer) {
      try {
        if (!getApps().length) initializeApp({ projectId: 'aramcreations-e1529' });
        const decoded = await getAdminAuth().verifyIdToken(bearer);
        verifiedAdmin = decoded.admin === true || decoded.email?.toLowerCase() === 'aristeaamnta@gmail.com';
      } catch (error) {
        console.warn('Invalid Firebase admin token for AI request');
      }
    }
    const expectedCode = Buffer.from(configuredAccessCode);
    const suppliedCode = Buffer.from(providedAccessCode);
    const validLegacyCode = Boolean(configuredAccessCode) && expectedCode.length === suppliedCode.length && timingSafeEqual(expectedCode, suppliedCode);
    if (!verifiedAdmin && !validLegacyCode) {
      return res.status(401).json({ error: 'Δεν επιβεβαιώθηκε ο διαχειριστής. Συνδέσου ξανά στο Back Office ή έλεγξε τον προαιρετικό κωδικό AI.' });
    }

    const {
      product = {},
      task = "full",
      prompt = "",
      imageDataUrl = "",
      imageDataUrls = [],
    } = req.body || {};

    
    const imageList = Array.isArray(imageDataUrls) && imageDataUrls.length > 0
      ? imageDataUrls
      : imageDataUrl ? [imageDataUrl] : [];

    const aiInput = { product, task, prompt, mode: req.body?.mode };
    const systemPrompt = buildBackofficeAiPrompt(aiInput);

    const parsedData = await generateBackofficeAiJson(systemPrompt, imageList);
    return res.json(validateBackofficeAiSuggestion(parsedData, aiInput));
  } catch (error: any) {
    console.error("Error in backoffice-ai:", error);
    if (error instanceof BackofficeAiConfigurationError) {
      return res.status(503).json({
        ok: false,
        error: "Δεν έχει οριστεί GEMINI_API_KEY (ή OPENAI_API_KEY) στο αρχείο .env του server.",
        code: "AI_KEY_MISSING",
        help: "Ελέγξτε τις ρυθμίσεις στο αρχείο .env ή στις παραμέτρους περιβάλλοντος του Netlify."
      });
    }
    if (error instanceof AiSuggestionValidationError) {
      return res.status(422).json({
        ok: false,
        error: error.message,
        code: "AI_SUGGESTION_INVALID",
      });
    }
    return res.status(502).json({
      ok: false,
      error: error.message || "Η δημιουργία AI απέτυχε προσωρινά.",
    });
  }
}

app.post("/api/backoffice-ai", handleBackofficeAi);
app.post("/.netlify/functions/backoffice-ai", handleBackofficeAi);

// 3. Vinted Scraper Endpoint with robust multi-image, category, color, material, condition extraction & Gemini AI enhancement
async function handleVintedLink(req: Request, res: Response) {
  try {
    const rawUrl = (req.query.url as string) || (req.body?.url as string);
    if (!rawUrl) {
      return res.status(400).json({ ok: false, error: "Missing 'url' parameter" });
    }

    let listingUrl: URL;
    try {
      listingUrl = new URL(rawUrl.trim());
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid URL format" });
    }
    const decodedUrl = listingUrl.toString();
    const isVintedHost = validVintedHost(listingUrl.hostname);
    const idMatch = listingUrl.pathname.match(/^\/items\/(\d+)(?:-|\/|$)/i);
    if (listingUrl.protocol !== 'https:' || listingUrl.username || listingUrl.password || listingUrl.port || !isVintedHost || !idMatch) {
      return res.status(400).json({ ok: false, error: "Enter a valid public Vinted item link." });
    }
    const vintedId = idMatch[1];

    // Generate readable fallback title from URL slug
    const slugMatch = decodedUrl.match(/\/items\/\d+-([^?#]+)/i);
    let fallbackTitle = "";
    if (slugMatch?.[1]) {
      fallbackTitle = slugMatch[1]
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    let html = "";
    let upstreamStatus = 0;
    const candidateUrls = [...new Set([decodedUrl, `${listingUrl.origin}/items/${vintedId}`])];
    for (const candidateUrl of candidateUrls) {
      try {
        const response = await fetch(candidateUrl, {
          signal: AbortSignal.timeout(12000),
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "el-GR,el;q=0.9,en-US;q=0.8,en;q=0.7",
          },
        });
        upstreamStatus = response.status;
        const finalUrl = new URL(response.url);
        const finalItemId = finalUrl.pathname.match(/^\/items\/(\d+)(?:-|\/|$)/i)?.[1];
        if (response.ok && validVintedHost(finalUrl.hostname) && finalItemId === vintedId) {
          html = await response.text();
          break;
        }
      } catch (fetchErr) {
        console.warn('Vinted candidate fetch failed:', fetchErr);
      }
    }
    if (!html) {
      return res.status(502).json({
        ok: false,
        error: `Το Vinted δεν επέτρεψε ανάγνωση από τον server (HTTP ${upstreamStatus || 'network'}). Το link μπορεί να ανοίγει κανονικά στον browser σου. Δοκίμασε ξανά αργότερα ή καταχώρησε το προϊόν χειροκίνητα.`,
      });
    }

    const parseNum = (val: any): number | null => {
      if (val === null || val === undefined) return null;
      if (typeof val === "number" && Number.isFinite(val)) return val;
      const str = String(val).trim().replace("€", "").replace(",", ".").replace(/[^\d.]/g, "");
      const num = parseFloat(str);
      return Number.isFinite(num) ? num : null;
    };

    let title = "";
    let description = "";
    let price: number | null = null;
    let priceKnown = false;
    let currency = "EUR";
    let favoritesCount: number | null = null;
    let viewsCount: number | null = null;
    let isSold = false;
    let isReserved = false;
    let availabilityKnown = false;
    let availability = 'unknown';
    let brand = "";
    let condition = "";
    let extractedCategory = "";
    const extractedColors: string[] = [];
    const extractedMaterials: string[] = [];
    const rawImages: string[] = [];
    const structuredImages: string[] = [];

    if (html) {
      const getMeta = (prop: string): string => {
        const match =
          html.match(new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i")) ||
          html.match(new RegExp(`<meta[^>]*name=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i")) ||
          html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${prop}["']`, "i")) ||
          html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${prop}["']`, "i"));
        return match ? match[1].trim() : "";
      };

      title = getMeta("og:title") || getMeta("title");
      if (!title) {
        const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
        title = titleMatch ? titleMatch[1].trim() : "";
      }
      title = title.replace(/\s*\|\s*Vinted.*$/i, "").replace(/\s*-\s*Vinted.*$/i, "").trim();

      description = getMeta("og:description") || getMeta("description") || "";
      const mainImage = getMeta("og:image") || getMeta("twitter:image");
      if (mainImage) rawImages.push(mainImage);

      // Extract all Vinted image URLs, including URLs escaped inside JSON/script data.
      const allImageMatches = html.match(/https?:\\?\/\\?\/[^"'\s]*vinted\.net\/[^"'\s\>\<\,]+/gi) || [];
      rawImages.push(...allImageMatches.map((url) => url.replace(/\\\//g, "/")));

      // Vinted's current gallery is rendered in HTML and provides the authoritative
      // item-photo IDs; avoid collecting unrelated recommendations from the full page.
      const galleryTags = html.match(/<img\b(?=[^>]*data-testid=["']item-photo-\d+--img["'])[^>]*>/gi) || [];
      for (const tag of galleryTags) {
        const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
        if (src) structuredImages.push(src);
      }

      // JSON-LD scan
      const jsonLdMatches = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      if (jsonLdMatches) {
        for (const scriptTag of jsonLdMatches) {
          try {
            const jsonText = scriptTag.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "");
            const parsed = JSON.parse(jsonText);
            const candidates = Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [parsed];
            for (const itemNode of candidates) {
              if (!itemNode) continue;
              if (!String(itemNode['@type'] || '').includes('Product')) continue;
              const nodeItemId = String(itemNode.url || itemNode.offers?.url || '').match(/\/items\/(\d+)/)?.[1];
              if (nodeItemId && nodeItemId !== vintedId) continue;
              if (itemNode.name && !title) title = itemNode.name;
              if (itemNode.description && !description) description = itemNode.description;
              if (itemNode.brand?.name) brand = itemNode.brand.name;
              if (itemNode.itemCondition) condition = String(itemNode.itemCondition).replace(/https?:\/\/schema\.org\//i, "");
              if (itemNode.category && !extractedCategory) extractedCategory = String(itemNode.category);
              if (itemNode.color) extractedColors.push(String(itemNode.color));

              if (Array.isArray(itemNode.image)) {
                structuredImages.push(...itemNode.image);
              } else if (typeof itemNode.image === "string") {
                structuredImages.push(itemNode.image);
              }

              const offers = Array.isArray(itemNode.offers) ? itemNode.offers[0] : itemNode.offers;
              if (offers?.price) {
                const p = parseNum(offers.price);
                if (p !== null && price === null) price = p;
                if (p !== null && nodeItemId === vintedId) priceKnown = true;
                if (offers.priceCurrency) currency = offers.priceCurrency;
                if (/InStock$/i.test(offers.availability || '')) { availabilityKnown = true; availability = 'available'; }
                if (/SoldOut|OutOfStock|Discontinued/i.test(offers.availability || '')) { availabilityKnown = true; availability = 'unavailable'; }
              }

              if (Array.isArray(itemNode.interactionStatistic)) {
                for (const stat of itemNode.interactionStatistic) {
                  const count = parseNum(stat.userInteractionCount);
                  if (count !== null) {
                    if (/Like|Favorite|Watch/i.test(stat.interactionType?.["@type"] || stat.interactionType || "")) {
                      favoritesCount = count;
                    } else if (/View/i.test(stat.interactionType?.["@type"] || stat.interactionType || "")) {
                      viewsCount = count;
                    }
                  }
                }
              }
            }
          } catch (_) {}
        }
      }

      // Current Vinted pages stream the precise condition and item summary via React Server Components.
      const normalizedRsc = html.replace(/\\"/g, '"').replace(/\\u0026/gi, "&");
      const preciseCondition = normalizedRsc.match(/"code":"status","data":\{[^}]*"value":"([^"]+)"/i)?.[1];
      if (preciseCondition) condition = preciseCondition;
      const preciseBrand = normalizedRsc.match(/"code":"brand","data":\{[^}]*"value":"([^"]+)"/i)?.[1];
      if (preciseBrand) brand = preciseBrand;
      const preciseColor = normalizedRsc.match(/"code":"color","data":\{[^}]*"value":"([^"]+)"/i)?.[1];
      if (preciseColor) extractedColors.push(...preciseColor.split(/[,،]/).map((value) => value.trim()).filter(Boolean));
      const favoriteMatch = normalizedRsc.match(new RegExp(`"favourite_count":(\\d+),"is_favourite":[^,}]+,"item_id":"${vintedId}"`, "i"));
      if (favoriteMatch && favoritesCount === null) favoritesCount = Number(favoriteMatch[1]);

      // The current item payload is also embedded as a JSON object in the streamed page.
      const itemPayloadMarker = `"value":{"id":"${vintedId}"`;
      const itemPayloadIndex = normalizedRsc.lastIndexOf(itemPayloadMarker);
      if (itemPayloadIndex >= 0) {
        const objectStart = normalizedRsc.indexOf("{", itemPayloadIndex + '"value":'.length);
        let depth = 0;
        let inString = false;
        let escaped = false;
        let objectEnd = -1;
        for (let index = objectStart; index < normalizedRsc.length; index += 1) {
          const character = normalizedRsc[index];
          if (inString) {
            if (escaped) escaped = false;
            else if (character === "\\") escaped = true;
            else if (character === '"') inString = false;
          } else if (character === '"') inString = true;
          else if (character === "{") depth += 1;
          else if (character === "}" && --depth === 0) { objectEnd = index + 1; break; }
        }
        if (objectEnd > objectStart) {
          try {
            const itemData = JSON.parse(normalizedRsc.slice(objectStart, objectEnd));
            if (itemData.id !== undefined && String(itemData.id) !== vintedId) throw new Error('Mismatched Vinted item metadata');
          if (itemData.title && !title) title = itemData.title;
            if (itemData.description && !description) description = itemData.description;
            if (itemData.price?.amount && price === null) price = parseNum(itemData.price.amount);
            if (itemData.price?.amount && parseNum(itemData.price.amount) !== null) priceKnown = true;
            if (itemData.price?.currency_code) currency = itemData.price.currency_code;
            if (itemData.is_sold || itemData.status === "sold") isSold = true;
            if (itemData.is_reserved || itemData.status === "reserved") isReserved = true;
            if (itemData.is_sold === true || itemData.is_closed === true || itemData.is_reserved === true || ['sold', 'reserved', 'available'].includes(itemData.status) || (itemData.is_sold === false && itemData.is_closed === false && itemData.is_reserved === false)) {
              availabilityKnown = true;
              availability = isSold ? 'sold' : isReserved ? 'reserved' : 'available';
            }
            if (Array.isArray(itemData.photos)) {
              for (const photo of itemData.photos) {
                const image = photo.high_resolution?.url || photo.full_size_url || photo.url ||
                  photo.thumbnails?.find((thumbnail: any) => /full|high|f800/i.test(thumbnail.type || ""))?.url ||
                  photo.thumbnails?.at(-1)?.url;
                if (image) structuredImages.push(image);
              }
            }
          } catch {}
        }
      }

      // __NEXT_DATA__ scan
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i);
      if (nextDataMatch) {
        try {
          const nextData = JSON.parse(nextDataMatch[1]);
          const itemData =
            nextData.props?.pageProps?.item ||
            nextData.props?.pageProps?.initialState?.item ||
            nextData.props?.pageProps?.product ||
            {};

          if (itemData.id !== undefined && String(itemData.id) !== vintedId) throw new Error('Mismatched Vinted item metadata');
          if (itemData.title && !title) title = itemData.title;
          if (itemData.description && !description) description = itemData.description;
          const rawPrice = itemData.price?.amount || itemData.price?.numeric || itemData.total_item_price || itemData.price_numeric || itemData.price;
          if (rawPrice && price === null) price = parseNum(rawPrice);
          if (rawPrice && String(itemData.id) === vintedId && parseNum(rawPrice) !== null) priceKnown = true;
          if (itemData.price?.currency_code) currency = itemData.price.currency_code;
          if (itemData.favourite_count !== undefined && favoritesCount === null) favoritesCount = parseNum(itemData.favourite_count);
          if (itemData.view_count !== undefined && viewsCount === null) viewsCount = parseNum(itemData.view_count);
          if (itemData.is_sold) isSold = true;
          if (itemData.is_reserved) isReserved = true;
          if (String(itemData.id) === vintedId && (itemData.is_sold === true || itemData.is_closed === true || itemData.is_reserved === true || (itemData.is_sold === false && itemData.is_closed === false && itemData.is_reserved === false))) {
            availabilityKnown = true;
            availability = isSold ? 'sold' : isReserved ? 'reserved' : 'available';
          }
          if (itemData.brand_title) brand = itemData.brand_title;
          if (itemData.status || itemData.status_title) condition = itemData.status_title || itemData.status;
          if (itemData.catalog_title || itemData.category_title || itemData.catalog?.title || itemData.catalog?.name) {
            extractedCategory = itemData.catalog_title || itemData.category_title || itemData.catalog?.title || itemData.catalog?.name;
          }

          if (itemData.color || itemData.color_title) {
            extractedColors.push(itemData.color_title || itemData.color);
          }

          if (Array.isArray(itemData.photos)) {
            for (const photo of itemData.photos) {
              const url = photo.high_resolution?.url || photo.full_size_url || photo.url;
              if (url) structuredImages.push(url);
            }
          }

          if (Array.isArray(itemData.colors)) {
            extractedColors.push(...itemData.colors.map((color: any) => String(color?.title || color?.name || color).trim()).filter(Boolean));
          }
          if (Array.isArray(itemData.materials)) {
            extractedMaterials.push(...itemData.materials.map((material: any) => String(material?.title || material?.name || material).trim()).filter(Boolean));
          }
          if (Array.isArray(itemData.catalog_path)) {
            const catalogPath = itemData.catalog_path.map((part: any) => String(part?.title || part?.name || part).trim()).filter(Boolean);
            if (catalogPath.length) extractedCategory = catalogPath[catalogPath.length - 1];
          }

          const collectImageUrls = (value: any, key = "", depth = 0) => {
            if (!value || depth > 8) return;
            if (typeof value === "string") {
              if (/^(https?:)?\\?\/?\\?\/?[^\s"']*vinted\.net\//i.test(value) && /photo|image|url|src/i.test(key)) {
                structuredImages.push(value.replace(/\\\//g, "/"));
              }
              return;
            }
            if (Array.isArray(value)) {
              value.forEach((entry) => collectImageUrls(entry, key, depth + 1));
              return;
            }
            if (typeof value === "object") {
              Object.entries(value).forEach(([childKey, child]) => collectImageUrls(child, childKey, depth + 1));
            }
          };
          collectImageUrls(itemData);
        } catch (_) {}
      }

      // Fallback regex for price
      if (price === null) {
        const priceMeta = getMeta("product:price:amount") || getMeta("og:price:amount");
        if (priceMeta) { price = parseNum(priceMeta); priceKnown = price !== null; }
      }
      if (price === null) {
        const priceMatch = html.match(/(\d+[\.,]\d{2})\s*(?:€|EUR)/i) || html.match(/(?:€|EUR)\s*(\d+[\.,]\d{2})/i);
        if (priceMatch) price = parseFloat(priceMatch[1].replace(",", "."));
      }
    }

    // Process and filter unique high-resolution images
    const sanitizedImages: string[] = [];
    const imageByFileKey = new Map<string, string>();

    const imageCandidates = structuredImages.length ? structuredImages : rawImages;
    for (const rawImg of imageCandidates) {
      if (!rawImg || typeof rawImg !== "string") continue;
      // Decode HTML/JSON escaping and common entities before validating image URLs.
      let cleanUrl = rawImg.replace(/\\\//g, "/").replace(/&amp;/gi, "&").replace(/["'\\]/g, "").trim();
      if (cleanUrl.startsWith("//")) cleanUrl = "https:" + cleanUrl;
      if (!/^https?:\/\//i.test(cleanUrl)) continue;

      // Ignore non-product UI images
      if (/avatar|logo|sprite|icon|placeholder|banner|member/i.test(cleanUrl)) continue;

      // Convert thumbnail URLs to full size if possible (Vinted f800 or full_size)
      const originalUrl = cleanUrl;
      cleanUrl = cleanUrl.replace(/\/(?:t|s)\d+_([^/]+)$/g, "/f800_$1");

      // Deduplicate by original photo file and retain the largest known rendition.
      let key = originalUrl.split("?")[0];
      try {
        const imageUrl = new URL(originalUrl);
        if (/^images\d*\.vinted\.net$/i.test(imageUrl.hostname)) {
          const segments = imageUrl.pathname.split("/").filter(Boolean);
          const tIndex = segments.indexOf("t");
          const fileName = segments.find((segment) => /\.(?:jpe?g|png|webp)$/i.test(segment));
          if (tIndex >= 0 && segments[tIndex + 1] && fileName) {
            key = `${segments[tIndex + 1]}/${fileName.replace(/\.(?:jpe?g|png|webp)$/i, "").toLowerCase()}`;
          }
        }
      } catch {}
      const prior = imageByFileKey.get(key);
      const qualityScore = (url: string) => {
        const text = url.toLowerCase();
        const dimension = text.match(/\/(\d+)x(\d+)\//);
        const area = dimension ? Number(dimension[1]) * Number(dimension[2]) : 0;
        return (/(?:\/f800\/|full_size|high_resolution)/.test(text) ? 1000000 : /\/f800_\//.test(text) ? 500000 : 0) + Math.min(area, 99999);
      };
      const candidateUrl = /(?:f800|full_size|high_resolution)/i.test(cleanUrl)
        ? cleanUrl
        : cleanUrl.replace(/\/([^/]+_\d+\.(?:jpg|jpeg|png|webp))(\?.*)?$/i, "/f800_$1$2");
      if (!prior || qualityScore(candidateUrl) > qualityScore(prior)) imageByFileKey.set(key, candidateUrl);
    }
    sanitizedImages.push(...imageByFileKey.values());

    const finalTitle = title || fallbackTitle;
    const finalPrice = price;
    const favSafe = favoritesCount !== null ? favoritesCount : req.query.refresh === '1' ? null : 0;
    const viewsSafe = viewsCount !== null ? viewsCount : req.query.refresh === '1' ? null : 0;

    const verifiedAvailability = extractListingState(html, vintedId);
    if (verifiedAvailability) { availabilityKnown = true; isSold = verifiedAvailability.isSold; isReserved = verifiedAvailability.isReserved; availability = verifiedAvailability.availability; }
    const textCorpus = `${finalTitle} ${description} ${decodedUrl}`.toLowerCase();
    const mappedCategory = classifyVintedCategory(finalTitle, extractedCategory, description);

    // Detect Colors from text
    const colorDictionary: Record<string, string> = {
      χρυσό: "Χρυσό", χρυσός: "Χρυσό", gold: "Χρυσό", ασημί: "Ασημί", ασημέν: "Ασημί", silver: "Ασημί",
      μαύρο: "Μαύρο", black: "Μαύρο", κόκκινο: "Κόκκινο", red: "Κόκκινο",
      μπλε: "Μπλε", blue: "Μπλε", πράσινο: "Πράσινο", green: "Πράσινο",
      ροζ: "Ροζ", pink: "Ροζ", λευκό: "Λευκό", white: "Λευκό",
      μπεζ: "Μπεζ", beige: "Μπεζ", τυρκουάζ: "Τυρκουάζ", turquoise: "Τυρκουάζ",
      φούξια: "Φούξια", fuchsia: "Φούξια", λιλά: "Λιλά", lilac: "Λιλά", lila: "Λιλά", μωβ: "Μωβ", purple: "Μωβ",
      κίτρινο: "Κίτρινο", yellow: "Κίτρινο", καφέ: "Καφέ", brown: "Καφέ",
      διάφανο: "Διάφανο", transparent: "Διάφανο", χάλκινο: "Χαλκός", bronze: "Χαλκός"
    };

    for (const [key, val] of Object.entries(colorDictionary)) {
      if (textCorpus.includes(key) && !extractedColors.includes(val)) {
        extractedColors.push(val);
      }
    }
    const normalizedColors = [...new Set(extractedColors.map((color) => {
      const normalized = color.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const alias = Object.entries(colorDictionary).find(([key]) =>
        normalized.includes(key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
      );
      return alias?.[1] || color;
    }))];

    // Detect Materials from text
    const materialDictionary: Record<string, string> = {
      "υγρό γυαλί": "Υγρό Γυαλί (Resin)", resin: "Υγρό Γυαλί (Resin)",
      ατσάλι: "Ανοξείδωτο Ατσάλι", steel: "Ανοξείδωτο Ατσάλι",
      ασήμι: "Ασήμι", silver: "Ασήμι", "925": "Ασήμι 925",
      χάντρ: "Χάντρες", bead: "Χάντρες", αλυσίδ: "Αλυσίδα", chain: "Αλυσίδα", μέταλλο: "Μέταλλο", metal: "Μέταλλο",
      σύρμα: "Σύρμα", χαλκός: "Χαλκός", copper: "Χαλκός", brass: "Ορείχαλκος",
      άνθη: "Αληθινά Άνθη", λουλούδια: "Αληθινά Άνθη", flowers: "Αληθινά Άνθη",
      βότσαλα: "Φυσικά Βότσαλα", pebbles: "Φυσικά Βότσαλα",
      "φύλλα χρυσού": "Φύλλα Χρυσού 24Κ", goldleaf: "Φύλλα Χρυσού 24Κ",
      πηλός: "Πηλός", clay: "Πηλός"
    };

    for (const [key, val] of Object.entries(materialDictionary)) {
      if (textCorpus.includes(key) && !extractedMaterials.includes(val)) {
        extractedMaterials.push(val);
      }
    }
    // Clean condition text
    let cleanCondition = condition;
    if (/new_with_tags|New with tags|Καινούργιο με ετικέτα|Νέο με ετικέτες/i.test(cleanCondition)) {
      cleanCondition = "Καινούργιο με ετικέτα";
    } else if (/new_without_tags|New without tags|Καινούργιο χωρίς ετικέτα|Νέο χωρίς ετικέτες/i.test(cleanCondition)) {
      cleanCondition = "Καινούργιο χωρίς ετικέτα";
    } else if (/very_good|Very good|Πολύ καλή|Πολύ καλό/i.test(cleanCondition)) {
      cleanCondition = "Πολύ καλή κατάσταση";
    } else if (/good|Good|Καλή|Καλό/i.test(cleanCondition)) {
      cleanCondition = "Καλή κατάσταση";
    } else if (/used|Pre-owned|Μεταχειρισμέν/i.test(cleanCondition)) {
      cleanCondition = "Μεταχειρισμένο";
    }

    const item = {
      id: vintedId || String(Date.now()),
      title: finalTitle,
      name: finalTitle,
      description,
      price: finalPrice,
      priceKnown,
      currency: currency || "EUR",
      category: mappedCategory,
      favorites: favSafe,
      likes: favSafe,
      favoritesCount: favSafe,
      views: viewsSafe,
      viewCount: viewsSafe,
      vintedFavorites: favSafe,
      vintedViews: viewsSafe,
      status: isSold ? "Πουλήθηκε" : isReserved ? "Κρατημένο" : availability === 'unavailable' ? "Μη διαθέσιμο" : "Διαθέσιμο",
      isSold,
      isReserved,
      availabilityKnown,
      availability,
      brand,
      condition: cleanCondition,
      stock: isSold || availability === 'unavailable' ? 0 : 1,
      materials: extractedMaterials,
      colors: normalizedColors,
      sourceUrl: decodedUrl,
      url: decodedUrl,
      photos: sanitizedImages,
      images: sanitizedImages,
      image_urls: sanitizedImages.join(", "),
      imageUrl: sanitizedImages[0] || "",
    };

    return res.json({
      ok: true,
      item,
    });
  } catch (error: any) {
    console.error("Error fetching Vinted item:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to process Vinted URL",
    });
  }
}

app.get("/api/vinted-link", handleVintedLink);
app.get("/.netlify/functions/vinted-link", handleVintedLink);

// 4. Image proxy
async function handleImageProxy(req: Request, res: Response) {
  try {
    const rawUrl = (req.query.url as string) || (req.body?.url as string);
    if (!rawUrl) return res.status(400).send("Missing url parameter");
    let imageUrl: URL;
    try { imageUrl = new URL(rawUrl.trim()); } catch { return res.status(400).send("Invalid URL"); }
    if (imageUrl.protocol !== "https:" || !/^images\d*\.vinted\.net$/i.test(imageUrl.hostname)) {
      return res.status(400).send("Only Vinted listing images are supported");
    }

    const imgResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!imgResponse.ok) return res.status(imgResponse.status).send("Failed to fetch image");
    const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
    if (!contentType.toLowerCase().startsWith("image/")) return res.status(415).send("Remote response is not an image");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");

    const arrayBuffer = await imgResponse.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    return res.status(500).send(error.message || "Image proxy failed");
  }
}

app.get("/api/vinted-image-proxy", handleImageProxy);
app.get("/.netlify/functions/vinted-image-proxy", handleImageProxy);
app.get("/api/image-proxy", handleImageProxy);

// 4b. Vinted Reviews Endpoints
async function handleVintedReviews(req: Request, res: Response) {
  try {
    const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const memberId = (req.query.member_id as string) || undefined;
    const data = await getVintedReviews({ forceRefresh, memberId });
    return res.json(data);
  } catch (err: any) {
    console.error("Error in handleVintedReviews:", err);
    return res.status(502).json({
      ok: false,
      error: err.message || "Αποτυχία ανάκτησης κριτικών Vinted",
      code: "VINTED_REVIEWS_ERROR"
    });
  }
}

async function handleVintedReviewsSync(req: Request, res: Response) {
  try {
    const memberId = (req.body?.memberId as string) || (req.query.member_id as string) || undefined;
    const live = await fetchLiveVintedReviews(memberId);
    await persistVintedReviewsToFirestore(live.stats, live.reviews);
    return res.json({
      ok: true,
      stats: live.stats,
      reviews: live.reviews,
      source: "live",
      cachedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("Error in handleVintedReviewsSync:", err);
    return res.status(502).json({
      ok: false,
      error: err.message || "Αποτυχία συγχρονισμού κριτικών Vinted",
      code: "VINTED_SYNC_ERROR"
    });
  }
}

app.get("/api/vinted-reviews", handleVintedReviews);
app.get("/.netlify/functions/vinted-reviews", handleVintedReviews);
app.post("/api/vinted-reviews/sync", handleVintedReviewsSync);
app.post("/.netlify/functions/vinted-reviews/sync", handleVintedReviewsSync);

// 5. Orders, Stripe Checkout, Stripe Confirm & Webhook, Contact, and Backups (Live Firestore + Stripe)
app.all(["/api/orders", "/.netlify/functions/orders"], bridgedOrdersHandler);
app.all(["/api/stripe-confirm", "/.netlify/functions/stripe-confirm"], bridgedStripeConfirmHandler);
app.all(["/api/stripe-webhook", "/.netlify/functions/stripe-webhook"], bridgedStripeWebhookHandler);
app.all(["/api/contact", "/.netlify/functions/contact"], bridgedContactHandler);

// 6b. Bridge additional Netlify Function handlers into Express for local dev & Cloud Run parity
function wrapWebHandler(webHandler: (request: globalThis.Request) => Promise<globalThis.Response>) {
  return async (req: Request, res: Response) => {
    try {
      const protocol = req.protocol || "http";
      const host = req.get("host") || "localhost:3000";
      const url = `${protocol}://${host}${req.originalUrl}`;
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === "string") headers.set(key, value);
        else if (Array.isArray(value)) headers.set(key, value.join(", "));
      }
      const hasBody = !["GET", "HEAD"].includes(req.method.toUpperCase());
      const bodyText =
        hasBody && req.body !== undefined
          ? typeof req.body === "string"
            ? req.body
            : JSON.stringify(req.body)
          : undefined;
      const webReq = new globalThis.Request(url, {
        method: req.method,
        headers,
        body: bodyText,
      });
      const webRes = await webHandler(webReq);
      res.status(webRes.status);
      webRes.headers.forEach((val, key) => res.setHeader(key, val));
      const buf = Buffer.from(await webRes.arrayBuffer());
      return res.send(buf);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Internal Server Error" });
    }
  };
}

app.all(["/api/catalog-backups", "/.netlify/functions/catalog-backups"], bridgedCatalogBackupsHandler);
app.all("/api/media", wrapWebHandler(mediaHandler));
app.all("/.netlify/functions/media", wrapWebHandler(mediaHandler));
app.all("/api/wix-project", wrapWebHandler(wixProjectHandler));
app.all("/.netlify/functions/wix-project", wrapWebHandler(wixProjectHandler));
app.all(["/api/order-email-test", "/.netlify/functions/order-email-test"], bridgedOrderEmailTestHandler);
app.post(
  ["/api/video-transcode", "/.netlify/functions/video-transcode"],
  express.raw({ type: () => true, limit: "120mb" }),
  handleVideoTranscode
);

// 7. Serve static public files
app.use(express.static(path.join(process.cwd(), "public")));


export { app };
