# TeleAgent - AI Sales Agent for Telegram + Bitrix24

## Project Overview
**Product**: AI Sales Agent for Telegram with CRM Integration  
**Target Market**: SMEs in Uzbekistan  
**Languages**: Uzbek (O'zbek tili) and Russian (Русский)

---

## Architecture

### Tech Stack
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **LLM**: OpenAI GPT-4o
- **Messaging**: Telegram Bot API (webhook mode)
- **CRM**: Bitrix24 REST API (DEMO mode currently)

### Key Components
1. **Telegram Webhook Handler** - Receives and processes incoming messages
2. **Sales Agent Orchestrator** - Main conversation flow controller
3. **LLM Service** - OpenAI integration for generating responses
4. **Lead Scoring Engine** - Hot/Warm/Cold classification
5. **Admin Dashboard** - Multi-tenant configuration UI

---

## User Personas

### 1. Tenant Admin (Business Owner/Sales Manager)
- Connects Telegram bot and configures AI behavior
- Monitors leads and performance metrics
- Uploads business documents for RAG

### 2. End Customers  
- Chat with AI agent on Telegram
- Receive sales assistance in Uzbek/Russian

---

## Core Requirements (Static)

### Must Have ✅
- [x] Telegram AI agent (text messages)
- [x] Lead qualification (hot/warm/cold + score)
- [x] Multi-tenant admin dashboard
- [x] Business info configuration
- [x] Knowledge base document upload
- [x] Lead tracking and management
- [x] Dashboard with KPIs and charts

### Should Have
- [ ] Real Bitrix24 OAuth integration
- [ ] Google Sheets fallback
- [ ] Returning customer detection with purchase history
- [ ] Vector search (RAG) for documents

### Could Have
- [ ] Voice/audio message support
- [ ] WhatsApp integration
- [ ] Advanced analytics

---

## What's Been Implemented

### 2026-02-08 - Initial MVP
**Backend APIs:**
- User authentication (register/login/me)
- Telegram bot connection with webhook
- Dashboard stats and leads-per-day
- Leads CRUD with filtering
- Tenant config management
- Knowledge base documents CRUD
- Integration status endpoint

**Frontend Pages:**
- Login/Register with split-screen design
- Dashboard with KPI cards and charts
- Connections (Telegram/Bitrix/Sheets)
- Sales Agent configuration
- Knowledge Base management
- Leads table with filters

**LLM Integration:**
- OpenAI GPT-4o for sales conversations
- JSON structured output for lead actions
- Bilingual responses (Uzbek/Russian)
- Lead classification with explanations

---

## Prioritized Backlog

### P0 - Critical (Next Sprint)
1. Real Bitrix24 OAuth integration
2. Google Sheets fallback storage
3. Returning customer detection

### P1 - Important
1. Vector search (pgvector/embeddings) for RAG
2. Conversation summarization for CRM
3. Phone number collection flow
4. Lead export functionality

### P2 - Nice to Have
1. Prompt version management UI
2. A/B testing for prompts
3. Advanced analytics dashboard
4. Webhook retry mechanism
5. Rate limiting for Telegram

---

## API Endpoints

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
| `/api/config` | GET/PUT | Tenant configuration |
| `/api/documents` | GET/POST | Knowledge base |
| `/api/documents/{id}` | DELETE | Delete document |
| `/api/integrations/status` | GET | Integration status |

---

## Notes

- **Bitrix24**: Currently in DEMO mode - leads stored in MongoDB
- **Database**: Using MongoDB instead of Supabase (connection issues)
- **Telegram Bot Token**: Provided by user, webhook auto-configured
- **OpenAI**: Using user's API key for GPT-4o calls
