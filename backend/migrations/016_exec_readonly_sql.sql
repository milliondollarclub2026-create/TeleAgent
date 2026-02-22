-- exec_readonly_sql: Safe SQL execution RPC for Bobur v4 agentic loop.
-- Sets tenant context via session variables, enforces read-only, 5s timeout.

CREATE OR REPLACE FUNCTION exec_readonly_sql(
    p_tenant_id TEXT,
    p_crm_source TEXT,
    p_query TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Reject write operations
    IF p_query ~* '\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|MERGE)\b' THEN
        RAISE EXCEPTION 'Write operations are not allowed';
    END IF;

    -- Set session variables for RLS policies
    PERFORM set_config('app.tenant_id', p_tenant_id, true);
    PERFORM set_config('app.crm_source', p_crm_source, true);

    -- Set statement timeout
    PERFORM set_config('statement_timeout', '5000', true);

    -- Execute and return as JSONB array
    EXECUTE format(
        'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t',
        p_query
    ) INTO result;

    RETURN result;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION exec_readonly_sql(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_readonly_sql(TEXT, TEXT, TEXT) TO service_role;

-- Ensure RLS is enabled on all CRM tables
ALTER TABLE IF EXISTS crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS crm_users ENABLE ROW LEVEL SECURITY;

-- RLS policies using session variables (cast to UUID for tenant_id)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exec_sql_tenant_isolation_deals') THEN
        CREATE POLICY exec_sql_tenant_isolation_deals ON crm_deals
            FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND crm_source = current_setting('app.crm_source', true));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exec_sql_tenant_isolation_leads') THEN
        CREATE POLICY exec_sql_tenant_isolation_leads ON crm_leads
            FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND crm_source = current_setting('app.crm_source', true));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exec_sql_tenant_isolation_contacts') THEN
        CREATE POLICY exec_sql_tenant_isolation_contacts ON crm_contacts
            FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND crm_source = current_setting('app.crm_source', true));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exec_sql_tenant_isolation_companies') THEN
        CREATE POLICY exec_sql_tenant_isolation_companies ON crm_companies
            FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND crm_source = current_setting('app.crm_source', true));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exec_sql_tenant_isolation_activities') THEN
        CREATE POLICY exec_sql_tenant_isolation_activities ON crm_activities
            FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND crm_source = current_setting('app.crm_source', true));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exec_sql_tenant_isolation_users') THEN
        CREATE POLICY exec_sql_tenant_isolation_users ON crm_users
            FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND crm_source = current_setting('app.crm_source', true));
    END IF;
END $$;
