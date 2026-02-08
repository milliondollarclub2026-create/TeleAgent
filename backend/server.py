"""AI Sales Agent for Telegram + Bitrix24 - Main Server with Supabase Client"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request, BackgroundTasks
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
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
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


# ============ Auth Helpers ============
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    password_hash = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{password_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, hash_value = stored_hash.split(":")
        password_hash = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
        return password_hash == hash_value
    except Exception:
        return False


def create_access_token(user_id: str, tenant_id: str, email: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "tenant_id": tenant_id,
        "email": email,
        "exp": expiration.timestamp()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Optional[Dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
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

class TelegramBotResponse(BaseModel):
    id: str
    bot_username: Optional[str]
    is_active: bool
    webhook_url: Optional[str]
    last_webhook_at: Optional[str]

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

class DocumentCreate(BaseModel):
    title: str
    content: str

class LeadResponse(BaseModel):
    id: str
    customer_name: Optional[str]
    customer_phone: Optional[str]
    status: str
    final_hotness: str
    score: int
    intent: Optional[str]
    product: Optional[str]
    llm_explanation: Optional[str]
    source_channel: str
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
    # Check if email exists
    result = supabase.table('users').select('*').eq('email', request.email).execute()
    if result.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create tenant
    tenant_id = str(uuid.uuid4())
    tenant = {
        "id": tenant_id,
        "name": request.business_name,
        "timezone": "Asia/Tashkent",
        "created_at": now_iso()
    }
    supabase.table('tenants').insert(tenant).execute()
    
    # Create user with confirmation token
    user_id = str(uuid.uuid4())
    confirmation_token = generate_confirmation_token()
    user = {
        "id": user_id,
        "email": request.email,
        "password_hash": hash_password(request.password),
        "name": request.name,
        "tenant_id": tenant_id,
        "role": "admin",
        "email_confirmed": False,
        "confirmation_token": confirmation_token,
        "created_at": now_iso()
    }
    supabase.table('users').insert(user).execute()
    
    # Create default config
    config = {
        "tenant_id": tenant_id,
        "business_name": request.business_name,
        "collect_phone": True,
        "agent_tone": "professional",
        "primary_language": "uz",
        "vertical": "default"
    }
    supabase.table('tenant_configs').insert(config).execute()
    
    # Generate token
    token = create_access_token(user_id, tenant_id, request.email)
    
    return AuthResponse(
        token=token,
        user={
            "id": user_id,
            "email": request.email,
            "name": request.name,
            "tenant_id": tenant_id,
            "business_name": tenant["name"],
            "email_confirmed": False
        },
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
    
    # Get tenant
    tenant_result = supabase.table('tenants').select('*').eq('id', user['tenant_id']).execute()
    tenant = tenant_result.data[0] if tenant_result.data else None
    
    token = create_access_token(user["id"], user["tenant_id"], user["email"])
    
    return AuthResponse(
        token=token,
        user={
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name"),
            "tenant_id": user["tenant_id"],
            "business_name": tenant["name"] if tenant else None,
            "email_confirmed": user.get("email_confirmed", False)
        }
    )


@api_router.get("/auth/me")
async def get_me(current_user: Dict = Depends(get_current_user)):
    result = supabase.table('users').select('*').eq('id', current_user["user_id"]).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = result.data[0]
    tenant_result = supabase.table('tenants').select('*').eq('id', user['tenant_id']).execute()
    tenant = tenant_result.data[0] if tenant_result.data else None
    
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name"),
        "tenant_id": user["tenant_id"],
        "business_name": tenant["name"] if tenant else None,
        "email_confirmed": user.get("email_confirmed", False)
    }


@api_router.get("/auth/confirm/{token}")
async def confirm_email(token: str):
    result = supabase.table('users').select('*').eq('confirmation_token', token).execute()
    
    if not result.data:
        raise HTTPException(status_code=400, detail="Invalid confirmation token")
    
    user = result.data[0]
    supabase.table('users').update({
        "email_confirmed": True,
        "confirmation_token": None
    }).eq('id', user['id']).execute()
    
    return {"message": "Email confirmed successfully"}


# ============ Telegram Service ============
async def get_bot_info(bot_token: str) -> Optional[Dict]:
    try:
        url = f"{TELEGRAM_API_BASE}{bot_token}/getMe"
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(url, timeout=30.0)
            response.raise_for_status()
            data = response.json()
            if data.get("ok"):
                return data.get("result")
            return None
    except Exception as e:
        logger.error(f"Failed to get bot info: {str(e)}")
        return None


async def set_telegram_webhook(bot_token: str, webhook_url: str) -> Dict:
    try:
        url = f"{TELEGRAM_API_BASE}{bot_token}/setWebhook"
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                url,
                json={"url": webhook_url, "allowed_updates": ["message"], "drop_pending_updates": True},
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to set webhook: {str(e)}")
        return {"ok": False, "error": str(e)}


async def delete_telegram_webhook(bot_token: str) -> Dict:
    try:
        url = f"{TELEGRAM_API_BASE}{bot_token}/deleteWebhook"
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(url, timeout=30.0)
            return response.json()
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def send_telegram_message(bot_token: str, chat_id: int, text: str) -> bool:
    try:
        url = f"{TELEGRAM_API_BASE}{bot_token}/sendMessage"
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                url,
                json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
                timeout=30.0
            )
            response.raise_for_status()
            return True
    except Exception as e:
        logger.error(f"Failed to send message: {str(e)}")
        return False


async def send_typing_action(bot_token: str, chat_id: int) -> bool:
    try:
        url = f"{TELEGRAM_API_BASE}{bot_token}/sendChatAction"
        async with httpx.AsyncClient() as http_client:
            await http_client.post(url, json={"chat_id": chat_id, "action": "typing"}, timeout=10.0)
            return True
    except Exception:
        return False


# ============ Telegram Bot Endpoints ============
@api_router.post("/telegram/bot", response_model=TelegramBotResponse)
async def connect_telegram_bot(request: TelegramBotCreate, current_user: Dict = Depends(get_current_user)):
    bot_info = await get_bot_info(request.bot_token)
    if not bot_info:
        raise HTTPException(status_code=400, detail="Invalid bot token")
    
    tenant_id = current_user["tenant_id"]
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://teleagent.preview.emergentagent.com')
    webhook_url = f"{backend_url}/api/telegram/webhook"
    
    # Check existing
    result = supabase.table('telegram_bots').select('*').eq('tenant_id', tenant_id).execute()
    
    bot_id = result.data[0]['id'] if result.data else str(uuid.uuid4())
    
    bot_data = {
        "id": bot_id,
        "tenant_id": tenant_id,
        "bot_token": request.bot_token,
        "bot_username": bot_info.get("username"),
        "webhook_url": webhook_url,
        "is_active": True,
        "created_at": now_iso()
    }
    
    if result.data:
        supabase.table('telegram_bots').update(bot_data).eq('id', bot_id).execute()
    else:
        supabase.table('telegram_bots').insert(bot_data).execute()
    
    # Set webhook
    webhook_result = await set_telegram_webhook(request.bot_token, webhook_url)
    logger.info(f"Webhook set result: {webhook_result}")
    
    return TelegramBotResponse(
        id=bot_id,
        bot_username=bot_info.get("username"),
        is_active=True,
        webhook_url=webhook_url,
        last_webhook_at=None
    )


@api_router.get("/telegram/bot")
async def get_telegram_bot(current_user: Dict = Depends(get_current_user)):
    result = supabase.table('telegram_bots').select('*').eq('tenant_id', current_user["tenant_id"]).execute()
    
    if not result.data:
        return None
    
    bot = result.data[0]
    return {
        "id": bot["id"],
        "bot_username": bot.get("bot_username"),
        "is_active": bot.get("is_active", False),
        "webhook_url": bot.get("webhook_url"),
        "last_webhook_at": bot.get("last_webhook_at")
    }


@api_router.delete("/telegram/bot")
async def disconnect_telegram_bot(current_user: Dict = Depends(get_current_user)):
    result = supabase.table('telegram_bots').select('*').eq('tenant_id', current_user["tenant_id"]).execute()
    
    if result.data:
        bot = result.data[0]
        await delete_telegram_webhook(bot["bot_token"])
        supabase.table('telegram_bots').update({"is_active": False}).eq('id', bot['id']).execute()
    
    return {"success": True}


# ============ LLM Service ============
def get_system_prompt(config: Optional[Dict] = None) -> str:
    business_name = config.get('business_name', 'our company') if config else 'our company'
    business_description = config.get('business_description', '') if config else ''
    products_services = config.get('products_services', '') if config else ''
    collect_phone = config.get('collect_phone', True) if config else True
    agent_tone = config.get('agent_tone', 'professional') if config else 'professional'
    
    phone_instruction = "Ask for the customer's phone number when appropriate for follow-up." if collect_phone else ""
    
    return f"""You are a professional sales agent for {business_name}. You communicate in Uzbek (O'zbek tili), Russian (Русский), and English based on the customer's preference.

BUSINESS CONTEXT:
{business_description}

PRODUCTS/SERVICES:
{products_services}

YOUR GOALS (in priority order):
1. Understand customer needs and pain points
2. Propose appropriate products/services from our catalog  
3. Close the sale or get a commitment (booking, appointment, order)
4. If not ready to buy, gather qualification data and classify the lead

BEHAVIOR GUIDELINES:
- Be {agent_tone}, confident, and helpful
- Ask clear, targeted questions (name, needs, budget, timeline)
- {phone_instruction}
- Keep messages concise - avoid long paragraphs
- For returning customers, acknowledge their history
- Detect and respond in the customer's language (Uzbek/Russian/English)

LEAD CLASSIFICATION:
- HOT: Customer explicitly wants to buy now, has budget, ready to proceed
- WARM: Interested but needs more info, comparing options, timeline unclear  
- COLD: Just browsing, no clear interest, or explicitly not interested
- When in doubt, choose WARM or COLD - never fabricate interest

OUTPUT FORMAT (JSON):
{{
  "reply_text": "Your response to the customer",
  "actions": [
    {{
      "type": "create_or_update_lead",
      "hotness": "hot/warm/cold",
      "score": 0-100,
      "intent": "short description of customer intent",
      "fields": {{"name": "...", "phone": "...", "product": "...", "budget": "...", "timeline": "..."}},
      "explanation": "reasoning for this classification"
    }}
  ]
}}

Always respond in the customer's preferred language (Uzbek, Russian, or English)."""


def get_business_context(tenant_id: str, query: str) -> List[str]:
    """Simple keyword-based RAG for MVP"""
    result = supabase.table('documents').select('*').eq('tenant_id', tenant_id).execute()
    documents = result.data or []
    
    context = []
    query_words = set(query.lower().split())
    
    for doc in documents:
        content = doc.get('content', '')
        if content:
            doc_words = set(content.lower().split())
            if query_words & doc_words:
                snippet = content[:500] + "..." if len(content) > 500 else content
                context.append(f"[{doc.get('title', 'Document')}]: {snippet}")
    
    return context[:5]


async def call_sales_agent(messages: List[Dict], config: Optional[Dict] = None, business_context: List[str] = None) -> Dict:
    try:
        system_prompt = get_system_prompt(config)
        
        if business_context:
            context_text = "\n\nRELEVANT BUSINESS INFORMATION:\n" + "\n".join(business_context)
            system_prompt += context_text
        
        api_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            role = "assistant" if msg.get("role") == "assistant" else "user"
            api_messages.append({"role": role, "content": msg.get("text", "")})
        
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=api_messages,
            temperature=0.7,
            max_tokens=1000,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        logger.info(f"LLM Response: {content}")
        
        try:
            result = json.loads(content)
            return {
                "reply_text": result.get("reply_text", "Kechirasiz, xatolik yuz berdi."),
                "actions": result.get("actions")
            }
        except json.JSONDecodeError:
            return {"reply_text": content}
            
    except Exception as e:
        logger.error(f"LLM call failed: {str(e)}")
        return {
            "reply_text": "Kechirasiz, texnik xatolik yuz berdi. / Извините, техническая ошибка. / Sorry, technical error."
        }


# ============ Telegram Webhook Handler ============
@api_router.post("/telegram/webhook")
async def telegram_webhook(request: Request, background_tasks: BackgroundTasks):
    try:
        update = await request.json()
        logger.info(f"Received Telegram update: {update}")
        
        message = update.get("message")
        if not message or not message.get("text"):
            return {"ok": True}
        
        # Get active bot
        result = supabase.table('telegram_bots').select('*').eq('is_active', True).execute()
        
        if not result.data:
            return {"ok": True}
        
        bot = result.data[0]
        
        # Update last webhook time
        supabase.table('telegram_bots').update({
            "last_webhook_at": now_iso()
        }).eq('id', bot['id']).execute()
        
        # Process in background
        background_tasks.add_task(process_telegram_message, bot["tenant_id"], bot["bot_token"], update)
        
        return {"ok": True}
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"ok": True}


