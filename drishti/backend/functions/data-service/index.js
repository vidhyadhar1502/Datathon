/**
 * DRISHTI — data-service
 * Advanced I/O Catalyst Function: CRUD layer over the CaseMaster table
 * (and closely linked tables) in Catalyst Data Store.
 *
 * Deploy with: catalyst functions:deploy (from the function's parent dir)
 * Local test:  catalyst functions:run data-service
 *
 * NOTE: Tables referenced here (CaseMaster, ComplainantDetails, Victim,
 * Accused, ActSectionAssociation, ...) must already exist in the Catalyst
 * console — see docs/data-layer/schema-design.md for the exact schema.
 */

const catalyst = require('zcatalyst-sdk-node');
const express = require('express');
const app = express();

app.use(express.json());

// ---- helpers ---------------------------------------------------------

function getDataStore(req) {
  const catalystApp = catalyst.initialize(req);
  return catalystApp.datastore();
}

function handleError(res, err) {
  console.error(err);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Internal error'
  });
}

/**
 * Resolves the lookup IDs on a set of CaseMaster rows (status, crime
 * sub-head, gravity) into human-readable names, so the frontend never has
 * to show a bare numeric ID as if it meant something on its own. Done as
 * a batch lookup rather than a JOIN, since ZCQL's JOIN support isn't
 * confirmed — this stays correct regardless.
 */
async function enrichCases(zcql, cases) {
  if (!cases.length) return cases;

  const statusIds = [...new Set(cases.map(c => c.CaseStatusID).filter(Boolean))];
  const subHeadIds = [...new Set(cases.map(c => c.CrimeMinorHeadID).filter(Boolean))];
  const gravityIds = [...new Set(cases.map(c => c.GravityOffenceID).filter(Boolean))];

  const [statusRows, subHeadRows, gravityRows] = await Promise.all([
    statusIds.length
      ? zcql.executeZCQLQuery(`SELECT CaseStatusID, CaseStatusName FROM CaseStatusMaster WHERE CaseStatusID IN (${statusIds.join(',')})`)
      : [],
    subHeadIds.length
      ? zcql.executeZCQLQuery(`SELECT CrimeSubHeadID, CrimeHeadName FROM CrimeSubHead WHERE CrimeSubHeadID IN (${subHeadIds.join(',')})`)
      : [],
    gravityIds.length
      ? zcql.executeZCQLQuery(`SELECT GravityOffenceID, LookupValue FROM GravityOffence WHERE GravityOffenceID IN (${gravityIds.join(',')})`)
      : []
  ]);

  const statusMap = Object.fromEntries(statusRows.map(r => [r.CaseStatusMaster.CaseStatusID, r.CaseStatusMaster.CaseStatusName]));
  const subHeadMap = Object.fromEntries(subHeadRows.map(r => [r.CrimeSubHead.CrimeSubHeadID, r.CrimeSubHead.CrimeHeadName]));
  const gravityMap = Object.fromEntries(gravityRows.map(r => [r.GravityOffence.GravityOffenceID, r.GravityOffence.LookupValue]));

  return cases.map(c => ({
    ...c,
    CaseStatusName: statusMap[c.CaseStatusID] || 'Unknown',
    CrimeTypeName: subHeadMap[c.CrimeMinorHeadID] || 'Unclassified',
    GravityName: gravityMap[c.GravityOffenceID] || null
  }));
}

// ---- routes ------------------------------------------------------------

/**
 * POST /server/data-service/cases
 * Create a new FIR case. Body: { caseMaster, complainant, accused, actSection }
 * Only caseMaster is required; the rest are optional linked records.
 */
app.post('/cases', async (req, res) => {
  try {
    const { caseMaster, complainant, accused, actSection } = req.body;
    if (!caseMaster) {
      return res.status(400).json({ error: true, message: 'caseMaster is required' });
    }

    const datastore = getDataStore(req);
    const caseTable = datastore.table('CaseMaster');

    const caseRow = await caseTable.insertRow(caseMaster);
    const caseMasterID = caseRow.CaseMasterID;

    const linked = {};

    if (complainant) {
      const complainantTable = datastore.table('ComplainantDetails');
      linked.complainant = await complainantTable.insertRow({
        ...complainant,
        CaseMasterID: caseMasterID
      });
    }

    if (accused) {
      const accusedTable = datastore.table('Accused');
      linked.accused = await accusedTable.insertRow({
        ...accused,
        CaseMasterID: caseMasterID
      });
    }

    if (actSection) {
      const actSectionTable = datastore.table('ActSectionAssociation');
      linked.actSection = await actSectionTable.insertRow({
        ...actSection,
        CaseMasterID: caseMasterID
      });
    }

    res.status(201).json({ caseMaster: caseRow, linked });
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * GET /server/data-service/cases/:id
 * Fetch a single case with its directly linked records, via ZCQL.
 */
app.get('/cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    const caseQuery = `SELECT * FROM CaseMaster WHERE CaseMasterID = ${id}`;
    const caseResult = await zcql.executeZCQLQuery(caseQuery);

    if (!caseResult.length) {
      return res.status(404).json({ error: true, message: 'Case not found' });
    }

    const [complainants, victims, accusedList, actSections] = await Promise.all([
      zcql.executeZCQLQuery(`SELECT * FROM ComplainantDetails WHERE CaseMasterID = ${id}`),
      zcql.executeZCQLQuery(`SELECT * FROM Victim WHERE CaseMasterID = ${id}`),
      zcql.executeZCQLQuery(`SELECT * FROM Accused WHERE CaseMasterID = ${id}`),
      zcql.executeZCQLQuery(`SELECT * FROM ActSectionAssociation WHERE CaseMasterID = ${id}`)
    ]);

    const [enrichedCase] = await enrichCases(zcql, [caseResult[0].CaseMaster]);

    res.status(200).json({
      caseMaster: enrichedCase,
      complainants: complainants.map(r => r.ComplainantDetails),
      victims: victims.map(r => r.Victim),
      accused: accusedList.map(r => r.Accused),
      actSections: actSections.map(r => r.ActSectionAssociation)
    });
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * GET /server/data-service/cases
 * List recent cases, optionally filtered by status or district (via police station -> unit).
 * Query params: limit (default 25), statusId
 */
app.get('/cases', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 25;
    const statusId = req.query.statusId;

    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    let query = `SELECT * FROM CaseMaster`;
    if (statusId) {
      query += ` WHERE CaseStatusID = ${parseInt(statusId, 10)}`;
    }
    query += ` ORDER BY CREATEDTIME DESC LIMIT ${limit}`;

    const result = await zcql.executeZCQLQuery(query);
    const enriched = await enrichCases(zcql, result.map(r => r.CaseMaster));
    res.status(200).json({ cases: enriched });
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * PATCH /server/data-service/cases/:id/status
 * Update a case's status (e.g. Under Investigation -> Charge Sheeted -> Closed).
 * Body: { caseStatusId }
 */
app.patch('/cases/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { caseStatusId } = req.body;
    if (!caseStatusId) {
      return res.status(400).json({ error: true, message: 'caseStatusId is required' });
    }

    const datastore = getDataStore(req);
    const caseTable = datastore.table('CaseMaster');
    const updated = await caseTable.updateRow({
      CaseMasterID: id,
      CaseStatusID: caseStatusId
    });

    res.status(200).json({ caseMaster: updated });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = app;
