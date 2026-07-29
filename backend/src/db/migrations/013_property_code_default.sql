-- ============================================================
-- BashaCare Migration 013: Add DEFAULT for property_code
-- ============================================================

-- Add a default value to property_code so INSERTs don't fail when it's omitted.
-- It generates an 8-character random hex string.
ALTER TABLE properties ALTER COLUMN property_code SET DEFAULT UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8));
