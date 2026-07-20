# Module 3 — Case Intelligence & Hotspot Analytics

## What's in this module
- `backend/functions/analytics-service/` — Advanced I/O function:
  - `GET /hotspots` — grid-aggregates `CaseMaster` lat/long into cells with
    case counts, filterable by date range and crime head. Feeds the
    Leaflet.js heatmap.
  - `GET /trends` — case counts per month per crime sub-head, for trend
    charts.
  - `POST /predict` — forwards feature values to a QuickML pipeline
    endpoint and relays the prediction (e.g. "expected case volume next
    month for district X").
- `backend/functions/hotspot-refresh-job/` — Basic I/O function meant to
  run on a **Job Pool schedule** (not HTTP-triggered) that precomputes the
  full hotspot grid nightly and stores it in **Catalyst Cache**, so the
  dashboard's default map view is a cache read instead of a live aggregation
  over the whole `CaseMaster` table.

## Setup steps

1. **Build the QuickML pipeline** (console, no-code):
   - QuickML → Create Pipeline → point it at a dataset derived from
     `CaseMaster` (district, month, `CrimeMajorHeadID`, case count) —
     export this from Data Store/ZCQL as a CSV to upload, since QuickML
     trains on uploaded datasets, not live tables.
   - Choose a regression or time-series-style model for "predicted case
     count" as the target column.
   - Publish it as an **endpoint** — the Endpoint tab gives you the URL,
     `X-QUICKML-ENDPOINT-KEY`, and environment (Development/Production).
2. **Get a Zoho OAuth2 access token** for calling that endpoint externally
   (QuickML endpoints authenticate via Zoho accounts OAuth2, separate from
   Catalyst's own app-level auth) — generate this from the Zoho API
   Console and refresh it periodically; store the current token as an env
   var, not in code.
3. **Set environment variables** on `analytics-service` (console → Functions
   → analytics-service → Environment Variables):
   `QUICKML_ENDPOINT_URL`, `QUICKML_ENDPOINT_KEY`, `QUICKML_ACCESS_TOKEN`,
   `QUICKML_ORG_ID`, `QUICKML_ENVIRONMENT`.
4. **Deploy both functions**:
   ```
   cd backend/functions/analytics-service && npm install && catalyst functions:deploy
   cd ../hotspot-refresh-job && npm install && catalyst functions:deploy
   ```
5. **Schedule the refresh job** — console → Job Pool → Create Job → select
   `hotspot-refresh-job` → set a nightly cron schedule.
6. **Test**:
   - `GET /server/analytics-service/hotspots` — should return grid cells
     from the seed data.
   - `GET /server/analytics-service/trends`
   - `POST /server/analytics-service/predict` once the QuickML endpoint is live.

## Note on scope
`/predict` is a thin relay to QuickML — until the pipeline is actually
built and published in the console, it returns a 501 with a pointer back
to this README rather than failing silently.

## Next module
Module 4 — Criminal network visualization (Cytoscape.js frontend + the
adjacency-table graph-traversal logic in Data Store/Functions, per the
Module 3 planning note about not reaching for an external graph DB).
