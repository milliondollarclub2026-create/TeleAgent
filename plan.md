# LeadRelay CRM Integration Plan

## Overview

Expand LeadRelay's CRM integrations beyond Bitrix24 and Google Sheets. Target markets: Qatar, Australia, and global SMBs.

---

## Current State

| Integration | Status | Auth Method | File |
|-------------|--------|-------------|------|
| Bitrix24 | Live | OAuth 2.0 + Fernet-encrypted tokens | `backend/bitrix_crm.py` |
| Google Sheets | Live | Spreadsheet URL + API key | `backend/server.py` (inline) |

Architecture pattern: On lead qualification, `process_channel_message()` triggers CRM push. Each CRM has a service module with `push_lead()`, `sync_contact()`, and `get_pipeline()` methods.

---

## Target CRMs (Priority Order)

### 1. HubSpot (Priority: HIGH)

**Why**: Largest SMB CRM globally. Free plan includes full API. Huge in Australia, growing in MENA.

#### API Details
- **Base URL**: `https://api.hubapi.com`
- **Auth**: OAuth 2.0 (authorization code grant)
  - Auth URL: `https://app.hubspot.com/oauth/authorize`
  - Token URL: `https://api.hubapi.com/oauth/v1/token`
  - Scopes: `crm.objects.contacts.write`, `crm.objects.deals.write`, `crm.objects.companies.write`
- **Rate Limits (Free)**: 100 requests/10 seconds, 250,000/day
- **Rate Limits (Paid)**: 190 requests/10 seconds, 650,000-1,000,000/day
- **SDK**: Official Python SDK available (`hubspot-api-client`)
- **Docs**: https://developers.hubspot.com/docs/api/overview

#### Key Endpoints
| Action | Method | Endpoint |
|--------|--------|----------|
| Create contact | POST | `/crm/v3/objects/contacts` |
| Update contact | PATCH | `/crm/v3/objects/contacts/{id}` |
| Create deal | POST | `/crm/v3/objects/deals` |
| Search contacts | POST | `/crm/v3/objects/contacts/search` |
| Get pipelines | GET | `/crm/v3/pipelines/deals` |
| Create note | POST | `/crm/v3/objects/notes` |
| Associate objects | PUT | `/crm/v4/objects/{from}/{id}/associations/{to}/{toId}` |

#### Data Mapping (LeadRelay to HubSpot)
| LeadRelay Field | HubSpot Property |
|----------------|-----------------|
| lead.name | `firstname` + `lastname` |
| lead.phone | `phone` |
| lead.email | `email` |
| lead.source | `hs_lead_source` (custom) |
| lead.score | `hs_lead_status` |
| lead.stage | Deal `dealstage` |
| conversation summary | Note `hs_note_body` |

#### Integration Architecture
```
backend/
  hubspot_crm.py          # HubSpot service module
    - HubSpotCRM class
    - connect(auth_code)   # OAuth token exchange
    - push_lead(lead)      # Create/update contact + deal
    - sync_contact(data)   # Update existing contact
    - get_pipelines()      # Fetch deal pipelines
    - refresh_token()      # Auto-refresh expired tokens
```

#### Estimated Effort: 1 day
- OAuth flow: 2 hours (same pattern as Bitrix24)
- Contact/Deal push: 3 hours
- Pipeline sync: 1 hour
- Frontend setup page: 2 hours
- Testing: 1 hour

---

### 2. Zoho CRM (Priority: HIGH)

**Why**: Dominates Middle East and Australia. Very popular with SMBs in Qatar/UAE/Saudi. Free plan for up to 3 users.

#### API Details
- **Base URL**: `https://www.zohoapis.com/crm/v7` (varies by data center)
- **Data Centers**:
  - US: `zohoapis.com`
  - EU: `zohoapis.eu`
  - India: `zohoapis.in`
  - Australia: `zohoapis.com.au`
  - Japan: `zohoapis.jp`
  - China: `zohoapis.com.cn`
