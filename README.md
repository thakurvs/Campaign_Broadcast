# Campaign Broadcast - Setup & Run Guide

This guide will help you set up and run the Campaign Broadcast project on your local machine.

---

## Prerequisites (Things You Need Installed)

| Software | Version | Why You Need It |
|----------|---------|-----------------|
| **Node.js** | v18+ | Runs the Next.js application |
| **MySQL** | v8.0+ | Stores users, campaigns, and recipients |
| **Docker Desktop** | Latest | Runs Elasticsearch locally (easiest way) |
| **npm** | Comes with Node.js | Installs packages |

### How to Install Prerequisites

1. **Node.js**: Download from https://nodejs.org (choose LTS version)
2. **MySQL**: Download from https://dev.mysql.com/downloads/mysql/ (choose MySQL Community Server)
   - During install, set a root password (remember it!)
3. **Docker Desktop**: Download from https://www.docker.com/products/docker-desktop/
   - This is needed to run Elasticsearch easily

---

## Step-by-Step Setup

### Step 1: Install Dependencies

Open terminal in the project folder and run:

```bash
npm install
```

This downloads all the libraries the project needs.

---

### Step 2: Configure Environment Variables

Open the file `.env.local` in the project root and update these values:

```env
# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YOUR_ACTUAL_MYSQL_PASSWORD    <-- Change this!
DB_NAME=campaign_broadcast

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# NextAuth.js
NEXTAUTH_SECRET=any-random-string-here-for-security
NEXTAUTH_URL=http://localhost:3000
```

> **Important**: Change `DB_PASSWORD` to whatever password you set during MySQL installation.

---

### Step 3: Start Elasticsearch (using Docker)

Make sure Docker Desktop is running, then run:

```bash
docker-compose up -d
```

This starts Elasticsearch on port 9200. To verify it's running:

```bash
curl http://localhost:9200
```

Or just open http://localhost:9200 in your browser - you should see JSON with cluster info.

> **Note**: First time may take 1-2 minutes to download the Elasticsearch image.

---

### Step 4: Create the Database Tables

*** During MySQL Installation:

-> Choose "Developer Default" or "Server Only" setup type
-> When it asks for a root password — set something simple you'll remember (e.g., root123)
-> Keep the default port: 3306
-> Finish the installer — MySQL will start as a Windows service automatically

After MySQL is installed:
DB_PASSWORD=root123    ← whatever you chose during install

Make sure MySQL is running, then run:

```bash
npm run setup-db
```

This creates the `campaign_broadcast` database and all 3 tables automatically.

You should see:
```
✅ Database 'campaign_broadcast' created
✅ Table 'users' created
✅ Table 'campaigns' created
✅ Table 'campaign_recipients' created
🎉 Database setup complete!
```

---

### Step 5: Start the Application

```bash
npm run dev
```

Open your browser at: **http://localhost:3000**

---

## How to Use the App

### 1. Register an Account
- Go to http://localhost:3000/register
- Fill in name, email, password
- Choose role: **User** (to create campaigns) or **Admin** (to monitor all campaigns)

### 2. Login
- Go to http://localhost:3000/login
- Enter your email and password

### 3. Create a Campaign (User role)
- Click "New Campaign"
- Enter campaign name, message, and paste mobile numbers
- Numbers can be separated by commas, spaces, or new lines
- Duplicates are removed automatically!

### 4. Monitor Campaigns (Admin role)
- Admin dashboard shows ALL campaigns from all users
- Use the search bar (powered by Elasticsearch) to search by name or broadcaster
- Filter by status

### 5. Export Report
- Click "Export" on any campaign to download an Excel file

---

## Stopping the App

1. Press `Ctrl + C` in the terminal running `npm run dev`
2. Stop Elasticsearch: `docker-compose down`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm install` fails | Make sure Node.js is installed: `node --version` |
| Database setup fails | Make sure MySQL is running and password in `.env.local` is correct |
| Elasticsearch won't start | Make sure Docker Desktop is running |
| Login doesn't work | Make sure you registered first, and the database setup completed successfully |
| Search returns error | Elasticsearch might not be running. Check with `docker ps` |
| Port 3000 already in use | Kill the other process or use `npm run dev -- -p 3001` |

---

## Folder Structure

```
Campaign_Broadcast/
├── src/
│   ├── app/                    # All pages and API routes
│   │   ├── api/               # Backend API endpoints
│   │   │   ├── auth/          # Login/session handling
│   │   │   ├── campaigns/     # Campaign CRUD + Export
│   │   │   ├── register/      # User registration
│   │   │   └── search/        # Elasticsearch search
│   │   ├── admin/             # Admin dashboard pages
│   │   ├── dashboard/         # User dashboard pages
│   │   ├── login/             # Login page
│   │   └── register/          # Register page
│   ├── components/            # Reusable UI components
│   ├── lib/                   # Database, ES, auth config
│   └── middleware.js          # Route protection
├── scripts/
│   └── setup-db.js           # Database setup script
├── docker-compose.yml         # Elasticsearch Docker config
├── .env.local                 # Your secret config (don't commit!)
└── package.json               # Project dependencies
```

---

## Tech Stack Summary

| Technology | Purpose |
|-----------|---------|
| Next.js 15 (App Router) | Full-stack React framework |
| JavaScript | Programming language |
| MySQL + mysql2 | Primary database |
| Elasticsearch | Fast search engine |
| NextAuth.js | Authentication (login/sessions) |
| Tailwind CSS | Styling |
| bcryptjs | Password hashing |
| xlsx | Excel export |
| Docker | Run Elasticsearch locally |
