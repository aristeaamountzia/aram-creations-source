/**
 * Vinted Content Sanitizer
 * Implements GEMINI.md Rule 5 & Rule 9:
 * - Rule 5: "Boilerplate condition phrases from Vinted (such as 'Καινούργιο με ετικέτα',
 *   'Very good', 'New with tags') must be completely stripped out and never appear
 *   in public descriptions, notes, or product cards."
 * - Rule 9: "Zero-Emoji Luxury UI Policy: Absolutely no raw Unicode emojis anywhere in the UI,
 *   customer views, back office, buttons, tabs, modal dialogs, or alerts."
 *
 * For authentic Customer Reviews (UGC), emojis expressing emotion (❤️, 🌸, ✨) can optionally
 * be preserved to maintain authentic social proof while stripping boilerplate condition text.
 */

const VINTED_BOILERPLATE_PATTERNS = [
  /καινούργιο\s+με\s+ετικέτα/gi,
  /καινούργιο\s+χωρίς\s+ετικέτα/gi,
  /new\s+with\s+tags/gi,
  /new\s+without\s+tags/gi,
  /very\s+good(?:\s+condition)?/gi,
  /πολύ\s+καλή(?:\s+κατάσταση)?/gi,
  /ικανοποιητική(?:\s+κατάσταση)?/gi,
  /satisfactory(?:\s+condition)?/gi,
  /vinted\s+condition/gi,
  /κατάσταση(?:\s+προϊόντος)?\s*[:\-–]\s*(?:καινούργιο|πολύ καλή|καλή|ικανοποιητική|new|good|very good)/gi
];

const EMOJI_PATTERN = /[\p{Extended_Pictographic}\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

export function sanitizeVintedDescription(
  text: string | null | undefined,
  options: { preserveEmojis?: boolean } = {}
): string {
  if (!text) return '';

  return text
    .split('\n')
    .map(line => {
      let cleaned = line;
      for (const pattern of VINTED_BOILERPLATE_PATTERNS) {
        cleaned = cleaned.replace(pattern, '').trim();
      }
      if (!options.preserveEmojis) {
        cleaned = cleaned.replace(EMOJI_PATTERN, '').trim();
      }
      return cleaned;
    })
    .filter((line, idx, arr) => {
      // Remove lines that became empty only if surrounded by other empty lines
      if (!line.trim() && idx > 0 && !arr[idx - 1].trim()) {
        return false;
      }
      return true;
    })
    .join('\n')
    .trim();
}

/**
 * Sanitizes customer reviews while preserving authentic emojis
 */
export function sanitizeVintedReview(text: string | null | undefined): string {
  return sanitizeVintedDescription(text, { preserveEmojis: true });
}

const AUTOMATED_REVIEW_PATTERNS = [
  /^επιβεβαιωμένη παράδοση παραγγελίας μέσω vinted[.!]?$/i,
  /^αυτόματη θετική αξιολόγηση(?: από το vinted)?[.!]?$/i,
  /^automatic positive feedback(?: from vinted)?[.!]?$/i,
  /^(?:the )?transaction (?:was |has been )?completed successfully[.!]?$/i,
];

/** Keeps customer-written feedback and rejects platform-generated confirmations. */
export function isAuthenticVintedReview(review: {
  feedback?: string | null;
  systemFeedback?: boolean | null;
} | null | undefined): boolean {
  if (!review || review.systemFeedback) return false;
  const feedback = sanitizeVintedReview(review.feedback).trim();
  return Boolean(feedback) && !AUTOMATED_REVIEW_PATTERNS.some(pattern => pattern.test(feedback));
}
