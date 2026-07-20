/**
 * DRISHTI — auth-service
 * Basic I/O Catalyst Function: Custom User Validation, invoked automatically
 * by Catalyst Authentication on every signup attempt.
 *
 * Create this function via the console/CLI as function type "Basic I/O"
 * and wire it to Authentication → Authentication Types → Custom User
 * Validation (not deployed like a normal HTTP function — no catalyst-config
 * route_config needed here).
 *
 * Flow:
 *  1. Signup form must collect an extra field: `kgid` (Karnataka Govt ID)
 *     alongside the standard email/password fields.
 *  2. We look up that KGID in the Employee table.
 *  3. If found -> allow signup, and set the Catalyst role from the
 *     employee's Designation. If not found -> reject signup.
 */

const catalyst = require('zcatalyst-sdk-node');

// Designation name -> Catalyst application role
const DESIGNATION_TO_ROLE = {
  'SHO': 'StationOfficer',
  'Investigating Officer': 'InvestigatingOfficer'
  // anything else falls back to 'Analyst' (read-only)
};

module.exports = async (context, basicIO) => {
  const catalystApp = catalyst.initialize(context);
  const userManagement = catalystApp.userManagement();
  const zcql = catalystApp.zcql();

  const requestDetails = userManagement.getSignupValidationRequest(basicIO);
  if (requestDetails === undefined) {
    return;
  }

  try {
    const { kgid } = requestDetails.user_details;

    if (!kgid) {
      basicIO.write(JSON.stringify({ status: 'failure' }));
      return;
    }

    const employees = await zcql.executeZCQLQuery(
      `SELECT EmployeeID, FirstName, DesignationID FROM Employee WHERE KGID = '${kgid}'`
    );

    if (!employees.length) {
      // No matching employee record -> not an onboarded officer, reject.
      basicIO.write(JSON.stringify({ status: 'failure' }));
      return;
    }

    const employee = employees[0].Employee;

    const designations = await zcql.executeZCQLQuery(
      `SELECT DesignationName FROM Designation WHERE DesignationID = ${employee.DesignationID}`
    );
    const designationName = designations.length
      ? designations[0].Designation.DesignationName
      : null;

    const role = DESIGNATION_TO_ROLE[designationName] || 'Analyst';

    basicIO.write(JSON.stringify({
      status: 'success',
      user_details: {
        first_name: employee.FirstName,
        role_identifier: role
      }
    }));
  } catch (err) {
    console.error(err);
    basicIO.write(JSON.stringify({ status: 'failure' }));
  }
};
