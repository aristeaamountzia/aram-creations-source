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

test('portfolio prompt includes context and explicit quality constraints', () => {
  const prompt = buildBackofficeAiPrompt(portfolioInput);
  assert.match(prompt, /Κυκλαδικό ειδώλιο/);
  assert.match(prompt, /Χαρτοπολτός και ακρυλικά/);
  assert.match(prompt, /Μην επαναλαμβάνεις λέξεις ή φράσεις/);
  assert.match(prompt, /Μην επινοείς υλικά/);
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

test('colors and materials task accepts lists without requiring a title or description', () => {
  const input = { mode: 'backoffice_product', task: 'tags', product: { name: 'Κολιέ' } };
  assert.match(buildBackofficeAiPrompt(input), /Εργασία: tags/);
  assert.deepEqual(validateBackofficeAiSuggestion({ colors: [' Μπλε '], materials: ['Γυαλί'] }, input), {
    colors: ['Μπλε'], materials: ['Γυαλί']
  });
  assert.throws(() => validateBackofficeAiSuggestion({ tags: ['χειροποίητο'] }, input), /χρώματα ή υλικά/);
});
