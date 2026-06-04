const { getDB } = require('../database');

function checkKillSwitch(req, res, next) {
  const row = getDB().prepare("SELECT value FROM settings WHERE key = 'kill_switch'").get();
  if (row && row.value === 'true') {
    return res.status(503).json({
      error: 'The system is currently offline. Please contact your administrator.',
      kill_switch: true
    });
  }
  next();
}

module.exports = { checkKillSwitch };
