/**
 * Vinted Content Sanitizer
 * Implements GEMINI.md Rule 5:
 * "Boilerplate condition phrases from Vinted (such as 'Καινούργιο με ετικέτα',
 * 'Very good', 'New with tags') must be completely stripped out and never appear
 * in public descriptions, notes, or product cards."
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

export function sanitizeVintedDescription(text: string | null | undefined): string {
  if (!text) return '';

  return text
    .split('\n')
    .map(line => {
      let cleaned = line;
      for (const pattern of VINTED_BOILERPLATE_PATTERNS) {
        cleaned = cleaned.replace(pattern, '').trim();
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

