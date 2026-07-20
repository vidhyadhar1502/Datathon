/**
 * DRISHTI — case-service
 * Advanced I/O Catalyst Function: CRUD for the remaining case-linked
 * tables not covered by data-service — Victim, ArrestSurrender,
 * ChargesheetDetails — with role-based write access.
 *
 * Deploy with: catalyst functions:deploy (from this directory)
 */

const catalyst = require('zcatalyst-sdk-node');
const express = require('express');
const { requireRole, ROLES } = require('./authMiddleware');

const app = express();
app.use(express.json());

function getDataStore(req) {
  const catalystApp = catalyst.initialize(req);
  return catalystApp.datastore();
}

function handleError(res, err) {
  console.error(err);
  res.status(err.status || 500).json({ error: true, message: err.message || 'Internal error' });
}

const CAN_WRITE = requireRole(ROLES.ADMIN, ROLES.STATION_OFFICER, ROLES.INVESTIGATING_OFFICER);

// ---- Victim -------------------------------------------------------------

app.post('/cases/:caseId/victims', CAN_WRITE, async (req, res) => {
  try {
    const table = getDataStore(req).table('Victim');
    const row = await table.insertRow({ ...req.body, CaseMasterID: req.params.caseId });
    res.status(201).json({ victim: row });
  } catch (err) { handleError(res, err); }
});

app.get('/cases/:caseId/victims', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();
    const result = await zcql.executeZCQLQuery(
      `SELECT * FROM Victim WHERE CaseMasterID = ${req.params.caseId}`
    );
    res.status(200).json({ victims: result.map(r => r.Victim) });
  } catch (err) { handleError(res, err); }
});

// ---- ArrestSurrender ------------------------------------------------------

app.post('/cases/:caseId/arrests', CAN_WRITE, async (req, res) => {
  try {
    const table = getDataStore(req).table('ArrestSurrender');
    const row = await table.insertRow({ ...req.body, CaseMasterID: req.params.caseId });
    res.status(201).json({ arrestSurrender: row });
  } catch (err) { handleError(res, err); }
});

app.get('/cases/:caseId/arrests', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();
    const result = await zcql.executeZCQLQuery(
      `SELECT * FROM ArrestSurrender WHERE CaseMasterID = ${req.params.caseId}`
    );
    res.status(200).json({ arrests: result.map(r => r.ArrestSurrender) });
  } catch (err) { handleError(res, err); }
});

// ---- ChargesheetDetails ------------------------------------------------

// Filing a chargesheet is a case-closing action -> Admin/StationOfficer only,
// not left to InvestigatingOfficer alone.
app.post(
  '/cases/:caseId/chargesheet',
  requireRole(ROLES.ADMIN, ROLES.STATION_OFFICER),
  async (req, res) => {
    try {
      const table = getDataStore(req).table('ChargesheetDetails');
      const row = await table.insertRow({ ...req.body, CaseMasterID: req.params.caseId });
      res.status(201).json({ chargesheet: row });
    } catch (err) { handleError(res, err); }
  }
);

app.get('/cases/:caseId/chargesheet', async (req, res) => {
  try {
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();
    const result = await zcql.executeZCQLQuery(
      `SELECT * FROM ChargesheetDetails WHERE CaseMasterID = ${req.params.caseId}`
    );
    res.status(200).json({ chargesheets: result.map(r => r.ChargesheetDetails) });
  } catch (err) { handleError(res, err); }
});

module.exports = app;
