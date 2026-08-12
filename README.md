**Demo Login Accounts (Use on [fundsroom-crm.vercel.app](fundsroom-crm.vercel.app))**:
   * **Admin:** `admin` / `password123`
   * **Sales:** `sales` / `password123`
   * **Warehouse:** `warehouse` / `password123`
   * **Accounts:** `accounts` / `password123`

# 🏢 FundsRoom CRM

> A full-stack, role-based CRM system for managing customers, inventory, and sales challans — built with **React + Vite** on the frontend and **Express.js + Prisma + PostgreSQL** on the backend.

---

## ⚡ Quick Start: Local Setup

1. **Backend Setup**:
   ```bash
   cd server && npm install
   # Create server/.env and add:
   # DATABASE_URL="postgresql://user:pass@host:5432/db"
   # JWT_SECRET="your-jwt-secret-key"
   npx prisma db push && npx prisma db seed
   npm run dev
   ```
2. **Frontend Setup**:
   ```bash
   cd client && npm install
   # Create client/.env and add:
   # VITE_API_URL="http://localhost:5000/api"
   npm run dev
   ```

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [User Roles & Permissions](#user-roles--permissions)
- [Database Schema](#database-schema)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
  - [Backend → Railway / Render](#backend--railway--render)
  - [Frontend → Vercel / Netlify](#frontend--vercel--netlify)
- [Default Seed Accounts](#default-seed-accounts)
- [API Reference](#api-reference)

---

## Overview

FundsRoom CRM is an internal operations portal designed to manage:

- **Customer Relationships** — track leads, active clients, billing info, follow-up notes
- **Product Inventory** — catalog, stock levels, low-stock alerts, stock movement audit logs
- **Sales Challans / Invoices** — create draft or confirmed dispatch invoices with PDF export

---

## Architecture

```
fundsroom-crm/
├── client/          # React + Vite frontend (SPA)
│   ├── src/
│   │   ├── context/     # Auth context (JWT)
│   │   ├── pages/       # Customers, Products, Challans
│   │   ├── services/    # api.ts - fetch wrapper
│   │   └── index.css    # Global design system
│   └── vite.config.ts
│
└── server/          # Express.js REST API backend
    ├── src/
    │   ├── controllers/ # Business logic handlers
    │   ├── middlewares/ # JWT auth + RBAC + Zod validation
    │   ├── routes/      # Route definitions
    │   ├── db.ts        # Prisma client singleton
    │   └── index.ts     # Express app entry point
    └── prisma/
        ├── schema.prisma  # Database models
        └── seed.ts        # Demo data seeder
```

---

## Tech Stack

| Layer       | Technology                                                   |
|-------------|--------------------------------------------------------------|
| Frontend    | React 18, Vite, TypeScript, Vanilla CSS                      |
| Icons       | Lucide React                                                 |
| Backend     | Node.js, Express.js, TypeScript                              |
| Database    | PostgreSQL (via Supabase or Railway)                         |
| ORM         | Prisma                                                       |
| Auth        | JWT (jsonwebtoken), bcryptjs                                 |
| Validation  | Zod                                                          |
| Dev Tools   | ts-node, nodemon, tsx                                        |

---

## User Roles & Permissions

| Role        | Customers      | Products       | Challans       | Notes                                         |
|-------------|----------------|----------------|----------------|-----------------------------------------------|
| **ADMIN**   | Full access    | Full access    | Full access    | Can do everything                             |
| **SALES**   | Read + Write   | Read only      | Read + Create  | Cannot add/edit/delete products               |
| **WAREHOUSE**| Read only    | Full access    | Read only      | Manages stock levels, stock movements         |
| **ACCOUNTS**| Read only      | Read only      | Read only      | View-only across all modules                  |

---

## Database Schema

```
User          → has many StockMovementLogs, Challans
Customer      → has many Challans
Product       → has many StockMovementLogs, ChallanItems
Challan       → belongs to Customer + User, has many ChallanItems
ChallanItem   → belongs to Challan + Product (price/name/sku snapshotted at creation)
StockMovementLog → belongs to Product + User
```

---

## Local Development Setup

### Prerequisites

- Node.js >= 18
- npm >= 9
- PostgreSQL database (or Supabase free tier)

### 1. Clone the repository

```bash
git clone https://github.com/chandraprakash-ai/fundsroom-crm.git
cd fundsroom-crm
```

### 2. Set up the Backend

```bash
cd server
npm install

# Create .env file (see Environment Variables section)
# Edit .env with your DATABASE_URL and JWT_SECRET

# Run Prisma migrations
npx prisma migrate deploy

# Seed demo data (optional)
npx ts-node prisma/seed.ts

# Start development server
npm run dev
```

Backend runs at: `http://localhost:5000`

### 3. Set up the Frontend

```bash
cd client
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:5000/api" > .env

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## Environment Variables

### Backend (`server/.env`)

```env
# PostgreSQL connection string (from Supabase, Railway, or local)
DATABASE_URL="postgresql://user:password@host:5432/dbname?pgbouncer=true"

# Direct connection (required by Prisma for migrations when using pgbouncer)
DIRECT_URL="postgresql://user:password@host:5432/dbname"

# JWT signing secret — use a long, random string in production
JWT_SECRET="your-super-secret-jwt-key-change-this"

# Server port
PORT=5000
```

### Frontend (`client/.env`)

```env
# The base URL of your deployed backend API
VITE_API_URL=http://localhost:5000/api
```

---

## Deployment

### Backend → Railway / Render

#### Option A: Railway (Recommended)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select the `fundsroom-crm` repository
3. Set **Root Directory** to `server`
4. Add environment variables in Railway dashboard:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `JWT_SECRET`
5. **Build Command**: `npm install && npx prisma generate && npm run build`
6. **Start Command**: `node dist/index.js`
7. Deploy! Railway provides a public URL like `https://fundsroom-api.up.railway.app`

#### Option B: Render

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo, set **Root Directory**: `server`
3. **Build Command**: `npm install && npx prisma generate && npm run build`
4. **Start Command**: `node dist/index.js`
5. Add all environment variables → Deploy

---

### Frontend → Vercel / Netlify

#### Before deploying, update `client/src/services/api.ts`:

```ts
// Change this line:
const BASE_URL = 'http://localhost:5000/api';
// To:
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
```

#### Option A: Vercel (Recommended)

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import `fundsroom-crm` from GitHub
3. Set **Root Directory** to `client`
4. Add environment variable: `VITE_API_URL` = `https://your-backend-url.railway.app/api`
5. **Build Command**: `npm run build` | **Output Directory**: `dist`
6. Deploy!

#### Option B: Netlify

1. Go to [netlify.com](https://app.netlify.com) → **Import from Git**
2. **Base directory**: `client` | **Build command**: `npm run build` | **Publish directory**: `client/dist`
3. Add `VITE_API_URL` environment variable
4. Create `client/public/_redirects` with: `/*  /index.html  200`
5. Deploy!

---

## Default Seed Accounts

After running `npx ts-node prisma/seed.ts`:

| Username    | Password     | Role      |
|-------------|--------------|-----------|
| `admin`     | `password123`| ADMIN     |
| `sales`     | `password123`| SALES     |
| `warehouse` | `password123`| WAREHOUSE |
| `accounts`  | `password123`| ACCOUNTS  |

> ⚠️ **Change all passwords before going to production!**

---

## API Reference

See [API_DOCS.md](./API_DOCS.md) for the complete endpoint reference with request/response examples.
