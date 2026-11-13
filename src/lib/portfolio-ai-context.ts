export const portfolioContextMessage =
  'Πρόσθεσε τίτλο, υλικό, διαστάσεις, περιγραφή ή οδηγίες για το συγκεκριμένο έργο.';

export function hasPortfolioAiContext(product: Record<string, unknown>, prompt?: string) {
  return [product.title, product.name, product.medium, product.dimensions, product.description, prompt]
    .some(value => typeof value === 'string' && /[\p{L}\p{N}]/u.test(value));
}
