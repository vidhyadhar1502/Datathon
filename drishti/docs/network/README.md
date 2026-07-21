# Module 4 — Criminal Network Visualization

## What's in this module
- `docs/network/schema-addition.md` — one new table, `CriminalAssociation`,
  for manually-tagged links between accused persons across different
  cases (co-accused-within-a-case links need no new table — they're
  derived on the fly from existing `Accused` rows).
- `backend/functions/network-service/` — Advanced I/O function:
  - `GET /network/person/:accusedId?depth=2` — BFS out from one person
  - `GET /network/case/:caseId` — graph for all accused in a case, plus
    one hop of their outside connections
  - `POST /network/associations` — add a manual link (role-gated, same
    as `case-service`)
- `frontend/` — first files here:
  - `src/api/networkService.js` — fetch wrapper for the endpoints above
  - `src/components/CriminalNetworkGraph.jsx` — Cytoscape.js graph
    component, `mode="person"` or `mode="case"`

## Setup steps

1. **Create `CriminalAssociation`** in the Catalyst console per
   `docs/network/schema-addition.md`.
2. **Deploy network-service**:
   ```
   cd backend/functions/network-service
   npm install
   catalyst functions:deploy
   ```
3. **Install frontend deps** (first time touching `frontend/`):
   ```
   cd frontend
   npm install
   ```
4. **Use the component**:
   ```jsx
   import CriminalNetworkGraph from './components/CriminalNetworkGraph';

   <CriminalNetworkGraph mode="case" id={caseMasterId} />
   <CriminalNetworkGraph mode="person" id={accusedId} depth={2} />
   ```
5. Set `REACT_APP_NETWORK_SERVICE_URL` to the deployed function's route
   once it's live (defaults to a relative `/server/network-service` path,
   which works if frontend and backend share a Catalyst project domain).

## Next module
Module 5 — Conversational assistant (Zia voice/NLP), which will likely
call into `data-service`, `analytics-service`, and `network-service` as
its backing tools rather than hitting Data Store directly.
