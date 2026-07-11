-- ============================================================
-- BashaCare Migration 002
-- Replace MFS Merchant model with Personal Send Money model.
-- Adds per-provider personal numbers to landlord_profiles.
-- Adds BKASH, NAGAD, ROCKET as specific payment method values.
-- ============================================================

-- Add per-provider personal numbers to landlord_profiles
ALTER TABLE landlord_profiles
  ADD COLUMN IF NOT EXISTS bkash_personal_number  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS nagad_personal_number   VARCHAR(20),
  ADD COLUMN IF NOT EXISTS rocket_personal_number  VARCHAR(20);

-- Extend the payment_method enum with specific MFS providers
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'BKASH';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'NAGAD';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'ROCKET';
