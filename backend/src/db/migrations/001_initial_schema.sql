-- ============================================================
-- BashaCare Database Migration
-- Full schema with RLS, Triggers, Views
-- Run: psql -U postgres -d bashacare -f migrations/001_initial_schema.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUMs ────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'landlord', 'manager', 'tenant');
CREATE TYPE unit_status AS ENUM ('VACANT', 'OCCUPIED', 'MAINTENANCE');
CREATE TYPE invoice_status AS ENUM (
  'UNPAID', 'PENDING_VERIFICATION', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'
);
CREATE TYPE payment_method AS ENUM (
  'MFS_MERCHANT', 'MFS_PERSONAL', 'BANK_TRANSFER', 'CASH'
);
CREATE TYPE payment_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE meter_type AS ENUM ('ELECTRICITY', 'GAS', 'WATER');
CREATE TYPE adjustment_type AS ENUM ('DISCOUNT', 'SURCHARGE', 'REPAIR_FEE', 'OTHER');

-- ─── LANDLORD PROFILES ────────────────────────────────────────────────
CREATE TABLE landlord_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name          VARCHAR(255) NOT NULL,
  contact_email         VARCHAR(255) UNIQUE NOT NULL,
  contact_phone         VARCHAR(20),
  -- MFS Merchant Keys (Automated Tier)
  bkash_merchant_key    TEXT,
  bkash_merchant_secret TEXT,
  bkash_username        TEXT,
  bkash_password        TEXT,
  nagad_merchant_id     TEXT,
  nagad_merchant_key    TEXT,
  rocket_merchant_id    TEXT,
  rocket_merchant_key   TEXT,
  -- Manual Tier Routing
  mfs_personal_number   VARCHAR(20),
  bank_account_name     VARCHAR(255),
  bank_account_number   VARCHAR(50),
  bank_routing_number   VARCHAR(50),
  bank_name             VARCHAR(255),
  -- Plan
  plan_tier             VARCHAR(50) DEFAULT 'starter',
  is_active             BOOLEAN DEFAULT FALSE, -- Requires admin approval
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USERS (Auth Layer) ───────────────────────────────────────────────
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id         UUID REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  role                user_role NOT NULL,
  email               VARCHAR(255) UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL,
  full_name           VARCHAR(255),
  phone_number        VARCHAR(20),
  linked_entity_id    UUID, -- tenant_id or NULL
  is_active           BOOLEAN DEFAULT TRUE,
  last_login          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROPERTIES ───────────────────────────────────────────────────────
CREATE TABLE properties (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  address     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── UNITS ────────────────────────────────────────────────────────────
CREATE TABLE units (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_number VARCHAR(50) NOT NULL,
  floor       VARCHAR(20),
  bedrooms    SMALLINT DEFAULT 1,
  status      unit_status NOT NULL DEFAULT 'VACANT',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, unit_number)
);

-- ─── TENANT PROFILES ──────────────────────────────────────────────────
CREATE TABLE tenant_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id           UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  full_name             VARCHAR(255) NOT NULL,
  phone_number          VARCHAR(20) NOT NULL,
  email                 VARCHAR(255),
  encrypted_national_id TEXT, -- AES-256 encrypted at application layer
  emergency_contact     VARCHAR(255),
  emergency_phone       VARCHAR(20),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(landlord_id, phone_number)
);

-- ─── LEASES ───────────────────────────────────────────────────────────
CREATE TABLE leases (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id      UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  unit_id          UUID NOT NULL REFERENCES units(id),
  tenant_id        UUID NOT NULL REFERENCES tenant_profiles(id),
  base_rent        NUMERIC(12, 2) NOT NULL,
  security_deposit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  utility_tariff   NUMERIC(8, 4) NOT NULL DEFAULT 0, -- per unit rate
  start_date       DATE NOT NULL,
  end_date         DATE,
  is_active        BOOLEAN DEFAULT TRUE,
  terminated_at    TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LEDGER INVOICES ──────────────────────────────────────────────────
CREATE TABLE ledger_invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id         UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  lease_id            UUID NOT NULL REFERENCES leases(id),
  tenant_id           UUID NOT NULL REFERENCES tenant_profiles(id),
  billing_month       DATE NOT NULL, -- First day of billing month
  base_rent           NUMERIC(12, 2) NOT NULL,
  utility_charges     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  late_fees           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount_due          NUMERIC(12, 2) NOT NULL,
  amount_paid         NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status              invoice_status NOT NULL DEFAULT 'UNPAID',
  due_date            DATE NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lease_id, billing_month)
);

