const BASE_URL = process.env.REACT_APP_ASSISTANT_SERVICE_URL || '/server/assistant-service';

export async function askAssistant(text) {
  const res = await fetch(`${BASE_URL}/assistant/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error(`assistant-service error: ${res.status}`);
  return res.json();
}
