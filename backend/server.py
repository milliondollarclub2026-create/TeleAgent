"""AI Sales Agent for Telegram + Bitrix24 - Enhanced Version with Sales Pipeline"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request, BackgroundTasks
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import secrets
import jwt
import httpx
from openai import AsyncOpenAI
import json
from supabase import create_client, Client

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

app = FastAPI(title="TeleAgent - AI Sales Agent")
api_router = APIRouter(prefix="/api")

# ============ Configuration ============
JWT_SECRET = os.environ.get('JWT_SECRET', 'teleagent-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
TELEGRAM_API_BASE = "https://api.telegram.org/bot"

# OpenAI client
openai_client = AsyncOpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

# ============ Sales Pipeline Constants ============
SALES_STAGES = {
    "awareness": {"order": 1, "name": "Awareness", "goal": "Educate about products/services"},
    "interest": {"order": 2, "name": "Interest", "goal": "Qualify needs and understand requirements"},
    "consideration": {"order": 3, "name": "Consideration", "goal": "Present tailored options"},
    "intent": {"order": 4, "name": "Intent", "goal": "Handle objections, build urgency"},
    "evaluation": {"order": 5, "name": "Evaluation", "goal": "Address final concerns, offer incentives"},
    "purchase": {"order": 6, "name": "Purchase", "goal": "Close the sale, collect final details"}
}

DEFAULT_OBJECTION_PLAYBOOK = [
    {
        "objection": "Too expensive / Price is high",
        "keywords": ["expensive", "costly", "price", "budget", "afford", "cheap"],
        "response_strategy": "Emphasize value over cost. Break down ROI. Mention payment plans if available. Compare quality to cheaper alternatives."
    },
    {
        "objection": "Need to think about it",
        "keywords": ["think about", "consider", "not sure", "maybe later", "need time"],
        "response_strategy": "Create soft urgency. Ask what specific concerns they have. Offer to answer any questions. Suggest a follow-up time."
    },
    {
        "objection": "Need to consult spouse/partner/boss",
        "keywords": ["ask my", "check with", "spouse", "partner", "boss", "manager", "wife", "husband"],
        "response_strategy": "Offer to provide summary they can share. Ask if you can include them in conversation. Respect the process but maintain engagement."
    },
    {
        "objection": "Found cheaper elsewhere",
        "keywords": ["cheaper", "competitor", "other store", "found better", "saw lower"],
        "response_strategy": "Acknowledge competition. Highlight unique value propositions. Mention warranty, support, quality differences."
    },
    {
        "objection": "Not the right time",
        "keywords": ["not now", "bad time", "later", "next month", "not ready"],
        "response_strategy": "Understand their timeline. Offer to reserve pricing. Schedule follow-up. Ask what would make it the right time."
    }
]

DEFAULT_CLOSING_SCRIPTS = {
    "soft_close": {
        "name": "Soft Close",
        "script": "Based on everything you've shared, {product} seems like a great fit for your needs. Would you like me to help you get started?",
        "use_when": "Customer shows interest but hasn't committed"
    },
    "assumptive_close": {
        "name": "Assumptive Close", 
        "script": "Perfect! I'll set that up for you right away. What's the best phone number for order confirmation?",
        "use_when": "Customer has shown strong buying signals"
    },
    "urgency_close": {
        "name": "Urgency Close",
        "script": "I can hold this special offer until {deadline}, but I'd need to confirm your interest today. Shall I reserve it for you?",
        "use_when": "Customer is hesitating, needs push"
    },
    "alternative_close": {
        "name": "Alternative Close",
        "script": "Would you prefer the {option_a} or the {option_b}? Both are excellent choices for your situation.",
        "use_when": "Customer can't decide between options"
    },
    "summary_close": {
        "name": "Summary Close",
        "script": "So to recap: you're looking for {need}, and {product} at {price} includes {benefits}. This checks all your boxes - ready to proceed?",
        "use_when": "After presenting full solution"
    }
}

DEFAULT_REQUIRED_FIELDS = {
    "name": {"required": True, "label": "Customer Name", "ask_prompt": "May I have your name?"},
    "phone": {"required": True, "label": "Phone Number", "ask_prompt": "What's the best phone number to reach you?"},
    "product": {"required": True, "label": "Product Interest", "ask_prompt": "Which product are you interested in?"},
    "budget": {"required": False, "label": "Budget", "ask_prompt": "What budget range are you working with?"},
    "timeline": {"required": False, "label": "Timeline", "ask_prompt": "When are you looking to make this purchase?"}
}


# ============ Auth Helpers ============
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{password_hash}"

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, hash_value = stored_hash.split(":")
        return hashlib.sha256(f"{salt}{password}".encode()).hexdigest() == hash_value
    except Exception:
        return False

def create_access_token(user_id: str, tenant_id: str, email: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    return jwt.encode({"user_id": user_id, "tenant_id": tenant_id, "email": email, "exp": expiration.timestamp()}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Optional[Dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except:
        return None

def generate_confirmation_token() -> str:
    return secrets.token_urlsafe(32)

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ============ Pydantic Models ============
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    business_name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    token: str
    user: Dict[str, Any]
    message: Optional[str] = None

class TelegramBotCreate(BaseModel):
    bot_token: str

class TenantConfigUpdate(BaseModel):
    vertical: Optional[str] = None
    business_name: Optional[str] = None
    business_description: Optional[str] = None
    products_services: Optional[str] = None
    faq_objections: Optional[str] = None
    collect_phone: Optional[bool] = None
    greeting_message: Optional[str] = None
    agent_tone: Optional[str] = None
    primary_language: Optional[str] = None
    objection_playbook: Optional[List[Dict]] = None
    closing_scripts: Optional[Dict] = None
    required_fields: Optional[Dict] = None
    active_promotions: Optional[List[Dict]] = None

class DocumentCreate(BaseModel):
    title: str
    content: str

class BitrixConnectRequest(BaseModel):
    bitrix_domain: str
    client_id: str
    client_secret: str

class LeadResponse(BaseModel):
    id: str
    customer_name: Optional[str]
    customer_phone: Optional[str]
    status: str
    sales_stage: str
    final_hotness: str
    score: int
    intent: Optional[str]
    product: Optional[str]
    llm_explanation: Optional[str]
    source_channel: str
    fields_collected: Optional[Dict]
    created_at: str
    last_interaction_at: str

class DashboardStats(BaseModel):
    total_conversations: int
    total_leads: int
    hot_leads: int
    warm_leads: int
    cold_leads: int
    returning_customers: int
    leads_today: int
    conversion_rate: float
    leads_by_stage: Dict[str, int]

class LeadsPerDay(BaseModel):
    date: str
    count: int
    hot: int
    warm: int
    cold: int


# ============ Auth Middleware ============
async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token_data = verify_token(token)
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return token_data


# ============ Auth Endpoints ============
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    result = supabase.table('users').select('*').eq('email', request.email).execute()
    if result.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    tenant_id = str(uuid.uuid4())
    tenant = {"id": tenant_id, "name": request.business_name, "timezone": "Asia/Tashkent", "created_at": now_iso()}
    supabase.table('tenants').insert(tenant).execute()
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id, "email": request.email, "password_hash": hash_password(request.password),
        "name": request.name, "tenant_id": tenant_id, "role": "admin",
        "email_confirmed": False, "confirmation_token": generate_confirmation_token(), "created_at": now_iso()
    }
    supabase.table('users').insert(user).execute()
    
    # Create default config - only include columns that exist in the database
    config = {
        "tenant_id": tenant_id, "business_name": request.business_name, "collect_phone": True,
        "agent_tone": "professional", "primary_language": "uz", "vertical": "default"
    }
    try:
        supabase.table('tenant_configs').insert(config).execute()
    except Exception as e:
        logger.warning(f"Could not create tenant config: {e}")
    
    token = create_access_token(user_id, tenant_id, request.email)
    return AuthResponse(
        token=token,
        user={"id": user_id, "email": request.email, "name": request.name, "tenant_id": tenant_id, "business_name": tenant["name"], "email_confirmed": False},
        message="Account created! A confirmation email has been sent."
    )


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    result = supabase.table('users').select('*').eq('email', request.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = result.data[0]
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    tenant_result = supabase.table('tenants').select('*').eq('id', user['tenant_id']).execute()
    tenant = tenant_result.data[0] if tenant_result.data else None
    
    token = create_access_token(user["id"], user["tenant_id"], user["email"])
    return AuthResponse(
        token=token,
        user={"id": user["id"], "email": user["email"], "name": user.get("name"), "tenant_id": user["tenant_id"], "business_name": tenant["name"] if tenant else None, "email_confirmed": user.get("email_confirmed", False)}
    )


@api_router.get("/auth/me")
async def get_me(current_user: Dict = Depends(get_current_user)):
    result = supabase.table('users').select('*').eq('id', current_user["user_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = result.data[0]
    tenant_result = supabase.table('tenants').select('*').eq('id', user['tenant_id']).execute()
    tenant = tenant_result.data[0] if tenant_result.data else None
    
    return {"id": user["id"], "email": user["email"], "name": user.get("name"), "tenant_id": user["tenant_id"], "business_name": tenant["name"] if tenant else None, "email_confirmed": user.get("email_confirmed", False)}


# ============ Telegram Service ============
async def get_bot_info(bot_token: str) -> Optional[Dict]:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{TELEGRAM_API_BASE}{bot_token}/getMe", timeout=30.0)
            data = response.json()
            return data.get("result") if data.get("ok") else None
    except Exception as e:
        logger.error(f"Failed to get bot info: {e}")
        return None

async def set_telegram_webhook(bot_token: str, webhook_url: str) -> Dict:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{TELEGRAM_API_BASE}{bot_token}/setWebhook", json={"url": webhook_url, "allowed_updates": ["message"], "drop_pending_updates": True}, timeout=30.0)
            return response.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}

async def delete_telegram_webhook(bot_token: str) -> Dict:
    try:
        async with httpx.AsyncClient() as client:
            return (await client.post(f"{TELEGRAM_API_BASE}{bot_token}/deleteWebhook", timeout=30.0)).json()
    except Exception as e:
        return {"ok": False, "error": str(e)}

async def send_telegram_message(bot_token: str, chat_id: int, text: str) -> bool:
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{TELEGRAM_API_BASE}{bot_token}/sendMessage", json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"}, timeout=30.0)
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Failed to send message: {e}")
        return False

async def send_typing_action(bot_token: str, chat_id: int):
    try:
        async with httpx.AsyncClient() as client:
            await client.post(f"{TELEGRAM_API_BASE}{bot_token}/sendChatAction", json={"chat_id": chat_id, "action": "typing"}, timeout=10.0)
    except:
        pass


# ============ Telegram Bot Endpoints ============
@api_router.post("/telegram/bot")
async def connect_telegram_bot(request: TelegramBotCreate, current_user: Dict = Depends(get_current_user)):
    bot_info = await get_bot_info(request.bot_token)
    if not bot_info:
        raise HTTPException(status_code=400, detail="Invalid bot token")
    
    tenant_id = current_user["tenant_id"]
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://aisales-hub-1.preview.emergentagent.com')
    webhook_url = f"{backend_url}/api/telegram/webhook"
    
    result = supabase.table('telegram_bots').select('*').eq('tenant_id', tenant_id).execute()
    bot_id = result.data[0]['id'] if result.data else str(uuid.uuid4())
    
    bot_data = {"id": bot_id, "tenant_id": tenant_id, "bot_token": request.bot_token, "bot_username": bot_info.get("username"), "webhook_url": webhook_url, "is_active": True, "created_at": now_iso()}
    
    if result.data:
        supabase.table('telegram_bots').update(bot_data).eq('id', bot_id).execute()
    else:
        supabase.table('telegram_bots').insert(bot_data).execute()
    
    await set_telegram_webhook(request.bot_token, webhook_url)
    return {"id": bot_id, "bot_username": bot_info.get("username"), "is_active": True, "webhook_url": webhook_url}


@api_router.get("/telegram/bot")
async def get_telegram_bot(current_user: Dict = Depends(get_current_user)):
    result = supabase.table('telegram_bots').select('*').eq('tenant_id', current_user["tenant_id"]).execute()
    if not result.data:
        return None
    bot = result.data[0]
    return {"id": bot["id"], "bot_username": bot.get("bot_username"), "is_active": bot.get("is_active", False), "webhook_url": bot.get("webhook_url"), "last_webhook_at": bot.get("last_webhook_at")}


@api_router.delete("/telegram/bot")
async def disconnect_telegram_bot(current_user: Dict = Depends(get_current_user)):
    result = supabase.table('telegram_bots').select('*').eq('tenant_id', current_user["tenant_id"]).execute()
    if result.data:
        await delete_telegram_webhook(result.data[0]["bot_token"])
        supabase.table('telegram_bots').update({"is_active": False}).eq('id', result.data[0]['id']).execute()
    return {"success": True}


# ============ Bitrix24 OAuth Endpoints ============
# Note: integrations_bitrix table may not exist in Supabase schema yet
# These endpoints will return placeholder responses until the table is created

@api_router.post("/bitrix/connect")
async def connect_bitrix(request: BitrixConnectRequest, current_user: Dict = Depends(get_current_user)):
    """Store Bitrix24 credentials and return OAuth URL for user to authorize"""
    # Note: Bitrix integration requires 'integrations_bitrix' table in Supabase
    # For now, return placeholder with OAuth URL
    redirect_uri = f"{os.environ.get('REACT_APP_BACKEND_URL')}/api/bitrix/callback"
    oauth_url = f"https://{request.bitrix_domain}/oauth/authorize/?client_id={request.client_id}&response_type=code&redirect_uri={redirect_uri}"
    
    return {"oauth_url": oauth_url, "message": "Bitrix24 integration pending database setup. OAuth URL generated.", "is_demo": True}


@api_router.get("/bitrix/callback")
async def bitrix_callback(code: str, state: Optional[str] = None):
    """Handle OAuth callback from Bitrix24"""
    # Placeholder until integrations_bitrix table exists
    return RedirectResponse(url="/connections?info=bitrix_setup_pending")


@api_router.get("/bitrix/status")
async def get_bitrix_status(current_user: Dict = Depends(get_current_user)):
    # Return demo status until integrations_bitrix table exists
    return {"connected": False, "is_demo": True, "domain": None, "message": "Bitrix24 integration available in demo mode"}


# ============ Enhanced LLM Service ============
def get_enhanced_system_prompt(config: Dict, lead_context: Dict = None) -> str:
    """Generate comprehensive system prompt with sales pipeline awareness"""
    
    business_name = config.get('business_name', 'our company')
    business_description = config.get('business_description', '')
    products_services = config.get('products_services', '')
    agent_tone = config.get('agent_tone', 'professional')
    collect_phone = config.get('collect_phone', True)
    
    # Get objection playbook
    objection_playbook = config.get('objection_playbook', DEFAULT_OBJECTION_PLAYBOOK)
    objection_text = "\n".join([f"- If customer says '{obj['objection']}': {obj['response_strategy']}" for obj in objection_playbook])
    
    # Get closing scripts
    closing_scripts = config.get('closing_scripts', DEFAULT_CLOSING_SCRIPTS)
    closing_text = "\n".join([f"- {script['name']}: \"{script['script']}\" (Use when: {script['use_when']})" for script in closing_scripts.values()])
    
    # Get required fields
    required_fields = config.get('required_fields', DEFAULT_REQUIRED_FIELDS)
    required_text = "\n".join([f"- {field['label']}: {'REQUIRED' if field['required'] else 'Optional'}" for field in required_fields.values()])
    
    # Current lead context
    current_stage = lead_context.get('sales_stage', 'awareness') if lead_context else 'awareness'
    fields_collected = lead_context.get('fields_collected', {}) if lead_context else {}
    
    missing_required = [k for k, v in required_fields.items() if v['required'] and not fields_collected.get(k)]
    
    return f"""You are an expert AI sales agent for {business_name}. Your mission is to convert leads into customers through professional, consultative selling.

