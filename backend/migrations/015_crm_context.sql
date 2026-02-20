-- Migration 015: Add crm_context column to dashboard_configs
-- Pre-computed CRM data summary for Bobur's context-aware chat
ALTER TABLE dashboard_configs ADD COLUMN IF NOT EXISTS crm_context JSONB DEFAULT '{}';
