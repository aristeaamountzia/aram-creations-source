export type BackofficeAiMode = 'portfolio_item' | 'product';
export type BackofficeAiTask = 'full' | 'title' | 'description';

export interface BackofficeAiInput {
  product?: Record<string, unknown>;
  task?: string;
  prompt?: string;
  mode?: string;
}

export class AiSuggestionValidationError extends Error {}

const text = (value: unknown, max = 2_000) => String(value ?? '').trim().slice(0, max);
const greek = /[Α-Ωα-ωΆ-ώ]/;
const wordPattern = /[\p{L}\p{N}]+/gu;
const ignoredContextWords = new Set(['και', 'της', 'του', 'των', 'ένα', 'μια', 'στο', 'στη', 'από', 'with', 'the', 'portfolio']);

export function normalizeAiMode(value: unknown): BackofficeAiMode {
  return value === 'portfolio_item' ? 'portfolio_item' : 'product';
}

export function normalizeAiTask(value: unknown): BackofficeAiTask {
  if (value === 'title' || value === 'description') return value;
  return 'full';
}

function productField(product: Record<string, unknown>, key: string, fallbackKey?: string): string {
  return text(product[key] ?? (fallbackKey ? product[fallbackKey] : ''), 800) || '(κενό)';
}

function listField(product: Record<string, unknown>, key: string): string {
  const value = product[key];
  if (!Array.isArray(value)) return '(κενό)';
  const values = value.map(item => text(item, 80)).filter(Boolean).slice(0, 20);
  return values.length ? values.join(', ') : '(κενό)';
}

export function buildBackofficeAiPrompt(input: BackofficeAiInput): string {
  const product = input.product || {};
  const task = normalizeAiTask(input.task);
  const extra = text(input.prompt, 800);
  const qualityRules = `
- Μην επαναλαμβάνεις λέξεις ή φράσεις και έλεγξε τη γραμματική πριν απαντήσεις.
- Σύνδεσε το κείμενο με τουλάχιστον ένα από τα παρεχόμενα στοιχεία.
- Μην επινοείς υλικά, τεχνικές, διαστάσεις, χρώματα ή προέλευση.
- Επίστρεψε μόνο τα πεδία που γνωρίζεις, χωρίς Markdown.`;

  if (normalizeAiMode(input.mode) === 'portfolio_item') {
    return `Είσαι επιμελητής εικαστικού Portfolio για το Aram Creations. Γράψε φυσικά και συγκεκριμένα στα Ελληνικά.
Στοιχεία έργου:
- Τίτλος: ${productField(product, 'name', 'title')}
- Κατηγορία: ${productField(product, 'category')}
- Έτος: ${productField(product, 'year')}
- Υλικό/τεχνική: ${productField(product, 'medium')}
- Διαστάσεις: ${productField(product, 'dimensions')}
- Περιγραφή: ${productField(product, 'description')}
- Εργασία: ${task}
${extra ? `- Ειδική απαίτηση: ${extra}` : ''}${qualityRules}
Απάντησε αποκλειστικά με έγκυρο JSON με πεδία title, description, shortDescription, tags (array), altText.`;
  }

  return `Είσαι copywriter και catalog manager για τα χειροποίητα κοσμήματα Aram Creations. Γράψε φυσικά και συγκεκριμένα στα Ελληνικά.
Στοιχεία προϊόντος:
- Τίτλος: ${productField(product, 'name', 'title')}
- Κατηγορία: ${productField(product, 'category')}
- Συλλογή: ${productField(product, 'collection')}
- Περιγραφή: ${productField(product, 'description', 'notes')}
- Τιμή: ${productField(product, 'price')}
- Υλικά: ${listField(product, 'materials')}
- Χρώματα: ${listField(product, 'colors')}
- Εργασία: ${task}
${extra ? `- Ειδική απαίτηση: ${extra}` : ''}${qualityRules}
Απάντησε αποκλειστικά με έγκυρο JSON με πεδία title, description, category, status, colors (array), materials (array), tags (array), shortDescription, instagramCaption, altText.`;
}

function normalizedWords(value: string): string[] {
  return value.toLocaleLowerCase('el-GR').match(wordPattern) || [];
}

