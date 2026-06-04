const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDB, transaction } = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getClientIP } = require('../middleware/ipCheck');

const router = express.Router();
router.use(authenticateToken, requireAdmin);

// ─── Multer setup ───────────────────────────────────────────────────────────

const csvUpload = multer({
  dest: path.join(__dirname, '..', 'uploads', 'temp'),
  fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.csv') || file.mimetype === 'text/csv') cb(null, true);
    else cb(new Error('Only CSV files are accepted'));
  },
  limits: { fileSize: 50 * 1024 * 1024 }
});

const reportUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'reports')),
    filename: (req, file, cb) => cb(null, `rpt_${Date.now()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// ─── CSV parser ──────────────────────────────────────────────────────────────

function parseCSVLine(line) {
  const out = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

router.get('/dashboard', (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];
  res.json({
    totalAgents:         db.prepare("SELECT COUNT(*) c FROM users WHERE role='agent'").get().c,
    activeAgents:        db.prepare("SELECT COUNT(*) c FROM users WHERE role='agent' AND is_active=1").get().c,
    totalLeads:          db.prepare('SELECT COUNT(*) c FROM leads').get().c,
    availableLeads:      db.prepare('SELECT COUNT(*) c FROM leads WHERE is_available=1 AND id NOT IN (SELECT lead_id FROM lead_extractions)').get().c,
    assignedLeads:       db.prepare('SELECT COUNT(*) c FROM lead_extractions').get().c,
    extractedToday:      db.prepare('SELECT COUNT(*) c FROM lead_extractions WHERE extraction_date=?').get(today).c,
    pendingReports:      db.prepare("SELECT COUNT(*) c FROM report_requests WHERE status='pending'").get().c,
    fulfilledReports:    db.prepare("SELECT COUNT(*) c FROM report_requests WHERE status='fulfilled'").get().c,
    pendingSubmissions:  db.prepare("SELECT COUNT(*) c FROM lead_submissions WHERE status='pending'").get().c,
    processedSubmissions:db.prepare("SELECT COUNT(*) c FROM lead_submissions WHERE status='processed'").get().c,
    killSwitch:          db.prepare("SELECT value FROM settings WHERE key='kill_switch'").get()?.value === 'true',
    yourIP:              getClientIP(req)
  });
});

// ─── Users ───────────────────────────────────────────────────────────────────

router.get('/users', (req, res) => {
  const db = getDB();
  const users = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.role, u.is_active, u.created_at, u.last_login,
      (SELECT COUNT(*) FROM lead_extractions WHERE user_id=u.id) total_extractions,
      (SELECT COUNT(*) FROM report_requests WHERE user_id=u.id) total_reports,
      (SELECT COUNT(*) FROM lead_submissions WHERE user_id=u.id) total_submissions
    FROM users u ORDER BY u.role DESC, u.created_at DESC
  `).all();
  res.json(users);
});

