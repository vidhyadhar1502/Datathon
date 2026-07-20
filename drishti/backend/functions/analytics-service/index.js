/**
 * DRISHTI — analytics-service
 * Advanced I/O Catalyst Function:
 *  - GET /hotspots   grid-aggregated case counts for the Leaflet.js hotspot map
 *  - GET /trends     case counts over time, grouped by month + crime sub-head
 *  - GET /predict    forwards feature values to a QuickML pipeline endpoint
 *                     and returns its prediction
 *
 * Env vars required for /predict (set in Catalyst console -> Functions ->
 * this function -> Environment Variables):
 *   QUICKML_ENDPOINT_URL   - the endpoint URL shown on the QuickML pipeline's
 *                            "Endpoint" tab
 *   QUICKML_ENDPOINT_KEY   - X-QUICKML-ENDPOINT-KEY value from that tab
 *   QUICKML_ACCESS_TOKEN   - Zoho OAuth2 access token (see docs/analytics/README.md
 *                            for how this is generated/refreshed)
 *   QUICKML_ORG_ID         - Catalyst org ID
 *   QUICKML_ENVIRONMENT    - "Development" or "Production"
 */

const catalyst = require('zcatalyst-sdk-node');
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

function handleError(res, err) {
  console.error(err);
  res.status(err.status || 500).json({ error: true, message: err.message || 'Internal error' });
}

// Grid cell size in degrees (~1.1km at the equator). Coarse enough to group
// nearby incidents, fine enough to still separate distinct neighbourhoods.
const GRID_SIZE = 0.01;

/**
 * GET /hotspots?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&crimeHeadId=2
 * Returns grid cells with a case count each, for heatmap rendering.
 */
app.get('/hotspots', async (req, res) => {
  try {
    const { fromDate, toDate, crimeHeadId } = req.query;
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    let query = `SELECT latitude, longitude, CrimeMajorHeadID FROM CaseMaster WHERE latitude IS NOT NULL`;
    if (fromDate) query += ` AND CrimeRegisteredDate >= '${fromDate}'`;
    if (toDate) query += ` AND CrimeRegisteredDate <= '${toDate}'`;
    if (crimeHeadId) query += ` AND CrimeMajorHeadID = ${parseInt(crimeHeadId, 10)}`;

    const rows = await zcql.executeZCQLQuery(query);

    const cells = {};
    for (const row of rows) {
      const c = row.CaseMaster;
      if (c.latitude == null || c.longitude == null) continue;

      const gridLat = Math.round(c.latitude / GRID_SIZE) * GRID_SIZE;
      const gridLng = Math.round(c.longitude / GRID_SIZE) * GRID_SIZE;
      const key = `${gridLat.toFixed(4)},${gridLng.toFixed(4)}`;

      if (!cells[key]) {
        cells[key] = { latitude: gridLat, longitude: gridLng, count: 0 };
      }
      cells[key].count += 1;
    }

    res.status(200).json({ hotspots: Object.values(cells) });
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * GET /trends?crimeHeadId=2&months=6
 * Returns case counts per month per crime sub-head, for trend charts.
 */
app.get('/trends', async (req, res) => {
  try {
    const { crimeHeadId } = req.query;
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    let query = `SELECT CrimeRegisteredDate, CrimeMinorHeadID FROM CaseMaster WHERE CrimeRegisteredDate IS NOT NULL`;
    if (crimeHeadId) query += ` AND CrimeMajorHeadID = ${parseInt(crimeHeadId, 10)}`;

    const rows = await zcql.executeZCQLQuery(query);

    const byMonth = {};
    for (const row of rows) {
      const c = row.CaseMaster;
      const date = new Date(c.CrimeRegisteredDate);
      if (isNaN(date.getTime())) continue;

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const subHead = c.CrimeMinorHeadID;

      if (!byMonth[monthKey]) byMonth[monthKey] = {};
      byMonth[monthKey][subHead] = (byMonth[monthKey][subHead] || 0) + 1;
    }

    res.status(200).json({ trends: byMonth });
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * POST /predict
 * Body: arbitrary feature key/values matching the QuickML pipeline's
 * expected input columns, e.g. { district: "Bengaluru Urban", month: 7,
 * crimeHeadId: 2 }
 * Forwards to the deployed QuickML endpoint and relays its prediction.
 */
app.post('/predict', async (req, res) => {
  try {
    const {
      QUICKML_ENDPOINT_URL,
      QUICKML_ENDPOINT_KEY,
      QUICKML_ACCESS_TOKEN,
      QUICKML_ORG_ID,
      QUICKML_ENVIRONMENT
    } = process.env;

    if (!QUICKML_ENDPOINT_URL) {
      return res.status(501).json({
        error: true,
        message: 'QuickML endpoint not configured yet — see docs/analytics/README.md'
      });
    }

    const response = await axios.post(QUICKML_ENDPOINT_URL, req.body, {
      headers: {
        'X-QUICKML-ENDPOINT-KEY': QUICKML_ENDPOINT_KEY,
        'Authorization': `Zoho-oauthtoken ${QUICKML_ACCESS_TOKEN}`,
        'CATALYST-ORG': QUICKML_ORG_ID,
        'Environment': QUICKML_ENVIRONMENT || 'Development',
        'Content-Type': 'application/json'
      }
    });

    res.status(200).json({ prediction: response.data });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = app;
