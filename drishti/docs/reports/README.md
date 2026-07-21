# Module 6 — Automated Reports (SmartBrowz)

## What's in this module
- `backend/functions/report-service/`:
  - `templates.js` — plain HTML builders for the case report and the
    analytics summary report (no framework — just template strings).
  - `index.js`:
    - `GET /reports/case/:caseId` — pulls the full case record from
      `data-service`, renders it to HTML, converts to PDF via
      **SmartBrowz** (`convertToPdf`), stores it in **File Store**.
    - `GET /reports/analytics-summary` — same idea, pulling from
      `analytics-service`'s `/hotspots` and `/trends`.

## Correction from earlier planning: Stratus vs. File Store

Module 3's tech-stack notes referred to file storage as "Catalyst
Stratus." Checking the docs for this module surfaced that **Stratus is a
newer object-storage component still in Early Access** — it requires
emailing `support@zohocatalyst.com` to get it enabled on your project.
The stable, generally-available component is called **File Store**
(`catalystApp.filestore()`), which is what `report-service` actually uses
here — no extra enablement needed. Worth correcting this on the
Technologies/Catalyst-Services slide of the pitch deck so it doesn't
overstate what's confirmed available.

## Setup steps

1. **Create a File Store folder** for reports — console → File Store →
   Create Folder — note its Folder ID.
2. **Set environment variables** on `report-service`:
   `REPORTS_FOLDER_ID` (from step 1), `INTERNAL_BASE_URL` (same value used
   in `assistant-service`).
3. **Deploy**:
   ```
   cd backend/functions/report-service
   npm install
   catalyst functions:deploy
   ```
4. **Test**:
   - `GET /server/report-service/reports/case/1`
   - `GET /server/report-service/reports/analytics-summary`
   Both should return a `report` object with the uploaded PDF's file ID —
   confirm it in the console under File Store.

## Next module
Module 7 — Frontend assembly: wiring `CriminalNetworkGraph`, `ChatAssistant`,
and new hotspot-map/trend-chart components (Leaflet.js + Chart.js) into one
dashboard, deployed via **Catalyst Slate**.
