/**
 * DRISHTI frontend — thin client for network-service.
 * BASE_URL should point at the deployed function's route, e.g.
 * https://<project-domain>/server/network-service
 */

const BASE_URL = process.env.REACT_APP_NETWORK_SERVICE_URL || '/server/network-service';

export async function getPersonNetwork(accusedId, depth = 2) {
  const res = await fetch(`${BASE_URL}/network/person/${accusedId}?depth=${depth}`);
  if (!res.ok) throw new Error(`network-service error: ${res.status}`);
  return res.json();
}

export async function getCaseNetwork(caseId) {
  const res = await fetch(`${BASE_URL}/network/case/${caseId}`);
  if (!res.ok) throw new Error(`network-service error: ${res.status}`);
  return res.json();
}

export async function addAssociation({ personAId, personBId, relationType, sourceCaseMasterId, notes }) {
  const res = await fetch(`${BASE_URL}/network/associations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personAId, personBId, relationType, sourceCaseMasterId, notes })
  });
  if (!res.ok) throw new Error(`network-service error: ${res.status}`);
  return res.json();
}
