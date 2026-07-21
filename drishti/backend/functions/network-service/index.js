/**
 * DRISHTI — network-service
 * Advanced I/O Catalyst Function: builds the criminal-association graph
 * from two edge sources — co-accused (same CaseMasterID) and manual
 * CriminalAssociation rows — and runs BFS traversal in-memory, since
 * Catalyst has no native graph DB (see docs/network/schema-addition.md).
 */

const catalyst = require('zcatalyst-sdk-node');
const express = require('express');
const { requireRole, ROLES } = require('./authMiddleware');

const app = express();
app.use(express.json());

function handleError(res, err) {
  console.error(err);
  res.status(err.status || 500).json({ error: true, message: err.message || 'Internal error' });
}

/**
 * Builds an adjacency list: { personId: [{ id, relation, caseMasterId }] }
 * from both edge sources.
 */
async function buildAdjacency(zcql) {
  const adjacency = {};

  function addEdge(a, b, relation, caseMasterId) {
    if (a == null || b == null || a === b) return;
    if (!adjacency[a]) adjacency[a] = [];
    if (!adjacency[b]) adjacency[b] = [];
    adjacency[a].push({ id: b, relation, caseMasterId });
    adjacency[b].push({ id: a, relation, caseMasterId });
  }

  // Edge source 1: co-accused (all accused sharing a CaseMasterID)
  const accusedRows = await zcql.executeZCQLQuery(
    `SELECT AccusedMasterID, CaseMasterID FROM Accused`
  );

  const byCase = {};
  for (const row of accusedRows) {
    const a = row.Accused;
    if (!byCase[a.CaseMasterID]) byCase[a.CaseMasterID] = [];
    byCase[a.CaseMasterID].push(a.AccusedMasterID);
  }
  for (const caseMasterId of Object.keys(byCase)) {
    const persons = byCase[caseMasterId];
    for (let i = 0; i < persons.length; i++) {
      for (let j = i + 1; j < persons.length; j++) {
        addEdge(persons[i], persons[j], 'Co-Accused', caseMasterId);
      }
    }
  }

  // Edge source 2: manual associations
  const associationRows = await zcql.executeZCQLQuery(
    `SELECT PersonAID, PersonBID, RelationType, SourceCaseMasterID FROM CriminalAssociation WHERE Active = true`
  );
  for (const row of associationRows) {
    const assoc = row.CriminalAssociation;
    addEdge(assoc.PersonAID, assoc.PersonBID, assoc.RelationType, assoc.SourceCaseMasterID);
  }

  return adjacency;
}

/**
 * BFS from a root node up to maxDepth hops. Returns nodes + edges in a
 * Cytoscape.js-friendly shape: { nodes: [{id}], edges: [{source,target,relation}] }
 */
function bfs(adjacency, rootId, maxDepth) {
  const visited = new Set([String(rootId)]);
  const nodes = new Set([String(rootId)]);
  const edges = [];
  let frontier = [String(rootId)];

  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    const next = [];
    for (const current of frontier) {
      const neighbours = adjacency[current] || [];
      for (const edge of neighbours) {
        const neighbourId = String(edge.id);
        edges.push({
          source: current,
          target: neighbourId,
          relation: edge.relation,
          caseMasterId: edge.caseMasterId
        });
        if (!visited.has(neighbourId)) {
          visited.add(neighbourId);
          nodes.add(neighbourId);
          next.push(neighbourId);
        }
      }
    }
    frontier = next;
  }

  // de-dupe edges (both directions get pushed once per direction traversed)
  const seen = new Set();
  const dedupedEdges = edges.filter(e => {
    const key = [e.source, e.target].sort().join('-') + '-' + e.relation;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    nodes: Array.from(nodes).map(id => ({ id })),
    edges: dedupedEdges
  };
}

/**
 * GET /network/person/:accusedId?depth=2
 * Graph centered on one person, out to `depth` hops (default 2).
 */
app.get('/network/person/:accusedId', async (req, res) => {
  try {
    const { accusedId } = req.params;
    const depth = parseInt(req.query.depth, 10) || 2;

    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    const adjacency = await buildAdjacency(zcql);
    const graph = bfs(adjacency, accusedId, depth);

    res.status(200).json(graph);
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * GET /network/case/:caseId
 * Graph for a single case: its accused persons + one hop of extended
 * connections for each (so you see who else they're tied to beyond this case).
 */
app.get('/network/case/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const catalystApp = catalyst.initialize(req);
    const zcql = catalystApp.zcql();

    const accusedRows = await zcql.executeZCQLQuery(
      `SELECT AccusedMasterID FROM Accused WHERE CaseMasterID = ${caseId}`
    );
    const accusedIds = accusedRows.map(r => r.Accused.AccusedMasterID);

    if (!accusedIds.length) {
      return res.status(200).json({ nodes: [], edges: [] });
    }

    const adjacency = await buildAdjacency(zcql);

    const nodes = new Set();
    const edges = [];
    const seen = new Set();

    for (const id of accusedIds) {
      const sub = bfs(adjacency, id, 1);
      sub.nodes.forEach(n => nodes.add(n.id));
      sub.edges.forEach(e => {
        const key = [e.source, e.target].sort().join('-') + '-' + e.relation;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push(e);
        }
      });
    }

    res.status(200).json({
      nodes: Array.from(nodes).map(id => ({ id })),
      edges
    });
  } catch (err) {
    handleError(res, err);
  }
});

/**
 * POST /network/associations
 * Add a manual association edge. Body: { personAId, personBId, relationType, sourceCaseMasterId?, notes? }
 * Investigator-only write (same gate as case-service writes).
 */
app.post(
  '/network/associations',
  requireRole(ROLES.ADMIN, ROLES.STATION_OFFICER, ROLES.INVESTIGATING_OFFICER),
  async (req, res) => {
    try {
      const { personAId, personBId, relationType, sourceCaseMasterId, notes } = req.body;
      if (!personAId || !personBId || !relationType) {
        return res.status(400).json({
          error: true,
          message: 'personAId, personBId, and relationType are required'
        });
      }

      const catalystApp = catalyst.initialize(req);
      const table = catalystApp.datastore().table('CriminalAssociation');
      const row = await table.insertRow({
        PersonAID: personAId,
        PersonBID: personBId,
        RelationType: relationType,
        SourceCaseMasterID: sourceCaseMasterId || null,
        Notes: notes || '',
        Active: true
      });

      res.status(201).json({ association: row });
    } catch (err) {
      handleError(res, err);
    }
  }
);

module.exports = app;