- **Auth**: OAuth 2.0
  - Auth URL: `https://accounts.zoho.com/oauth/v2/auth`
  - Token URL: `https://accounts.zoho.com/oauth/v2/token`
  - Scopes: `ZohoCRM.modules.ALL`, `ZohoCRM.settings.ALL`
  - **Important**: Access tokens expire in 1 hour. Refresh tokens are single-use (each refresh gives a new refresh token). Must store the latest refresh token every time.
- **Rate Limits**: 4,000-25,000 requests/day (varies by plan and user count)
- **SDK**: Official Python SDK available (`zohocrmsdk7_0`)
- **Docs**: https://www.zoho.com/crm/developer/docs/api/v7/

#### Key Endpoints
| Action | Method | Endpoint |
|--------|--------|----------|
| Create lead | POST | `/crm/v7/Leads` |
| Create contact | POST | `/crm/v7/Contacts` |
| Create deal | POST | `/crm/v7/Deals` |
| Search records | GET | `/crm/v7/{module}/search?criteria=...` |
| Get fields | GET | `/crm/v7/settings/fields?module={module}` |
| Create note | POST | `/crm/v7/Notes` |
| Convert lead | POST | `/crm/v7/Leads/{id}/actions/convert` |

#### Data Mapping (LeadRelay to Zoho)
| LeadRelay Field | Zoho Field |
|----------------|-----------|
| lead.name | `First_Name` + `Last_Name` |
| lead.phone | `Phone` |
| lead.email | `Email` |
| lead.source | `Lead_Source` |
| lead.score | `Rating` |
| lead.stage | Deal `Stage` |
| conversation summary | Note `Note_Content` |

#### Integration Quirks
- **Single-use refresh tokens**: Each token refresh returns a new refresh token. Must update stored token after every refresh. Missing an update = permanent disconnection.
- **Multi-datacenter**: Must detect and store user's data center during OAuth. Australian users hit `.com.au`, Middle East users typically hit `.com` (US) or `.eu`.
- **Module naming**: Uses `Leads` (pre-qualified) and `Contacts` (post-qualified) as separate modules. May need to map LeadRelay's pipeline stages to Zoho's lead-to-contact conversion flow.

#### Integration Architecture
```
backend/
  zoho_crm.py              # Zoho service module
    - ZohoCRM class
    - connect(auth_code, dc) # OAuth + data center detection
    - push_lead(lead)        # Create lead or contact + deal
    - sync_contact(data)     # Update existing record
    - convert_lead(id)       # Lead to contact conversion
    - refresh_token()        # Single-use refresh token handling
    - get_pipelines()        # Fetch deal stages
```

#### Estimated Effort: 1 day
- OAuth flow + datacenter handling: 3 hours
- Lead/Contact/Deal push: 3 hours
- Token refresh (single-use quirk): 1 hour
- Frontend setup page: 2 hours
- Testing: 1 hour

---

### 3. Freshsales (Priority: MEDIUM)

**Why**: Growing in MENA region. Simplest API of the four. Quick win.

#### API Details
- **Base URL**: `https://{domain}.freshsales.io/api`
- **Auth**: API key (passed as `Authorization: Token token={api_key}` header)
  - No OAuth needed. User provides their API key and domain.
  - API key found in: Freshsales > Settings > API Settings
- **Rate Limits**: 1,000 requests/hour (all plans)
- **SDK**: No official Python SDK. Use `requests` directly.
- **Docs**: https://developers.freshworks.com/crm/api/

#### Key Endpoints
| Action | Method | Endpoint |
|--------|--------|----------|
| Create contact | POST | `/api/contacts` |
| Update contact | PUT | `/api/contacts/{id}` |
| Create deal | POST | `/api/deals` |
| Search contacts | GET | `/api/lookup?q={query}&f=email&entities=contact` |
| List pipelines | GET | `/api/deals/filters` |
| Create note | POST | `/api/contacts/{id}/notes` |
| Create task | POST | `/api/tasks` |

#### Data Mapping (LeadRelay to Freshsales)
| LeadRelay Field | Freshsales Field |
|----------------|-----------------|
| lead.name | `first_name` + `last_name` |
| lead.phone | `mobile_number` |
| lead.email | `email` |
| lead.source | `lead_source_id` |
| lead.score | `lead_score` |
| lead.stage | Deal `deal_stage_id` |
| conversation summary | Note `description` |

