const { getDB } = require('../database');

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = forwarded ? forwarded.split(',')[0].trim() : (req.ip || req.connection.remoteAddress || '');
  return raw.replace('::ffff:', '');
}

function checkIP(req, res, next) {
  const db = getDB();
  const allowed = db.prepare('SELECT ip_address FROM allowed_ips').all();

  if (allowed.length === 0) return next(); // setup mode — no restrictions yet

  const clientIP = getClientIP(req);
  const ok = allowed.some(row => {
    const stored = row.ip_address.replace('::ffff:', '');
    return stored === clientIP || stored === '127.0.0.1' && (clientIP === '127.0.0.1' || clientIP === '::1');
  });

  if (!ok) {
    return res.status(403).json({
      error: 'Access denied. Your IP address is not authorised to access this system.',
      your_ip: clientIP
    });
  }
  next();
}

module.exports = { checkIP, getClientIP };
