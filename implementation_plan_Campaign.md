# Campaign Broadcast Platform

This document outlines the step-by-step implementation plan for building the Campaign Broadcast platform. The goal is to build a robust, beginner-friendly application using Next.js 15 (App Router), Javascript, MySQL, Elasticsearch, NextAuth.js, and Tailwind CSS + shadcn/ui.

> [!NOTE]
> The primary focus of this plan is to break down the development process into logical, manageable phases suitable for a beginner while fulfilling all technical requirements, including dual-writes to MySQL and Elasticsearch.

## User Review Required

> [!IMPORTANT]
> - **Database Interaction**: The stack suggestion mentions `mysql2` driver. We can use raw SQL queries with `mysql2` (beginner friendly in terms of learning SQL), or we can use a lightweight query builder / ORM like Prisma or Drizzle which simplifies migrations and typing. For now, the plan uses pure `mysql2` to strictly follow the suggestion. Please confirm if this is preferred.
> - **Elasticsearch Setup**: You will need a running instance of Elasticsearch (e.g., via Docker or Elastic Cloud). Ensure this is available for local development before we begin coding.
> - **Authentication**: NextAuth.js (Auth.js) credentials provider will be used. We will store passwords as hashed strings (e.g., using `bcryptjs`) in the MySQL database.

## Open Questions

- Should users be able to upload a CSV/Excel file for mobile numbers, or just paste them as a comma-separated list in a text area?
- Do you have a preference for the report export format (Excel `.xlsx` via `xlsx` package vs CSV via `json2csv`)?

## Proposed Implementation Phases

### Phase 1: Project Setup & Foundation

- **Next.js Initialization**: Create a Next.js 15 project using the App Router, Javascript, and Tailwind CSS.
- **UI Configuration**: Initialize `shadcn/ui` and set up a clean, professional aesthetic for the dashboards.
- **Database Connection**: Set up the `mysql2` connection pool to communicate with the local MySQL server.
- **Elasticsearch Client**: Configure the `@elastic/elasticsearch` client.
- **Database Tables**:
  We will use three tables. While two tables is the absolute simplest, adding a third table for recipients is the **correct relational database way** to handle bulk numbers and allows you to track if an individual message was delivered or failed (the bonus feature!).
  
  1. `users`:
     - `id` (INT, Primary Key, Auto-increment)
     - `name` (VARCHAR)
     - `email` (VARCHAR, Unique)
     - `password` (VARCHAR)
     - `role` (VARCHAR) - 'ADMIN' or 'USER'
     
  2. `campaigns`:
     - `id` (INT, Primary Key, Auto-increment)
     - `name` (VARCHAR)
     - `message` (TEXT)
     - `status` (VARCHAR) - Overall status (e.g., 'PROCESSING', 'COMPLETED')
     - `user_id` (INT) - Links to the user who created the campaign
     - `created_at` (TIMESTAMP)

  3. `campaign_recipients`:
     - `id` (INT, Primary Key, Auto-increment)
     - `campaign_id` (INT) - Foreign key to `campaigns` table
     - `mobile_number` (VARCHAR)
     - `status` (VARCHAR) - Individual delivery status (e.g., 'PENDING', 'SENT', 'FAILED')
- **Elasticsearch**: The `campaigns` index will only store `id`, `name`, `status`, `user_id`, and `recipientCount` (which we can calculate before saving).

### Phase 2: Authentication & Roles

- **NextAuth.js Integration**: Implement NextAuth.js with the Credentials Provider.
- **Signup/Login Pages**: Build intuitive UI for user registration and login.
- **Role Management**: Implement middleware or layout checks to route Users to `/dashboard` and Admins to `/admin`.

### Phase 3: User Dashboard & Campaign CRUD

- **Campaign Creation**:
  - Build a form for Name, Message, and Mobile Numbers.
  - Implement bulk handling: clean up formatting, deduplicate numbers, and validate them before saving.
- **Data Persistence**:
  - Save the campaign to MySQL.
  - Sync the summary data (e.g., `id`, `name`, `status`, `broadcasterId`, `recipientCount`) to Elasticsearch.
- **Campaign Listing**: Display a table of the user's campaigns with summary counts and status.

### Phase 4: Admin Monitoring & Search

- **Admin Dashboard**: Build a comprehensive view of all campaigns in the system.
- **Elasticsearch Integration**:
  - Implement a search bar using Server Actions/Route Handlers to query Elasticsearch.
  - Allow searching by Campaign Name, Status, and Broadcaster.
- **Campaign Details**: A detailed view showing the recipient breakdown and specific campaign metadata.

### Phase 5: Export Functionality

- **Report Generation**: Use `xlsx` or `json2csv` to format the campaign data.
- **Download Route**: Create a Next.js Route Handler that returns the file as an attachment for downloading.

### Phase 6: Polish & Optional Bonus Features

- Implement filters on the Admin report (e.g., date range, status).
- Mock per-recipient delivery status simulation.
- Enhance UI with smooth transitions and micro-animations.

## Verification Plan

### Automated Tests
- *(Optional based on beginner scope)* We can write basic unit tests for the mobile number deduplication and validation logic.

### Manual Verification
- Register a test Admin and a test User.
- Create a campaign as a User with a large batch of messy/duplicate mobile numbers to verify cleanup and database/ES storage.
- Log in as Admin to verify the new campaign appears and is searchable via Elasticsearch.
- Export the report and verify the Excel/CSV opens cleanly and accurately reflects the database state.
