const express = require('express');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database');
const { checkIP } = require('./middleware/ipCheck');
const { checkKillSwitch } = require('./middleware/killSwitch');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const agentRoutes = require('./routes/agent');

// Ensure required directories exist
['uploads/reports', 'uploads/temp', 'public/admin', 'public/agent'].forEach(d => {
  const p = path.join(__dirname, d);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const app = express();
app.set('trust proxy', 1);

initDatabase();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// IP whitelist check — admin routes bypass the whitelist (agents only)
app.use('/api/agent', checkIP);

// Kill switch blocks agent API routes (admin is unaffected)
app.use('/api/agent', checkKillSwitch);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agent', agentRoutes);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html')));
app.get('/agent', (req, res) => res.sendFile(path.join(__dirname, 'public', 'agent', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  CRM System running at http://localhost:${PORT}`);
  console.log(`${'='.repeat(50)}`);
  console.log(`  Default admin: username=admin | password=Admin@123`);
  console.log(`  IMPORTANT: Change the default password immediately!`);
  console.log(`${'='.repeat(50)}\n`);
});
