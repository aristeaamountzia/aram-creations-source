export async function requestBackofficeAi(
  payload: Record<string, unknown>,
  headers: Record<string, string>,
  endpoint = '/api/backoffice-ai'
) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(65000)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || typeof data !== 'object' || Array.isArray(data) || data.error) {
    throw new Error(data?.error || data?.message || `Μη έγκυρη απάντηση από το AI endpoint (HTTP ${response.status}).`);
  }
  const suggestion = data.suggestion || data.product || data;
  const fields = ['title', 'name', 'description', 'notes', 'shortDescription', 'category', 'collection', 'status', 'colors', 'materials', 'tags', 'seoKeywords', 'instagramCaption', 'altText'];
  if (!suggestion || typeof suggestion !== 'object' || !fields.some(key => typeof suggestion[key] === 'string' ? suggestion[key].trim().length : Array.isArray(suggestion[key]) && suggestion[key].length)) {
    throw new Error('Το AI endpoint επέστρεψε κενή πρόταση.');
  }
  return data;
}
