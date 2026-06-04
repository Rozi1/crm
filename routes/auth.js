const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../database');
const { JWT_SECRET } = require('../middleware/auth');
const { getClientIP } = require('../middleware/ipCheck');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.is_active) return res.status(401).json({ error: 'Account is inactive. Contact your administrator.' });

  if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });

  // Block agents if kill switch is on
  if (user.role === 'agent') {
    const ks = db.prepare("SELECT value FROM settings WHERE key = 'kill_switch'").get();
    if (ks && ks.value === 'true') {
      return res.status(503).json({ error: 'The system is currently offline. Please contact your administrator.', kill_switch: true });
    }
  }

  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  const expiresIn = (user.role === 'admin' || user.role === 'superadmin') ? '48h' : '12h';
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn });
  res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role } });
});

router.get('/my-ip', (req, res) => {
  res.json({ ip: getClientIP(req) });
});

module.exports = router;
