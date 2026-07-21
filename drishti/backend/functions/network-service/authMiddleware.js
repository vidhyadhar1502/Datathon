/**
 * DRISHTI — shared auth middleware, duplicated into network-service.
 * Same as backend/functions/case-service/authMiddleware.js — see the note
 * there about extracting this into a shared private package once the
 * function count grows further.
 */

const catalyst = require('zcatalyst-sdk-node');

const ROLES = {
  ADMIN: 'Admin',
  STATION_OFFICER: 'StationOfficer',
  INVESTIGATING_OFFICER: 'InvestigatingOfficer',
  ANALYST: 'Analyst'
};

function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const catalystApp = catalyst.initialize(req);
      const userManagement = catalystApp.userManagement();
      const currentUser = await userManagement.getCurrentUser();

      const roleName = currentUser && currentUser.role_details
        ? currentUser.role_details.role_name
        : undefined;

      if (!roleName || !allowedRoles.includes(roleName)) {
        return res.status(403).json({
          error: true,
          message: `Requires one of: ${allowedRoles.join(', ')}`
        });
      }

      req.currentUser = currentUser;
      req.currentRole = roleName;
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: true, message: 'Auth check failed' });
    }
  };
}

module.exports = { requireRole, ROLES };
