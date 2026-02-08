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
- **Email**: Resend (confirmation & password reset)
- **Messaging**: Telegram Bot API (webhook mode)
- **CRM**: Bitrix24 REST API (via webhook URL)

### Key Components
1. **Agent Management** - Multi-agent support with per-agent configuration
2. **5-Step Onboarding Wizard** - Business → Knowledge → Settings → Test → Connect
3. **Semantic RAG System** - OpenAI embeddings with smart chunking
4. **Chat Simulator** - Browser-based agent testing before deployment
5. **Sales Pipeline** - 6-stage funnel with objection handling
6. **Agent Performance Dashboard** - Analytics with charts and KPIs
7. **Email Confirmation Flow** - User verification before login
8. **Bitrix24 CRM Integration** - Full webhook-based CRM access
9. **CRM Chat** - AI-powered chat for querying CRM data

---

## User Flow

```
Register → Confirm Email → Login → Agents Page → [Create New Agent] → 5-Step Wizard → Test → Connect Telegram
                                        ↓
                                View Agent Dashboard → CRM Chat / Manage Settings / Knowledge / Leads
```

---

## New Features (2026-02-08)

### Email Confirmation System ✅
- Registration creates user with `email_confirmed=false`
- Sends confirmation email via Resend
- Login blocked (403) until email confirmed
- Resend confirmation option available
- Password reset flow with email link

### Bitrix24 CRM Integration ✅
Full webhook-based CRM integration:

**Connection Flow:**
1. User goes to Connections page
2. Enters Bitrix24 webhook URL (from portal's inbound webhooks)
3. System tests connection automatically
4. CRM data becomes available

**Capabilities:**
- **Leads**: List, create, update, search by phone
- **Deals**: List, view, track pipeline
- **Products**: Browse catalog, search, pricing
- **Contacts**: Find by phone, view purchase history
- **Analytics**: Conversion rates, top products, trends

### CRM Chat ✅
AI-powered chat interface for querying CRM data:
- Access from Agent Dashboard via "CRM Chat" button
- Ask natural language questions:
  - "What are our top selling products?"
  - "Show me recent leads"
  - "What's our conversion rate?"
  - "How many deals are in the pipeline?"
- Powered by GPT-4o with live CRM data context

---

## API Endpoints

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register (sends confirmation email) |
| `/api/auth/login` | POST | Login (requires confirmed email) |
| `/api/auth/confirm-email` | GET | Confirm email with token |
| `/api/auth/resend-confirmation` | POST | Resend confirmation email |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password` | POST | Reset password with token |

### Bitrix24 CRM
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bitrix-crm/connect` | POST | Connect with webhook URL |
| `/api/bitrix-crm/status` | GET | Get connection status |
| `/api/bitrix-crm/test` | POST | Test connection |
| `/api/bitrix-crm/disconnect` | POST | Disconnect CRM |
| `/api/bitrix-crm/leads` | GET | List leads |
| `/api/bitrix-crm/deals` | GET | List deals |
| `/api/bitrix-crm/products` | GET | List products |
| `/api/bitrix-crm/analytics` | GET | Get analytics |
| `/api/bitrix-crm/chat` | POST | CRM Chat AI queries |

### Agent & Telegram
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List all agents |
| `/api/chat/test` | POST | Test agent in browser |
| `/api/telegram/bot` | POST/GET/DELETE | Manage Telegram bot |
| `/api/telegram/webhook` | POST | Telegram webhook handler |

---

## Database Schema Additions Needed

**tenants table:**
```sql
ALTER TABLE tenants ADD COLUMN bitrix_webhook_url TEXT;
ALTER TABLE tenants ADD COLUMN bitrix_connected_at TIMESTAMPTZ;
```

**users table:**
```sql
ALTER TABLE users ADD COLUMN reset_token TEXT;
ALTER TABLE users ADD COLUMN reset_token_expiry TIMESTAMPTZ;
```

**documents table:**
```sql
ALTER TABLE documents ADD COLUMN chunk_count INTEGER;
ALTER TABLE documents ADD COLUMN chunks_data JSONB;
```

---

## Test Credentials
- **Email**: test2@teleagent.uz
- **Password**: testpass123
- **Status**: email_confirmed=true

---

## Test Reports
- `/app/test_reports/iteration_9.json` - Latest (100% pass rate, 64 tests)
- All backend tests: 64/64 passed
- Frontend tests: All features verified

---

## Files Reference

### Backend
- `/app/backend/server.py` - Main FastAPI app
- `/app/backend/bitrix_crm.py` - Bitrix24 CRM client
- `/app/backend/document_processor.py` - RAG processing
- `/app/backend/.env` - Environment variables (Resend key configured)

### Frontend
- `/app/frontend/src/App.js` - Routes (includes CRM Chat)
- `/app/frontend/src/pages/LoginPage.js` - Auth with confirmation flow
- `/app/frontend/src/pages/ConfirmEmail.js` - Email confirmation page
- `/app/frontend/src/pages/ResetPassword.js` - Password reset page
- `/app/frontend/src/pages/CRMChatPage.js` - CRM Chat interface
- `/app/frontend/src/pages/ConnectionsPage.js` - Bitrix24 connection UI
- `/app/frontend/src/pages/AgentDashboard.js` - CRM Chat button added

### Test Files
- `/app/backend/tests/test_bitrix_crm.py` - Bitrix24 CRM tests
- `/app/backend/tests/test_api_endpoints.py` - API tests
- `/app/backend/tests/test_bug_fixes.py` - Bug fix tests

---

## Backlog

### P0 (Critical) - DONE ✅
- [x] Email confirmation via Resend
- [x] Bitrix24 CRM integration (webhook)
- [x] CRM Chat feature

### P1 (High)
- [ ] Add DB columns for full persistence
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
