# CRM Platform — Complete User Manual

**Version:** 1.0  
**System:** CRM Platform — Agent Management System  
**Last Updated:** 2026-06-05

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [User Accounts & Credentials](#2-user-accounts--credentials)
3. [Logging In](#3-logging-in)
4. [Admin Portal — Full Guide](#4-admin-portal--full-guide)
   - 4.1 Dashboard
   - 4.2 Agents
   - 4.3 Leads
   - 4.4 Report Requests
   - 4.5 Lead Submissions
   - 4.6 IP Whitelist
   - 4.7 Settings
   - 4.8 Statistics
5. [Agent Portal — Full Guide](#5-agent-portal--full-guide)
   - 5.1 Dashboard & Lead Extraction
   - 5.2 My Leads
   - 5.3 Request Report
   - 5.4 Submit Lead
   - 5.5 My History
6. [System Concept Flow](#6-system-concept-flow)
7. [Security Features](#7-security-features)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. System Overview

The CRM Platform is a secure, web-based system designed to manage a team of field agents, distribute customer leads, and track agent activity. It consists of two separate portals:

| Portal | URL | Who Uses It |
|--------|-----|-------------|
| Login Page | `http://localhost:3000/` | Everyone |
| Admin Portal | `http://localhost:3000/admin` | Admins & Super Admins |
| Agent Portal | `http://localhost:3000/agent` | Field Agents |

### Core Roles

| Role | Description |
|------|-------------|
| **Super Admin** | Full system control. Can create admin accounts, reset any password, permanently delete users, force-assign leads, and access all features. |
| **Admin** | Day-to-day operations. Manages agents, uploads leads, fulfils report requests, processes submissions, manages IP whitelist and settings. Cannot create other admin accounts. |
| **Agent** | Field worker. Extracts leads each period, views lead details, requests reports from admin, and submits lead details back to admin. |

---

## 2. User Accounts & Credentials

### Default Super Admin

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `Admin@123` |
| Role | Super Admin |

> **IMPORTANT:** Change this password immediately after first login.

### Demo Agent Accounts (pre-seeded)

All demo agents share the same default password.

| Username | Full Name | Password |
|----------|-----------|----------|
| `sarahj` | Sarah Johnson | `Agent@123` |
| `miket` | Mike Thompson | `Agent@123` |
| `emmad` | Emma Davis | `Agent@123` |
| `jamesw` | James Wilson | `Agent@123` |
| `lisac` | Lisa Chen | `Agent@123` |
| `robertm` | Robert Martinez | `Agent@123` |
| `amandat` | Amanda Taylor | `Agent@123` |
| `davidb` | David Brown | `Agent@123` |

> Demo agents are only created if no agents exist when the server first starts.

### Session Duration

| Role | Session Expires |
|------|----------------|
| Admin / Super Admin | 48 hours |
| Agent | 12 hours |

---

## 3. Logging In

Open your browser and go to `http://localhost:3000`

```
┌─────────────────────────────────────────────────────────────────┐
│  ████████████████████████  │  ┌──────────────────────────────┐  │
│  ██  CRM Platform       ██  │  │  🔒 SECURE SIGN IN           │  │
│  ██  Agent Management   ██  │  │                              │  │
│  ██  System             ██  │  │  Welcome back                │  │
│  ██                     ██  │  │                              │  │
│  ██  ✓ Agent lifecycle  ██  │  │  USERNAME                    │  │
│  ██  ✓ Lead distribution██  │  │  [____________________]      │  │
│  ██  ✓ IP access control██  │  │                              │  │
│  ██  ✓ Analytics        ██  │  │  PASSWORD                    │  │
│  ██                     ██  │  │  [____________________]      │  │
│  ██  2× Period Slots    ██  │  │                              │  │
│  ██  48h Admin Session  ██  │  │  [   Sign In   ]             │  │
│  ██                     ██  │  │                              │  │
│  ████████████████████████  │  │  Your IP: 192.168.1.10       │  │
│                             │  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                LEFT PANEL (brand)    RIGHT PANEL (login form)
```

**Steps to log in:**

1. Enter your **Username** in the first field.
2. Enter your **Password** in the second field.
3. Click **Sign In**.
4. The system automatically redirects:
   - Admins and Super Admins → `/admin` (Admin Portal)
   - Agents → `/agent` (Agent Portal)

**Your IP address** is shown at the bottom of the login form. If the IP Whitelist is active, your IP must be on it for agents to log in.

**Common Login Errors:**

| Error | Cause |
|-------|-------|
| "Invalid credentials" | Wrong username or password |
| "Account is inactive" | Your account was deactivated by admin |
| "System is currently offline" | Admin activated the Kill Switch |
| "Access denied. Your IP address is not authorised" | Your IP is not on the whitelist |

---

## 4. Admin Portal — Full Guide

After logging in as admin/superadmin, you land on the **Admin Portal** at `/admin`.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ SIDEBAR (left)              │  MAIN CONTENT (right)             │
│─────────────────────────────│───────────────────────────────────│
│  CRM Platform               │                                   │
│  Admin Portal               │  [Page Title]                     │
│  ⭐ Super Admin             │  [Page Subtitle]                  │
│─────────────────────────────│                                   │
│  👤 Admin                   │  [Content area changes based      │
│  Administrator              │   on which nav item is active]    │
│─────────────────────────────│                                   │
│  Overview                   │                                   │
│  > Dashboard  ← (active)    │                                   │
│                             │                                   │
│  Management                 │                                   │
│  > Agents                   │                                   │
│  > Leads                    │                                   │
│  > Report Requests  [3]     │                                   │
│  > Lead Submissions [2]     │                                   │
│                             │                                   │
│  Security & Config          │                                   │
│  > IP Whitelist             │                                   │
│  > Settings                 │                                   │
│                             │                                   │
│  Analytics                  │                                   │
│  > Statistics               │                                   │
│─────────────────────────────│                                   │
│  ● System Online            │                                   │
│  [Sign Out]                 │                                   │
└─────────────────────────────────────────────────────────────────┘
```

The red badges (e.g., `[3]`) on Report Requests and Lead Submissions show how many items are pending your attention.

---

### 4.1 Dashboard

The Dashboard is the first screen you see. It gives a live overview of the entire system.

```
┌──────────────────────────────────────────────────────────────────┐
│  Dashboard                    System overview and quick controls  │
│──────────────────────────────────────────────────────────────────│
│                                                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │  TOTAL     │  │  TOTAL     │  │  PENDING   │  │  PENDING   │  │
│  │  AGENTS    │  │  LEADS     │  │  REPORTS   │  │ SUBMISSIONS│  │
│  │            │  │            │  │            │  │            │  │
│  │    8       │  │    45      │  │    5       │  │    3       │  │
│  │ Click to   │  │ Click to   │  │ Click to   │  │ Click to   │  │
│  │  manage →  │  │  manage →  │  │  review →  │  │ process →  │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│                                                                    │
│  Active Agents: 8  |  Assigned Leads: 18  |  Available: 27       │
│  Extracted Today: 9  |  Reports Fulfilled: 2  |  Processed: 2    │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ 🔔 Pending Actions Required  [5]              [Refresh]      │ │
│  │──────────────────────────────────────────────────────────────│ │
│  │ 📄 REPORT  Sarah Johnson — Robert Anderson     5 min ago     │ │
│  │ 📬 SUBMIT  Mike Thompson — David Taylor        2 hrs ago     │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ✅ System Online — agents can log in                         │ │
│  │                               [  Disable System  ]           │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ℹ Your IP address: 192.168.1.10                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Dashboard Elements:**

- **Hero Cards (top row):** Large clickable cards. Click any card to jump directly to that section.
- **Mini Stat Cards (second row):** Show active agents, assigned/available leads, today's extractions, fulfilled reports, and processed submissions.
- **Pending Actions Panel:** Shows all pending report requests and lead submissions in one place with quick-action buttons.
- **Kill Switch Box:** Toggle to instantly disable or re-enable all agent access.
- **Your IP:** Shows the IP address your browser is connecting from.

---

### 4.2 Agents

Manage all agent accounts. Click **Agents** in the sidebar.

```
┌──────────────────────────────────────────────────────────────────┐
│  Agents                        Manage agent accounts and access   │
│──────────────────────────────────────────────────────────────────│
│  [+ Add Agent]  [↺ Refresh]                                       │
│                                                                    │
│  Agent        Username  Status    Last Login   Leads  Rpts  Subs  │
│  ──────────── ───────── ───────── ──────────── ────── ───── ───── │
│  SJ Sarah J.  sarahj    ● Active  1 Jun 2026     6      2     2   │
│  MT Mike T.   miket     ● Active  2 Jun 2026     6      1     2   │
│  ED Emma D.   emmad     ● Active  Never          6      1     1   │
│  ...                                                               │
│                                                                    │
│  Actions: [Edit]  [View Leads]  [Deactivate]  [Delete*]          │
│                                           * Super Admin only       │
└──────────────────────────────────────────────────────────────────┘
```

**Actions available:**

| Button | Who Can Use | What It Does |
|--------|-------------|--------------|
| **Add Agent** | Admin & Super Admin | Opens modal to create a new agent account |
| **Edit** | Admin & Super Admin | Edit full name, active status, reset password |
| **View Leads** | Admin & Super Admin | See all leads assigned to this specific agent |
| **Deactivate** | Admin & Super Admin | Disables the agent's login (soft delete) |
| **Delete (Permanent)** | Super Admin only | Permanently deletes agent and all their data |

**How to Add a New Agent:**

1. Click **+ Add Agent**.
2. Fill in:
   - **Username** (must be unique)
   - **Full Name**
   - **Password**
   - **Role** — Super Admin can choose agent, admin, or superadmin; Admin can only create agents
3. Click **Create User**.

**How to Edit an Agent:**

1. Find the agent in the table, click **Edit**.
2. Update the Full Name, Active status, or set a new password.
3. Click **Save**.

**Note on roles (Super Admin only):** Only a Super Admin can create or manage other admin-level accounts.

---

### 4.3 Leads

Manage the lead pool — upload batches, view assignments, reassign leads.

```
┌──────────────────────────────────────────────────────────────────┐
│  Leads             Manage lead pool — upload CSV, view all       │
│──────────────────────────────────────────────────────────────────│
│  [↑ Upload CSV]  [Batch: All Batches ▼]  [↺ Refresh]            │
│  Showing 45 leads (27 available, 18 assigned)                    │
│                                                                    │
│  Name            Phone          Address         Batch     Status  │
│  ─────────────── ────────────── ─────────────── ───────── ─────── │
│  Robert Anderson (217) 555-0142 742 Evergreen.. Mar 2025  Assigned│
│                                                 → sarahj          │
│  Jennifer Marti. (312) 555-0183 1234 Oak St..   Mar 2025  Assigned│
│  William Brown   (313) 555-0291 456 Maple Ave.. Mar 2025  Avail. │
│  ...                                                               │
│                                                                    │
│  Actions per lead: [Manage]  [Delete]                             │
│  Batch actions: [Delete Unextracted Leads from Batch]             │
│                                                                    │
│  < Prev  Page 1 of 1  Next >                                      │
└──────────────────────────────────────────────────────────────────┘
```

**How to Upload Leads (CSV):**

1. Click **↑ Upload CSV**.
2. Enter a **Batch Name** (e.g., "June 2026 Batch"). If left blank, today's date is used.
3. Click **Choose File** and select your CSV file.
4. Click **Upload**.

**CSV Format:**

```
first_name, middle_name, last_name, address, phone
Robert, James, Anderson, "742 Evergreen Terrace, Springfield IL", (217) 555-0142
Jennifer, Lynn, Martinez, "1234 Oak Street, Chicago IL", (312) 555-0183
```

- The first row is treated as a header and skipped if it contains the word "first" or "name".
- Up to 50 MB file size supported.

**Batch Management:**

- Use the **Batch filter dropdown** to view leads from one specific batch.
- Click **Delete Unextracted Leads from Batch** (visible per batch) to remove only leads that haven't been assigned to any agent yet. Assigned leads are protected.

**Managing a Single Lead:**

Click **Manage** on any lead row to open the Lead Management modal:

```
┌──────────────────────────────────────────┐
│  Manage Lead — Robert Anderson           │
│──────────────────────────────────────────│
│  Name: Robert James Anderson             │
│  Phone: (217) 555-0142                   │
│  Address: 742 Evergreen Terrace...       │
│  Batch: March 2025 Batch                 │
│  Currently assigned to: sarahj           │
│                                          │
│  Reassign to: [Select Agent ▼]           │
│  Period:      [Period 1 ▼]               │
│                                          │
│  [Return to Pool]  [Assign]              │
└──────────────────────────────────────────┘
```

- **Assign** — Assign the lead to a different agent.
- **Return to Pool** — Remove the current assignment; lead becomes available again.

---

### 4.4 Report Requests

Agents submit report requests asking admin to pull a credit/background report. Admin fulfils them by uploading a file.

```
┌──────────────────────────────────────────────────────────────────┐
│  Report Requests       Review agent requests and upload reports   │
│──────────────────────────────────────────────────────────────────│
│  [↺ Refresh]                                                      │
│  [All]  [Pending]  [Fulfilled]   ← filter tabs                   │
│                                                                    │
│  Agent       Customer Details              Status    Actions       │
│  ─────────── ──────────────────────────── ───────── ──────────── │
│  sarahj      Robert Anderson, DOB 15/...  ⏳ pending [Fulfil]    │
│  sarahj      Jennifer Martinez, DOB...    ⏳ pending [Fulfil]    │
│  miket       William Brown, DOB 08/11...  ✅ fulfilled [Download] │
└──────────────────────────────────────────────────────────────────┘
```

**How to Fulfil a Report Request:**

1. Find a **pending** request, click **Fulfil**.
2. A modal opens showing the customer details the agent submitted.
3. Upload the report file (PDF, DOCX, or any format).
4. Optionally add an **Admin Note**.
5. Click **Upload & Fulfil**.

The agent will see a download button on their side immediately.

**Viewing a Fulfilled Report:**

Click **Download** next to any fulfilled report to download the file that was uploaded.

---

### 4.5 Lead Submissions

Agents submit lead details (financial/banking information) to admin. Admin reviews and marks them as processed.

```
┌──────────────────────────────────────────────────────────────────┐
│  Lead Submissions          Review details submitted by agents     │
│──────────────────────────────────────────────────────────────────│
│  [↺ Refresh]                                                      │
│  [All]  [Pending]  [Processed]                                    │
│                                                                    │
│  Agent    Lead          Details Preview      Status     Actions   │
│  ──────── ───────────── ──────────────────── ────────── ───────── │
│  sarahj   Linda Wilson  Name: Linda Wilson\n ⏳ pending  [Review] │
│  miket    David Taylor  Name: David Taylor\n ✅ processed [View]  │
└──────────────────────────────────────────────────────────────────┘
```

**How to Process a Submission:**

1. Click **Review** on a pending submission.
2. The full submission text is shown (name, sort code, account, card details, etc.).
3. Set the **Status** to `processed`.
4. Add an optional **Admin Note** (e.g., reference number).
5. Click **Update Status**.

---

### 4.6 IP Whitelist

Control which IP addresses agents are allowed to connect from. **Admin access is never blocked by the IP whitelist** — only agent API calls are checked.

```
┌──────────────────────────────────────────────────────────────────┐
│  IP Whitelist             Only whitelisted IPs can access system  │
│──────────────────────────────────────────────────────────────────│
│  🔒 Your current IP: 192.168.1.10                                 │
│  [+ Add IP]  [↺ Refresh]                                          │
│                                                                    │
│  ⚠ When the list is EMPTY, all IPs are allowed (setup mode).     │
│    Add your own IP first to avoid locking yourself out.          │
│                                                                    │
│  IP Address       Description       Added          Actions        │
│  ──────────────── ───────────────── ────────────── ────────────── │
│  192.168.1.10     Office main PC    5 Jun 2026     [Remove]       │
│  10.0.0.5         Agent PC #1       4 Jun 2026     [Remove]       │
└──────────────────────────────────────────────────────────────────┘
```

**How to Add an IP:**

1. Click **+ Add IP**.
2. Enter the IP address (e.g., `192.168.1.50`).
3. Optionally add a description (e.g., "Sarah's laptop").
4. Click **Add IP**.

**Important Rules:**

- If the whitelist is **empty** → all IPs can connect (setup/open mode).
- Once you add **any** IP → only those IPs can connect for agents.
- **Always add your own IP first** before adding any others, or you may lock agents out.
- Admin portal is **never affected** by the IP whitelist.

---

### 4.7 Settings

Configure system-wide behaviour.

```
┌──────────────────────────────────────────────────────────────────┐
│  Settings                   Configure system behaviour & limits   │
│──────────────────────────────────────────────────────────────────│
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Kill Switch                                                   │ │
│  │ Instantly disable all agent access to the system             │ │
│  │                                    [  Disable System  ]      │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Lead Extraction Limits                                        │ │
│  │                                                               │ │
│  │  Leads per Period: [15]     Period Split Hour: [12]          │ │
│  │                                                               │ │
│  │  Period 1 = midnight to split hour                           │ │
│  │  Period 2 = split hour to midnight                           │ │
│  │  Agents can extract N leads in each period.                  │ │
│  │                                                               │ │
│  │  [✓ Save Settings]                                           │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ⚡ Force Extract Leads  (Super Admin only)                    │ │
│  │                                                               │ │
│  │  Target Agent: [Select agent ▼]   Period: [Period 1 ▼]       │ │
│  │  Number of Leads: [10]                                        │ │
│  │                            [⚡ Force Extract Now]             │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Setting Descriptions:**

| Setting | Default | Description |
|---------|---------|-------------|
| Kill Switch | Off | When ON, all agents are blocked from logging in or making any requests |
| Leads per Period | 15 | Maximum number of leads an agent can extract in one period |
| Period Split Hour | 12 (noon) | The hour (0–23) that divides the AM and PM periods |

**Kill Switch:**

- Click **Disable System** to turn it ON (blocks all agents).
- Click **Enable System** to turn it OFF (agents can log in again).
- The sidebar footer shows a green/red indicator of current status.
- Agents who are already logged in will see a "System Offline" screen on their next action.

**Force Extract Leads (Super Admin only):**

This bypasses the normal per-period limits and directly assigns leads to an agent.

1. Select the target **Agent** from the dropdown.
2. Select which **Period** to assign for.
3. Enter the **number of leads** (1–200).
4. Click **Force Extract Now**.

---

### 4.8 Statistics

Monthly performance report per agent.

```
┌──────────────────────────────────────────────────────────────────┐
│  Agent Statistics           Monthly performance tracking          │
│──────────────────────────────────────────────────────────────────│
│  Month: [June 2026 ▼]   [📊 Load Stats]                          │
│                                                                    │
│  Agent          Username  Status    Extracted  Reports  Submitted  │
│  ────────────── ───────── ───────── ─────────── ─────── ──────── │
│  Sarah Johnson  sarahj    ● Active       12        2        2     │
│  Mike Thompson  miket     ● Active        9        1        2     │
│  Emma Davis     emmad     ● Active        6        1        1     │
│  James Wilson   jamesw    ● Active        0        0        0     │
│  Lisa Chen      lisac     ● Active        0        0        0     │
└──────────────────────────────────────────────────────────────────┘
```

1. Select the month using the month picker.
2. Click **Load Stats**.
3. The table shows per-agent counts for that month:
   - **Leads Extracted** — how many leads they pulled
   - **Reports Requested** — how many report requests submitted
   - **Leads Submitted** — how many lead submissions made

---

## 5. Agent Portal — Full Guide

After logging in as an agent, you land on the **Agent Portal** at `/agent`.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ SIDEBAR (left)              │  MAIN CONTENT (right)             │
│─────────────────────────────│───────────────────────────────────│
│  CRM Platform               │                                   │
│  Agent Portal               │  [Page Title]                     │
│─────────────────────────────│                                   │
│  👤 Sarah Johnson           │  [Content area changes based      │
│  Field Agent                │   on which nav item is active]    │
│─────────────────────────────│                                   │
│  Overview                   │                                   │
│  > Dashboard  ← (active)    │                                   │
│                             │                                   │
│  My Work                    │                                   │
│  > My Leads                 │                                   │
│  > Request Report           │                                   │
│  > Submit Lead              │                                   │
│                             │                                   │
│  Records                    │                                   │
│  > My History               │                                   │
│─────────────────────────────│                                   │
│  [Sign Out]                 │                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5.1 Dashboard & Lead Extraction

The agent dashboard shows today's lead extraction status and key stats.

```
┌──────────────────────────────────────────────────────────────────┐
│  My Dashboard                    Thursday, 5 June 2026           │
│──────────────────────────────────────────────────────────────────│
│  ┌────────────────────────┐  ┌────────────────────────┐         │
│  │ Period 1 — Morning  AM │  │ Period 2 — Afternoon PM │         │
│  │                        │  │                         │         │
│  │   15  / 15 leads       │  │   0   / 15 leads        │         │
│  │  All leads extracted!  │  │  15 remaining           │         │
│  │  ████████████████ 100% │  │  ░░░░░░░░░░░░░░░░  0%  │         │
│  │                        │  │                         │         │
│  │  ✅ All Leads Extracted │  │  [ Extract 15 Leads Now]│         │
│  └────────────────────────┘  └────────────────────────┘         │
│                                                                    │
│    Leads All Time: 21      Pending Reports: 2    Fulfilled: 1    │
│                                                                    │
│  ✅ You have 1 fulfilled report(s) ready to download in History.  │
│                                                                    │
│  ℹ How it works: Click Extract in each period to receive your    │
│    leads for that slot. View leads in My Leads. Use Request      │
│    Report to ask admin for a credit report, or Submit Lead to    │
│    send banking details.                                          │
└──────────────────────────────────────────────────────────────────┘
```

**Period System:**

The day is split into two periods by the admin-configured split hour (default: 12 noon):

| Period | Time Window | Badge |
|--------|-------------|-------|
| Period 1 | Midnight → noon | AM |
| Period 2 | Noon → midnight | PM |

**Extracting Leads:**

1. During the **current period**, the Extract button is blue and active.
2. Click **Extract N Leads Now**.
3. The system assigns up to the configured number of leads (default: 15) to you.
4. Each lead is unique — once a lead is assigned to any agent, it cannot be assigned to another.
5. After extraction, the button turns green and shows "All Leads Extracted".

**Rules:**

- You can only extract during the current period.
- The other period button shows "Available in morning/afternoon period" and is greyed out.
- If you've already extracted all leads for the current period, you must wait for the next period.
- If no leads are available in the pool, you'll see an error asking you to contact your administrator.

---

### 5.2 My Leads

View all leads assigned to you. Click **My Leads** in the sidebar.

```
┌──────────────────────────────────────────────────────────────────┐
│  My Leads                          Click any lead to view details │
│──────────────────────────────────────────────────────────────────│
│  [Date: 05/06/2026]  [Show All]  [↺ Refresh]                     │
│                                                                    │
│  #   Lead Name           Period    Extracted    Action            │
│  ─── ─────────────────── ───────── ──────────── ─────────────── │
│  1   RA Robert Anderson  Period 1  05/06/2026   [👁 View]         │
│  2   JM Jennifer Marti.  Period 1  05/06/2026   [👁 View]         │
│  3   WB William Brown    Period 1  05/06/2026   [👁 View]         │
│  ...                                                               │
└──────────────────────────────────────────────────────────────────┘
```

**Filtering by Date:**

- Use the date picker to show only leads extracted on a specific day.
- Click **Show All** to see all your leads across all dates.

**Viewing Lead Details:**

Click any row or the **View** button to open the Lead Details modal:

```
┌──────────────────────────────────┐
│  Lead Details              [✕]   │
│──────────────────────────────────│
│  ℹ Lead #1 · Period 1            │
│                                  │
│  FULL NAME                       │
│  Robert James Anderson           │
│                                  │
│  PHONE NUMBER                    │
│  (217) 555-0142                  │
│                                  │
│  HOME ADDRESS                    │
│  742 Evergreen Terrace,          │
│  Springfield, IL 62701           │
│                                  │
│  Extracted 05/06/2026            │
│  · Copying is disabled           │
└──────────────────────────────────┘
```

> **Note:** Lead details are copy-protected. Right-click, Ctrl+C, and text selection are disabled within the lead modal to protect the data.

---

### 5.3 Request Report

Ask the admin to pull a credit or background report for a customer. Click **Request Report**.

```
┌──────────────────────────────────────────────────────────────────┐
│  Request Report      Submit customer details — admin will upload  │
│──────────────────────────────────────────────────────────────────│
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ 📄 New Report Request                                         │ │
│  │                                                               │ │
│  │  SELECT LEAD (optional)                                       │ │
│  │  [— Not linked to a specific lead — ▼]                       │ │
│  │                                                               │ │
│  │  CUSTOMER DETAILS                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐    │ │
│  │  │ Enter customer details: full name, home address,     │    │ │
│  │  │ date of birth, phone number, National Insurance      │    │ │
│  │  │ number…                                              │    │ │
│  │  │                                                      │    │ │
│  │  └──────────────────────────────────────────────────────┘    │ │
│  │  0 characters                                                 │ │
│  │                                                               │ │
│  │  [ ✈ Send to Admin ]                                         │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**How to submit a report request:**

1. Optionally select a **lead** from the dropdown to link this request to one of your assigned leads.
2. Fill in the **Customer Details** text box — include full name, date of birth, address, phone, and NI number.
3. Click **Send to Admin**.
4. You'll see a success message. The admin will process it and upload the report.
5. When the report is ready, you'll see a notification on the Dashboard and can download it from **My History**.

---

### 5.4 Submit Lead

Submit customer details (e.g., banking information) to the admin for processing. Click **Submit Lead**.

```
┌──────────────────────────────────────────────────────────────────┐
│  Submit Lead          Submit lead details to admin for processing │
│──────────────────────────────────────────────────────────────────│
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ✈ Lead Submission                                            │ │
│  │                                                               │ │
│  │  SELECT LEAD (optional)                                       │ │
│  │  [— Not linked to a specific lead — ▼]                       │ │
│  │                                                               │ │
│  │  SUBMISSION DETAILS                                           │ │
│  │  ┌──────────────────────────────────────────────────────┐    │ │
│  │  │ Enter the customer details: card information, bank   │    │ │
│  │  │ details, account numbers, and any other relevant     │    │ │
│  │  │ information…                                         │    │ │
│  │  │                                                      │    │ │
│  │  └──────────────────────────────────────────────────────┘    │ │
│  │  0 characters                                                 │ │
│  │                                                               │ │
│  │  [ ✈ Submit to Admin ]                                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**How to submit:**

1. Optionally link to one of your leads using the dropdown.
2. Type all the relevant customer details in the text box.
3. Click **Submit to Admin**.
4. The admin will see the submission and can mark it as processed with a reference note.
5. You can check the status in **My History → Lead Submissions**.

---

### 5.5 My History

Track all your past report requests and lead submissions. Click **My History**.

```
┌──────────────────────────────────────────────────────────────────┐
│  My History             Track your report requests and submissions │
│──────────────────────────────────────────────────────────────────│
│  [Report Requests]  [Lead Submissions]   ← switch tabs           │
│                                                                    │
│  ── Report Requests tab ──────────────────────────────────────── │
│  Date        Lead           Details          Status    Action     │
│  ──────────── ────────────── ──────────────── ─────── ─────────── │
│  05/06/2026  Robert Ander.  Robert Anderson,  pending  Awaiting   │
│  04/06/2026  Jennifer Mart  Jennifer Martine  pending  Awaiting   │
│  03/06/2026  —              William Brown...  fulfilled [↓ Download]│
│                                                                    │
│  ── Lead Submissions tab ─────────────────────────────────────── │
│  Date        Lead           Status      Admin Note                 │
│  ──────────── ────────────── ─────────── ─────────────────────── │
│  05/06/2026  Linda Wilson   pending     —                         │
│  04/06/2026  David Taylor   processed   Forwarded. Ref #MT-441    │
└──────────────────────────────────────────────────────────────────┘
```

**Report Requests tab:**

| Status | Meaning | Action Available |
|--------|---------|-----------------|
| `pending` | Admin hasn't fulfilled it yet | "Awaiting admin" (no action) |
| `fulfilled` | Admin uploaded the report | **Download** button appears |

Click **Download** to save the fulfilled report file to your computer.

**Lead Submissions tab:**

| Status | Meaning |
|--------|---------|
| `pending` | Admin has not processed it yet |
| `processed` | Admin marked it done; check the Admin Note column for a reference |

---

## 6. System Concept Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPLETE SYSTEM FLOW                          │
└─────────────────────────────────────────────────────────────────┘

  ADMIN SETUP
  ──────────
  1. Admin uploads CSV file of leads → they go into the lead pool
  2. Admin configures: leads per period, period split hour
  3. Admin creates agent accounts (username + password)
  4. Admin optionally sets IP whitelist


  AGENT DAILY WORKFLOW
  ─────────────────────
  Morning (Period 1):
    Agent logs in → clicks Extract → gets up to N leads assigned
    Agent works the leads (calls customers, gathers info)

  Afternoon (Period 2):
    Agent clicks Extract again → gets another N leads
    Agent works the afternoon leads

  For each lead, agent can:
    a) Request a credit/background report:
       Agent → fills in customer info → Admin pulls report → Admin uploads PDF → Agent downloads

    b) Submit banking/financial details:
       Agent → types card/bank info → Admin sees it → Admin marks processed


  ADMIN DAILY WORKFLOW
  ─────────────────────
  Admin checks Dashboard → sees pending reports + submissions badge counts
  Admin goes to Report Requests → uploads fulfilled report files
  Admin goes to Lead Submissions → reviews submitted details, marks processed
  Admin monitors Statistics → checks agent performance per month


  SECURITY LAYER (at every step)
  ───────────────────────────────
  Agent request arrives
        │
        ▼
  [1] IP Whitelist?  →  IP not in list → BLOCKED (403)
        │ pass
        ▼
  [2] Kill Switch?   →  Switch is ON  → BLOCKED (503)
        │ pass
        ▼
  [3] JWT Token?     →  No/expired    → BLOCKED (401)
        │ valid
        ▼
  [4] Role check?    →  Wrong role    → BLOCKED (403)
        │ correct role
        ▼
       ACTION ALLOWED
```

---

## 7. Security Features

### JWT Authentication
All API requests require a Bearer token obtained at login. Tokens auto-expire (48h admin, 12h agent). Invalid or expired tokens redirect to the login page automatically.

### Role-Based Access Control

| Feature | Agent | Admin | Super Admin |
|---------|-------|-------|-------------|
| Extract leads | ✅ | ✗ | ✗ |
| View own leads | ✅ | ✗ | ✗ |
| Submit reports/leads | ✅ | ✗ | ✗ |
| Manage all agents | ✗ | ✅ | ✅ |
| Upload leads (CSV) | ✗ | ✅ | ✅ |
| Fulfil report requests | ✗ | ✅ | ✅ |
| Process submissions | ✗ | ✅ | ✅ |
| IP Whitelist management | ✗ | ✅ | ✅ |
| Kill switch control | ✗ | ✅ | ✅ |
| System settings | ✗ | ✅ | ✅ |
| Create admin accounts | ✗ | ✗ | ✅ |
| Permanently delete users | ✗ | ✗ | ✅ |
| Reset any user's password | ✗ | ✗ | ✅ |
| Force-assign leads | ✗ | ✗ | ✅ |

### IP Whitelist
- Only agent-facing API routes (`/api/agent/*`) are checked.
- Admin portal is always accessible regardless of IP.
- **Empty list = open mode** (no restrictions, suitable for setup).
- Once any IP is added, only whitelisted IPs can access agent routes.

### Kill Switch
- A single toggle that instantly blocks all agent logins and requests.
- Agents who are already logged in see a "System Offline" screen on their next API call.
- Admin is completely unaffected.

### Lead Copy Protection
Lead details shown in the agent portal are protected:
- Text selection is disabled.
- Right-click context menu is blocked.
- Ctrl+C, Ctrl+A, Ctrl+S, Ctrl+P are blocked while the lead modal is open.
- Drag-and-drop is disabled.

---

## 8. Troubleshooting

### Agent Cannot Log In

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "Invalid credentials" | Wrong username/password | Reset password from Admin → Agents → Edit |
| "Account is inactive" | Account was deactivated | Admin → Agents → Edit → set Active = Yes |
| "System is currently offline" | Kill switch is ON | Admin → Settings or Dashboard → Enable System |
| "Access denied" | IP not whitelisted | Admin → IP Whitelist → Add agent's IP |

### Agent Cannot Extract Leads

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Button says "Available in morning period" | It's the wrong period | Wait for the correct time period |
| Button says "All Leads Extracted" | Already extracted this period | Wait for the next period |
| "No leads currently available" | Lead pool is empty | Admin must upload more leads via CSV |
| Button is greyed out with no explanation | Kill switch is ON | Admin must enable the system |

### Admin Cannot See Reports/Submissions

This usually means no agents have submitted anything yet. Check:
1. Agents are active and can log in.
2. Agents have extracted leads.
3. Agents have used "Request Report" or "Submit Lead".

### Password Recovery

- Agents cannot reset their own passwords.
- **Admin** can reset any agent's password: Agents section → Edit → set new password.
- **Super Admin** can reset any user's password including other admins: Agents section → Edit.
- If the Super Admin password is lost and you have server access, restart the server — if no superadmin exists, a new default account (`admin` / `Admin@123`) is created automatically.

### Server Won't Start

1. Make sure Node.js is installed: `node --version`
2. Install dependencies: `npm install`
3. Run: `node server.js` or double-click `START_CRM.bat`
4. Open browser at `http://localhost:3000`

---

*© 2026 CRM Platform — Agent Management System*
