-- ============================================================
-- BashaCare Migration 012: Access & Auth Improvements
-- ============================================================

-- ─── 1. Add username to users table ──────────────────────────
ALTER TABLE users ADD COLUMN username VARCHAR(100);

-- Backfill existing users: Use the local part of the email as default username
UPDATE users SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL;
ALTER TABLE users ALTER COLUMN username SET NOT NULL;

-- ─── 2. Add property_code to properties ──────────────────────
ALTER TABLE properties ADD COLUMN property_code VARCHAR(20);

-- Backfill existing properties with an 8-char uppercase hex code generated from their UUID
UPDATE properties 
SET property_code = UPPER(SUBSTRING(REPLACE(id::TEXT, '-', ''), 1, 8))
WHERE property_code IS NULL;

ALTER TABLE properties ALTER COLUMN property_code SET NOT NULL;
CREATE UNIQUE INDEX idx_properties_code ON properties(property_code);

-- ─── 3. Manager ↔ Property assignment table ─────────────────
CREATE TABLE manager_property_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id  UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- RLS for manager assignments
ALTER TABLE manager_property_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY landlord_isolation_manager_assignments ON manager_property_assignments
  USING (landlord_id::TEXT = current_setting('app.current_landlord_id', TRUE));

CREATE INDEX idx_mpa_user ON manager_property_assignments(user_id);
CREATE INDEX idx_mpa_property ON manager_property_assignments(property_id);
CREATE INDEX idx_mpa_landlord ON manager_property_assignments(landlord_id);

-- ─── 4. Module Permissions Enum & Table ──────────────────────
CREATE TYPE module_permission AS ENUM (
  'PROPERTY_VIEW',
  'UNIT_MANAGER',
  'OCCUPANT_MANAGER',
  'AGREEMENT_MANAGER',
  'BILLING_MANAGER',
  'PAYMENT_MANAGER',
  'MAINTENANCE_MANAGER',
  'UTILITY_MANAGER',
  'REPORT_VIEWER',
  'ACTIVITY_VIEWER'
);

CREATE TABLE user_module_permissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id   UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  permission    module_permission NOT NULL,
  granted_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id, permission),
  -- Crucial dependency: Cascade delete permissions if manager is unassigned from property
  CONSTRAINT fk_ump_assignment FOREIGN KEY (user_id, property_id) 
    REFERENCES manager_property_assignments(user_id, property_id) ON DELETE CASCADE
);

-- RLS for permissions
ALTER TABLE user_module_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY landlord_isolation_permissions ON user_module_permissions
  USING (landlord_id::TEXT = current_setting('app.current_landlord_id', TRUE));

CREATE INDEX idx_ump_user ON user_module_permissions(user_id);
CREATE INDEX idx_ump_property ON user_module_permissions(property_id);

-- ─── 5. Extend Activity Logs for Impersonation ───────────────
ALTER TABLE activity_logs ADD COLUMN username VARCHAR(100);
ALTER TABLE activity_logs ADD COLUMN property_id UUID REFERENCES properties(id);
ALTER TABLE activity_logs ADD COLUMN property_code VARCHAR(20);
ALTER TABLE activity_logs ADD COLUMN ip_address INET;
ALTER TABLE activity_logs ADD COLUMN user_agent TEXT;
ALTER TABLE activity_logs ADD COLUMN session_id UUID;
ALTER TABLE activity_logs ADD COLUMN impersonator_id UUID REFERENCES users(id);
ALTER TABLE activity_logs ADD COLUMN impersonation_context JSONB;

CREATE INDEX idx_activity_logs_impersonator ON activity_logs(impersonator_id);
