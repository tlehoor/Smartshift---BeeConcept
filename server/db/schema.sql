-- ============================================================
-- SMARTSHIFT POSTGRESQL PRODUCTION SCHEMA
-- ============================================================

-- Extensions not needed; gen_random_uuid() is built-in in PostgreSQL 13+

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL, -- 'ADMIN', 'MANAGER', 'OFFICIAL_STAFF', 'PROBATION_STAFF', 'WORKSHOP'
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'BAN'
    is_first_login BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Employee Profiles
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    nickname VARCHAR(50),
    email VARCHAR(100) UNIQUE NOT NULL,
    dob VARCHAR(20),
    avatar_url TEXT,
    target_shifts INT NOT NULL DEFAULT 6,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Schedule Weeks
CREATE TABLE IF NOT EXISTS schedule_weeks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_number INT NOT NULL,
    year INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    current_status VARCHAR(20) NOT NULL DEFAULT 'WAITING', -- 'WAITING', 'RUNNING', 'DRAFT', 'PUBLISHED'
    active_version_id UUID,
    registration_open TIMESTAMPTZ NOT NULL,
    registration_close TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(week_number, year)
);

-- 4. 28 Shifts per Week
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id UUID NOT NULL REFERENCES schedule_weeks(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1: Mon ... 7: Sun
    shift_index INT NOT NULL CHECK (shift_index BETWEEN 1 AND 4), -- 1: 09-12, 2: 12-15, 3: 15-18, 4: 18-21
    is_special_shift BOOLEAN NOT NULL DEFAULT FALSE,
    required_count INT NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(week_id, day_of_week, shift_index)
);
CREATE INDEX IF NOT EXISTS idx_shifts_week_day ON shifts(week_id, day_of_week);

-- 5. Schedule Versions (Immutable Milestones: V1, V2, V3...)
CREATE TABLE IF NOT EXISTS schedule_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id UUID NOT NULL REFERENCES schedule_weeks(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    version_label VARCHAR(20) NOT NULL, -- 'V1', 'V2', 'V3'
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'PUBLISHED', 'REPLACED'
    created_by UUID REFERENCES users(id),
    published_by UUID REFERENCES users(id),
    published_at TIMESTAMPTZ,
    notes TEXT,
    violations_summary JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(week_id, version_number)
);

-- 6. Schedule Version Assignments (IMMUTABLE SNAPSHOT HISTORY)
CREATE TABLE IF NOT EXISTS schedule_version_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES schedule_versions(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    is_special_shift_assignment BOOLEAN NOT NULL DEFAULT FALSE,
    is_fallback_assignment BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(version_id, shift_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_sva_version ON schedule_version_assignments(version_id);

-- 7. Operational Shift Assignments (LIVE MUTABLE ROSTER FOR PUBLISHED WEEKS)
-- Note: UNIQUE constraint is DEFERRABLE INITIALLY DEFERRED to support atomic Swap operations
CREATE TABLE IF NOT EXISTS operational_shift_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id UUID NOT NULL REFERENCES schedule_weeks(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    source_version_id UUID NOT NULL REFERENCES schedule_versions(id) ON DELETE RESTRICT,
    assignment_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'CANCELLED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_osa_week_shift_employee UNIQUE (week_id, shift_id, employee_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX IF NOT EXISTS idx_osa_lookup ON operational_shift_assignments(employee_id, week_id, shift_id);
CREATE INDEX IF NOT EXISTS idx_osa_week_shift ON operational_shift_assignments(week_id, shift_id);

-- 8. Employee Availabilities (Point-in-time commitments)
CREATE TABLE IF NOT EXISTS employee_availabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id UUID NOT NULL REFERENCES schedule_weeks(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(week_id, shift_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_avail_lookup ON employee_availabilities(employee_id, shift_id);
CREATE INDEX IF NOT EXISTS idx_avail_week_emp ON employee_availabilities(week_id, employee_id);

-- 9. Availability Explanations & Approvals
CREATE TABLE IF NOT EXISTS availability_explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id UUID NOT NULL REFERENCES schedule_weeks(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    submitted_count INT NOT NULL,
    target_count INT NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Cover Requests
CREATE TABLE IF NOT EXISTS cover_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id UUID NOT NULL REFERENCES schedule_weeks(id) ON DELETE RESTRICT,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE RESTRICT,
    operational_assignment_id UUID NOT NULL REFERENCES operational_shift_assignments(id) ON DELETE RESTRICT,
    requester_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'CANCELLED'
    accepted_by UUID REFERENCES employees(id) ON DELETE RESTRICT,
    accepted_at TIMESTAMPTZ,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cover_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cover_request_id UUID NOT NULL REFERENCES cover_requests(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cover_request_id, candidate_id)
);

-- 11. Swap Requests
CREATE TABLE IF NOT EXISTS swap_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id UUID NOT NULL REFERENCES schedule_weeks(id) ON DELETE RESTRICT,
    requester_assignment_id UUID NOT NULL REFERENCES operational_shift_assignments(id) ON DELETE RESTRICT,
    target_assignment_id UUID NOT NULL REFERENCES operational_shift_assignments(id) ON DELETE RESTRICT,
    requester_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    target_employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'
    resolved_at TIMESTAMPTZ,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Transactional Debt Ledger
CREATE TABLE IF NOT EXISTS debt_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debtor_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    creditor_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    shifts_count INT NOT NULL DEFAULT 1 CHECK (shifts_count > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SETTLED', 'OFFSET'
    cover_request_id UUID REFERENCES cover_requests(id),
    offset_with_debt_id UUID REFERENCES debt_transactions(id),
    settled_at TIMESTAMPTZ,
    action_description TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_different_debtor_creditor CHECK (debtor_id <> creditor_id)
);
CREATE INDEX IF NOT EXISTS idx_debt_parties ON debt_transactions(debtor_id, creditor_id, status);

-- 13. Immutable Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id),
    actor_name VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    target_object VARCHAR(200) NOT NULL,
    detail TEXT NOT NULL,
    result VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_logs(category, created_at DESC);