async def process_telegram_message(tenant_id: str, bot_token: str, update: Dict):
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
        
        # Handle /start command
        if text.strip() == "/start":
            config_result = supabase.table('tenant_configs').select('*').eq('tenant_id', tenant_id).execute()
            config = config_result.data[0] if config_result.data else None
            greeting = config.get("greeting_message") if config else None
            if not greeting:
                greeting = "Assalomu alaykum! Men sizga qanday yordam bera olaman?\nЗдравствуйте! Чем могу помочь?\nHello! How can I help you?"
            await send_telegram_message(bot_token, chat_id, greeting)
            return
        
        # Get or create customer
        customer_result = supabase.table('customers').select('*').eq('tenant_id', tenant_id).eq('telegram_user_id', user_id).execute()
        
        now = now_iso()
        
        if not customer_result.data:
            # Detect language
            if language_code:
                if language_code.startswith('ru'):
                    primary_lang = 'ru'
                elif language_code.startswith('en'):
                    primary_lang = 'en'
                else:
                    primary_lang = 'uz'
            else:
                primary_lang = 'uz'
                
            customer = {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "telegram_user_id": user_id,
                "telegram_username": username,
                "name": first_name,
                "primary_language": primary_lang,
                "segments": [],
                "first_seen_at": now,
                "last_seen_at": now
            }
            supabase.table('customers').insert(customer).execute()
        else:
            customer = customer_result.data[0]
            supabase.table('customers').update({"last_seen_at": now}).eq('id', customer['id']).execute()
        
        # Get or create conversation
        conv_result = supabase.table('conversations').select('*').eq('tenant_id', tenant_id).eq('customer_id', customer['id']).eq('status', 'active').execute()
        
        if not conv_result.data:
            conversation = {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "customer_id": customer['id'],
                "status": "active",
                "started_at": now,
                "last_message_at": now
            }
            supabase.table('conversations').insert(conversation).execute()
        else:
            conversation = conv_result.data[0]
        
        # Save incoming message
        incoming_msg = {
            "id": str(uuid.uuid4()),
            "conversation_id": conversation['id'],
            "sender_type": "user",
            "text": text,
            "created_at": now
        }
        supabase.table('messages').insert(incoming_msg).execute()
        
        # Get conversation history
        history_result = supabase.table('messages').select('*').eq('conversation_id', conversation['id']).order('created_at', desc=True).limit(10).execute()
        history = list(reversed(history_result.data or []))
        
        messages_for_llm = [
            {"role": "assistant" if m["sender_type"] == "agent" else "user", "text": m["text"]}
            for m in history
        ]
        
        # Get config
        config_result = supabase.table('tenant_configs').select('*').eq('tenant_id', tenant_id).execute()
        config = config_result.data[0] if config_result.data else None
        config_dict = {
            "business_name": config.get("business_name") if config else None,
            "business_description": config.get("business_description") if config else None,
            "products_services": config.get("products_services") if config else None,
            "collect_phone": config.get("collect_phone", True) if config else True,
            "agent_tone": config.get("agent_tone", "professional") if config else "professional"
        }
        
        # Get business context (RAG)
        business_context = get_business_context(tenant_id, text)
        
        # Call LLM
        llm_result = await call_sales_agent(messages_for_llm, config_dict, business_context)
        
        # Process actions
        if llm_result.get("actions"):
            for action in llm_result["actions"]:
                if action.get("type") == "create_or_update_lead":
                    process_lead_action(tenant_id, customer, action)
        
        # Save agent response
        agent_msg = {
            "id": str(uuid.uuid4()),
            "conversation_id": conversation['id'],
            "sender_type": "agent",
            "text": llm_result["reply_text"],
            "created_at": now_iso()
        }
        supabase.table('messages').insert(agent_msg).execute()
        
        # Update conversation
        supabase.table('conversations').update({"last_message_at": now_iso()}).eq('id', conversation['id']).execute()
        
        # Send response
        await send_telegram_message(bot_token, chat_id, llm_result["reply_text"])
        
        # Log event
        event = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "event_type": "message_processed",
            "event_data": {"customer_id": customer['id'], "conversation_id": conversation['id']},
            "created_at": now_iso()
        }
        supabase.table('event_logs').insert(event).execute()
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        import traceback
        traceback.print_exc()
        try:
            await send_telegram_message(
                bot_token, 
                update.get("message", {}).get("chat", {}).get("id"),
                "Kechirasiz, texnik xatolik yuz berdi. / Извините, техническая ошибка. / Sorry, technical error."
            )
        except Exception:
            pass


