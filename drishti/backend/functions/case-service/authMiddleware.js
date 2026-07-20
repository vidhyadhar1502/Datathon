/**
 * DRISHTI — shared auth middleware for Advanced I/O functions.
 * Copy this file into any function directory that needs role gating
 * (Catalyst functions are deployed independently, so this isn't imported
 * across function boundaries — duplicate as needed, or later published
 * as a private npm package once the module count grows).
 */

const catalyst = require('zcatalyst-sdk-node');

const ROLES = {
  ADMIN: 'Admin',
  STATION_OFFICER: 'StationOfficer',
  INVESTIGATING_OFFICER: 'InvestigatingOfficer',
  ANALYST: 'Analyst'
};

/**
 * requireRole(...allowedRoles) -> Express middleware
 * Fetches the current logged-in Catalyst user and checks their
 * role_details.role_name against the allowed list. 403s if not allowed.
 */
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
