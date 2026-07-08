const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'crm.db');
let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

// Wraps a callback in a BEGIN/COMMIT transaction (compatible with both better-sqlite3 versions)
function transaction(db, fn) {
  const run = db.transaction(fn);
  run();
}

function initDatabase() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL DEFAULT 'agent',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );

    CREATE TABLE IF NOT EXISTS allowed_ips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT UNIQUE NOT NULL,
      description TEXT,
      added_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      middle_name TEXT DEFAULT '',
      last_name TEXT NOT NULL,
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      zipcode TEXT DEFAULT '',
      ssn TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      batch_name TEXT DEFAULT 'Default',
      is_available INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lead_extractions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      lead_id INTEGER NOT NULL UNIQUE,
      extraction_date TEXT NOT NULL,
      extraction_period INTEGER NOT NULL,
      extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );

    CREATE TABLE IF NOT EXISTS report_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      lead_id INTEGER,
      customer_details TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      report_filename TEXT,
      report_original_name TEXT,
      admin_note TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );

    CREATE TABLE IF NOT EXISTS lead_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      lead_id INTEGER,
      submission_details TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      admin_note TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    );
  `);

  // Migration: add new lead fields if they don't exist yet
  const leadCols = db.prepare("PRAGMA table_info(leads)").all().map(c => c.name);
  if (!leadCols.includes('city'))    db.exec("ALTER TABLE leads ADD COLUMN city TEXT DEFAULT ''");
  if (!leadCols.includes('state'))   db.exec("ALTER TABLE leads ADD COLUMN state TEXT DEFAULT ''");
  if (!leadCols.includes('zipcode')) db.exec("ALTER TABLE leads ADD COLUMN zipcode TEXT DEFAULT ''");
  if (!leadCols.includes('ssn'))     db.exec("ALTER TABLE leads ADD COLUMN ssn TEXT DEFAULT ''");

  const ins = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  ins.run('kill_switch', 'false');
  ins.run('leads_per_day', '15');

  // Migration: carry forward any previously configured per-period limit into the new
  // single daily-extraction-window setting, then drop the retired period-based keys.
  const oldLimit = db.prepare("SELECT value FROM settings WHERE key='leads_per_period'").get();
  if (oldLimit) {
    db.prepare("UPDATE settings SET value=? WHERE key='leads_per_day'").run(oldLimit.value);
    db.prepare("DELETE FROM settings WHERE key IN ('leads_per_period','period_split_hour')").run();
  }

  // One-time migration: promote all existing admins to superadmin if no superadmin exists yet
  const superAdminExists = db.prepare("SELECT id FROM users WHERE role = 'superadmin'").get();
  if (!superAdminExists) {
    const promoted = db.prepare("UPDATE users SET role='superadmin' WHERE role='admin'").run();
    if (promoted.changes > 0) {
      console.log(`Migrated ${promoted.changes} admin account(s) to superadmin role.`);
    }
  }

  const adminExists = db.prepare("SELECT id FROM users WHERE role IN ('admin', 'superadmin')").get();
  if (!adminExists) {
    const hash = bcrypt.hashSync('Admin@123', 10);
    db.prepare("INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, 'superadmin')")
      .run('admin', hash, 'System Administrator');
    console.log('Default superadmin created — username: admin | password: Admin@123');
    console.log('IMPORTANT: Change the default password immediately!');
  }

  seedDemoData(db);
  console.log('Database ready.');
}

function seedDemoData(db) {
  const agentCount = db.prepare("SELECT COUNT(*) c FROM users WHERE role='agent'").get().c;
  if (agentCount > 0) return;

  console.log('Seeding demo data…');

  const agents = [
    { username: 'sarahj',   full_name: 'Sarah Johnson'   },
    { username: 'miket',    full_name: 'Mike Thompson'    },
    { username: 'emmad',    full_name: 'Emma Davis'       },
    { username: 'jamesw',   full_name: 'James Wilson'     },
    { username: 'lisac',    full_name: 'Lisa Chen'        },
    { username: 'robertm',  full_name: 'Robert Martinez'  },
    { username: 'amandat',  full_name: 'Amanda Taylor'    },
    { username: 'davidb',   full_name: 'David Brown'      },
  ];

  const insAgent = db.prepare("INSERT OR IGNORE INTO users (username,password,full_name,role) VALUES (?,?,?,?)");
  const agentIds = [];
  const hash = bcrypt.hashSync('Agent@123', 10);
  for (const a of agents) {
    const r = insAgent.run(a.username, hash, a.full_name, 'agent');
    agentIds.push(r.lastInsertRowid);
  }

  const leads = [
    // March 2025 Batch
    ['Robert','James','Anderson','742 Evergreen Terrace, Springfield, IL 62701','(217) 555-0142','March 2025 Batch'],
    ['Jennifer','Lynn','Martinez','1234 Oak Street, Chicago, IL 60601','(312) 555-0183','March 2025 Batch'],
    ['William','Thomas','Brown','456 Maple Avenue, Detroit, MI 48201','(313) 555-0291','March 2025 Batch'],
    ['Patricia','Ann','Davis','789 Pine Road, Columbus, OH 43215','(614) 555-0374','March 2025 Batch'],
    ['Michael','Scott','Johnson','321 Elm Street, Indianapolis, IN 46201','(317) 555-0445','March 2025 Batch'],
    ['Linda','Marie','Wilson','654 Cedar Lane, Louisville, KY 40202','(502) 555-0521','March 2025 Batch'],
    ['David','Ryan','Taylor','987 Birch Boulevard, Memphis, TN 38103','(901) 555-0617','March 2025 Batch'],
    ['Barbara','Jean','Moore','147 Walnut Way, Nashville, TN 37201','(615) 555-0738','March 2025 Batch'],
    ['James','Edward','Jackson','258 Spruce Court, Kansas City, MO 64101','(816) 555-0829','March 2025 Batch'],
    ['Susan','Grace','White','369 Willow Drive, Oklahoma City, OK 73101','(405) 555-0913','March 2025 Batch'],
    ['Richard','Allen','Harris','741 Ash Street, Tulsa, OK 74101','(918) 555-0104','March 2025 Batch'],
    ['Jessica','Nicole','Clark','852 Poplar Avenue, Wichita, KS 67201','(316) 555-0295','March 2025 Batch'],
    ['Thomas','Henry','Lewis','963 Magnolia Lane, Omaha, NE 68101','(402) 555-0386','March 2025 Batch'],
    ['Karen','Ruth','Lee','159 Chestnut Road, Des Moines, IA 50301','(515) 555-0477','March 2025 Batch'],
    ['Mark','Daniel','Walker','357 Hickory Boulevard, Milwaukee, WI 53201','(414) 555-0568','March 2025 Batch'],
    // April 2025 Batch
    ['Christopher','Paul','Hall','246 Elm Court, Minneapolis, MN 55401','(612) 555-0659','April 2025 Batch'],
    ['Nancy','Ellen','Allen','135 Oak Lane, Portland, OR 97201','(503) 555-0741','April 2025 Batch'],
    ['Steven','Craig','Young','468 Maple Street, Denver, CO 80201','(720) 555-0832','April 2025 Batch'],
    ['Betty','Anne','Hernandez','579 Pine Court, Phoenix, AZ 85001','(602) 555-0923','April 2025 Batch'],
    ['George','Wayne','King','681 Cedar Boulevard, San Antonio, TX 78201','(210) 555-0114','April 2025 Batch'],
    ['Dorothy','May','Wright','792 Birch Road, Dallas, TX 75201','(214) 555-0205','April 2025 Batch'],
    ['Kenneth','Lee','Lopez','813 Spruce Way, Houston, TX 77001','(713) 555-0396','April 2025 Batch'],
    ['Ruth','Clare','Hill','924 Walnut Avenue, Austin, TX 78701','(512) 555-0487','April 2025 Batch'],
    ['Brian','Scott','Scott','135 Willow Court, Seattle, WA 98101','(206) 555-0578','April 2025 Batch'],
    ['Sharon','Louise','Green','246 Ash Boulevard, Las Vegas, NV 89101','(702) 555-0669','April 2025 Batch'],
    ['Kevin','James','Adams','357 Poplar Street, Sacramento, CA 95814','(916) 555-0750','April 2025 Batch'],
    ['Helen','Grace','Baker','468 Magnolia Road, San Jose, CA 95101','(408) 555-0841','April 2025 Batch'],
    ['Larry','Dean','Nelson','579 Chestnut Lane, San Francisco, CA 94101','(415) 555-0932','April 2025 Batch'],
    ['Martha','Kay','Carter','681 Hickory Court, San Diego, CA 92101','(619) 555-0123','April 2025 Batch'],
    ['Raymond','Earl','Mitchell','792 Elm Drive, Los Angeles, CA 90001','(213) 555-0214','April 2025 Batch'],
    // May 2025 Batch
    ['Catherine','Rose','Perez','813 Oak Street, Atlanta, GA 30301','(404) 555-0305','May 2025 Batch'],
    ['Harold','Wayne','Roberts','924 Maple Boulevard, Charlotte, NC 28201','(704) 555-0496','May 2025 Batch'],
    ['Diane','Ann','Turner','135 Pine Avenue, Raleigh, NC 27601','(919) 555-0587','May 2025 Batch'],
    ['Wayne','Carl','Phillips','246 Cedar Way, Virginia Beach, VA 23450','(757) 555-0678','May 2025 Batch'],
    ['Judith','Lynn','Campbell','357 Birch Lane, Richmond, VA 23220','(804) 555-0769','May 2025 Batch'],
    ['Roy','Glenn','Parker','468 Spruce Road, Jacksonville, FL 32099','(904) 555-0850','May 2025 Batch'],
    ['Phyllis','Mae','Evans','579 Walnut Street, Tampa, FL 33601','(813) 555-0941','May 2025 Batch'],
    ['Jack','Ray','Edwards','681 Willow Boulevard, Miami, FL 33101','(305) 555-0132','May 2025 Batch'],
    ['Virginia','Jean','Collins','792 Ash Court, Orlando, FL 32801','(407) 555-0223','May 2025 Batch'],
    ['Arthur','Lee','Stewart','813 Poplar Drive, New Orleans, LA 70112','(504) 555-0314','May 2025 Batch'],
    ['Lois','Marie','Sanchez','924 Magnolia Street, Baltimore, MD 21201','(410) 555-0405','May 2025 Batch'],
    ['Joe','Allen','Morris','135 Chestnut Boulevard, Washington, DC 20001','(202) 555-0496','May 2025 Batch'],
    ['Teresa','Ann','Rogers','246 Hickory Lane, Philadelphia, PA 19101','(215) 555-0587','May 2025 Batch'],
    ['Albert','James','Reed','357 Elm Road, Pittsburgh, PA 15219','(412) 555-0678','May 2025 Batch'],
    ['Wanda','Kay','Cook','468 Oak Court, Cleveland, OH 44101','(216) 555-0769','May 2025 Batch'],
  ];

  const insLead = db.prepare('INSERT OR IGNORE INTO leads (first_name,middle_name,last_name,address,phone,batch_name) VALUES (?,?,?,?,?,?)');
  db.transaction(() => { for (const l of leads) insLead.run(...l); })();

  // Assign first 18 leads to agents (6 per agent across 3 agents)
  const leadRows = db.prepare('SELECT id FROM leads ORDER BY id LIMIT 18').all();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const insExt = db.prepare('INSERT OR IGNORE INTO lead_extractions (user_id,lead_id,extraction_date,extraction_period) VALUES (?,?,?,?)');

  db.transaction(() => {
    for (let i = 0; i < Math.min(leadRows.length, agentIds.length > 0 ? 18 : 0); i++) {
      const agentId = agentIds[i % 3];
      const date = i < 9 ? today : yesterday;
      const period = (i % 2) + 1;
      try { insExt.run(agentId, leadRows[i].id, date, period); } catch {}
    }
  })();

  // Report requests
  const rptLeads = db.prepare('SELECT id FROM lead_extractions WHERE user_id=? LIMIT 3').all(agentIds[0]);
  const insRpt = db.prepare("INSERT OR IGNORE INTO report_requests (user_id,lead_id,customer_details,status) VALUES (?,?,?,?)");
  if (agentIds.length > 0) {
    insRpt.run(agentIds[0], rptLeads[0]?.lead_id||null, 'Robert Anderson, DOB 15/03/1975, NI: AB123456C, 742 Evergreen Terrace, Springfield. Phone: (217) 555-0142. Requesting full credit report for loan application.', 'pending');
    insRpt.run(agentIds[0], rptLeads[1]?.lead_id||null, 'Jennifer Martinez, DOB 22/07/1982, NI: CD789012E, 1234 Oak Street, Chicago. Phone: (312) 555-0183. Credit check required before approval.', 'pending');
    insRpt.run(agentIds[1], null, 'William Brown, DOB 08/11/1969, NI: EF345678G, 456 Maple Avenue, Detroit. Phone: (313) 555-0291. Mortgage pre-approval credit assessment needed.', 'pending');
    insRpt.run(agentIds[2], null, 'Patricia Davis, DOB 30/04/1991, NI: GH901234I, 789 Pine Road, Columbus. Phone: (614) 555-0374. Background check and financial history review.', 'pending');
    insRpt.run(agentIds[1], null, 'Michael Johnson, DOB 14/09/1977, NI: IJ567890K. Full credit profile including missed payments and county court judgements.', 'pending');
  }

  // Lead submissions
  const insSub = db.prepare("INSERT OR IGNORE INTO lead_submissions (user_id,lead_id,submission_details,status,admin_note) VALUES (?,?,?,?,?)");
  if (agentIds.length > 0) {
    insSub.run(agentIds[0], rptLeads[2]?.lead_id||null, 'Name: Linda Wilson\nSort Code: 20-14-33\nAccount: 87654321\nCard: 4532 1234 5678 9012 (exp 09/27, CVV 456)\nAvailable Credit: £4,200\nMonthly Income: £2,800', 'pending', '');
    insSub.run(agentIds[1], null, 'Name: David Taylor\nBank: Barclays\nSort Code: 20-45-67\nAccount: 12345678\nCard: 5412 7534 3210 9876 (exp 03/26, CVV 789)\nOverdraft Limit: £1,500\nSalary: £3,400/month', 'processed', 'Forwarded to merchant via Teams. Reference #MT-2025-0441.');
    insSub.run(agentIds[2], null, 'Name: Barbara Moore\nSort Code: 30-91-56\nAccount: 65432187\nCredit Card: 4916 8877 6655 4433 (exp 11/26, CVV 321)\nCredit Limit: £6,800\nEmployer: NHS Trust', 'pending', '');
    insSub.run(agentIds[0], null, 'Name: James Jackson\nBank: HSBC\nSort Code: 40-22-18\nAccount: 98765432\nCard: 5500 0055 5555 4444 (exp 07/28, CVV 654)\nBalance: £12,300\nMonthly Direct Debits: £880', 'processed', 'Processed and sent to merchant. Reference #MT-2025-0398.');
  }

  console.log('Demo data seeded — 8 agents, 45 leads, sample requests/submissions created.');
  console.log('Agent login password: Agent@123');
}

module.exports = { getDB, initDatabase, transaction };