def process_lead_action(tenant_id: str, customer: Dict, action: Dict):
    now = now_iso()
    
    hotness = action.get("hotness", "warm")
    score = action.get("score", 50)
    intent = action.get("intent", "")
    explanation = action.get("explanation", "")
    fields = action.get("fields", {})
    
    # Check for existing lead
    result = supabase.table('leads').select('*').eq('tenant_id', tenant_id).eq('customer_id', customer['id']).execute()
    
    lead_data = {
        "tenant_id": tenant_id,
        "customer_id": customer['id'],
        "status": "new",
        "llm_hotness_suggestion": hotness,
        "final_hotness": hotness,
        "score": score,
        "intent": intent,
        "llm_explanation": explanation,
        "product": fields.get("product"),
        "budget": fields.get("budget"),
        "timeline": fields.get("timeline"),
        "additional_notes": fields.get("additional_notes"),
        "source_channel": "telegram",
        "last_interaction_at": now
    }
    
    if result.data:
        supabase.table('leads').update(lead_data).eq('id', result.data[0]['id']).execute()
    else:
        lead_data["id"] = str(uuid.uuid4())
        lead_data["created_at"] = now
        supabase.table('leads').insert(lead_data).execute()
    
    # Update customer info
    updates = {}
    if fields.get("name"):
        updates["name"] = fields["name"]
    if fields.get("phone"):
        updates["phone"] = fields["phone"]
    
    if updates:
        supabase.table('customers').update(updates).eq('id', customer['id']).execute()


