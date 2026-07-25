-- ============================================================
-- BashaCare Migration 009
-- Multi-Vertical Support (Hotels, Hospitals, Plazas, etc.)
-- ============================================================

-- 1. Create property_type ENUM and add to properties
CREATE TYPE property_type AS ENUM (
  'RESIDENTIAL',
  'HOTEL',
  'HOSPITAL',
  'COMMERCIAL',
  'COWORKING',
  'WAREHOUSE'
);

ALTER TABLE properties ADD COLUMN property_type property_type NOT NULL DEFAULT 'RESIDENTIAL';
ALTER TABLE properties ADD COLUMN description TEXT;
ALTER TABLE properties ADD COLUMN total_floors INT;
ALTER TABLE properties ADD COLUMN amenities JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN settings JSONB DEFAULT '{}';

-- 2. Extend units table
ALTER TABLE units ADD COLUMN unit_type VARCHAR(50); 
ALTER TABLE units ADD COLUMN area_sqft NUMERIC(10,2);
ALTER TABLE units ADD COLUMN rate_per_unit NUMERIC(12,2);
ALTER TABLE units ADD COLUMN rate_type VARCHAR(20) DEFAULT 'MONTHLY';
ALTER TABLE units ADD COLUMN metadata JSONB DEFAULT '{}';
ALTER TABLE units ALTER COLUMN bedrooms DROP NOT NULL;

-- 3. Extend unit_status ENUM
ALTER TYPE unit_status ADD VALUE IF NOT EXISTS 'RESERVED';
ALTER TYPE unit_status ADD VALUE IF NOT EXISTS 'CHECKED_IN';
ALTER TYPE unit_status ADD VALUE IF NOT EXISTS 'HOUSEKEEPING';
ALTER TYPE unit_status ADD VALUE IF NOT EXISTS 'ADMITTED';
ALTER TYPE unit_status ADD VALUE IF NOT EXISTS 'DISCHARGED';
ALTER TYPE unit_status ADD VALUE IF NOT EXISTS 'AVAILABLE';

-- 4. Rename tenant_profiles -> occupant_profiles
ALTER TABLE tenant_profiles RENAME TO occupant_profiles;
ALTER TABLE occupant_profiles ADD COLUMN occupant_type VARCHAR(30) DEFAULT 'TENANT';

-- Rename FK columns from tenant_id to occupant_id
ALTER TABLE leases RENAME COLUMN tenant_id TO occupant_id;
-- Drop view before renaming columns in ledger_invoices
DROP VIEW IF EXISTS invoice_calculated_totals;

ALTER TABLE ledger_invoices RENAME COLUMN tenant_id TO occupant_id;
ALTER TABLE payment_transactions RENAME COLUMN tenant_id TO occupant_id;
ALTER TABLE maintenance_requests RENAME COLUMN tenant_id TO occupant_id;

-- 5. Rename leases -> agreements
ALTER TABLE leases RENAME TO agreements;
ALTER TABLE agreements ADD COLUMN agreement_type VARCHAR(30) DEFAULT 'LEASE';
ALTER TABLE agreements ADD COLUMN billing_cycle VARCHAR(20) DEFAULT 'MONTHLY';
ALTER TABLE agreements ADD COLUMN check_in TIMESTAMPTZ;
ALTER TABLE agreements ADD COLUMN check_out TIMESTAMPTZ;
ALTER TABLE agreements ADD COLUMN metadata JSONB DEFAULT '{}';

-- Rename FK columns from lease_id to agreement_id
ALTER TABLE ledger_invoices RENAME COLUMN lease_id TO agreement_id;
ALTER TABLE utility_meter_logs RENAME COLUMN lease_id TO agreement_id;

-- 6. Recreate view invoice_calculated_totals
CREATE OR REPLACE VIEW invoice_calculated_totals AS
SELECT
  i.id,
  i.landlord_id,
  i.agreement_id,
  i.occupant_id,
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

-- 7. Fix Policies and Triggers 
ALTER POLICY landlord_isolation_tenants ON occupant_profiles RENAME TO landlord_isolation_occupants;
ALTER POLICY landlord_isolation_leases ON agreements RENAME TO landlord_isolation_agreements;

-- Drop and recreate triggers that depend on the table/columns
DROP TRIGGER IF EXISTS trg_enforce_single_active_lease ON agreements;
DROP FUNCTION IF EXISTS fn_enforce_single_active_lease();

CREATE OR REPLACE FUNCTION fn_enforce_single_active_agreement()
RETURNS TRIGGER AS $$
BEGIN
  -- Deactivate any existing active agreement for this unit
  UPDATE agreements
  SET is_active = FALSE, terminated_at = NOW()
  WHERE unit_id = NEW.unit_id
    AND is_active = TRUE
    AND id != NEW.id;

  -- Mark unit as OCCUPIED (For residential defaults)
  -- Real status depends on property type, but keeping this basic
  UPDATE units SET status = 'OCCUPIED' WHERE id = NEW.unit_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_single_active_agreement
  AFTER INSERT ON agreements
  FOR EACH ROW
  WHEN (NEW.is_active = TRUE)
  EXECUTE FUNCTION fn_enforce_single_active_agreement();

-- Trigger 2: Utility Charge
DROP TRIGGER IF EXISTS trg_calculate_utility_charge ON utility_meter_logs;
DROP FUNCTION IF EXISTS fn_calculate_utility_charge();

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

  SELECT utility_tariff INTO v_tariff
  FROM agreements
  WHERE id = NEW.agreement_id;

  v_delta  := GREATEST(NEW.meter_reading - v_prev_reading, 0);
  v_charge := v_delta * COALESCE(v_tariff, 0);

  NEW.calculated_units := v_delta;
  NEW.charge_amount    := v_charge;

  v_billing_month := DATE_TRUNC('month', NEW.reading_date)::DATE;

  SELECT id INTO v_invoice_id
  FROM ledger_invoices
  WHERE agreement_id = NEW.agreement_id
    AND billing_month = v_billing_month
    AND status NOT IN ('PAID')
  LIMIT 1;

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

-- Trigger 3: Agreement Termination
DROP TRIGGER IF EXISTS trg_lease_termination ON agreements;
DROP FUNCTION IF EXISTS fn_lease_termination_update_unit();

CREATE OR REPLACE FUNCTION fn_agreement_termination_update_unit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
    UPDATE units SET status = 'VACANT' WHERE id = NEW.unit_id;
    NEW.terminated_at := COALESCE(NEW.terminated_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_agreement_termination
  BEFORE UPDATE ON agreements
  FOR EACH ROW
  EXECUTE FUNCTION fn_agreement_termination_update_unit();

-- Rename indexes
ALTER INDEX IF EXISTS idx_tenants_landlord RENAME TO idx_occupants_landlord;
ALTER INDEX IF EXISTS idx_leases_landlord RENAME TO idx_agreements_landlord;
ALTER INDEX IF EXISTS idx_leases_unit RENAME TO idx_agreements_unit;
ALTER INDEX IF EXISTS idx_leases_tenant RENAME TO idx_agreements_occupant;
ALTER INDEX IF EXISTS idx_invoices_lease RENAME TO idx_invoices_agreement;
