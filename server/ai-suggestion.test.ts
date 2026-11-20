import test from 'node:test';
import assert from 'node:assert/strict';
import { AiSuggestionValidationError, buildBackofficeAiPrompt, validateBackofficeAiSuggestion } from './ai-suggestion';

const portfolioInput = {
  mode: 'portfolio_item',
  task: 'full',
  product: {
    name: 'Κυκλαδικό ειδώλιο',
    category: 'Γλυπτική',
    year: '2024',
    medium: 'Χαρτοπολτός και ακρυλικά',
    dimensions: '21 × 10 cm'
  }
};

test('Portfolio requests with only the default year and category ask for details before generation', () => {
  const input = { mode: 'portfolio_item', product: { year: '2026', category: 'handcrafted-memories' } };
  assert.throws(() => buildBackofficeAiPrompt(input), /Πρόσθεσε/);
  assert.doesNotThrow(() => buildBackofficeAiPrompt({ ...input, product: { ...input.product, medium: 'Πηλός' } }));
  assert.doesNotThrow(() => buildBackofficeAiPrompt({ ...input, prompt: 'Ανάγλυφο με κλαδιά ελιάς σε πηλό' }));
  assert.doesNotThrow(() => buildBackofficeAiPrompt({ ...input, mode: 'product' }));
});

test('portfolio prompt includes context and explicit quality constraints', () => {
  const prompt = buildBackofficeAiPrompt(portfolioInput);
  assert.match(prompt, /Κυκλαδικό ειδώλιο/);
  assert.match(prompt, /Χαρτοπολτός και ακρυλικά/);
  assert.match(prompt, /Μην επαναλαμβάνεις λέξεις ή φράσεις/);
  assert.match(prompt, /Μην επινοείς υλικά/);
});

test('Portfolio accepts image-only context and does not require English default categories in Greek image descriptions', () => {
  const input = { mode: 'portfolio_item', product: { year: '2026', category: 'handcrafted-memories' }, imageDataUrls: ['data:image/jpeg;base64,fixture'] };
  assert.doesNotThrow(() => buildBackofficeAiPrompt(input));
  assert.doesNotThrow(() => validateBackofficeAiSuggestion({ title: 'Κλαδί ελιάς', description: 'Ένα ανάγλυφο κλαδί ελιάς ξεδιπλώνεται σε λευκό φόντο με απαλή υφή και λιτή σύνθεση.' }, input));
  assert.throws(() => buildBackofficeAiPrompt({ ...input, imageDataUrls: ['not-an-image'] }), /Πρόσθεσε/);
});

test('validates and trims a contextual Greek portfolio suggestion', () => {
  const result = validateBackofficeAiSuggestion({
    title: '  Ίχνος των Κυκλάδων  ',
    description: 'Το κυκλαδικό ειδώλιο αποδίδεται με χαρτοπολτό και ακρυλικά, συνδέοντας τη λιτή φόρμα με μια σύγχρονη χειροποίητη υφή.',
    tags: ['γλυπτική', 'γλυπτική', 'Κυκλάδες']
  }, portfolioInput);
  assert.equal(result.title, 'Ίχνος των Κυκλάδων');
  assert.deepEqual(result.tags, ['γλυπτική', 'Κυκλάδες']);
});

test('rejects empty, generic, non-Greek and repetitive AI output', () => {
  assert.throws(() => validateBackofficeAiSuggestion({ title: '', description: '' }, portfolioInput), AiSuggestionValidationError);
  assert.throws(() => validateBackofficeAiSuggestion({ title: 'Μοναδική μορφή', description: 'Μια μοναδική δημιουργία με ιδιαίτερη αισθητική που προσφέρει ομορφιά σε κάθε χώρο και στιγμή.' }, portfolioInput), /δεν χρησιμοποιεί/);
  assert.throws(() => validateBackofficeAiSuggestion({ title: 'Cycladic trace', description: 'A sculptural object with a carefully balanced contemporary form and a distinctive visual presence.' }, portfolioInput), /Ελληνικά/);
  assert.throws(() => validateBackofficeAiSuggestion({ title: 'Κυκλαδικό ίχνος', description: 'Οι αποχρώσεις του φυσικές αποχρώσεις αναδεικνύουν το κυκλαδικό ειδώλιο και τη χειροποίητη υφή του έργου.' }, portfolioInput), /επαναλαμβανόμενες/);
});

test('title-only tasks do not require a description', () => {
  assert.deepEqual(
    validateBackofficeAiSuggestion({ title: 'Κυκλαδικό ίχνος' }, { ...portfolioInput, task: 'title' }),
    { title: 'Κυκλαδικό ίχνος' }
  );
});

test('title-only actions ignore unrelated invalid descriptions and catalog fields', () => {
  const input = { ...portfolioInput, task: 'title' };
  assert.match(buildBackofficeAiPrompt(input), /JSON με πεδία title\./);
  assert.deepEqual(validateBackofficeAiSuggestion({ title: 'Κυκλαδικό ίχνος', description: 'Generic text', category: 'Unrequested', colors: 'not a list' }, input), { title: 'Κυκλαδικό ίχνος' });
});

test('description-only actions ignore unrelated title and metadata fields', () => {
  const input = { ...portfolioInput, task: 'description' };
  const description = 'Το κυκλαδικό ειδώλιο αποδίδεται με χαρτοπολτό και ακρυλικά, συνδέοντας τη λιτή φόρμα με μια σύγχρονη χειροποίητη υφή.';
  assert.match(buildBackofficeAiPrompt(input), /JSON με πεδία description\./);
  assert.deepEqual(validateBackofficeAiSuggestion({ title: 123, description, tags: 'not a list' }, input), { description });
});

test('color and material actions ignore unrelated invalid prose', () => {
  const input = { mode: 'product', task: 'tags', product: { name: 'Κολιέ' } };
  assert.deepEqual(validateBackofficeAiSuggestion({ title: '', description: '', colors: ['Μπλε'], materials: ['Γυαλί'] }, input), { colors: ['Μπλε'], materials: ['Γυαλί'] });
});

test('colors and materials task accepts lists without requiring a title or description', () => {
  const input = { mode: 'backoffice_product', task: 'tags', product: { name: 'Κολιέ' } };
  assert.match(buildBackofficeAiPrompt(input), /Εργασία: tags/);
  assert.deepEqual(validateBackofficeAiSuggestion({ colors: [' Μπλε '], materials: ['Γυαλί'] }, input), {
    colors: ['Μπλε'], materials: ['Γυαλί']
  });
  assert.throws(() => validateBackofficeAiSuggestion({ tags: ['χειροποίητο'] }, input), /χρώματα ή υλικά/);
});

test('AI availability and inventory suggestions are discarded', () => {
  const output = validateBackofficeAiSuggestion({ title: 'Ασημένιο κόσμημα', status: 'active', stock: 999, availability: 'active' }, { mode: 'product', task: 'title', product: { name: 'Ασημένιο κόσμημα' } });
  assert.equal(output.status, undefined);
  assert.equal(output.stock, undefined);
  assert.equal(output.availability, undefined);
  assert.doesNotMatch(buildBackofficeAiPrompt({ mode: 'product', task: 'title' }), /category, status/);
});
