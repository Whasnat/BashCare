CREATE TABLE IF NOT EXISTS maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenant_profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    issue_type VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'LOW',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_landlord ON maintenance_requests(landlord_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant ON maintenance_requests(tenant_id);

ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view maintenance for their properties"
    ON maintenance_requests FOR SELECT
    USING (landlord_id = current_setting('app.current_landlord_id', TRUE)::uuid);

CREATE POLICY "Landlords can insert maintenance for their properties"
    ON maintenance_requests FOR INSERT
    WITH CHECK (landlord_id = current_setting('app.current_landlord_id', TRUE)::uuid);

CREATE POLICY "Landlords can update maintenance for their properties"
    ON maintenance_requests FOR UPDATE
    USING (landlord_id = current_setting('app.current_landlord_id', TRUE)::uuid);

CREATE POLICY "Landlords can delete maintenance for their properties"
    ON maintenance_requests FOR DELETE
    USING (landlord_id = current_setting('app.current_landlord_id', TRUE)::uuid);
