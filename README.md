# Fresh Starter (same stack as ngo-management)

A clean, generic full-stack starter using the same tech stack as your NGO
management project, with all domain-specific code removed.

## Stack

**Client** — React 18 + TypeScript + Vite + Tailwind CSS + Zustand +
React Router + React Hook Form + Zod + Axios

**Server** — Express + TypeScript + PostgreSQL (`pg`) + Redis (`ioredis`) +
Passport (JWT) + bcrypt + Zod validation + Pino logging

## What's included

- JWT auth (register / login / protected routes) end to end
- A minimal dashboard shell (sidebar + topbar layout) you can build into
- PostgreSQL connection pool + a `users` table bootstrap script
- Redis client wired up (session/cache use is up to you)
- Centralized error handling, request logging, and env validation
- Sensible `.gitignore`, `.env.example`, and lint configs

## What's intentionally left out

Everything NGO-specific: beneficiaries, donations, stock, branches,
volunteers, reports, the huge UI kit (charts, calendars, rich text editor,
PDF export, etc.). Add only the libraries your new project actually needs.

## Database & pgAdmin Setup (Without Docker)

### 1. Create the Database in pgAdmin:
1. Open your **pgAdmin** application and connect to your local PostgreSQL server.
2. In the left browser tree, right-click **Databases** > **Create** > **Database...**
3. Enter Database name: `crm_db` and click **Save**.

### 2. Run the Schema Script:
1. Right-click on your new **`crm_db`** database > select **Query Tool**.
2. Open or copy the contents of [`server/schema.sql`](file:///d:/CRM/server/schema.sql) into the Query Tool.
3. Click the **Execute/Run (F5)** button to create the tables, indexes, and initial admin record.

### 3. Configure Server Environment:
Ensure [`server/.env`](file:///d:/CRM/server/.env) matches your local pgAdmin / PostgreSQL credentials:
```env
# Change username/password if different in your local pgAdmin
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/crm_db
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=crm_db
```

---

## Getting started

### Server
```bash
cd server
npm install
npm run seed:user      # bootstraps users table + seeds admin user
npm run dev
```

### Client
```bash
cd client
npm install
npm run dev
```

The client expects the API at `http://localhost:5000` by default (see `client/.env.example`).
