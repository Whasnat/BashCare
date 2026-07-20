-- Migration: Add cost to maintenance requests
-- Applied to: maintenance_requests table

ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS cost NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS billed_invoice_id UUID REFERENCES ledger_invoices(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_billed_invoice ON maintenance_requests(billed_invoice_id);