## BUSINESS CONTEXT
{business_description}

## PRODUCTS/SERVICES
{products_services}

## COMMUNICATION STYLE
- Tone: {agent_tone}
- Languages: Respond in the customer's language (Uzbek/Russian/English)
- Be concise, professional, and value-focused
- Never be pushy, but be persistent and helpful

## SALES PIPELINE STAGES
You must track and advance customers through these stages:

1. AWARENESS - Customer just discovered us
   → Goal: Educate, build rapport, understand initial interest
   → Actions: Welcome warmly, ask open questions about their needs

2. INTEREST - Customer is engaged and asking questions  
   → Goal: Qualify their needs, budget, timeline
   → Actions: Ask targeted questions, listen actively

3. CONSIDERATION - Customer is evaluating options
   → Goal: Present best-fit solutions, differentiate from competitors
   → Actions: Recommend specific products, explain benefits

4. INTENT - Customer shows buying signals
   → Goal: Handle objections, create urgency
   → Actions: Address concerns, use closing techniques

5. EVALUATION - Customer is making final decision
   → Goal: Remove last barriers, offer incentives if needed
   → Actions: Summarize value, offer guarantees

6. PURCHASE - Customer is ready to buy
   → Goal: Close the sale, collect final details
   → Actions: Confirm order, get contact info, next steps

