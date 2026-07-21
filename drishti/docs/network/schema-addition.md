# DRISHTI — Criminal Network Schema (Module 4)

Adds one new table on top of the Module 1 schema. Create it in the Catalyst
console the same way as the others (Data Store → Create a new Table).

## New table: CriminalAssociation

Manual/investigator-tagged links between two accused persons that aren't
already implied by sharing a case (e.g. known associates, family ties,
gang membership — links across *different* FIRs).

| Column | Type | Key | Notes |
|---|---|---|---|
| AssociationID | AUTONUMBER | PK | |
| PersonAID | BIGINT | FK → Accused.AccusedMasterID | |
| PersonBID | BIGINT | FK → Accused.AccusedMasterID | |
| RelationType | VARCHAR | | e.g. "Known Associate", "Family", "Gang Member" |
| SourceCaseMasterID | BIGINT | FK → CaseMaster.CaseMasterID, nullable | case in which this link was identified, if any |
| Notes | VARCHAR | | free-text investigator notes |
| Active | CHECKBOX | | soft-delete flag |

## Where the rest of the graph comes from

Two edge types make up the full network — only one needs a new table:

1. **Co-accused edges** (auto-derived, no storage needed) — any two rows in
   `Accused` sharing the same `CaseMasterID` are connected. Computed on the
   fly by `network-service` from existing data.
2. **Manual association edges** (`CriminalAssociation`, above) — links the
   investigator explicitly adds, e.g. two people who've never shared a
   case but are known associates.

This keeps the graph entirely inside Catalyst Data Store (per the
decision to avoid an external graph DB) — `network-service` builds an
in-memory adjacency list per request by combining both edge sources and
does the traversal (BFS) in the function itself.
