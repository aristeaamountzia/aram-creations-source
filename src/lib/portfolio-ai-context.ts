export const portfolioContextMessage =
  'Πρόσθεσε εικόνα, τίτλο, υλικό, διαστάσεις, περιγραφή ή οδηγίες για το συγκεκριμένο έργο.';

export function hasPortfolioAiContext(product: Record<string, unknown>, prompt?: string, hasImages = false) {
  return hasImages || [product.title, product.name, product.medium, product.dimensions, product.description, prompt]
    .some(value => typeof value === 'string' && /[\p{L}\p{N}]/u.test(value));
}
