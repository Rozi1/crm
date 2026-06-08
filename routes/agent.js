const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDB, transaction } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ─── Dashboard ───────────────────────────────────────────────────────────────

router.get('/dashboard', (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];
  const uid = req.user.id;
  const splitHour = parseInt(db.prepare("SELECT value FROM settings WHERE key='period_split_hour'").get()?.value || '12');
  const currentPeriod = new Date().getHours() < splitHour ? 1 : 2;
  const leadsPerPeriod = parseInt(db.prepare("SELECT value FROM settings WHERE key='leads_per_period'").get()?.value || '15');

  const p1 = db.prepare("SELECT COUNT(*) c FROM lead_extractions WHERE user_id=? AND extraction_date=? AND extraction_period=1").get(uid, today).c;
  const p2 = db.prepare("SELECT COUNT(*) c FROM lead_extractions WHERE user_id=? AND extraction_date=? AND extraction_period=2").get(uid, today).c;
  const pendingRpts = db.prepare("SELECT COUNT(*) c FROM report_requests WHERE user_id=? AND status='pending'").get(uid).c;
  const fulfilledRpts = db.prepare("SELECT COUNT(*) c FROM report_requests WHERE user_id=? AND status='fulfilled'").get(uid).c;
  const totalLeads = db.prepare("SELECT COUNT(*) c FROM lead_extractions WHERE user_id=?").get(uid).c;

  res.json({
    today, currentPeriod, leadsPerPeriod, splitHour,
    period1: { extracted: p1, remaining: Math.max(0, leadsPerPeriod - p1) },
    period2: { extracted: p2, remaining: Math.max(0, leadsPerPeriod - p2) },
    pendingReports: pendingRpts,
    fulfilledReports: fulfilledRpts,
    totalLeadsAllTime: totalLeads
  });
});

// ─── Extract Leads ───────────────────────────────────────────────────────────

router.post('/leads/extract', (req, res) => {
  const db = getDB();
  const uid = req.user.id;
  const today = new Date().toISOString().split('T')[0];
  const splitHour = parseInt(db.prepare("SELECT value FROM settings WHERE key='period_split_hour'").get()?.value || '12');
  const currentPeriod = new Date().getHours() < splitHour ? 1 : 2;
  const leadsPerPeriod = parseInt(db.prepare("SELECT value FROM settings WHERE key='leads_per_period'").get()?.value || '15');

  const already = db.prepare("SELECT COUNT(*) c FROM lead_extractions WHERE user_id=? AND extraction_date=? AND extraction_period=?").get(uid, today, currentPeriod).c;
  const remaining = leadsPerPeriod - already;

  if (remaining <= 0) {
    return res.status(400).json({ error: `You have already extracted all ${leadsPerPeriod} leads for this period.`, remaining: 0 });
  }

  const available = db.prepare("SELECT id FROM leads WHERE id NOT IN (SELECT lead_id FROM lead_extractions) LIMIT ?").all(remaining);

  if (available.length === 0) {
    return res.status(400).json({ error: 'No leads are currently available. Please contact your administrator.' });
  }

  const ins = db.prepare('INSERT INTO lead_extractions (user_id,lead_id,extraction_date,extraction_period) VALUES (?,?,?,?)');
  db.transaction(() => { for (const l of available) ins.run(uid, l.id, today, currentPeriod); })();

  res.json({ message: `${available.length} lead(s) extracted successfully.`, count: available.length, remaining: remaining - available.length });
});

// ─── My Leads ────────────────────────────────────────────────────────────────

router.get('/leads', (req, res) => {
  const db = getDB();
  const { date } = req.query;
  let q = `
    SELECT l.id, l.first_name, l.middle_name, l.last_name, l.phone, l.address, l.city, l.state, l.zipcode, l.ssn, le.extraction_date, le.extraction_period, le.extracted_at
    FROM leads l JOIN lead_extractions le ON l.id=le.lead_id WHERE le.user_id=?`;
  const params = [req.user.id];
  if (date) { q += ' AND le.extraction_date=?'; params.push(date); }
  q += ' ORDER BY le.extracted_at DESC';
  res.json(getDB().prepare(q).all(...params));
});

router.get('/leads/:id', (req, res) => {
  const lead = getDB().prepare(`
    SELECT l.id, l.first_name, l.middle_name, l.last_name, l.address, l.city, l.state, l.zipcode, l.ssn, l.phone, le.extraction_date, le.extraction_period, le.extracted_at
    FROM leads l JOIN lead_extractions le ON l.id=le.lead_id WHERE l.id=? AND le.user_id=?
  `).get(req.params.id, req.user.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found or not assigned to you' });
  res.json(lead);
});

// ─── Report Requests ─────────────────────────────────────────────────────────

router.get('/report-requests', (req, res) => {
  res.json(getDB().prepare(`
    SELECT rr.*, l.first_name, l.last_name FROM report_requests rr LEFT JOIN leads l ON rr.lead_id=l.id
    WHERE rr.user_id=? ORDER BY rr.created_at DESC
  `).all(req.user.id));
});

router.post('/report-requests', (req, res) => {
  const { lead_id, customer_details } = req.body;
  if (!customer_details?.trim()) return res.status(400).json({ error: 'Customer details are required' });
  if (lead_id) {
    const owns = getDB().prepare('SELECT 1 FROM lead_extractions WHERE lead_id=? AND user_id=?').get(lead_id, req.user.id);
    if (!owns) return res.status(403).json({ error: 'That lead is not assigned to you' });
  }
  const id = getDB().prepare('INSERT INTO report_requests (user_id,lead_id,customer_details) VALUES (?,?,?)')
    .run(req.user.id, lead_id || null, customer_details.trim()).lastInsertRowid;
  res.json({ id, message: 'Report request submitted successfully' });
});

router.get('/report-requests/:id/download', (req, res) => {
  const rpt = getDB().prepare("SELECT * FROM report_requests WHERE id=? AND user_id=?").get(req.params.id, req.user.id);
  if (!rpt || rpt.status !== 'fulfilled' || !rpt.report_filename) return res.status(404).json({ error: 'Report not available yet' });
  const fp = path.join(__dirname, '..', 'uploads', 'reports', rpt.report_filename);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'File not found' });
  res.download(fp, rpt.report_original_name || rpt.report_filename);
});

// ─── Lead Submissions ────────────────────────────────────────────────────────

router.get('/lead-submissions', (req, res) => {
  res.json(getDB().prepare(`
    SELECT ls.*, l.first_name, l.last_name FROM lead_submissions ls LEFT JOIN leads l ON ls.lead_id=l.id
    WHERE ls.user_id=? ORDER BY ls.created_at DESC
  `).all(req.user.id));
});

router.post('/lead-submissions', (req, res) => {
  const { lead_id, submission_details } = req.body;
  if (!submission_details?.trim()) return res.status(400).json({ error: 'Submission details are required' });
  if (lead_id) {
    const owns = getDB().prepare('SELECT 1 FROM lead_extractions WHERE lead_id=? AND user_id=?').get(lead_id, req.user.id);
    if (!owns) return res.status(403).json({ error: 'That lead is not assigned to you' });
  }
  const id = getDB().prepare('INSERT INTO lead_submissions (user_id,lead_id,submission_details) VALUES (?,?,?)')
    .run(req.user.id, lead_id || null, submission_details.trim()).lastInsertRowid;
  res.json({ id, message: 'Lead submitted successfully' });
});

module.exports = router;
