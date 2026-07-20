# DRISHTI — Roles & Access Model

Configured in the Catalyst console under **Authentication → User Management
→ Roles**. These are Catalyst *application* roles (separate from, but
mapped to, the `Rank`/`Designation` master tables in the data layer).

| Role | Who | Can do |
|---|---|---|
| `Admin` | Project/dept administrators | Full access — manage users, edit any case, view all analytics |
| `InvestigatingOfficer` | Officers assigned to cases (mapped via `Employee.EmployeeID`) | Create/update cases they're assigned to, update case status, add accused/victim/arrest records |
| `StationOfficer` | SHOs | Everything an Investigating Officer can do, across their station's cases |
| `Analyst` | Crime analysts, non-investigating staff | Read-only — dashboards, hotspot maps, trend queries. No case creation/edits |

## How this maps to Functions

Every Advanced I/O function in `backend/functions/` should call the shared
`requireRole()` check (see `case-service/authMiddleware.js`) before
performing a write. Reads are generally open to any authenticated role;
writes are restricted per the table above.

## Signup flow

- Authentication type: **Hosted Authentication** (Catalyst-hosted login/signup
  pages, styled from the console — no custom login UI to build).
- **Custom User Validation** (`auth-service` Basic I/O function) runs on
  every signup attempt and:
  1. Requires the signup email to match an existing `Employee` record
     (cross-checked by KGID, entered as an extra signup field) — i.e. you
     can't self-register without being a real, already-onboarded employee.
  2. Assigns the Catalyst role based on the employee's `Designation`
     (e.g. `SHO` designation → `StationOfficer` Catalyst role).
