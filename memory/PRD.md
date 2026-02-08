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
- **Messaging**: Telegram Bot API (webhook mode)
- **CRM**: Bitrix24 REST API (DEMO mode currently)

### Key Components
1. **Telegram Webhook Handler** - Receives and processes incoming messages
2. **Sales Agent Orchestrator** - Main conversation flow controller with 6-stage sales pipeline
3. **LLM Service** - OpenAI integration with enhanced prompts for sales
4. **Lead Scoring Engine** - Hot/Warm/Cold classification with scores 0-100
5. **Admin Dashboard** - Multi-tenant configuration UI with "Emerald Graphite" theme

---

## UI/UX Design - Emerald Graphite Theme

### Color Palette
- **Background**: #F5F7F6 (light gray-green)
- **Primary**: #059669 (emerald-600)
- **Text**: #111827 (slate-900)
- **Secondary**: Various slate tones

### Key UI Features
- Collapsible sidebar (w-56 expanded, w-[68px] collapsed)
- Logo in top left corner
- Premium minimal icons (lucide-react)
- Plus Jakarta Sans for headings, Inter for body text
- Smooth 200ms transitions

---

## Sales Pipeline (6 Stages)

1. **Awareness** - Customer just discovered us
2. **Interest** - Customer is engaged and asking questions
3. **Consideration** - Customer is evaluating options
4. **Intent** - Customer shows buying signals
5. **Evaluation** - Customer is making final decision
6. **Purchase** - Customer is ready to buy

---

## What's Been Implemented

### 2026-02-08 - Backend Rewrite & UI Redesign
**Backend Features:**
- Enhanced sales pipeline with 6 stages
- Objection playbook (5 default objections with strategies)
- Closing scripts (soft, assumptive, urgency, alternative, summary)
- Required fields collection (name, phone, product, budget, timeline)
- All APIs handle missing Supabase columns gracefully
- Bitrix24 endpoints in demo mode

**Frontend Features:**
- "Emerald Graphite" light theme
- Collapsible sidebar with logo in top left
- Premium lucide-react icons throughout
- Responsive design for mobile
- All pages redesigned (Login, Dashboard, Leads, Connections, Sales Agent, Knowledge Base)

**Backend APIs (19 endpoints - all tested):**
- `/api/auth/register` - User registration
- `/api/auth/login` - User login
- `/api/auth/me` - Get current user
- `/api/dashboard/stats` - KPI statistics with leads_by_stage
- `/api/dashboard/leads-per-day` - Chart data
- `/api/leads` - List leads with filtering
- `/api/leads/{id}/status` - Update lead status
- `/api/leads/{id}/stage` - Update sales stage
- `/api/config` - Tenant configuration CRUD
- `/api/config/defaults` - Get default templates
- `/api/documents` - Knowledge base CRUD
- `/api/telegram/bot` - Telegram bot connection
- `/api/telegram/webhook` - Webhook handler
- `/api/integrations/status` - All integrations status
- `/api/bitrix/status` - Bitrix demo status
- `/api/health` - Health check

---

## Core Requirements (Static)

### Implemented ✅
- [x] Telegram AI agent (text messages)
- [x] Lead qualification (hot/warm/cold + score 0-100)
- [x] Sales pipeline tracking (6 stages)
- [x] Objection handling playbook
- [x] Closing scripts library
- [x] Multi-tenant admin dashboard
- [x] Business info configuration
- [x] Knowledge base document upload
- [x] Lead tracking and management
- [x] Dashboard with KPIs and charts
- [x] English/Russian/Uzbek language support
- [x] Password visibility toggle
- [x] Supabase database integration
- [x] Collapsible sidebar
- [x] "Emerald Graphite" light theme

### Upcoming (P1)
- [ ] Real Bitrix24 OAuth integration
- [ ] Google Sheets fallback
- [ ] Vector search (RAG) for documents
- [ ] Email confirmation with actual emails

### Future (P2)
- [ ] Voice/audio message support
- [ ] WhatsApp integration
- [ ] Advanced analytics
- [ ] Smart follow-up scheduling

---

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login and get JWT |
| `/api/auth/me` | GET | Get current user |
| `/api/telegram/bot` | POST/GET/DELETE | Manage Telegram bot |
| `/api/telegram/webhook` | POST | Telegram webhook handler |
| `/api/dashboard/stats` | GET | KPI statistics |
| `/api/dashboard/leads-per-day` | GET | Leads chart data |
| `/api/leads` | GET | List leads |
| `/api/leads/{id}/status` | PUT | Update lead status |
| `/api/leads/{id}/stage` | PUT | Update sales stage |
| `/api/config` | GET/PUT | Tenant configuration |
| `/api/config/defaults` | GET | Default templates |
| `/api/documents` | GET/POST | Knowledge base |
| `/api/documents/{id}` | DELETE | Delete document |
| `/api/integrations/status` | GET | Integration status |
| `/api/bitrix/status` | GET | Bitrix demo status |

---

## Test Credentials
- **Email**: test2@teleagent.uz
- **Password**: testpass123

---

## Notes

- **Database**: Supabase PostgreSQL with all core tables
- **Bitrix24**: MOCKED - Running in demo mode, leads stored locally
- **Google Sheets**: NOT IMPLEMENTED - Button shows "Coming Soon"
- **Email Confirmation**: Token generated but emails not actually sent
- **RAG**: Basic keyword matching (vector search planned)
- **Supabase Schema**: Some new columns (sales_stage, closing_scripts) may not exist - code handles gracefully
