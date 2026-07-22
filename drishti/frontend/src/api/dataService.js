const BASE_URL = process.env.REACT_APP_DATA_SERVICE_URL || '/server/data-service';

export async function getCase(caseId) {
  const res = await fetch(`${BASE_URL}/cases/${caseId}`);
  if (!res.ok) throw new Error(`data-service error: ${res.status}`);
  return res.json();
}

export async function listCases(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/cases${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error(`data-service error: ${res.status}`);
  return res.json();
}