function hasNearbyRepetition(value: string): boolean {
  const words = normalizedWords(value);
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (word.length < 6) continue;
    for (let next = index + 1; next <= Math.min(index + 3, words.length - 1); next += 1) {
      if (words[next] === word) return true;
    }
  }
  return false;
}

function contextWords(input: BackofficeAiInput): Set<string> {
  const product = input.product || {};
  const values = [
    product.name,
    product.title,
    product.category,
    product.year,
    product.medium,
    product.dimensions,
    ...(Array.isArray(product.materials) ? product.materials : []),
    ...(Array.isArray(product.colors) ? product.colors : [])
  ];
  return new Set(
    normalizedWords(values.map(value => text(value, 300)).join(' '))
      .filter(word => word.length >= 4 && !ignoredContextWords.has(word))
  );
}

function validatedString(raw: Record<string, unknown>, key: string, max: number): string | undefined {
  if (raw[key] === undefined || raw[key] === null) return undefined;
  if (typeof raw[key] !== 'string') throw new AiSuggestionValidationError(`Το πεδίο ${key} του AI δεν είναι κείμενο.`);
  const value = raw[key].trim();
  if (!value || value.length > max) throw new AiSuggestionValidationError(`Το πεδίο ${key} του AI είναι κενό ή υπερβολικά μεγάλο.`);
  if (/```|^#{1,6}\s/m.test(value)) throw new AiSuggestionValidationError(`Το πεδίο ${key} περιέχει μη επιτρεπτό Markdown.`);
  return value;
}

function validatedList(raw: Record<string, unknown>, key: string): string[] | undefined {
  if (raw[key] === undefined || raw[key] === null) return undefined;
  if (!Array.isArray(raw[key])) throw new AiSuggestionValidationError(`Το πεδίο ${key} του AI δεν είναι λίστα.`);
  const values = raw[key].map(value => {
    if (typeof value !== 'string') throw new AiSuggestionValidationError(`Το πεδίο ${key} περιέχει μη έγκυρη τιμή.`);
    return value.trim();
  }).filter(Boolean);
  if (values.length > 20 || values.some(value => value.length > 80)) {
    throw new AiSuggestionValidationError(`Το πεδίο ${key} του AI είναι υπερβολικά μεγάλο.`);
  }
  return [...new Set(values)];
}

export function validateBackofficeAiSuggestion(raw: Record<string, unknown>, input: BackofficeAiInput): Record<string, unknown> {
  const task = normalizeAiTask(input.task);
  const title = validatedString(raw, 'title', 160);
  const description = validatedString(raw, 'description', 2_000);
  if ((task === 'full' || task === 'title') && (!title || title.length < 3)) {
    throw new AiSuggestionValidationError('Το AI δεν επέστρεψε έγκυρο τίτλο.');
  }
  if ((task === 'full' || task === 'description') && (!description || normalizedWords(description).length < 8)) {
    throw new AiSuggestionValidationError('Η περιγραφή του AI είναι κενή ή υπερβολικά γενική.');
  }
  const prose = [title, description].filter(Boolean).join(' ');
  if (prose && !greek.test(prose)) throw new AiSuggestionValidationError('Η πρόταση του AI δεν είναι στα Ελληνικά.');
  if ((title && hasNearbyRepetition(title)) || (description && hasNearbyRepetition(description))) {
    throw new AiSuggestionValidationError('Η πρόταση του AI περιέχει επαναλαμβανόμενες λέξεις ή φράσεις.');
  }
  if (description) {
    const context = contextWords(input);
    const result = new Set(normalizedWords(description));
    if (context.size > 0 && ![...context].some(word => result.has(word))) {
      throw new AiSuggestionValidationError('Η περιγραφή του AI είναι γενική και δεν χρησιμοποιεί τα στοιχεία της φόρμας.');
    }
  }

  const output: Record<string, unknown> = {};
  const fields: Array<[string, number]> = [
    ['title', 160], ['description', 2_000], ['category', 100], ['status', 80],
    ['shortDescription', 300], ['instagramCaption', 1_000], ['altText', 300]
  ];
  for (const [key, max] of fields) {
    const value = key === 'title' ? title : key === 'description' ? description : validatedString(raw, key, max);
    if (value !== undefined) output[key] = value;
  }
  for (const key of ['colors', 'materials', 'tags']) {
    const value = validatedList(raw, key);
    if (value !== undefined) output[key] = value;
  }
  return output;
}