#### Integration Quirks
- **API key auth**: Simpler than OAuth but less secure. Key is a static secret.
- **Domain-based URL**: Each Freshsales account has a unique subdomain. Must store per tenant.
- **No webhook support**: Freshsales doesn't push events to us. All sync is push-only from LeadRelay.

#### Integration Architecture
```
backend/
  freshsales_crm.py        # Freshsales service module
    - FreshsalesCRM class
    - connect(domain, api_key) # Validate credentials
    - push_lead(lead)          # Create contact + deal
    - sync_contact(data)       # Update existing contact
    - get_pipelines()          # Fetch deal stages
```

#### Estimated Effort: 0.5 day
- API key setup flow: 1 hour
- Contact/Deal push: 2 hours
- Frontend setup page: 1.5 hours
- Testing: 0.5 hours

---

### 4. Salesforce (Priority: LOW)

**Why**: Enterprise standard (#1 globally, 21% market share). Complex but opens the biggest market. Only pursue when enterprise customers ask for it.

#### API Details
- **Base URL**: `https://{instance}.salesforce.com/services/data/v62.0`
- **Auth**: OAuth 2.0 (Web Server Flow)
  - Auth URL: `https://login.salesforce.com/services/oauth2/authorize`
  - Token URL: `https://login.salesforce.com/services/oauth2/token`
  - Must create a "Connected App" in each customer's Salesforce org
  - Scopes: `api`, `refresh_token`
  - **Important**: Instance URL varies per customer (na1, eu1, ap1, etc.)
- **Rate Limits**: 15,000/day (Developer), 100,000+/day (Enterprise)
- **SDK**: `simple-salesforce` Python library (unofficial but widely used)
- **Docs**: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/

#### Key Endpoints
| Action | Method | Endpoint |
|--------|--------|----------|
| Create lead | POST | `/services/data/v62.0/sobjects/Lead` |
| Create contact | POST | `/services/data/v62.0/sobjects/Contact` |
| Create opportunity | POST | `/services/data/v62.0/sobjects/Opportunity` |
| SOQL query | GET | `/services/data/v62.0/query/?q=SELECT...` |
| Describe object | GET | `/services/data/v62.0/sobjects/{object}/describe` |
| Create task/note | POST | `/services/data/v62.0/sobjects/Task` |

#### Data Mapping (LeadRelay to Salesforce)
| LeadRelay Field | Salesforce Field |
|----------------|-----------------|
| lead.name | `FirstName` + `LastName` |
| lead.phone | `Phone` |
| lead.email | `Email` |
| lead.source | `LeadSource` |
| lead.score | `Rating` |
| lead.stage | Opportunity `StageName` |
| conversation summary | Task `Description` |

#### Integration Quirks
- **Highly customized orgs**: Every Salesforce customer has custom fields, objects, and workflows. Field names may differ across customers.
- **SOQL query language**: Searching requires learning SOQL (SQL-like but Salesforce-specific).
- **Connected App setup**: Requires customers to create a Connected App in their Salesforce org and provide client ID/secret. More onboarding friction.
- **Instance URLs**: Each customer has a different instance URL. Must store per tenant.
- **API versions**: Must specify API version (e.g., v62.0). Older orgs may need older versions.
- **Governor limits**: Salesforce has complex "governor limits" beyond just API rate limits (e.g., max 200 records per DML operation).

#### Integration Architecture
```
backend/
  salesforce_crm.py         # Salesforce service module
    - SalesforceCRM class
    - connect(auth_code)     # OAuth + instance URL detection
    - push_lead(lead)        # Create Lead or Contact + Opportunity
    - sync_contact(data)     # Update existing record
    - search(soql_query)     # SOQL search wrapper
    - refresh_token()        # Standard OAuth refresh
    - describe_object(name)  # Get custom field metadata
    - get_pipelines()        # Fetch Opportunity stages
```

#### Estimated Effort: 2-3 days
- OAuth + Connected App flow: 4 hours
- Lead/Contact/Opportunity push: 4 hours
- SOQL search and field mapping: 3 hours
- Custom field handling: 2 hours
- Frontend setup page: 3 hours
- Testing across different org configs: 4 hours

---

## Implementation Order

| Phase | CRM | Effort | Market Coverage |
|-------|-----|--------|----------------|
| Phase 1 | HubSpot | 1 day | Global SMBs, Australia |
| Phase 2 | Zoho CRM | 1 day | Qatar, Middle East, Australia |
| Phase 3 | Freshsales | 0.5 day | MENA, growing globally |
| Phase 4 | Salesforce | 2-3 days | Enterprise, when demand exists |

**Total estimated effort**: 4.5-5.5 days

---

## Shared Architecture

All CRM integrations will follow the same pattern established by `bitrix_crm.py`:

```python
# backend/{crm_name}_crm.py

class CRMService:
    def __init__(self, tenant_id: str, credentials: dict):
        """Initialize with tenant's stored credentials."""
        pass

    async def push_lead(self, lead: dict) -> dict:
        """Push a qualified lead to the CRM. Returns CRM record ID."""
        pass

    async def sync_contact(self, contact: dict) -> dict:
        """Update an existing CRM contact with new conversation data."""
        pass

    async def get_pipelines(self) -> list:
        """Fetch available deal/opportunity pipelines and stages."""
        pass

    async def search_contact(self, query: str) -> list:
        """Search for existing contacts to prevent duplicates."""
        pass

    async def refresh_token(self) -> None:
        """Refresh OAuth tokens if applicable."""
        pass
```

### Database Changes Needed

```sql
-- Extend tenant_configs or create crm_connections table
CREATE TABLE crm_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    crm_type VARCHAR(20) NOT NULL,  -- 'hubspot', 'zoho', 'freshsales', 'salesforce', 'bitrix24'
    credentials JSONB NOT NULL,      -- Encrypted OAuth tokens, API keys, instance URLs
    pipeline_id VARCHAR(100),        -- Selected pipeline/stage mapping
    is_active BOOLEAN DEFAULT true,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ,
    UNIQUE(tenant_id, crm_type)
);

-- RLS policy
ALTER TABLE crm_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_connections_tenant ON crm_connections
    USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
```

### Frontend Changes Needed

Each CRM needs a setup page following the existing pattern:
- `frontend/src/pages/HubSpotSetupPage.js`
- `frontend/src/pages/ZohoSetupPage.js`
- `frontend/src/pages/FreshsalesSetupPage.js`
- `frontend/src/pages/SalesforceSetupPage.js`

Each setup page:
1. Shows CRM logo and description
2. OAuth connect button (or API key input for Freshsales)
3. Pipeline selection after connecting
4. "After connecting" panel (black icons, white icon color, green on hover)
5. Connection status and disconnect option

### ConnectionsPage.js Updates
Add new CRM cards to the "Data Sources & CRM" section alongside Bitrix24 and Google Sheets.

---

## Pricing Tier Considerations

CRM integrations tie directly into pricing:

| Tier | CRM Access |
|------|-----------|
| Free | Google Sheets only |
| Pro | Google Sheets + 1 CRM (HubSpot, Zoho, Freshsales, or Bitrix24) |
| Business | All CRMs + Salesforce |

This creates natural upgrade pressure: free users outgrow Sheets, Pro users want multiple CRMs or Salesforce.

---

## API Keys and Environment Variables

Each CRM integration will need:

| CRM | Env Variables |
|-----|--------------|
| HubSpot | `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET` |
| Zoho | `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET` |
| Freshsales | None (user provides API key directly) |
| Salesforce | `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET` |

Register OAuth apps at:
- HubSpot: https://developers.hubspot.com/
- Zoho: https://api-console.zoho.com/
- Salesforce: Create Connected App in Salesforce Setup

---

## Notes

- All OAuth tokens must be Fernet-encrypted at rest (same as Bitrix24)
- All CRM operations must be tenant-scoped (tenant_id checked on every call)
- Duplicate detection: search CRM for existing contact before creating new one
- Error handling: CRM API failures must not block the conversation flow (log and continue)
- Rate limiting: implement backoff/retry for CRM API rate limit responses (429)
