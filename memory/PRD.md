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
- **RAG**: OpenAI text-embedding-3-small + in-memory vector search
- **Email**: Resend (for confirmation emails)
- **Messaging**: Telegram Bot API (webhook mode)
- **CRM**: Bitrix24 MCP (planned), currently demo mode

### Key Components
1. **Agent Management** - Multi-agent support with per-agent configuration
2. **5-Step Onboarding Wizard** - Business → Knowledge → Settings → Test → Connect
3. **Semantic RAG System** - OpenAI embeddings with smart chunking
4. **Chat Simulator** - Browser-based agent testing before deployment
5. **Sales Pipeline** - 6-stage funnel with objection handling
6. **Agent Performance Dashboard** - Analytics with charts and KPIs
7. **Email Confirmation Flow** - User verification before login

---

## User Flow

```
Register → Confirm Email → Login → Agents Page → [Create New Agent] → 5-Step Wizard → Test → Connect Telegram
                                        ↓
                                View Agent Dashboard → Manage Settings/Knowledge/Leads
```

### Authentication Flow (Updated 2026-02-08)
1. User registers with email, password, name, business
2. System creates user with `email_confirmed=false`
3. Confirmation email sent via Resend
4. User clicks link in email → `/confirm-email?token=...`
5. Token validated, user marked as confirmed
6. User can now log in
7. Login blocked with 403 if email not confirmed

---

## Bug Fixes Completed (2026-02-08)

### Bug 0: Email Confirmation
**Status**: ✅ FIXED
- Registration creates unconfirmed users
- Login blocked with 403 and helpful message if not confirmed
- Confirmation email sent via Resend
- Resend confirmation option available
- Password reset flow implemented (requires DB columns)

### Bug 1: RAG/Knowledge Base  
**Status**: ✅ FIXED (with limitations)
- Documents now store actual extracted content
- Embeddings cached in memory and loaded from DB
- Test chat returns `rag_context_used` and `rag_context_count`
- **Note**: Full persistence requires `chunks_data` column in documents table

### Bug 2: Telegram Bot Error
**Status**: ✅ FIXED
- Improved error handling in webhook
- Better logging for debugging
- Graceful degradation on errors
- HTML parse mode fallback

---

## Bitrix24 MCP Integration (Planned)

A detailed technical design document has been created at `/app/memory/BITRIX24_MCP_INTEGRATION.md` covering:
- Data model (add columns to tenants table)
- BitrixMcpClient class for API calls
- Backend endpoints: connect, test, disconnect, status
- Frontend UI component
- Security considerations
- Implementation phases

---

## API Endpoints Reference

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user (sends confirmation email) |
| `/api/auth/login` | POST | Login (requires confirmed email) |
| `/api/auth/confirm-email` | GET | Confirm email with token |
| `/api/auth/resend-confirmation` | POST | Resend confirmation email |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password` | POST | Reset password with token |
| `/api/auth/me` | GET | Get current user |

### Agent Management
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List all agents |
| `/api/agents/{id}` | DELETE | Delete agent |
| `/api/chat/test` | POST | Test agent in browser |

### Telegram
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/telegram/bot` | POST/GET/DELETE | Manage Telegram bot |
| `/api/telegram/webhook` | POST | Telegram webhook handler |

### Dashboard & Analytics
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/stats` | GET | KPI statistics |
| `/api/dashboard/analytics` | GET | Comprehensive analytics |
| `/api/leads` | GET | List leads |

### Documents (RAG)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents` | GET/POST | Knowledge base |
| `/api/documents/upload` | POST | Upload file with embedding |
| `/api/documents/search` | POST | Semantic search |

---

## Database Schema Requirements

### Missing Columns (Need to add in Supabase)

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

**tenants table (for Bitrix24 MCP):**
```sql
ALTER TABLE tenants ADD COLUMN bitrix_mcp_token TEXT;
ALTER TABLE tenants ADD COLUMN bitrix_mcp_url TEXT DEFAULT 'https://mcp.bitrix24.com/mcp/';
ALTER TABLE tenants ADD COLUMN bitrix_mcp_connected_at TIMESTAMPTZ;
```

---

## Test Credentials
- **Email**: test2@teleagent.uz
- **Password**: testpass123
- **Note**: This user has `email_confirmed=true`

---

## Known Limitations

| Feature | Status | Notes |
|---------|--------|-------|
| Email Sending | NEEDS API KEY | Resend placeholder key - actual emails won't be sent |
| RAG Persistence | PARTIAL | Works in memory, DB columns needed for persistence |
| Password Reset | NEEDS DB | Requires reset_token columns |
| Bitrix24 CRM | MOCKED | Design complete, implementation pending |
| Google Sheets | NOT IMPLEMENTED | Shows "Coming Soon" |

---

## Backlog

### P0 (Critical)
- [ ] Add missing DB columns (users: reset_token, documents: chunks_data)
- [ ] Configure real Resend API key
- [ ] Implement Bitrix24 MCP integration

### P1 (High)
- [ ] Conversation History & Viewer page
- [ ] Follow-up Automation system
- [ ] Human Takeover feature

### P2 (Medium)
- [ ] Multi-user access with roles
- [ ] Visual conversation flow builder
- [ ] E-commerce integration (Shopify)

### P3 (Low)
- [ ] Voice message support
- [ ] WhatsApp integration
- [ ] Broadcast messaging

---

## Test Reports
- `/app/test_reports/iteration_8.json` - Latest (100% pass rate, 43 tests)
- `/app/backend/tests/test_bug_fixes.py` - Bug fix test suite
- `/app/backend/tests/test_api_endpoints.py` - 23 API tests

---

## Files Reference

### Backend
- `/app/backend/server.py` - Main FastAPI app
- `/app/backend/document_processor.py` - RAG processing
- `/app/backend/.env` - Environment variables

### Frontend
- `/app/frontend/src/App.js` - Routes
- `/app/frontend/src/pages/LoginPage.js` - Auth with confirmation flow
- `/app/frontend/src/pages/ConfirmEmail.js` - Email confirmation page
- `/app/frontend/src/pages/ResetPassword.js` - Password reset page
- `/app/frontend/src/pages/AgentsPage.js` - Agent listing
- `/app/frontend/src/pages/AgentOnboarding.js` - 5-step wizard
- `/app/frontend/src/pages/AgentDashboard.js` - Performance analytics

### Documentation
- `/app/memory/PRD.md` - This file
- `/app/memory/BITRIX24_MCP_INTEGRATION.md` - Bitrix24 MCP technical design