# ============ Dashboard Endpoints ============
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: Dict = Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    conv_result = supabase.table('conversations').select('id', count='exact').eq('tenant_id', tenant_id).execute()
    total_conversations = conv_result.count or 0
    
    leads_result = supabase.table('leads').select('id', count='exact').eq('tenant_id', tenant_id).execute()
    total_leads = leads_result.count or 0
    
    hot_result = supabase.table('leads').select('id', count='exact').eq('tenant_id', tenant_id).eq('final_hotness', 'hot').execute()
    hot_leads = hot_result.count or 0
    
    warm_result = supabase.table('leads').select('id', count='exact').eq('tenant_id', tenant_id).eq('final_hotness', 'warm').execute()
    warm_leads = warm_result.count or 0
    
    cold_result = supabase.table('leads').select('id', count='exact').eq('tenant_id', tenant_id).eq('final_hotness', 'cold').execute()
    cold_leads = cold_result.count or 0
    
    # Returning customers (rough approximation)
    customers_result = supabase.table('customers').select('*').eq('tenant_id', tenant_id).execute()
    returning_customers = sum(1 for c in (customers_result.data or []) if c.get('first_seen_at') != c.get('last_seen_at'))
    
    today_result = supabase.table('leads').select('id', count='exact').eq('tenant_id', tenant_id).gte('created_at', today).execute()
    leads_today = today_result.count or 0
    
    return DashboardStats(
        total_conversations=total_conversations,
        total_leads=total_leads,
        hot_leads=hot_leads,
        warm_leads=warm_leads,
        cold_leads=cold_leads,
        returning_customers=returning_customers,
        leads_today=leads_today
    )


