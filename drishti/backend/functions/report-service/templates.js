/**
 * DRISHTI — report-service / templates
 * Plain HTML string builders — kept separate from index.js so the layout
 * can be tweaked without touching the SmartBrowz/File Store plumbing.
 */

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function caseReportHtml({ caseMaster, complainants = [], victims = [], accused = [], actSections = [] }) {
  const rows = (list, fields) => list.map(item => `
    <tr>${fields.map(f => `<td>${escapeHtml(item[f])}</td>`).join('')}</tr>
  `).join('');

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
          h1 { font-size: 20px; border-bottom: 2px solid #b91c1c; padding-bottom: 8px; }
          h2 { font-size: 14px; margin-top: 20px; color: #b91c1c; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          td, th { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 12px; text-align: left; }
          .meta { font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <h1>DRISHTI — Case Report</h1>
        <p class="meta">Generated for internal investigative use only — Karnataka State Police.</p>

        <h2>Case Summary</h2>
        <table>
          <tr><th>Crime No.</th><td>${escapeHtml(caseMaster.CrimeNo)}</td></tr>
          <tr><th>Case No.</th><td>${escapeHtml(caseMaster.CaseNo)}</td></tr>
          <tr><th>Registered</th><td>${escapeHtml(caseMaster.CrimeRegisteredDate)}</td></tr>
          <tr><th>Status ID</th><td>${escapeHtml(caseMaster.CaseStatusID)}</td></tr>
        </table>
        <p>${escapeHtml(caseMaster.BriefFacts)}</p>

        <h2>Complainants</h2>
        <table>
          <tr><th>Name</th><th>Age</th></tr>
          ${rows(complainants, ['ComplainantName', 'AgeYear'])}
        </table>

        <h2>Victims</h2>
        <table>
          <tr><th>Name</th><th>Age</th></tr>
          ${rows(victims, ['VictimName', 'AgeYear'])}
        </table>

        <h2>Accused</h2>
        <table>
          <tr><th>Person ID</th><th>Name</th></tr>
          ${rows(accused, ['PersonID', 'AccusedName'])}
        </table>

        <h2>Acts &amp; Sections Invoked</h2>
        <table>
          <tr><th>Act</th><th>Section</th></tr>
          ${rows(actSections, ['ActID', 'SectionID'])}
        </table>
      </body>
    </html>
  `;
}

function analyticsSummaryHtml({ hotspots = [], trends = {} }) {
  const topHotspots = [...hotspots].sort((a, b) => b.count - a.count).slice(0, 10);
  const months = Object.keys(trends).sort();

  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
          h1 { font-size: 20px; border-bottom: 2px solid #1d4ed8; padding-bottom: 8px; }
          h2 { font-size: 14px; margin-top: 20px; color: #1d4ed8; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          td, th { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 12px; text-align: left; }
        </style>
      </head>
      <body>
        <h1>DRISHTI — Analytics Summary</h1>

        <h2>Top 10 Hotspot Cells</h2>
        <table>
          <tr><th>Latitude</th><th>Longitude</th><th>Case Count</th></tr>
          ${topHotspots.map(h => `<tr><td>${h.latitude}</td><td>${h.longitude}</td><td>${h.count}</td></tr>`).join('')}
        </table>

        <h2>Monthly Case Volume</h2>
        <table>
          <tr><th>Month</th><th>Crime Sub-Head Breakdown</th></tr>
          ${months.map(m => `<tr><td>${m}</td><td>${escapeHtml(JSON.stringify(trends[m]))}</td></tr>`).join('')}
        </table>
      </body>
    </html>
  `;
}

module.exports = { caseReportHtml, analyticsSummaryHtml };
