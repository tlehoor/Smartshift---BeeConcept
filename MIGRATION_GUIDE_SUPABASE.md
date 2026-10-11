# SMARTSHIFT — SUPABASE POSTGRESQL MIGRATION GUIDE
===================================================

This guide details the deterministic steps for setting up a fresh Supabase PostgreSQL database for SmartShift without data loss or downtime.

---

### Phase 1: Create Supabase Project
1. Log in to [Supabase](https://supabase.com) and create a new project (e.g. `smartshift-prod`).
2. Select region: **Singapore (ap-southeast-1)** for lowest latency to Vietnam (`Asia/Ho_Chi_Minh`).
3. Save your database password securely.

---

### Phase 2: Schema Migration Execution

The primary production schema is maintained deterministically in:
`server/db/schema.sql`

To apply the schema to Supabase, choose one of the following methods:

#### Option A: Via SmartShift Migration Script (Recommended CLI)
Set the production connection string and execute the transactional migration script:
```bash
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?sslmode=require"
npm run db:migrate
```
*(The script verifies clean schema state, applies DDL atomically inside a transaction `BEGIN ... COMMIT`, and confirms all 14 tables).*

#### Option B: Supabase SQL Editor (Web UI)
1. Open the Supabase dashboard $\to$ **SQL Editor**.
2. Click **New query**.
3. Copy the full content of `server/db/schema.sql` and paste it.
4. Click **Run**.
5. Verify that all 14 tables are created:
   - `users`
   - `employees`
   - `schedule_weeks`
   - `shifts`
   - `schedule_versions`
   - `schedule_version_assignments`
   - `operational_shift_assignments` (Contains `DEFERRABLE INITIALLY DEFERRED` constraint)
   - `employee_availabilities`
   - `availability_explanations`
   - `cover_requests`
   - `cover_invitations`
   - `swap_requests`
   - `debt_transactions`
   - `audit_logs`

#### Option C: Via `psql` or Supabase CLI
```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?sslmode=require" -f server/db/schema.sql
```

---

### Phase 3: Initial Administrator Account Bootstrap

> [!CAUTION]
> **DO NOT RUN DEMO SEEDS ON PRODUCTION.**
> Automatic demo seeding is strictly disabled when `DATABASE_URL` is set or when `NODE_ENV=production`. Do NOT manually run mock data seeds on a live Supabase production database.

To initialize the primary administrator (`ADMIN`) account on a clean database:

```bash
# 1. Ensure required production environment variables are configured
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres?sslmode=require"
export JWT_SECRET="[STRONG_RANDOM_SECRET_MIN_32_CHARS]"
export NODE_ENV="production"
export CORS_ORIGIN="https://[YOUR_FRONTEND_DOMAIN]"

# 2. Run standalone bootstrap CLI (prompts interactively with masked password input)
npm run db:bootstrap-admin
```

> [!IMPORTANT]
> **Manual Execution Only:** Both `npm run db:migrate` and `npm run db:bootstrap-admin` are strictly manual CLI operations. Neither schema migration nor admin bootstrap will ever run automatically during server startup.

---

### Phase 4: Starting the Backend Service

Start the production server using the standard npm start command:
```bash
npm start # Executes: tsx server/index.ts
```
The server will bind to `0.0.0.0:${PORT || 5000}`, connect to Supabase PostgreSQL, and serve the API without modifying schema or injecting demo records.

---

### Phase 5: Critical Invariants to Verify on Supabase

After running the migration and bootstrap, verify the following queries return expected results:

```sql
-- 1. Verify DEFERRABLE constraint on operational_shift_assignments:
SELECT conname, contype, condeferrable, condeferred
FROM pg_constraint
WHERE conname = 'uq_osa_week_shift_employee';
-- Expected: condeferrable = true, condeferred = true

-- 2. Verify gen_random_uuid() function is operational:
SELECT gen_random_uuid();
-- Expected: valid UUIDv4

-- 3. Verify server timezone configuration:
SHOW timezone;
-- Recommended to keep UTC or set to 'Asia/Ho_Chi_Minh'
```
