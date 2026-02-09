# TeleAgent - AI Sales Agent for Telegram + Bitrix24

## Project Overview
**Product**: AI Sales Agent for Telegram with CRM Integration  
**Target Market**: SMEs in Uzbekistan  
**Languages**: Uzbek (O'zbek tili), Russian (Русский), and English

---

## Architecture

### Tech Stack
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **LLM**: OpenAI GPT-4o
- **RAG**: OpenAI text-embedding-3-small + semantic search
- **Email**: Supabase Auth (native email confirmation)
- **Messaging**: Telegram Bot API (webhook mode)
- **CRM**: Bitrix24 REST API (via webhook URL)

### Key Components
1. **Agent Management** - Multi-agent support with per-agent configuration
2. **5-Step Onboarding Wizard** - Business → Knowledge → Settings → Test → Connect
3. **Semantic RAG System** - OpenAI embeddings with smart chunking
4. **Chat Simulator** - Browser-based agent testing before deployment
5. **Sales Pipeline** - 6-stage funnel with objection handling
6. **Agent Performance Dashboard** - Analytics with charts and KPIs
7. **Email Confirmation Flow** - Supabase Auth handles verification
8. **Bitrix24 CRM Integration** - Full webhook-based CRM access ✅
9. **CRM Chat** - AI-powered chat for querying CRM data ✅

---

## Completed Features (2026-02-09)

### Bitrix24 CRM Integration ✅ FULLY WORKING
Full webhook-based CRM integration with real data access:

**Connection Flow:**
1. User goes to Connections page
2. Enters Bitrix24 webhook URL (from portal's inbound webhooks)
3. System tests connection automatically
4. CRM data becomes available immediately

**Verified Capabilities:**
- **Leads**: List 50+ leads, with status breakdown (Muhokama, Tasdiqlandi, Yangi lead, etc.)
- **Products**: Browse catalog (Tiramisu - 20,000 KZT)
- **Analytics**: Conversion rates, lead sources, deal stages
- **Real-time data**: All API calls return actual CRM data

**API Endpoints (All Working):**
| Endpoint | Status | Description |
|----------|--------|-------------|
| `/api/bitrix-crm/connect` | ✅ | Connect with webhook URL |
| `/api/bitrix-crm/status` | ✅ | Get connection status |
| `/api/bitrix-crm/test` | ✅ | Test connection |
| `/api/bitrix-crm/disconnect` | ✅ | Disconnect CRM |
| `/api/bitrix-crm/leads` | ✅ | List leads (50 leads returned) |
| `/api/bitrix-crm/products` | ✅ | List products |
| `/api/bitrix-crm/analytics` | ✅ | Get analytics |
| `/api/bitrix-crm/chat` | ✅ | CRM Chat AI queries |

### CRM Chat ✅ FULLY WORKING
AI-powered chat interface for querying CRM data:

**Features:**
- Access from Agent Dashboard via "CRM Chat" button
- Suggested questions for quick start
- Natural language queries in English, Russian, Uzbek
- AI analyzes real CRM data and provides insights

**Example Queries Tested:**
- "Show me recent leads" → Returns list of 50 leads with status/source
- "What are our top selling products?" → Analyzes sales data
- "What's our conversion rate?" → Returns 0.0% (no deals yet)
- "Give me a CRM overview" → Full summary with metrics

---

## Database Schema Requirements

**⚠️ USER ACTION REQUIRED for Persistence:**

The Bitrix24 connection currently works but stores data in memory only. For persistence across server restarts, add these columns to `tenant_configs` table in Supabase:

```sql
-- Run this in Supabase SQL Editor
ALTER TABLE tenant_configs 
ADD COLUMN IF NOT EXISTS bitrix_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS bitrix_connected_at TIMESTAMPTZ;
```

---

## Test Reports

**Latest Test (iteration_10.json):**
- Backend: 100% (11/11 Bitrix integration tests passed)
- Frontend: 100% (All CRM features working)
- CRM Chat: Verified with real data responses
- All features tested with actual Bitrix24 CRM data

**Real CRM Data Verified:**
- Total Leads: 50
- Products: 1 (Tiramisu - 20,000)
- Portal User: Ishaq Ansari
- CRM Mode: SIMPLE

---

## Test Credentials
- **Email**: test2@teleagent.uz
- **Password**: testpass123
- **Bitrix24 Webhook**: https://b24-48tcii.bitrix24.kz/rest/15/3rncfhh9z5j9opvf/

---

## Files Reference

### Backend
- `/app/backend/server.py` - Main FastAPI app with Bitrix24 endpoints
- `/app/backend/bitrix_crm.py` - Bitrix24 CRM client (enhanced)
- `/app/backend/document_processor.py` - RAG processing
- `/app/backend/.env` - Environment variables

### Frontend
- `/app/frontend/src/App.js` - Routes (includes CRM Chat)
- `/app/frontend/src/pages/CRMChatPage.js` - CRM Chat interface
- `/app/frontend/src/pages/ConnectionsPage.js` - Bitrix24 connection UI
- `/app/frontend/src/pages/AgentDashboard.js` - CRM Chat button

### Test Files
- `/app/test_reports/iteration_10.json` - Latest test results
- `/app/backend/tests/test_bitrix_real_integration.py` - Real Bitrix tests

---

## Backlog

### P0 (Critical) - DONE ✅
- [x] Bitrix24 CRM integration (webhook)
- [x] CRM Chat feature with AI analysis
- [x] All Bitrix API endpoints working

### P1 (High) - PENDING USER ACTION
- [ ] Add DB columns for full persistence (user must run SQL)
- [ ] Conversation History & Viewer page
- [ ] Customer recognition in Telegram bot

### P2 (Medium)
- [ ] Follow-up Automation system
- [ ] Human Takeover feature
- [ ] Multi-user access with roles

### P3 (Low)
- [ ] Voice message support
- [ ] WhatsApp integration
- [ ] Broadcast messaging
- [ ] Lead sync from Telegram to Bitrix24