-- ─── LEDGER ADJUSTMENTS ───────────────────────────────────────────────
CREATE TABLE ledger_adjustments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id     UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES ledger_invoices(id) ON DELETE CASCADE,
  adjustment_type adjustment_type NOT NULL,
  amount          NUMERIC(12, 2) NOT NULL, -- Negative for discounts
  note            TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PAYMENT TRANSACTIONS ─────────────────────────────────────────────
CREATE TABLE payment_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id      UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  invoice_id       UUID NOT NULL REFERENCES ledger_invoices(id),
  tenant_id        UUID NOT NULL REFERENCES tenant_profiles(id),
  amount           NUMERIC(12, 2) NOT NULL,
  method           payment_method NOT NULL,
  trx_id           VARCHAR(100),
  gateway_response JSONB,
  status           payment_status NOT NULL DEFAULT 'PENDING',
  verified_by      UUID REFERENCES users(id),
  verified_at      TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── UTILITY METER LOGS ───────────────────────────────────────────────
CREATE TABLE utility_meter_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id    UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  unit_id        UUID NOT NULL REFERENCES units(id),
  lease_id       UUID NOT NULL REFERENCES leases(id),
  meter_type     meter_type NOT NULL DEFAULT 'ELECTRICITY',
  meter_reading  NUMERIC(12, 2) NOT NULL,
  calculated_units NUMERIC(12, 2), -- delta from previous
  charge_amount  NUMERIC(12, 2),   -- auto-calculated by trigger
  reading_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_by      UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY POLICIES
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE utility_meter_logs ENABLE ROW LEVEL SECURITY;

-- Properties RLS
CREATE POLICY landlord_isolation_properties ON properties
  USING (landlord_id::TEXT = current_setting('app.current_landlord_id', TRUE));

-- Units RLS
CREATE POLICY landlord_isolation_units ON units
  USING (landlord_id::TEXT = current_setting('app.current_landlord_id', TRUE));

-- Tenants RLS
CREATE POLICY landlord_isolation_tenants ON tenant_profiles
  USING (landlord_id::TEXT = current_setting('app.current_landlord_id', TRUE));

-- Leases RLS
CREATE POLICY landlord_isolation_leases ON leases
  USING (landlord_id::TEXT = current_setting('app.current_landlord_id', TRUE));

-- Invoices RLS
CREATE POLICY landlord_isolation_invoices ON ledger_invoices
  USING (landlord_id::TEXT = current_setting('app.current_landlord_id', TRUE));

-- Adjustments RLS
CREATE POLICY landlord_isolation_adjustments ON ledger_adjustments
  USING (landlord_id::TEXT = current_setting('app.current_landlord_id', TRUE));

-- Payments RLS
CREATE POLICY landlord_isolation_payments ON payment_transactions
  USING (landlord_id::TEXT = current_setting('app.current_landlord_id', TRUE));

-- Utilities RLS
CREATE POLICY landlord_isolation_utilities ON utility_meter_logs
  USING (landlord_id::TEXT = current_setting('app.current_landlord_id', TRUE));

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- TRIGGER 1: Enforce single active lease per unit per date range
CREATE OR REPLACE FUNCTION fn_enforce_single_active_lease()
RETURNS TRIGGER AS $$
BEGIN
  -- Deactivate any existing active lease for this unit
  UPDATE leases
  SET is_active = FALSE, terminated_at = NOW()
  WHERE unit_id = NEW.unit_id
    AND is_active = TRUE
    AND id != NEW.id;

  -- Mark unit as OCCUPIED
  UPDATE units SET status = 'OCCUPIED' WHERE id = NEW.unit_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_single_active_lease
  AFTER INSERT ON leases
  FOR EACH ROW
  WHEN (NEW.is_active = TRUE)
  EXECUTE FUNCTION fn_enforce_single_active_lease();

-- TRIGGER 2: Auto-calculate utility delta and append charge to invoice
CREATE OR REPLACE FUNCTION fn_calculate_utility_charge()
RETURNS TRIGGER AS $$
DECLARE
  v_prev_reading    NUMERIC(12, 2);
  v_delta           NUMERIC(12, 2);
  v_tariff          NUMERIC(8, 4);
  v_charge          NUMERIC(12, 2);
  v_invoice_id      UUID;
  v_billing_month   DATE;
