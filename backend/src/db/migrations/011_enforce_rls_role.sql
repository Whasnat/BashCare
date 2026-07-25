-- ============================================================
-- BashaCare Migration 011
-- Enforce RLS by creating a non-superuser role for the app
-- ============================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'bashacare_rls_user') THEN
    CREATE ROLE bashacare_rls_user;
  END IF;
END
$$;

-- Grant permissions to the new role
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bashacare_rls_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bashacare_rls_user;

-- Allow the current user (e.g. neondb_owner) to switch to this role
GRANT bashacare_rls_user TO current_user;

-- Ensure future tables and sequences also have permissions granted
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO bashacare_rls_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO bashacare_rls_user;
