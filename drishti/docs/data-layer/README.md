# Module 1 — Data Layer

## What's in this module
- `docs/data-layer/schema-design.md` — full table spec (columns, types, keys)
  for every table in the FIR data model.
- `data/seed-data/masters.json` — synthetic reference data (states, ranks,
  crime heads, acts/sections, etc.)
- `data/seed-data/sample-case.json` — one synthetic end-to-end case for
  testing the pipeline.
- `backend/functions/data-service/` — an Advanced I/O Catalyst Function
  (Node.js) with basic CRUD: create a case (+ linked records), fetch a case
  by ID, list/filter cases, update case status.

## Setup steps

1. **Create the tables** — in the Catalyst console, Data Store → Create a
   new Table, for each table in `schema-design.md`, in the build order
   listed there (masters first, then Employee/Unit/Court, then CaseMaster,
   then the case-linked tables).
2. **Seed masters** — use Data Store → Import (or the console's manual row
   entry) to load `masters.json` into the corresponding tables. IDs are
   auto-numbered, so note down which row got which ID before seeding
   `sample-case.json` (its FK values assume masters were seeded in the
   order listed).
3. **Deploy the function**:
   ```
   cd backend/functions/data-service
   npm install
   catalyst functions:deploy
   ```
4. **Test it**:
   ```
   curl -X POST https://<project-domain>/server/data-service/cases \
     -H "Content-Type: application/json" \
     -d @../../../data/seed-data/sample-case.json
   ```

## Next module
Once this is working end-to-end (create → fetch → list → update status),
Module 2 is Auth + broader CRUD Functions (Victim, ArrestSurrender,
ChargesheetDetails endpoints, and Catalyst Authentication wiring).