BEGIN
  -- Get previous reading for this unit and meter type
  SELECT meter_reading INTO v_prev_reading
  FROM utility_meter_logs
  WHERE unit_id = NEW.unit_id
    AND meter_type = NEW.meter_type
    AND id != NEW.id
  ORDER BY reading_date DESC
  LIMIT 1;

  IF v_prev_reading IS NULL THEN
    v_prev_reading := 0;
  END IF;

  -- Get utility tariff from active lease
  SELECT utility_tariff INTO v_tariff
  FROM leases
  WHERE id = NEW.lease_id;

  -- Calculate delta and charge
  v_delta  := GREATEST(NEW.meter_reading - v_prev_reading, 0);
  v_charge := v_delta * COALESCE(v_tariff, 0);

  -- Update the log entry with calculated values
  NEW.calculated_units := v_delta;
  NEW.charge_amount    := v_charge;

  -- Find the current month's open invoice
  v_billing_month := DATE_TRUNC('month', NEW.reading_date)::DATE;

  SELECT id INTO v_invoice_id
  FROM ledger_invoices
  WHERE lease_id = NEW.lease_id
    AND billing_month = v_billing_month
    AND status NOT IN ('PAID')
  LIMIT 1;

  -- Append charge to the invoice if found
  IF v_invoice_id IS NOT NULL THEN
    UPDATE ledger_invoices
    SET utility_charges = utility_charges + v_charge,
        amount_due      = base_rent + utility_charges + v_charge + late_fees,
        updated_at      = NOW()
    WHERE id = v_invoice_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_utility_charge
  BEFORE INSERT ON utility_meter_logs
  FOR EACH ROW
  EXECUTE FUNCTION fn_calculate_utility_charge();

-- TRIGGER 3: Update unit status when lease is terminated
CREATE OR REPLACE FUNCTION fn_lease_termination_update_unit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
    UPDATE units SET status = 'VACANT' WHERE id = NEW.unit_id;
    NEW.terminated_at := COALESCE(NEW.terminated_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lease_termination
  BEFORE UPDATE ON leases
  FOR EACH ROW
  EXECUTE FUNCTION fn_lease_termination_update_unit();

-- ═══════════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW invoice_calculated_totals AS
SELECT
  i.id,
  i.landlord_id,
  i.lease_id,
  i.tenant_id,
  i.billing_month,
  i.base_rent,
  i.utility_charges,
  i.late_fees,
  COALESCE(SUM(a.amount), 0)                          AS total_adjustments,
  i.base_rent + i.utility_charges + i.late_fees
    + COALESCE(SUM(a.amount), 0)                      AS total_calculated_due,
  i.amount_paid,
  i.base_rent + i.utility_charges + i.late_fees
    + COALESCE(SUM(a.amount), 0) - i.amount_paid      AS balance_remaining,
  i.status,
  i.due_date,
  i.created_at,
  i.updated_at
FROM ledger_invoices i
LEFT JOIN ledger_adjustments a ON a.invoice_id = i.id
GROUP BY i.id;

-- ─── INDEXES ──────────────────────────────────────────────────────────
CREATE INDEX idx_properties_landlord    ON properties(landlord_id);
CREATE INDEX idx_units_property         ON units(property_id);
CREATE INDEX idx_units_landlord         ON units(landlord_id);
CREATE INDEX idx_tenants_landlord       ON tenant_profiles(landlord_id);
CREATE INDEX idx_leases_landlord        ON leases(landlord_id);
CREATE INDEX idx_leases_unit            ON leases(unit_id);
CREATE INDEX idx_leases_tenant          ON leases(tenant_id);
CREATE INDEX idx_invoices_landlord      ON ledger_invoices(landlord_id);
CREATE INDEX idx_invoices_lease         ON ledger_invoices(lease_id);
CREATE INDEX idx_invoices_status        ON ledger_invoices(status);
CREATE INDEX idx_payments_invoice       ON payment_transactions(invoice_id);
CREATE INDEX idx_payments_landlord      ON payment_transactions(landlord_id);
CREATE INDEX idx_utility_logs_unit      ON utility_meter_logs(unit_id);
CREATE INDEX idx_users_landlord         ON users(landlord_id);
CREATE INDEX idx_users_email            ON users(email);