## CURRENT STATUS
- Current Stage: {current_stage.upper()}
- Fields Collected: {json.dumps(fields_collected)}
- Missing Required Fields: {', '.join(missing_required) if missing_required else 'None'}

## REQUIRED INFORMATION TO COLLECT
{required_text}

## OBJECTION HANDLING PLAYBOOK
When you detect these objections, respond strategically:
{objection_text}

## CLOSING SCRIPTS
Use these proven closes at appropriate moments:
{closing_text}

## OUTPUT FORMAT (STRICT JSON)
You MUST respond with valid JSON in this exact format:
{{
    "reply_text": "Your response to the customer",
    "sales_stage": "awareness|interest|consideration|intent|evaluation|purchase",
    "stage_change_reason": "Brief explanation if stage changed",
    "hotness": "hot|warm|cold",
    "score": 0-100,
    "intent": "Short description of customer intent",
    "objection_detected": "Name of objection if detected, or null",
    "closing_technique_used": "Name of closing technique if used, or null",
    "fields_collected": {{
        "name": "value or null",
        "phone": "value or null", 
        "product": "value or null",
        "budget": "value or null",
        "timeline": "value or null"
    }},
    "next_action": "What AI should focus on next turn"
}}

## CRITICAL RULES
1. NEVER fabricate product info not in your context
2. NEVER be aggressive or pushy
3. ALWAYS advance the conversation toward a goal
4. ALWAYS respond in the customer's language
5. If you don't have information, ask clarifying questions
6. Track ALL information customer shares in fields_collected
7. When all required fields are collected AND customer shows intent, attempt a close"""


def get_business_context(tenant_id: str, query: str) -> List[str]:
    """Simple keyword-based RAG"""
    result = supabase.table('documents').select('*').eq('tenant_id', tenant_id).execute()
    context = []
    query_words = set(query.lower().split())
    
    for doc in (result.data or []):
        content = doc.get('content', '')
        if content and query_words & set(content.lower().split()):
            snippet = content[:500] + "..." if len(content) > 500 else content
            context.append(f"[{doc.get('title', 'Document')}]: {snippet}")
    
    return context[:5]


async def call_sales_agent(messages: List[Dict], config: Dict, lead_context: Dict = None, business_context: List[str] = None) -> Dict:
    """Call LLM with enhanced sales pipeline awareness"""
    try:
        system_prompt = get_enhanced_system_prompt(config, lead_context)
        
        if business_context:
            system_prompt += "\n\n## RELEVANT BUSINESS INFORMATION\n" + "\n".join(business_context)
        
        api_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            role = "assistant" if msg.get("role") == "assistant" else "user"
            api_messages.append({"role": role, "content": msg.get("text", "")})
        
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=api_messages,
            temperature=0.7,
            max_tokens=1500,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        logger.info(f"LLM Response: {content}")
        
        result = json.loads(content)
        return {
            "reply_text": result.get("reply_text", "I apologize, let me help you."),
            "sales_stage": result.get("sales_stage", "awareness"),
            "stage_change_reason": result.get("stage_change_reason"),
            "hotness": result.get("hotness", "warm"),
            "score": result.get("score", 50),
            "intent": result.get("intent", ""),
            "objection_detected": result.get("objection_detected"),
            "closing_technique_used": result.get("closing_technique_used"),
            "fields_collected": result.get("fields_collected", {}),
            "next_action": result.get("next_action")
        }
            
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}, content: {content}")
        return {"reply_text": content if 'content' in dir() else "I apologize, please try again.", "sales_stage": "awareness", "hotness": "warm", "score": 50}
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        return {"reply_text": "I apologize, a technical error occurred. Please try again.", "sales_stage": "awareness", "hotness": "warm", "score": 50}


# ============ Telegram Webhook Handler ============
@api_router.post("/telegram/webhook")
async def telegram_webhook(request: Request, background_tasks: BackgroundTasks):
    try:
        update = await request.json()
        logger.info(f"Received Telegram update: {update}")
        
        message = update.get("message")
        if not message or not message.get("text"):
            return {"ok": True}
        
        result = supabase.table('telegram_bots').select('*').eq('is_active', True).execute()
        if not result.data:
            return {"ok": True}
        
        bot = result.data[0]
        supabase.table('telegram_bots').update({"last_webhook_at": now_iso()}).eq('id', bot['id']).execute()
        
        background_tasks.add_task(process_telegram_message, bot["tenant_id"], bot["bot_token"], update)
        return {"ok": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"ok": True}


async def process_telegram_message(tenant_id: str, bot_token: str, update: Dict):
    """Process incoming Telegram message with enhanced sales pipeline"""
    try:
        message = update.get("message", {})
        text = message.get("text", "")
        chat_id = message.get("chat", {}).get("id")
        from_user = message.get("from", {})
        user_id = str(from_user.get("id"))
        username = from_user.get("username")
        first_name = from_user.get("first_name")
        language_code = from_user.get("language_code")
        
        await send_typing_action(bot_token, chat_id)
        
        # Get config
        config_result = supabase.table('tenant_configs').select('*').eq('tenant_id', tenant_id).execute()
        config = config_result.data[0] if config_result.data else {}
        
        # Handle /start command
        if text.strip() == "/start":
            greeting = config.get("greeting_message") or "Hello! Welcome. How can I help you today?\n\nAssalomu alaykum! Sizga qanday yordam bera olaman?\n\nЗдравствуйте! Чем могу помочь?"
            await send_telegram_message(bot_token, chat_id, greeting)
            return
        
        now = now_iso()
        
        # Get or create customer
        customer_result = supabase.table('customers').select('*').eq('tenant_id', tenant_id).eq('telegram_user_id', user_id).execute()
        
        if not customer_result.data:
            primary_lang = 'ru' if language_code and language_code.startswith('ru') else ('en' if language_code and language_code.startswith('en') else 'uz')
            customer = {
                "id": str(uuid.uuid4()), "tenant_id": tenant_id, "telegram_user_id": user_id,
                "telegram_username": username, "name": first_name, "primary_language": primary_lang,
                "segments": [], "first_seen_at": now, "last_seen_at": now
            }
            supabase.table('customers').insert(customer).execute()
        else:
            customer = customer_result.data[0]
            supabase.table('customers').update({"last_seen_at": now}).eq('id', customer['id']).execute()
        
        # Get or create conversation
        conv_result = supabase.table('conversations').select('*').eq('tenant_id', tenant_id).eq('customer_id', customer['id']).eq('status', 'active').execute()
        
        if not conv_result.data:
            conversation = {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "customer_id": customer['id'], "status": "active", "started_at": now, "last_message_at": now}
            supabase.table('conversations').insert(conversation).execute()
        else:
            conversation = conv_result.data[0]
        
        # Save incoming message
        supabase.table('messages').insert({"id": str(uuid.uuid4()), "conversation_id": conversation['id'], "sender_type": "user", "text": text, "created_at": now}).execute()
        
        # Get conversation history
        history_result = supabase.table('messages').select('*').eq('conversation_id', conversation['id']).order('created_at', desc=True).limit(10).execute()
        history = list(reversed(history_result.data or []))
        messages_for_llm = [{"role": "assistant" if m["sender_type"] == "agent" else "user", "text": m["text"]} for m in history]
        
        # Get existing lead context
        lead_result = supabase.table('leads').select('*').eq('tenant_id', tenant_id).eq('customer_id', customer['id']).execute()
        existing_lead = lead_result.data[0] if lead_result.data else None
        
        lead_context = {
            "sales_stage": existing_lead.get("sales_stage", "awareness") if existing_lead else "awareness",
            "fields_collected": existing_lead.get("fields_collected", {}) if existing_lead else {}
        }
        
        # Get business context (RAG)
        business_context = get_business_context(tenant_id, text)
        
        # Call enhanced LLM
        llm_result = await call_sales_agent(messages_for_llm, config, lead_context, business_context)
        
        # Update or create lead with enhanced data
        await update_lead_from_llm(tenant_id, customer, existing_lead, llm_result)
        
        # Save agent response
        supabase.table('messages').insert({"id": str(uuid.uuid4()), "conversation_id": conversation['id'], "sender_type": "agent", "text": llm_result["reply_text"], "created_at": now_iso()}).execute()
        
        # Update conversation
        supabase.table('conversations').update({"last_message_at": now_iso()}).eq('id', conversation['id']).execute()
        
        # Send response
        await send_telegram_message(bot_token, chat_id, llm_result["reply_text"])
        
        # Log event
        supabase.table('event_logs').insert({
            "id": str(uuid.uuid4()), "tenant_id": tenant_id, "event_type": "message_processed",
            "event_data": {
                "customer_id": customer['id'], "conversation_id": conversation['id'],
                "sales_stage": llm_result.get("sales_stage"), "hotness": llm_result.get("hotness"),
                "objection_detected": llm_result.get("objection_detected"),
                "closing_used": llm_result.get("closing_technique_used")
            },
            "created_at": now_iso()
        }).execute()
        
        # Sync to Bitrix if connected
        await sync_lead_to_bitrix(tenant_id, customer, llm_result)
        
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        import traceback
        traceback.print_exc()
        try:
            await send_telegram_message(bot_token, update.get("message", {}).get("chat", {}).get("id"), "I apologize, a technical error occurred. Please try again.")
        except:
            pass


async def update_lead_from_llm(tenant_id: str, customer: Dict, existing_lead: Optional[Dict], llm_result: Dict):
    """Update lead with LLM analysis results"""
    now = now_iso()
    
    # Merge fields collected
    existing_fields = existing_lead.get("fields_collected", {}) if existing_lead else {}
    new_fields = llm_result.get("fields_collected", {})
    
    # Only update non-null values
    merged_fields = {**existing_fields}
    for k, v in new_fields.items():
        if v:
            merged_fields[k] = v
    
    lead_data = {
        "tenant_id": tenant_id,
        "customer_id": customer['id'],
        "status": "new" if not existing_lead else existing_lead.get("status", "new"),
        "sales_stage": llm_result.get("sales_stage", "awareness"),
        "llm_hotness_suggestion": llm_result.get("hotness", "warm"),
        "final_hotness": llm_result.get("hotness", "warm"),
        "score": llm_result.get("score", 50),
        "intent": llm_result.get("intent"),
        "llm_explanation": llm_result.get("next_action"),
        "product": merged_fields.get("product"),
        "budget": merged_fields.get("budget"),
        "timeline": merged_fields.get("timeline"),
        "fields_collected": merged_fields,
        "source_channel": "telegram",
        "last_interaction_at": now
    }
    
    # Update customer with collected info
    customer_updates = {}
    if merged_fields.get("name"):
        customer_updates["name"] = merged_fields["name"]
    if merged_fields.get("phone"):
        customer_updates["phone"] = merged_fields["phone"]
    
    if customer_updates:
        supabase.table('customers').update(customer_updates).eq('id', customer['id']).execute()
    
    # Update or create lead
    if existing_lead:
        supabase.table('leads').update(lead_data).eq('id', existing_lead['id']).execute()
    else:
        lead_data["id"] = str(uuid.uuid4())
        lead_data["created_at"] = now
        supabase.table('leads').insert(lead_data).execute()


async def sync_lead_to_bitrix(tenant_id: str, customer: Dict, llm_result: Dict):
    """Sync lead to Bitrix24 if connected - currently in demo mode"""
    # Bitrix integration is in demo mode until integrations_bitrix table is created
    # Log the lead data that would be synced
    if llm_result.get("sales_stage") in ["intent", "evaluation", "purchase"]:
        logger.info(f"Bitrix sync (demo mode): Lead at {llm_result.get('sales_stage')} stage would be synced")
    return


# ============ Dashboard Endpoints ============
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: Dict = Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    conv_result = supabase.table('conversations').select('id', count='exact').eq('tenant_id', tenant_id).execute()
    leads_result = supabase.table('leads').select('*').eq('tenant_id', tenant_id).execute()
    
    leads = leads_result.data or []
    total_leads = len(leads)
    hot_leads = sum(1 for l in leads if l.get('final_hotness') == 'hot')
    warm_leads = sum(1 for l in leads if l.get('final_hotness') == 'warm')
    cold_leads = sum(1 for l in leads if l.get('final_hotness') == 'cold')
    
    # Leads by stage
    leads_by_stage = {}
    for stage in SALES_STAGES.keys():
        leads_by_stage[stage] = sum(1 for l in leads if l.get('sales_stage') == stage)
    
    # Conversion rate (purchase stage / total)
    purchase_leads = leads_by_stage.get('purchase', 0)
    conversion_rate = (purchase_leads / total_leads * 100) if total_leads > 0 else 0
    
    customers_result = supabase.table('customers').select('*').eq('tenant_id', tenant_id).execute()
    returning_customers = sum(1 for c in (customers_result.data or []) if c.get('first_seen_at') != c.get('last_seen_at'))
    
    today_result = supabase.table('leads').select('id', count='exact').eq('tenant_id', tenant_id).gte('created_at', today).execute()
    
    return DashboardStats(
        total_conversations=conv_result.count or 0,
        total_leads=total_leads,
        hot_leads=hot_leads,
        warm_leads=warm_leads,
        cold_leads=cold_leads,
        returning_customers=returning_customers,
        leads_today=today_result.count or 0,
        conversion_rate=round(conversion_rate, 1),
        leads_by_stage=leads_by_stage
    )


@api_router.get("/dashboard/leads-per-day", response_model=List[LeadsPerDay])
async def get_leads_per_day(days: int = 7, current_user: Dict = Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    result = supabase.table('leads').select('*').eq('tenant_id', tenant_id).gte('created_at', start_date).order('created_at').execute()
    
    daily_stats = {}
    for lead in (result.data or []):
        date_str = lead["created_at"][:10]
        if date_str not in daily_stats:
            daily_stats[date_str] = {"count": 0, "hot": 0, "warm": 0, "cold": 0}
        daily_stats[date_str]["count"] += 1
        hotness = lead.get("final_hotness", "warm")
        if hotness in daily_stats[date_str]:
            daily_stats[date_str][hotness] += 1
    
    return [LeadsPerDay(date=(datetime.now(timezone.utc) - timedelta(days=days-1-i)).strftime("%Y-%m-%d"), **daily_stats.get((datetime.now(timezone.utc) - timedelta(days=days-1-i)).strftime("%Y-%m-%d"), {"count": 0, "hot": 0, "warm": 0, "cold": 0})) for i in range(days)]


# ============ Leads Endpoints ============
@api_router.get("/leads")
async def get_leads(status: Optional[str] = None, hotness: Optional[str] = None, stage: Optional[str] = None, limit: int = 50, current_user: Dict = Depends(get_current_user)):
    query = supabase.table('leads').select('*').eq('tenant_id', current_user["tenant_id"])
    if status:
        query = query.eq('status', status)
    if hotness:
        query = query.eq('final_hotness', hotness)
    if stage:
        query = query.eq('sales_stage', stage)
    
    result = query.order('created_at', desc=True).limit(limit).execute()
    
    response = []
    for lead in (result.data or []):
        cust_result = supabase.table('customers').select('*').eq('id', lead['customer_id']).execute()
        customer = cust_result.data[0] if cust_result.data else None
        response.append({
            "id": lead["id"],
            "customer_name": customer.get("name") if customer else None,
            "customer_phone": customer.get("phone") if customer else None,
            "status": lead.get("status", "new"),
            "sales_stage": lead.get("sales_stage", "awareness"),
            "final_hotness": lead.get("final_hotness", "warm"),
            "score": lead.get("score", 50),
            "intent": lead.get("intent"),
            "product": lead.get("product"),
            "llm_explanation": lead.get("llm_explanation"),
            "source_channel": lead.get("source_channel", "telegram"),
            "fields_collected": lead.get("fields_collected", {}),
            "created_at": lead.get("created_at", ""),
            "last_interaction_at": lead.get("last_interaction_at", "")
        })
    
    return response


@api_router.put("/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, status: str, current_user: Dict = Depends(get_current_user)):
    result = supabase.table('leads').select('*').eq('id', lead_id).eq('tenant_id', current_user["tenant_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    supabase.table('leads').update({"status": status}).eq('id', lead_id).execute()
    return {"success": True}


@api_router.put("/leads/{lead_id}/stage")
async def update_lead_stage(lead_id: str, stage: str, current_user: Dict = Depends(get_current_user)):
    if stage not in SALES_STAGES:
        raise HTTPException(status_code=400, detail="Invalid sales stage")
    result = supabase.table('leads').select('*').eq('id', lead_id).eq('tenant_id', current_user["tenant_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    supabase.table('leads').update({"sales_stage": stage}).eq('id', lead_id).execute()
    return {"success": True}


# ============ Config Endpoints ============
@api_router.get("/config")
async def get_tenant_config(current_user: Dict = Depends(get_current_user)):
    result = supabase.table('tenant_configs').select('*').eq('tenant_id', current_user["tenant_id"]).execute()
    if not result.data:
        return {"objection_playbook": DEFAULT_OBJECTION_PLAYBOOK, "closing_scripts": DEFAULT_CLOSING_SCRIPTS, "required_fields": DEFAULT_REQUIRED_FIELDS}
    
    config = result.data[0]
    return {
        "vertical": config.get("vertical"),
        "business_name": config.get("business_name"),
        "business_description": config.get("business_description"),
        "products_services": config.get("products_services"),
        "faq_objections": config.get("faq_objections"),
        "collect_phone": config.get("collect_phone", True),
        "greeting_message": config.get("greeting_message"),
        "agent_tone": config.get("agent_tone"),
        "primary_language": config.get("primary_language"),
        "objection_playbook": config.get("objection_playbook") or DEFAULT_OBJECTION_PLAYBOOK,
        "closing_scripts": config.get("closing_scripts") or DEFAULT_CLOSING_SCRIPTS,
        "required_fields": config.get("required_fields") or DEFAULT_REQUIRED_FIELDS,
        "active_promotions": config.get("active_promotions") or []
    }


@api_router.put("/config")
async def update_tenant_config(request: TenantConfigUpdate, current_user: Dict = Depends(get_current_user)):
    update_data = {k: v for k, v in request.model_dump().items() if v is not None}
    
    result = supabase.table('tenant_configs').select('*').eq('tenant_id', current_user["tenant_id"]).execute()
    if result.data:
        supabase.table('tenant_configs').update(update_data).eq('tenant_id', current_user["tenant_id"]).execute()
    else:
        update_data["tenant_id"] = current_user["tenant_id"]
        supabase.table('tenant_configs').insert(update_data).execute()
    
    return {"success": True}


@api_router.get("/config/defaults")
async def get_config_defaults():
    """Get default templates for objection playbook and closing scripts"""
    return {
        "objection_playbook": DEFAULT_OBJECTION_PLAYBOOK,
        "closing_scripts": DEFAULT_CLOSING_SCRIPTS,
        "required_fields": DEFAULT_REQUIRED_FIELDS,
        "sales_stages": SALES_STAGES
    }


# ============ Documents Endpoints ============
@api_router.get("/documents")
async def get_documents(current_user: Dict = Depends(get_current_user)):
    result = supabase.table('documents').select('*').eq('tenant_id', current_user["tenant_id"]).order('created_at', desc=True).execute()
    return [{"id": doc["id"], "title": doc["title"], "file_type": doc.get("file_type", "text"), "file_size": doc.get("file_size"), "created_at": doc.get("created_at", "")} for doc in (result.data or [])]


@api_router.post("/documents")
async def create_document(request: DocumentCreate, current_user: Dict = Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), "tenant_id": current_user["tenant_id"], "title": request.title, "content": request.content, "file_type": "text", "file_size": len(request.content), "created_at": now_iso()}
    supabase.table('documents').insert(doc).execute()
    return {"id": doc["id"], "title": doc["title"], "created_at": doc["created_at"]}


@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: Dict = Depends(get_current_user)):
    result = supabase.table('documents').select('*').eq('id', doc_id).eq('tenant_id', current_user["tenant_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    supabase.table('documents').delete().eq('id', doc_id).execute()
    return {"success": True}


# ============ Integration Status ============
@api_router.get("/integrations/status")
async def get_integrations_status(current_user: Dict = Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]
    
    # Get Telegram bot status
    try:
        tg_result = supabase.table('telegram_bots').select('*').eq('tenant_id', tenant_id).eq('is_active', True).execute()
        telegram_bot = tg_result.data[0] if tg_result.data else None
    except Exception:
        telegram_bot = None
    
    # Bitrix status - table may not exist yet, return demo mode
    bitrix_status = {"connected": False, "is_demo": True, "domain": None}
    
    return {
        "telegram": {"connected": telegram_bot is not None, "bot_username": telegram_bot.get("bot_username") if telegram_bot else None, "last_webhook_at": telegram_bot.get("last_webhook_at") if telegram_bot else None},
        "bitrix": bitrix_status,
        "google_sheets": {"connected": False, "sheet_id": None}
    }


# ============ Health Check ============
@api_router.get("/")
async def root():
    return {"message": "TeleAgent API - AI Sales Agent for Telegram", "version": "2.0", "features": ["sales_pipeline", "objection_handling", "closing_scripts", "bitrix24_oauth"]}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": now_iso(), "database": "supabase"}


# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
