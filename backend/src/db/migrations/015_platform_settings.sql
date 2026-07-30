-- ============================================================
-- BashaCare Migration 015: Platform Settings
-- ============================================================

CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  allow_new_registrations BOOLEAN DEFAULT TRUE,
  default_trial_days INT DEFAULT 14,
  system_announcement TEXT,
  maintenance_mode BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Seed a single row
INSERT INTO platform_settings (allow_new_registrations, default_trial_days)
VALUES (TRUE, 14);
