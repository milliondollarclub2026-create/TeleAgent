# Migration Guide

How to apply database migrations for a new Supabase project or disaster recovery.

---

## Migration files

All migrations live in two locations (consolidate to one in a future cleanup):

| File | Location | Contents |
|------|----------|----------|
| `schema.sql` | `/schema.sql` | Original tables: tenants, users, telegram_bots, customers, conversations, messages, leads, documents, agent_document_overrides, tenant_configs, event_logs |
| `002_bitrix_and_lead_fixes.sql` | `/migrations/` | Adds bitrix_webhook_url + bitrix_connected_at to tenant_configs; unique index on leads |
| `003_google_sheets_columns.sql` | `/backend/migrations/` | Adds Google Sheets columns to tenant_configs |
| `004_instagram_integration.sql` | `/migrations/` | Instagram OAuth columns |
| `005_unique_active_instagram_account.sql` | `/migrations/` | Unique constraint on Instagram accounts |
| **`006_crm_dashboard_core.sql`** | `/backend/migrations/` | **CRM sync, dashboard, chat, and agent observability tables** |

---

## Applying to a new Supabase project

Run in this exact order in the **Supabase SQL Editor** (Dashboard → SQL Editor → New query):

```
1.  schema.sql
2.  migrations/002_bitrix_and_lead_fixes.sql
3.  migrations/004_instagram_integration.sql
4.  migrations/005_unique_active_instagram_account.sql
5.  backend/migrations/003_google_sheets_columns.sql
6.  backend/migrations/006_crm_dashboard_core.sql
```

All statements use `IF NOT EXISTS` — safe to re-run on an existing database.

### Via psql (CI / local dev)

```bash
# Set your Supabase connection string
export DB_URL="postgresql://postgres:<password>@<project>.supabase.co:5432/postgres"

psql "$DB_URL" -f schema.sql
psql "$DB_URL" -f migrations/002_bitrix_and_lead_fixes.sql
psql "$DB_URL" -f migrations/004_instagram_integration.sql
psql "$DB_URL" -f migrations/005_unique_active_instagram_account.sql
psql "$DB_URL" -f backend/migrations/003_google_sheets_columns.sql
psql "$DB_URL" -f backend/migrations/006_crm_dashboard_core.sql
```

---

## Verification queries

Run these after applying migration 006 to confirm all tables and indexes exist.

### 1. Confirm all 11 new tables exist

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'crm_connections',
    'crm_sync_status',
    'crm_leads',
    'crm_deals',
    'crm_contacts',
    'crm_companies',
    'crm_activities',
    'dashboard_configs',
    'dashboard_widgets',
    'dashboard_chat_messages',
    'agent_traces'
  )
ORDER BY table_name;
-- Expected: 11 rows
```

### 2. Confirm unique constraints

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'uq_crm_connections_tenant_crm_type',
    'uq_crm_sync_status_tenant_source_entity',
    'uq_crm_leads_tenant_source_external',
    'uq_crm_deals_tenant_source_external',
    'uq_crm_contacts_tenant_source_external',
    'uq_crm_companies_tenant_source_external',
    'uq_crm_activities_tenant_source_external'
  )
ORDER BY tablename;
-- Expected: 7 rows
```

### 3. Confirm performance indexes

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_crm_leads_tenant_modified',
    'idx_crm_leads_tenant_created',
    'idx_crm_deals_tenant_modified',
    'idx_crm_deals_tenant_created',
    'idx_crm_deals_won',
    'idx_crm_deals_closed_at',
    'idx_crm_activities_tenant_started',
    'idx_dashboard_widgets_tenant_active_position',
    'idx_agent_traces_tenant_created'
  )
ORDER BY tablename;
-- Expected: 9 rows
```

### 4. Confirm soft-delete column on dashboard_widgets

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'dashboard_widgets'
  AND column_name = 'deleted_at';
-- Expected: 1 row, data_type = 'timestamp with time zone', is_nullable = 'YES'
```

### 5. Confirm updated_at trigger on dashboard_configs

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trg_dashboard_configs_updated_at';
-- Expected: 1 row
```

### 6. Smoke-test insert round-trip (run after connecting a test tenant)

```sql
-- Insert a test config
INSERT INTO dashboard_configs (tenant_id, onboarding_state)
SELECT id, 'not_started'
FROM tenants
LIMIT 1
ON CONFLICT (tenant_id) DO NOTHING;

-- Verify it reads back
SELECT tenant_id, onboarding_state, created_at
FROM dashboard_configs
ORDER BY created_at DESC
LIMIT 1;

-- Clean up
DELETE FROM dashboard_configs WHERE onboarding_state = 'not_started';
```

---

## Known schema gaps (documented, not hidden)

| Gap | Impact | Fix |
|-----|--------|-----|
| `crm_activities.employee_name` always NULL | Activity-by-rep charts show ID not name | Add Bitrix user lookup to `BitrixAdapter._normalize_activity()` |
| `crm_activities.modified_at` never populated | Incremental sync cursor is NULL for activities; full re-fetch every 15 min | Set `modified_at` from Bitrix `LAST_UPDATED` in normalize |
| No stage history table | Cannot compute time-in-stage velocity | Add `crm_stage_history` table; capture on incremental delta |
| No deal→lead FK | Cannot track true lead→deal conversion | Capture Bitrix `DEAL_ID` on lead rows if available |
