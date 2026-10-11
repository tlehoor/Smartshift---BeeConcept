# SMARTSHIFT — REQUIRED PRODUCTION ENVIRONMENT VARIABLES
======================================================
This document outlines all environment variables required or supported when deploying SmartShift to production (e.g., Render for Backend, Vercel for Frontend, Supabase for PostgreSQL).

DO NOT COMMIT REAL SECRETS TO THIS REPOSITORY.
These variables must be populated securely via the host provider's dashboard or secrets manager.

---

### 1. BACKEND SERVICE (Render / Node.js)

| Variable | Purpose | Required | Example Format | Where Consumed |
|---|---|---|---|---|
| `PORT` | HTTP port on which the Express application listens. | Optional (Render injects automatically) | `5000` or `10000` | `server/index.ts` |
| `NODE_ENV` | Operating environment (`production`, `development`, `test`). | Highly Recommended | `production` | `server/index.ts`, `server/db/seed.ts` |
| `DATABASE_URL` | PostgreSQL connection string for real database (Supabase / AWS RDS). | Required for real PostgreSQL (defaults to persistent PGlite directory if omitted) | `postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?sslmode=require` | Planned connection bridge / `server/db/index.ts` |
| `JWT_SECRET` | 256-bit cryptographic secret for signing and verifying user session JWT tokens. | **REQUIRED** in production | `a8f9b4c2...min-32-chars-random-string` | `server/services/authService.ts` |
| `CORS_ORIGIN` | Allowed Frontend domains for Cross-Origin Resource Sharing. Comma-separated for multiple origins. | Recommended in production | `https://smartshift.vercel.app` or `https://smartshift.beeconcept.vn` | `server/index.ts` |

---

### 2. FRONTEND SERVICE (Vercel / Vite)

| Variable | Purpose | Required | Example Format | Where Consumed |
|---|---|---|---|---|
| `VITE_API_URL` | Base URL pointing to the deployed Render backend service. In local dev, Vite proxy forwards `/api` to `localhost:5000`. | Recommended for standalone Vercel hosting | `https://smartshift-api.onrender.com` | `src/services/apiClient.ts` |
| `DISABLE_HMR` | Disables hot module replacement in static builds / serverless. | Optional | `false` | `vite.config.ts` |

---

### 3. SENSITIVITY & SECURITY GUIDELINES
1. **Never commit `.env` or `.env.local` files:** The repository's `.gitignore` explicitly ignores `.env*` patterns.
2. **First-Login Policy:** Newly created or seeded users start with `is_first_login = true` and must change their password to $\ge 6$ characters before performing standard operations.
3. **Database Credentials:** In Supabase, use the pooled connection string (port 6543) or direct connection string (port 5432) with SSL enabled (`?sslmode=require`).
