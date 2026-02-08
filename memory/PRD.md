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
- Receive sales assistance in Uzbek/Russian/English

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
- [x] English language support
- [x] Password visibility toggle
- [x] Supabase database integration

### Should Have
- [ ] Real Bitrix24 OAuth integration
- [ ] Google Sheets fallback
- [ ] Email confirmation with actual email sending
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
- Password visibility toggle (Eye/EyeOff)
- Dashboard with KPI cards and charts
- Connections (Telegram/Bitrix/Sheets)
- Sales Agent configuration (with English option)
- Knowledge Base management
- Leads table with filters

**LLM Integration:**
- OpenAI GPT-4o for sales conversations
- JSON structured output for lead actions
- Trilingual responses (Uzbek/Russian/English)
- Lead classification with explanations

### 2026-02-08 - Supabase Migration
- Migrated from MongoDB to Supabase PostgreSQL
- All tables created with proper indexes
- Service Role key authentication

---

## Sales Agent Behavior

The AI Sales Agent operates with these key behaviors:

1. **Goal Hierarchy:**
   - Understand customer needs through targeted questions
   - Propose appropriate products/services
   - Close the sale or get commitment
   - Gather qualification data and classify lead

2. **Lead Classification:**
   - **HOT**: Customer wants to buy NOW, has budget, ready to proceed
   - **WARM**: Interested but needs more info, comparing options
   - **COLD**: Just browsing, no clear interest

3. **Communication:**
   - Detects and responds in customer's language
   - Professional yet warm tone (configurable)
   - Concise messages, avoids long paragraphs

---

## RAG System

**Current Implementation:** Keyword-based document search
- Supports: Text documents (pasted content)
- Search: Finds documents with matching keywords
- Returns: Top 5 relevant snippets (500 chars each)

**What to Upload:**
- Product catalogs with prices
- Service descriptions
- FAQ and objections
- Company policies
- Contact info and hours

---

## Prioritized Backlog

### P0 - Critical (Next Sprint)
1. Real Bitrix24 OAuth integration
2. Google Sheets fallback storage
3. Email confirmation with actual emails

### P1 - Important
1. Vector embeddings for semantic RAG search
2. File upload (PDF, DOCX) with extraction
3. Phone number collection flow
4. Lead export functionality

### P2 - Nice to Have
1. Prompt version management UI
2. A/B testing for prompts
3. Advanced analytics dashboard

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login and get JWT |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/confirm/{token}` | GET | Confirm email |
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

- **Database**: Supabase PostgreSQL with all tables created
- **Bitrix24**: Currently in DEMO mode - leads stored in Supabase
- **Email Confirmation**: Token generated but emails not actually sent
- **RAG**: Basic keyword matching (vector search planned)
