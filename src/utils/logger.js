// Small project logger. It deliberately accepts messages only, never credentials or tokens.
function info(action, details = '') { console.info(`[INFO] ${action}${details ? `: ${details}` : ''}`); }
function error(action, err) { console.error(`[ERROR] ${action}`, err?.message || err); }
module.exports = { info, error };
