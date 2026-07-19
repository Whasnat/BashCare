-- Add a flag to indicate if a late fee was manually waived by the landlord.
-- This prevents the daily cron job from re-applying the auto late fee on an overdue invoice.
ALTER TABLE ledger_invoices ADD COLUMN late_fee_waived BOOLEAN DEFAULT FALSE;
