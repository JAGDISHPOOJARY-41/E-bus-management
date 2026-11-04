// Auth guard middleware — verifies the JWT cookie and attaches `req.user`.
const config = require('../config');
const { verifyToken } = require('../services/tokenService');
const { findByRoleAndId } = require('../services/accountService');

function authMiddleware(req, res, next) {
  const token = req.cookies[config.cookieName];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Session expired, please log in again' });
  }
}

module.exports = { authMiddleware };

async function adminMiddleware(req, res, next) {
  authMiddleware(req, res, async () => {
    try {
      const user = await findByRoleAndId('admin', req.user.id, 'role active');
      if (!user || user.active === false) {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
      }
      req.user.role = user.role;
      next();
    } catch (error) {
      next(error);
    }
  });
}

module.exports.adminMiddleware = adminMiddleware;

async function driverMiddleware(req, res, next) {
  authMiddleware(req, res, async () => {
    try {
      // Driver accounts used to live in the users collection. A token issued
      // before the account migration can therefore contain the old User id,
      // even though the matching Driver document now has the same email and a
      // different id. Resolve that legacy session once and use the Driver id
      // for all subsequent bus-assignment checks.
      let user = await findByRoleAndId('driver', req.user.id, 'role active');
      if ((!user || user.active === false) && req.user.email) {
        const Driver = require('../models/Driver');
        user = await Driver.findOne({ email: String(req.user.email).toLowerCase().trim(), active: { $ne: false } }).select('role active');
      }
      if (!user || user.active === false) {
        return res.status(403).json({ success: false, message: 'Driver access required.' });
      }
      req.user.id = user._id;
      req.user.role = user.role;
      next();
    } catch (error) {
      next(error);
    }
  });
}

module.exports.driverMiddleware = driverMiddleware;