router.post('/users', (req, res) => {
  const { username, password, full_name, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  try {
    const id = getDB().prepare("INSERT INTO users (username,password,full_name,role) VALUES (?,?,?,?)")
      .run(username, bcrypt.hashSync(password, 10), full_name || username, role || 'agent').lastInsertRowid;
    res.json({ id, message: 'User created successfully' });
  } catch (e) {
    res.status(400).json({ error: e.message.includes('UNIQUE') ? 'Username already exists' : e.message });
  }
});

router.put('/users/:id', (req, res) => {
  const { full_name, is_active, password } = req.body;
  const db = getDB();
  if (password) {
    db.prepare('UPDATE users SET password=?,full_name=?,is_active=? WHERE id=?')
      .run(bcrypt.hashSync(password, 10), full_name, is_active, req.params.id);
  } else {
    db.prepare('UPDATE users SET full_name=?,is_active=? WHERE id=?').run(full_name, is_active, req.params.id);
  }
  res.json({ message: 'User updated' });
});

router.delete('/users/:id', (req, res) => {
  getDB().prepare("UPDATE users SET is_active=0 WHERE id=? AND role!='admin'").run(req.params.id);
  res.json({ message: 'User deactivated' });
});

// ─── Leads ───────────────────────────────────────────────────────────────────

router.get('/leads/batches', (req, res) => {
  const batches = getDB().prepare(`
    SELECT batch_name, COUNT(*) total,
      SUM(CASE WHEN id NOT IN (SELECT lead_id FROM lead_extractions) THEN 1 ELSE 0 END) available,
      MIN(created_at) created_at
    FROM leads GROUP BY batch_name ORDER BY created_at DESC
  `).all();
  res.json(batches);
});

router.get('/leads', (req, res) => {
  const { page = 1, limit = 100, batch } = req.query;
  const db = getDB();
  const offset = (page - 1) * limit;
  let where = batch ? 'WHERE l.batch_name=?' : '';
  const params = batch ? [batch] : [];
  const leads = db.prepare(`
    SELECT l.*, u.username extracted_by, le.extraction_date, le.extracted_at
    FROM leads l
    LEFT JOIN lead_extractions le ON l.id=le.lead_id
    LEFT JOIN users u ON le.user_id=u.id
    ${where} ORDER BY l.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), parseInt(offset));
  const total = db.prepare(`SELECT COUNT(*) c FROM leads ${where}`).get(...params).c;
  res.json({ leads, total, page: +page, limit: +limit });
});

router.post('/leads/upload', csvUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const batchName = req.body.batch_name?.trim() || `Batch_${new Date().toISOString().split('T')[0]}`;
  try {
    const lines = fs.readFileSync(req.file.path, 'utf-8').split('\n').filter(l => l.trim());
    const db = getDB();
    const ins = db.prepare('INSERT INTO leads (first_name,middle_name,last_name,address,phone,batch_name) VALUES (?,?,?,?,?,?)');
    let inserted = 0, skipped = 0;
    const firstLine = lines[0].toLowerCase();
    const startIdx = (firstLine.includes('first') || firstLine.includes('name')) ? 1 : 0;

    const runInsert = db.transaction(() => {
      for (const line of lines.slice(startIdx)) {
        const p = parseCSVLine(line);
        const [fn, mn, ln, addr, phone] = p;
        if (!fn && !ln) { skipped++; return; }
        ins.run(fn || '', mn || '', ln || fn || '', addr || '', phone || '', batchName);
        inserted++;
      }
    });
    runInsert();

    fs.unlinkSync(req.file.path);
    res.json({ message: `${inserted} leads imported, ${skipped} rows skipped.`, inserted, skipped, batchName });
  } catch (e) {
    try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ error: e.message });
  }
});

router.delete('/leads/batch/:name', (req, res) => {
  const db = getDB();
  const batchName = decodeURIComponent(req.params.name);
  const count = db.prepare('DELETE FROM leads WHERE batch_name=? AND id NOT IN (SELECT lead_id FROM lead_extractions)').run(batchName).changes;
  res.json({ message: `${count} unextracted leads deleted from batch.` });
});

router.get('/leads/:id', (req, res) => {
  const db = getDB();
  const lead = db.prepare(`
    SELECT l.*,
      u.username AS extracted_by, u.full_name AS extracted_by_name, u.id AS extracted_by_id,
      le.extraction_date, le.extracted_at, le.extraction_period, le.id AS extraction_id
    FROM leads l
    LEFT JOIN lead_extractions le ON l.id = le.lead_id
    LEFT JOIN users u ON le.user_id = u.id
    WHERE l.id = ?
  `).get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(lead);
});

router.put('/leads/:id/assign', (req, res) => {
  const { user_id, period } = req.body;
  const db = getDB();
  const lead = db.prepare('SELECT id FROM leads WHERE id=?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  const today = new Date().toISOString().split('T')[0];
  db.transaction(() => {
    db.prepare('DELETE FROM lead_extractions WHERE lead_id=?').run(req.params.id);
    if (user_id) {
      db.prepare(
        'INSERT INTO lead_extractions (lead_id, user_id, extraction_date, extraction_period, extracted_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(req.params.id, parseInt(user_id), today, parseInt(period) || 1);
    }
  })();
  res.json({ message: user_id ? 'Lead assigned successfully' : 'Lead returned to pool' });
});

router.delete('/leads/:id', (req, res) => {
  getDB().prepare('DELETE FROM leads WHERE id=?').run(req.params.id);
  res.json({ message: 'Lead deleted' });
});

// ─── Reports ─────────────────────────────────────────────────────────────────

router.get('/reports', (req, res) => {
  const reports = getDB().prepare(`
    SELECT rr.*, u.username, u.full_name, l.first_name, l.last_name, l.phone
    FROM report_requests rr JOIN users u ON rr.user_id=u.id
    LEFT JOIN leads l ON rr.lead_id=l.id ORDER BY rr.created_at DESC
  `).all();
  res.json(reports);
});

router.post('/reports/:id/fulfill', reportUpload.single('report'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Report file is required' });
  getDB().prepare(`
    UPDATE report_requests SET status='fulfilled', report_filename=?, report_original_name=?, admin_note=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(req.file.filename, req.file.originalname, req.body.admin_note || '', req.params.id);
  res.json({ message: 'Report fulfilled and delivered to agent' });
});

router.get('/reports/:id/download', (req, res) => {
  const rpt = getDB().prepare('SELECT * FROM report_requests WHERE id=?').get(req.params.id);
  if (!rpt?.report_filename) return res.status(404).json({ error: 'Report not found' });
  const fp = path.join(__dirname, '..', 'uploads', 'reports', rpt.report_filename);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File not found on server' });
  res.download(fp, rpt.report_original_name || rpt.report_filename);
});

// ─── Submissions ─────────────────────────────────────────────────────────────

router.get('/submissions', (req, res) => {
  const submissions = getDB().prepare(`
    SELECT ls.*, u.username, u.full_name, l.first_name, l.last_name
    FROM lead_submissions ls JOIN users u ON ls.user_id=u.id
    LEFT JOIN leads l ON ls.lead_id=l.id ORDER BY ls.created_at DESC
  `).all();
  res.json(submissions);
});

router.put('/submissions/:id/status', (req, res) => {
  const { status, admin_note } = req.body;
  getDB().prepare('UPDATE lead_submissions SET status=?,admin_note=? WHERE id=?').run(status, admin_note || '', req.params.id);
  res.json({ message: 'Status updated' });
});

// ─── IP Management ───────────────────────────────────────────────────────────

router.get('/ips', (req, res) => {
  res.json(getDB().prepare('SELECT * FROM allowed_ips ORDER BY created_at DESC').all());
});

router.post('/ips', (req, res) => {
  const { ip_address, description } = req.body;
  if (!ip_address) return res.status(400).json({ error: 'IP address is required' });
  try {
    const id = getDB().prepare('INSERT INTO allowed_ips (ip_address,description,added_by) VALUES (?,?,?)')
      .run(ip_address.trim(), description || '', req.user.id).lastInsertRowid;
    res.json({ id, message: 'IP added to whitelist' });
  } catch (e) {
    res.status(400).json({ error: e.message.includes('UNIQUE') ? 'IP already in whitelist' : e.message });
  }
});

router.delete('/ips/:id', (req, res) => {
  getDB().prepare('DELETE FROM allowed_ips WHERE id=?').run(req.params.id);
  res.json({ message: 'IP removed from whitelist' });
});

// ─── Settings ────────────────────────────────────────────────────────────────

router.get('/settings', (req, res) => {
  const rows = getDB().prepare('SELECT * FROM settings').all();
  const s = {};
  rows.forEach(r => s[r.key] = r.value);
  res.json(s);
});

router.put('/settings', (req, res) => {
  const db = getDB();
  const upd = db.prepare('INSERT OR REPLACE INTO settings (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP)');
  db.transaction(() => { for (const [k, v] of Object.entries(req.body)) upd.run(k, String(v)); })();
  res.json({ message: 'Settings saved' });
});

// ─── Super Admin: Permanent Delete User ──────────────────────────────────────

router.delete('/users/:id/permanent', (req, res) => {
  const db = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin') return res.status(403).json({ error: 'Cannot permanently delete admin accounts' });
  if (parseInt(req.params.id) === req.user.id) return res.status(403).json({ error: 'Cannot delete your own account' });
  db.transaction(() => {
    db.prepare('DELETE FROM lead_submissions WHERE user_id=?').run(req.params.id);
    db.prepare('DELETE FROM report_requests WHERE user_id=?').run(req.params.id);
    db.prepare('DELETE FROM lead_extractions WHERE user_id=?').run(req.params.id);
    db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  })();
  res.json({ message: `User "${user.full_name}" permanently deleted` });
});

// ─── Super Admin: Reset Any User Password ─────────────────────────────────────

router.put('/users/:id/password', (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });
  const user = getDB().prepare('SELECT id, username FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  getDB().prepare('UPDATE users SET password=? WHERE id=?').run(bcrypt.hashSync(password, 10), req.params.id);
  res.json({ message: `Password for "${user.username}" reset successfully` });
});

// ─── Super Admin: View All Leads for a Specific Agent ─────────────────────────

router.get('/agents/:id/leads', (req, res) => {
  try {
    const db = getDB();
    const leads = db.prepare(`
      SELECT l.*, le.extraction_date, le.extracted_at, le.extraction_period,
        u.username AS agent_username, u.full_name AS agent_name
      FROM lead_extractions le
      JOIN leads l ON le.lead_id = l.id
      JOIN users u ON le.user_id = u.id
      WHERE le.user_id = ?
      ORDER BY le.extracted_at DESC
    `).all(req.params.id);
    const agent = db.prepare('SELECT id, username, full_name FROM users WHERE id=?').get(req.params.id);
    res.json({ agent, leads });
  } catch (err) {
    console.error('Error fetching agent leads:', err.message);
    res.status(500).json({ error: 'Failed to fetch agent leads: ' + err.message });
  }
});

// ─── Super Admin: Force Assign Leads to Any Agent ─────────────────────────────

router.post('/leads/force-extract', (req, res) => {
  const { user_id, count, period } = req.body;
  if (!user_id || !count) return res.status(400).json({ error: 'user_id and count are required' });
  const db = getDB();
  const agent = db.prepare("SELECT id, full_name FROM users WHERE id=? AND role='agent'").get(user_id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const today = new Date().toISOString().split('T')[0];
  const extractPeriod = parseInt(period) || 1;
  const extractCount = Math.min(Math.max(parseInt(count), 1), 200);
  const available = db.prepare(
    'SELECT id FROM leads WHERE id NOT IN (SELECT lead_id FROM lead_extractions) ORDER BY RANDOM() LIMIT ?'
  ).all(extractCount);
  if (!available.length) return res.status(400).json({ error: 'No available leads in the pool' });
  const ins = db.prepare('INSERT INTO lead_extractions (lead_id,user_id,extraction_date,extraction_period) VALUES (?,?,?,?)');
  db.transaction(() => { available.forEach(l => ins.run(l.id, parseInt(user_id), today, extractPeriod)); })();
  res.json({ message: `${available.length} leads force-assigned to ${agent.full_name}`, count: available.length });
});

// ─── Statistics ──────────────────────────────────────────────────────────────

router.get('/stats/agents', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const stats = getDB().prepare(`
    SELECT u.id, u.username, u.full_name, u.is_active,
      COUNT(DISTINCT CASE WHEN strftime('%Y-%m',le.extracted_at)=? THEN le.id END) leads_extracted,
      COUNT(DISTINCT CASE WHEN strftime('%Y-%m',rr.created_at)=? THEN rr.id END) reports_requested,
      COUNT(DISTINCT CASE WHEN strftime('%Y-%m',ls.created_at)=? THEN ls.id END) leads_submitted
    FROM users u
    LEFT JOIN lead_extractions le ON u.id=le.user_id
    LEFT JOIN report_requests rr ON u.id=rr.user_id
    LEFT JOIN lead_submissions ls ON u.id=ls.user_id
    WHERE u.role='agent' GROUP BY u.id ORDER BY leads_extracted DESC
  `).all(month, month, month);
  res.json({ stats, month });
});

module.exports = router;
