# Campaign Broadcast - Project Flow & Interview Guide

This document explains the entire project in simple terms - what each part does, how data flows, and how to explain it to an interviewer.

---

## What Does This Project Do? (Elevator Pitch)

> "Campaign Broadcast is a full-stack web application where users can send bulk SMS-like campaign messages to multiple mobile numbers. It features user authentication, role-based access (User & Admin), campaign creation with number deduplication, real-time delivery status tracking, Elasticsearch-powered search for admins, and Excel report export."

---

## Tech Stack - What Each Technology Does

| Technology | What It Does | Why We Use It |
|-----------|-------------|---------------|
| **Next.js 15 (App Router)** | Full-stack framework - handles both frontend (React pages) and backend (API routes) | One framework for everything, no need for separate backend |
| **JavaScript** | Programming language for the whole app | Simple and widely known |
| **MySQL** | Relational database - stores all persistent data | Industry standard, structured data with relationships |
| **mysql2** | Node.js driver to talk to MySQL | Lightweight, supports promises, lets us write raw SQL |
| **Elasticsearch** | Search engine - enables fast full-text search | Much faster than MySQL for search queries, supports fuzzy matching |
| **NextAuth.js** | Authentication library - handles login, sessions, JWT tokens | Secure, easy to integrate with Next.js |
| **bcryptjs** | Password hashing library | Never store plain passwords! This hashes them securely |
| **Tailwind CSS** | Utility-first CSS framework | Fast styling without writing custom CSS files |
| **xlsx** | Excel file generation library | Creates downloadable Excel reports |
| **Docker** | Containerization - runs Elasticsearch locally | Easy one-command setup for Elasticsearch |

---

## Database Design (MySQL)

### Tables & Their Relationships

```
┌─────────────┐       ┌──────────────────┐       ┌──────────────────────┐
│   users     │       │   campaigns      │       │  campaign_recipients │
├─────────────┤       ├──────────────────┤       ├──────────────────────┤
│ id (PK)     │──┐    │ id (PK)          │──┐    │ id (PK)              │
│ name        │  │    │ name             │  │    │ campaign_id (FK)     │
│ email       │  └───>│ user_id (FK)     │  └───>│ mobile_number        │
│ password    │       │ message          │       │ status               │
│ role        │       │ status           │       └──────────────────────┘
└─────────────┘       │ created_at       │
                      └──────────────────┘
```

### Relationships Explained:

1. **users → campaigns**: One-to-Many
   - One user can create MANY campaigns
   - Each campaign belongs to ONE user
   - Connected by: `campaigns.user_id` references `users.id`

2. **campaigns → campaign_recipients**: One-to-Many
   - One campaign can have MANY recipients
   - Each recipient belongs to ONE campaign
   - Connected by: `campaign_recipients.campaign_id` references `campaigns.id`

### Why 3 Tables Instead of 2?

> "We use a separate `campaign_recipients` table because it follows proper database normalization. Instead of storing mobile numbers as a comma-separated string in the campaigns table, each number gets its own row. This lets us track individual delivery status (SENT/FAILED/PENDING) per number."

---

## Authentication Flow

```
┌──────────┐     ┌───────────────┐     ┌──────────┐     ┌──────────┐
│  User    │────>│  /register    │────>│ API      │────>│  MySQL   │
│  Browser │     │  page         │     │ /register│     │  (hash)  │
└──────────┘     └───────────────┘     └──────────┘     └──────────┘

┌──────────┐     ┌───────────────┐     ┌──────────┐     ┌──────────┐
│  User    │────>│  /login       │────>│ NextAuth │────>│  MySQL   │
│  Browser │     │  page         │     │ verify   │     │  (check) │
└──────────┘     └───────────────┘     └──────────┘     └──────────┘
                                            │
                                            ▼
                                    ┌──────────────┐
                                    │  JWT Token   │
                                    │  (in cookie) │
                                    └──────────────┘
```

### How It Works:

1. **Registration**: User fills form → password gets hashed with bcrypt → stored in MySQL
2. **Login**: User enters credentials → NextAuth checks email in DB → compares password hash → creates JWT token → stores in browser cookie
3. **Protected Routes**: Middleware checks if JWT token exists and is valid before allowing access
4. **Role Check**: JWT contains `role` field → Admin goes to `/admin`, User goes to `/dashboard`

