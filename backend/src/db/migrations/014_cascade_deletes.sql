-- ============================================================
-- BashaCare Migration 014: Enforce ON DELETE CASCADE
-- ============================================================

-- Ensure that deleting a property perfectly cascades down to all related records

-- 1. Units -> Properties
ALTER TABLE units DROP CONSTRAINT IF EXISTS units_property_id_fkey;
ALTER TABLE units ADD CONSTRAINT units_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;

-- 2. Agreements -> Units
ALTER TABLE agreements DROP CONSTRAINT IF EXISTS agreements_unit_id_fkey;
ALTER TABLE agreements DROP CONSTRAINT IF EXISTS leases_unit_id_fkey;
ALTER TABLE agreements ADD CONSTRAINT agreements_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;

-- 3. Utility Meter Logs -> Units
ALTER TABLE utility_meter_logs DROP CONSTRAINT IF EXISTS utility_meter_logs_unit_id_fkey;
ALTER TABLE utility_meter_logs ADD CONSTRAINT utility_meter_logs_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;

-- 4. Utility Meter Logs -> Agreements
ALTER TABLE utility_meter_logs DROP CONSTRAINT IF EXISTS utility_meter_logs_agreement_id_fkey;
ALTER TABLE utility_meter_logs DROP CONSTRAINT IF EXISTS utility_meter_logs_lease_id_fkey;
ALTER TABLE utility_meter_logs ADD CONSTRAINT utility_meter_logs_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES agreements(id) ON DELETE CASCADE;

-- 5. Ledger Invoices -> Agreements
ALTER TABLE ledger_invoices DROP CONSTRAINT IF EXISTS ledger_invoices_agreement_id_fkey;
ALTER TABLE ledger_invoices DROP CONSTRAINT IF EXISTS ledger_invoices_lease_id_fkey;
ALTER TABLE ledger_invoices ADD CONSTRAINT ledger_invoices_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES agreements(id) ON DELETE CASCADE;

-- 6. Ledger Adjustments -> Invoices
ALTER TABLE ledger_adjustments DROP CONSTRAINT IF EXISTS ledger_adjustments_invoice_id_fkey;
ALTER TABLE ledger_adjustments ADD CONSTRAINT ledger_adjustments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES ledger_invoices(id) ON DELETE CASCADE;

-- 7. Payment Transactions -> Invoices
ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_invoice_id_fkey;
ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES ledger_invoices(id) ON DELETE CASCADE;

-- 8. Maintenance Requests -> Properties
ALTER TABLE maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_property_id_fkey;
ALTER TABLE maintenance_requests ADD CONSTRAINT maintenance_requests_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;

-- 9. Maintenance Requests -> Units
ALTER TABLE maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_unit_id_fkey;
ALTER TABLE maintenance_requests ADD CONSTRAINT maintenance_requests_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;
