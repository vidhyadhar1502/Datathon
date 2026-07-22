# Connecting DRISHTI to a Real Catalyst Project & Data Store

Everything built in Modules 1–7 talks to Catalyst Data Store through
`zcql`/`datastore()` calls — but none of it has been run against a real
project yet. This is the runbook to make that connection real.

## What I can't do for you
`catalyst login` and `catalyst init` are interactive and require your
Zoho account — they open a browser OAuth flow and ask you to pick your
org/project by name. I can't drive that from here. Everything below is
written so those are the only manual steps; everything else is scripted
or already built.

## Step 0 — Create the cloud project (console, one-time)

1. Go to the Catalyst console → **Create Project** → name it (e.g.
   `DRISHTI`).
2. Under **Data Store**, create every table listed in
   `docs/data-layer/schema-design.md`, in the build order given there.
   Nothing in the backend will work until these exist — Data Store
   tables can only be created from the console (confirmed in Module 1),
   not from the CLI or from code.
3. Also create the `CriminalAssociation` table from
   `docs/network/schema-addition.md`.
4. Under **File Store**, create a folder for generated reports — note
   its Folder ID (needed for `report-service`, see `docs/reports/README.md`).

## Step 1 — Install the CLI and log in

```
npm install -g zcatalyst-cli
catalyst login
```
This opens a browser window for your Zoho account — pick the org that
owns the project you just created.

## Step 2 — Link this repo to that project

**Important**: `catalyst init` is a wizard that expects to *scaffold* a
fresh project layout — it doesn't have a documented "adopt my existing
folders" mode. Rather than guess whether it'll accept our existing
`backend/functions/*` layout, the reliable path is:

1. Run `catalyst init` in an **empty scratch directory** (not this repo),
   select your project from the list, and initialize the **Functions**
   component. This generates a correct `catalyst.json` and a hidden
   `.catalystrc` (which encodes your actual project ID — this is the
   file that makes local commands target your real cloud project).
2. Copy those two files (`catalyst.json`, `.catalystrc`) into this repo's
   root, replacing the placeholder `catalyst.json` already here.
3. Open the copied `catalyst.json` and set `"functions": { "source":
   "backend/functions", "targets": [...] }` — list all 8 folder names
   currently under `backend/functions/` (`data-service`, `case-service`,
   `auth-service`, `analytics-service`, `hotspot-refresh-job`,
   `network-service`, `assistant-service`, `report-service`). The `source`
   path is just a config value, so pointing it at our existing
   `backend/functions` directory should work without moving anything —
   but if `catalyst functions:deploy` complains it can't find a function,
   the fallback is renaming `backend/functions` to a top-level
   `functions/` directory to match the CLI's own default convention
   exactly, and updating `source` to `"functions"`.
4. Delete the scratch directory — it's served its purpose.

## Step 3 — Environment variables

Each function that needs one has its env vars documented in its module's
README (`docs/auth/`, `docs/analytics/`, `docs/assistant/`,
`docs/reports/`). Set these in the console under Functions → *function
name* → Environment Variables before deploying — they're not stored in
this repo.

## Step 4 — Deploy and test

```
catalyst functions:deploy
```
This deploys all 8 functions in one pass. Then work through each
module's README test steps in order (Module 1 → 6), since later
functions depend on earlier ones being live (e.g. `report-service` calls
`data-service` internally).

## Step 5 — Seed real (synthetic) data

Use the console's Data Store import, or a one-off script calling
`data-service`'s `POST /cases` endpoint, to load
`data/seed-data/masters.json` and `data/seed-data/sample-case.json` —
see `docs/data-layer/README.md` for the exact sequence (masters first,
since IDs are auto-numbered and later records reference them).

## After this works
Once `GET /server/data-service/cases` returns real data from your
project's Data Store (not a 404/auth error), every module built so far
is genuinely connected end-to-end, and Module 8 (deck/diagrams) can
honestly show a working system rather than a planned one.
