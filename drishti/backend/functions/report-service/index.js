/**
 * DRISHTI — report-service
 * Advanced I/O Catalyst Function: builds case and analytics-summary PDF
 * reports using Catalyst SmartBrowz (convertToPdf), stores the result in
 * Catalyst File Store, and returns the stored file's ID/name.
 *
 * Note on naming: earlier module planning referred to "Catalyst Stratus"
 * for file storage. Stratus is a newer object-storage component still in
 * Early Access (requires emailing support@zohocatalyst.com to enable) —
 * this function uses the standard, generally-available **File Store**
 * component instead (catalystApp.filestore()), which needs no extra
 * enablement. Swap to Stratus later if/when it's enabled for the project.
 *
 * Env var required:
 *   REPORTS_FOLDER_ID — File Store folder ID to upload generated PDFs into
 *   (create this folder in the console under File Store first)
 *   INTERNAL_BASE_URL — same as assistant-service, e.g. https://<project-domain>/server
 */

const catalyst = require('zcatalyst-sdk-node');
const express = require('express');
const axios = require('axios');
const { caseReportHtml, analyticsSummaryHtml } = require('./templates');

const app = express();
app.use(express.json());

function internalUrl(path) {
  const base = process.env.INTERNAL_BASE_URL || '/server';
  return `${base}${path}`;
}

function handleError(res, err) {
  console.error(err);
  res.status(err.status || 500).json({ error: true, message: err.message || 'Internal error' });
}

async function generateAndStorePdf(catalystApp, html, fileName) {
  const smartbrowz = catalystApp.smartbrowz();
  const pdfResult = await smartbrowz.convertToPdf(html, {
    pdf_options: {
      format: 'A4',
      display_header_footer: true,
      margin: { top: '20', bottom: '20', left: '10', right: '10' }
    },
    page_options: {
      javascript_enabled: false
    }
  });

  // pdfResult carries the generated PDF content — buffer it for upload.
  const fileBuffer = Buffer.isBuffer(pdfResult) ? pdfResult : Buffer.from(pdfResult.data || pdfResult);

  const folderId = process.env.REPORTS_FOLDER_ID;
  if (!folderId) {
    throw Object.assign(new Error('REPORTS_FOLDER_ID not configured — see docs/reports/README.md'), { status: 501 });
  }

  const filestore = catalystApp.filestore();
  const folder = filestore.folder(folderId);
  const fileObject = await folder.uploadFile({
    code: fileBuffer,
    name: fileName
  });

  return fileObject;
}

/**
 * GET /reports/case/:caseId
 * Pulls the full case record (via data-service) and generates a PDF.
 */
app.get('/reports/case/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const catalystApp = catalyst.initialize(req);

    const caseResponse = await axios.get(internalUrl(`/data-service/cases/${caseId}`));
    const html = caseReportHtml(caseResponse.data);

    const fileObject = await generateAndStorePdf(
      catalystApp,
      html,
      `case-report-${caseId}-${Date.now()}.pdf`
    );

    res.status(201).json({ report: fileObject });
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * GET /reports/analytics-summary
 * Pulls hotspot + trend data (via analytics-service) and generates a PDF.
 */
app.get('/reports/analytics-summary', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);

    const [hotspotsResponse, trendsResponse] = await Promise.all([
      axios.get(internalUrl('/analytics-service/hotspots')),
      axios.get(internalUrl('/analytics-service/trends'))
    ]);

    const html = analyticsSummaryHtml({
      hotspots: hotspotsResponse.data.hotspots,
      trends: trendsResponse.data.trends
    });

    const fileObject = await generateAndStorePdf(
      catalystApp,
      html,
      `analytics-summary-${Date.now()}.pdf`
    );

    res.status(201).json({ report: fileObject });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = app;
