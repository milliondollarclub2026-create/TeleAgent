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
- **Messaging**: Telegram Bot API (webhook mode)
- **CRM**: Bitrix24 REST API (DEMO mode currently)

### Key Components
1. **Agent Management** - Multi-agent support with per-agent configuration
2. **5-Step Onboarding Wizard** - Business → Knowledge → Settings → Test → Connect
3. **Semantic RAG System** - OpenAI embeddings with smart chunking
4. **Chat Simulator** - Browser-based agent testing before deployment
5. **Sales Pipeline** - 6-stage funnel with objection handling

---

## User Flow

```
Login → Agents Page → [Create New Agent] → 5-Step Wizard → Test → Connect Telegram
                   ↓
           View Agent Dashboard → Manage Settings/Knowledge/Leads
```

### Empty State (No Agents)
- Shows large CTA: "Create Your First AI Agent"
- Explains what the agent can do
- "Takes about 2 minutes to set up"

### Agents List
- Shows all agents with: Name, Status (Active/Inactive), Conversations count, Leads count
- Hover reveals dropdown: View Dashboard, Settings, Delete
- "New Agent" button in header

---

## 5-Step Onboarding Wizard

### Step 1: Business Info
- Business Name (required)
- Business Description (required)
- Products/Services (optional)

### Step 2: Knowledge Base
- Drag-and-drop file upload
- Supports: PDF, DOCX, Excel, CSV, Images, TXT
- Files are chunked and embedded for semantic search
- Can skip and add later

### Step 3: Settings
**Communication Style:**
- Tone: Professional / Friendly Professional / Casual / Luxury
- Primary Language: Uzbek / Russian / English
- Response Length: Concise / Balanced / Detailed
- Emoji Usage: Never / Minimal / Moderate / Frequent

**Messages:**
- Greeting Message (auto-generates if empty)
- Closing Message (when ready to buy)

**Rate Limiting:**
- Response Delay: 0-5 seconds
- Max Messages/Minute: 5-20 or Unlimited

**Lead Collection:**
- Toggle: Name, Phone, Product Interest, Budget, Location

### Step 4: Test Chat
- Browser-based chat simulator
- Shows agent greeting with business name
- Expandable Debug Panel (stage, hotness, score, RAG used)
- Reset button to start fresh
- Hint: "Try asking about your products, prices, or delivery"

### Step 5: Connect
- Telegram bot token input
- Instructions to get token from @BotFather
- Bitrix24 CRM (Coming Soon)
- Can skip and connect later

---

## RAG System (Semantic Search)

### Document Processing Pipeline
1. **Upload** - Accept PDF, DOCX, Excel, CSV, Images, TXT
2. **Extraction** - PyMuPDF for PDF, python-docx for Word, pandas for Excel, GPT-4V for images
3. **Chunking** - Smart sentence-based chunking with overlap
4. **Embedding** - OpenAI text-embedding-3-small (1536 dimensions)
5. **Storage** - In-memory cache per document

### Search Flow
1. User sends message
2. Generate query embedding
3. Cosine similarity search across all document chunks
4. Return top-5 most relevant chunks (min 25% similarity)
5. Inject context into LLM prompt

---

## What's Been Implemented

### 2026-02-08 - Major Restructure
**New Agent Management Flow:**
- Users land on /agents page (not dashboard)
- Empty state with CTA if no agents
- Agent cards showing status and stats
- 5-step onboarding wizard

**Enhanced RAG:**
- File upload with automatic chunking
- OpenAI embeddings (text-embedding-3-small)
- Semantic search across documents
- Image description via GPT-4V

**Chat Simulator:**
- Browser-based testing before Telegram
- Shows AI responses in real-time
- Debug panel with stage, hotness, score

**API Endpoints Added:**
- `/api/agents` - List agents with stats
- `/api/agents/{id}` - Delete agent
- `/api/chat/test` - Browser chat testing
- `/api/documents/upload` - File upload with embedding
- `/api/documents/search` - Semantic search

---

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List all agents |
| `/api/agents/{id}` | DELETE | Delete agent |
| `/api/chat/test` | POST | Test agent in browser |
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login and get JWT |
| `/api/auth/me` | GET | Get current user |
| `/api/telegram/bot` | POST/GET/DELETE | Manage Telegram bot |
| `/api/telegram/webhook` | POST | Telegram webhook handler |
| `/api/dashboard/stats` | GET | KPI statistics |
| `/api/leads` | GET | List leads |
| `/api/config` | GET/PUT | Tenant configuration |
| `/api/documents` | GET/POST | Knowledge base |
| `/api/documents/upload` | POST | Upload file with embedding |
| `/api/documents/search` | POST | Semantic search |
| `/api/integrations/status` | GET | Integration status |

---

## Test Credentials
- **Email**: test2@teleagent.uz
- **Password**: testpass123

---

## Notes

- **Database**: Supabase PostgreSQL
- **Embeddings**: Stored in memory cache (not pgvector yet)
- **Bitrix24**: MOCKED - Running in demo mode
- **Google Sheets**: NOT IMPLEMENTED - Button shows "Coming Soon"
- **Email Confirmation**: Token generated but emails not sent

---

## Backlog

### P1 (Next)
- Persist embeddings to database (add chunks column or use pgvector)
- Real Bitrix24 OAuth integration
- Agent detail dashboard (scoped analytics)

### P2
- Custom field builder (list-based)
- Objection handler configuration
- Google Sheets fallback

### P3
- Voice message support
- WhatsApp integration
- Advanced analytics