---

## API Routes - What Each One Does

| Method | Route | Purpose | Who Can Access |
|--------|-------|---------|----------------|
| POST | `/api/register` | Create new user account | Everyone |
| POST | `/api/auth/[...nextauth]` | Handle login/logout/session | Everyone |
| GET | `/api/campaigns` | List campaigns | Logged-in users |
| POST | `/api/campaigns` | Create new campaign | Logged-in users |
| GET | `/api/campaigns/[id]` | Get campaign details + recipients | Owner or Admin |
| GET | `/api/campaigns/[id]/export` | Download Excel report | Owner or Admin |
| GET | `/api/search?q=term&status=X` | Search campaigns via Elasticsearch | Admin only |

---

## Campaign Creation Flow (Most Important Feature)

```
User fills form (name, message, mobile numbers)
         │
         ▼
┌─────────────────────────────┐
│  1. Process Mobile Numbers  │
│  - Split by comma/newline   │
│  - Remove special chars     │
│  - Deduplicate              │
│  - Validate (10-15 digits)  │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  2. Save to MySQL           │
│  - INSERT into campaigns    │
│  - INSERT into recipients   │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  3. Simulate Delivery       │
│  - 90% marked as SENT       │
│  - 10% marked as FAILED     │
│  - Update campaign status   │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  4. Sync to Elasticsearch   │  ← DUAL WRITE
│  - Index campaign summary   │
│  - (id, name, status, etc.) │
└─────────────────────────────┘
```

### Dual Write Pattern Explained:

> "We write data to TWO places: MySQL (primary database - source of truth) and Elasticsearch (for fast search). MySQL stores everything reliably. Elasticsearch only stores summary data for quick searching. If Elasticsearch fails, the app still works - we just can't search."

---

## Search Flow (Elasticsearch)

```
Admin types in search box
         │
         ▼
┌─────────────────────────────┐
│  Frontend sends GET request │
│  /api/search?q=diwali       │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  API builds ES query        │
│  - multi_match on name,     │
│    user_name fields          │
│  - fuzzy matching enabled   │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Elasticsearch returns      │
│  matching campaigns ranked  │
│  by relevance score         │
└─────────────────────────────┘
```

### Why Elasticsearch Instead of MySQL LIKE?

| Feature | MySQL `LIKE '%term%'` | Elasticsearch |
|---------|----------------------|---------------|
| Speed on large data | Slow (full table scan) | Very fast (inverted index) |
| Fuzzy matching | No | Yes ("diwli" finds "diwali") |
| Relevance scoring | No | Yes (ranks results) |
| Full-text search | Basic | Advanced |

---

## Middleware - Route Protection

The `middleware.js` file runs BEFORE every page load:

```
Request comes in
       │
       ▼
Is it a public route? (/login, /register, /) → Allow through
       │ No
       ▼
Does the user have a valid JWT token? → No → Redirect to /login
       │ Yes
       ▼
Is the user trying to access /admin? → Is role ADMIN? → No → Redirect to /dashboard
       │
       ▼
Is the user (ADMIN) trying to access /dashboard? → Redirect to /admin
       │
       ▼
Allow through ✓
```

---

## Export Feature Flow

```
User clicks "Export" button
         │
         ▼
Browser makes GET request to /api/campaigns/[id]/export
         │
         ▼
┌─────────────────────────────┐
│  API fetches campaign data  │
│  + all recipients from MySQL│
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Creates Excel workbook     │
│  Sheet 1: Campaign Summary  │
│  Sheet 2: All Recipients    │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Returns file as download   │
│  Content-Disposition:       │
│  attachment; filename=...   │
└─────────────────────────────┘
         │
         ▼
Browser downloads .xlsx file
```

---

## Key Interview Questions & Answers

### Q: "Why did you use Next.js instead of separate React + Express?"
> "Next.js combines frontend and backend in one project. The App Router gives us file-based routing, server components, and API routes without needing a separate Express server. This simplifies deployment and development."

### Q: "How do you handle password security?"
> "Passwords are NEVER stored in plain text. We use bcryptjs to hash passwords with a salt factor of 10. During login, we compare the entered password's hash against the stored hash using bcrypt.compare()."

