# Module 2 — Auth & Broader CRUD

## What's in this module
- `docs/auth/roles.md` — role model (Admin, StationOfficer,
  InvestigatingOfficer, Analyst) and how signup validation assigns them.
- `backend/functions/auth-service/` — Basic I/O function wired to
  Authentication's **Custom User Validation** event. Rejects signups unless
  the entered KGID matches an `Employee` record; assigns a Catalyst role
  from that employee's `Designation`.
- `backend/functions/case-service/` — Advanced I/O function:
  - `authMiddleware.js` — `requireRole(...)` middleware, checks the caller's
    Catalyst role via `userManagement.getCurrentUser()`.
  - CRUD for `Victim`, `ArrestSurrender`, `ChargesheetDetails` (all nested
    under `/cases/:caseId/...`). Reads are open to any authenticated user;
    writes require Admin/StationOfficer/InvestigatingOfficer, and filing a
    chargesheet is further restricted to Admin/StationOfficer only.

## Setup steps

1. **Enable Authentication** — Catalyst console → Authentication → enable
   **Hosted Authentication**, turn on Public Sign Up.
2. **Add signup field** — configure the hosted signup form to collect an
   extra `kgid` field (Employee's Karnataka Govt ID) alongside email/password.
3. **Create roles** — under User Management → Roles, create `Admin`,
   `StationOfficer`, `InvestigatingOfficer`, `Analyst` matching
   `docs/auth/roles.md`.
4. **Wire Custom User Validation**:
   ```
   cd backend/functions/auth-service
   npm install
   catalyst functions:deploy
   ```
   Then in the console, under Authentication → Authentication Types →
   Custom User Validation, point it at this function.
5. **Deploy case-service**:
   ```
   cd backend/functions/case-service
   npm install
   catalyst functions:deploy
   ```
6. **Test role gating** — sign up two test users mapped to different
   `Employee` designations, confirm one can `POST /cases/:id/chargesheet`
   and the other gets a 403.

## Next module
Module 3 — Case intelligence & hotspot analytics (QuickML), building on
top of the CaseMaster lat/long + CrimeSubHead data now reachable through
Modules 1 and 2.