@api_router.get("/dashboard/leads-per-day", response_model=List[LeadsPerDay])
async def get_leads_per_day(days: int = 7, current_user: Dict = Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    result = supabase.table('leads').select('*').eq('tenant_id', tenant_id).gte('created_at', start_date).order('created_at').execute()
    leads = result.data or []
    
    daily_stats = {}
    for lead in leads:
        date_str = lead["created_at"][:10]
        if date_str not in daily_stats:
            daily_stats[date_str] = {"count": 0, "hot": 0, "warm": 0, "cold": 0}
        daily_stats[date_str]["count"] += 1
        hotness = lead.get("final_hotness", "warm")
        if hotness in daily_stats[date_str]:
            daily_stats[date_str][hotness] += 1
    
    result_list = []
    for i in range(days):
        date = (datetime.now(timezone.utc) - timedelta(days=days-1-i)).strftime("%Y-%m-%d")
        stats = daily_stats.get(date, {"count": 0, "hot": 0, "warm": 0, "cold": 0})
        result_list.append(LeadsPerDay(date=date, count=stats["count"], hot=stats["hot"], warm=stats["warm"], cold=stats["cold"]))
    
    return result_list


# ============ Leads Endpoints ============
@api_router.get("/leads", response_model=List[LeadResponse])
async def get_leads(status: Optional[str] = None, hotness: Optional[str] = None, limit: int = 50, current_user: Dict = Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]
    
    query = supabase.table('leads').select('*').eq('tenant_id', tenant_id)
    if status:
        query = query.eq('status', status)
    if hotness:
        query = query.eq('final_hotness', hotness)
    
    result = query.order('created_at', desc=True).limit(limit).execute()
    leads = result.data or []
    
    response = []
    for lead in leads:
        cust_result = supabase.table('customers').select('*').eq('id', lead['customer_id']).execute()
        customer = cust_result.data[0] if cust_result.data else None
        response.append(LeadResponse(
            id=lead["id"],
            customer_name=customer.get("name") if customer else None,
            customer_phone=customer.get("phone") if customer else None,
            status=lead.get("status", "new"),
            final_hotness=lead.get("final_hotness", "warm"),
            score=lead.get("score", 50),
            intent=lead.get("intent"),
            product=lead.get("product"),
            llm_explanation=lead.get("llm_explanation"),
            source_channel=lead.get("source_channel", "telegram"),
            created_at=lead.get("created_at", ""),
            last_interaction_at=lead.get("last_interaction_at", "")
        ))
    
    return response


@api_router.put("/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, status: str, current_user: Dict = Depends(get_current_user)):
    result = supabase.table('leads').select('*').eq('id', lead_id).eq('tenant_id', current_user["tenant_id"]).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    supabase.table('leads').update({"status": status}).eq('id', lead_id).execute()
    
    return {"success": True}


# ============ Sales Agent Config Endpoints ============
@api_router.get("/config")
async def get_tenant_config(current_user: Dict = Depends(get_current_user)):
    result = supabase.table('tenant_configs').select('*').eq('tenant_id', current_user["tenant_id"]).execute()
    
    if not result.data:
        return {}
    
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
        "primary_language": config.get("primary_language")
    }


@api_router.put("/config")
async def update_tenant_config(request: TenantConfigUpdate, current_user: Dict = Depends(get_current_user)):
    result = supabase.table('tenant_configs').select('*').eq('tenant_id', current_user["tenant_id"]).execute()
    
    update_data = {k: v for k, v in request.model_dump().items() if v is not None}
    
    if result.data:
        supabase.table('tenant_configs').update(update_data).eq('tenant_id', current_user["tenant_id"]).execute()
    else:
        update_data["tenant_id"] = current_user["tenant_id"]
        supabase.table('tenant_configs').insert(update_data).execute()
    
    return {"success": True}


# ============ Knowledge Base Endpoints ============
@api_router.get("/documents")
async def get_documents(current_user: Dict = Depends(get_current_user)):
    result = supabase.table('documents').select('*').eq('tenant_id', current_user["tenant_id"]).order('created_at', desc=True).execute()
    documents = result.data or []
    
    return [
        {
            "id": doc["id"],
            "title": doc["title"],
            "file_type": doc.get("file_type", "text"),
            "file_size": doc.get("file_size"),
            "created_at": doc.get("created_at", "")
        }
        for doc in documents
    ]


@api_router.post("/documents")
async def create_document(request: DocumentCreate, current_user: Dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "tenant_id": current_user["tenant_id"],
        "title": request.title,
        "content": request.content,
        "file_type": "text",
        "file_size": len(request.content),
        "created_at": now_iso()
    }
    supabase.table('documents').insert(doc).execute()
    
    return {"id": doc["id"], "title": doc["title"], "created_at": doc["created_at"]}


@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: Dict = Depends(get_current_user)):
    result = supabase.table('documents').select('*').eq('id', doc_id).eq('tenant_id', current_user["tenant_id"]).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    
    supabase.table('documents').delete().eq('id', doc_id).execute()
    
    return {"success": True}


# ============ Integration Status Endpoints ============
@api_router.get("/integrations/status")
async def get_integrations_status(current_user: Dict = Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]
    
    tg_result = supabase.table('telegram_bots').select('*').eq('tenant_id', tenant_id).eq('is_active', True).execute()
    telegram_bot = tg_result.data[0] if tg_result.data else None
    
    return {
        "telegram": {
            "connected": telegram_bot is not None,
            "bot_username": telegram_bot.get("bot_username") if telegram_bot else None,
            "last_webhook_at": telegram_bot.get("last_webhook_at") if telegram_bot else None
        },
        "bitrix": {
            "connected": False,
            "is_demo": True,
            "domain": None
        },
        "google_sheets": {
            "connected": False,
            "sheet_id": None
        }
    }


# ============ Health Check ============
@api_router.get("/")
async def root():
    return {"message": "TeleAgent API - AI Sales Agent for Telegram"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": now_iso(), "database": "supabase"}


# Include router and add middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