### Q: "Why do you use both MySQL and Elasticsearch?"
> "MySQL is our primary database - it's reliable and handles all CRUD operations. Elasticsearch is specifically for search - it provides fast full-text search with fuzzy matching, which would be slow and limited with MySQL LIKE queries. This is called the Dual Write pattern."

### Q: "How does your authentication work?"
> "We use NextAuth.js with the Credentials Provider and JWT strategy. When a user logs in, their credentials are verified against the database. If valid, a JWT token is created containing their user ID and role, stored in an HTTP-only cookie. Our middleware checks this token on every request to protected routes."

### Q: "How do you handle duplicate mobile numbers?"
> "The `processMobileNumbers` utility function splits the raw input by various delimiters, removes special characters, uses JavaScript's Set to eliminate duplicates, then validates each number is between 10-15 digits long. We return stats showing how many duplicates were removed."

### Q: "What is the Dual Write pattern and what are its tradeoffs?"
> "Dual Write means saving data to two different storage systems simultaneously - in our case MySQL and Elasticsearch. The tradeoff is potential inconsistency: if the ES write fails after MySQL succeeds, the data is out of sync. We handle this by making MySQL the source of truth and treating ES failures as non-critical (the search might be slightly stale but the app still works)."

### Q: "How would you scale this application?"
> "For the database: add read replicas for MySQL, or switch to connection pooling services. For Elasticsearch: run a multi-node cluster. For the app: deploy on Vercel or similar platforms that auto-scale. For heavy campaign processing: move to a job queue (like BullMQ) instead of processing synchronously."

---

## Data Flow Diagram (Complete)

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌───────────┐  ┌──────────────┐  ┌───────────────────────────┐│
│  │  Login/   │  │  Dashboard   │  │  Admin Dashboard          ││
│  │  Register │  │  (User)      │  │  (Search + Monitor)       ││
│  └─────┬─────┘  └──────┬───────┘  └────────────┬──────────────┘│
└────────┼────────────────┼───────────────────────┼───────────────┘
         │                │                       │
         ▼                ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API ROUTES (Backend)                          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────┐ │
│  │/register │  │ /campaigns   │  │ /search  │  │  /export   │ │
│  │/auth     │  │ /campaigns/id│  │ (ES)     │  │  (xlsx)    │ │
│  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └─────┬──────┘ │
└───────┼────────────────┼───────────────┼──────────────┼─────────┘
        │                │               │              │
        ▼                ▼               ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐
│    MySQL     │  │    MySQL     │  │     Elasticsearch        │
│  (users)     │  │ (campaigns + │  │  (campaign summaries     │
│              │  │  recipients) │  │   for fast search)       │
└──────────────┘  └──────────────┘  └──────────────────────────┘
```

---

## Features Summary

| Feature | Description | Tech Used |
|---------|-------------|-----------|
| User Registration | Create account with email/password | NextAuth + bcrypt + MySQL |
| Login/Logout | Secure session management | NextAuth JWT |
| Role-Based Access | USER sees own campaigns, ADMIN sees all | Middleware + JWT role |
| Create Campaign | Bulk message to many numbers | MySQL dual-write to ES |
| Number Cleanup | Deduplicate, validate, format numbers | Custom utility function |
| Delivery Simulation | Mock 90% success, 10% failure | Random status assignment |
| Admin Search | Full-text fuzzy search across campaigns | Elasticsearch |
| Export Report | Download campaign data as Excel | xlsx library |
| Per-Recipient Status | Track SENT/FAILED/PENDING per number | campaign_recipients table |

---

## Common Interviewer Follow-ups

1. **"Is this production-ready?"** → No, for production we'd add: rate limiting, input sanitization middleware, proper error boundaries, logging service, actual SMS gateway integration, and database migrations.

2. **"What if Elasticsearch goes down?"** → The app still works for CRUD operations (MySQL is primary). Only the admin search feature would be affected. We could add a fallback to MySQL LIKE queries.

3. **"How would you add real SMS sending?"** → Replace the random simulation with an SMS gateway API (like Twilio or MSG91). Use a job queue to process messages asynchronously and update status via webhooks.

4. **"What about SQL injection?"** → We use parameterized queries (`?` placeholders in mysql2). User input never gets concatenated into SQL strings directly.
