const BASE_URL = process.env.REACT_APP_REPORT_SERVICE_URL || '/server/report-service';

export async function generateCaseReport(caseId) {
  const res = await fetch(`${BASE_URL}/reports/case/${caseId}`);
  if (!res.ok) throw new Error(`report-service error: ${res.status}`);
  return res.json();
}

export async function generateAnalyticsSummaryReport() {
  const res = await fetch(`${BASE_URL}/reports/analytics-summary`);
  if (!res.ok) throw new Error(`report-service error: ${res.status}`);
  return res.json();
}
