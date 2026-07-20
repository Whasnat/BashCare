-- Migration: Add Activity Logs table
-- Applied to: new activity_logs table

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who performed the action (can be null for system actions)
    entity_type VARCHAR(50) NOT NULL, -- e.g., 'TENANT', 'INVOICE', 'MAINTENANCE', 'PAYMENT', 'LEASE'
    entity_id UUID, -- ID of the affected record
    action VARCHAR(50) NOT NULL, -- e.g., 'CREATED', 'UPDATED', 'DELETED', 'PAID', 'VERIFIED'
    description TEXT NOT NULL, -- Human readable summary of the event
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying by landlord and entity
CREATE INDEX IF NOT EXISTS idx_activity_logs_landlord ON activity_logs(landlord_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
