const BASE_URL = process.env.REACT_APP_ANALYTICS_SERVICE_URL || '/server/analytics-service';

export async function getHotspots(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/hotspots${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error(`analytics-service error: ${res.status}`);
  return res.json();
}

export async function getTrends(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/trends${query ? `?${query}` : ''}`);
  if (!res.ok) throw new Error(`analytics-service error: ${res.status}`);
  return res.json();
}
