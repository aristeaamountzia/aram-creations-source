export async function requestBackofficeAi(
  payload: Record<string, unknown>,
  headers: Record<string, string>,
  endpoint = '/api/backoffice-ai'
) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || typeof data !== 'object') {
    throw new Error(data?.error || data?.message || `Μη έγκυρη απάντηση από το AI endpoint (HTTP ${response.status}).`);
  }
  return data;
}
