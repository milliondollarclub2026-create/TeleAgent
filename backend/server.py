"""AI Sales Agent for Telegram + Bitrix24 - Main Server (MongoDB Version)"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="TeleAgent - AI Sales Agent")
api_router = APIRouter(prefix="/api")


# ============ Auth Helpers ============
import hashlib
import secrets
import jwt

JWT_SECRET = os.environ.get('JWT_SECRET', 'teleagent-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


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
    existing = await db.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create tenant
    tenant_id = str(uuid.uuid4())
    tenant = {
        "id": tenant_id,
        "name": request.business_name,
        "timezone": "Asia/Tashkent",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tenants.insert_one(tenant)
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": request.email,
        "password_hash": hash_password(request.password),
        "name": request.name,
        "tenant_id": tenant_id,
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # Create default config
    config = {
        "tenant_id": tenant_id,
        "business_name": request.business_name,
        "collect_phone": True,
        "agent_tone": "professional",
        "primary_language": "uz",
        "vertical": "default"
    }
    await db.tenant_configs.insert_one(config)
    
    # Generate token
    token = create_access_token(user_id, tenant_id, request.email)
    
    return AuthResponse(
        token=token,
        user={
            "id": user_id,
            "email": request.email,
            "name": request.name,
            "tenant_id": tenant_id,
            "business_name": tenant["name"]
        }
    )


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    user = await db.users.find_one({"email": request.email})
    
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    tenant = await db.tenants.find_one({"id": user["tenant_id"]})
    token = create_access_token(user["id"], user["tenant_id"], user["email"])
    
    return AuthResponse(
        token=token,
        user={
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name"),
            "tenant_id": user["tenant_id"],
            "business_name": tenant["name"] if tenant else None
        }
    )


@api_router.get("/auth/me")
async def get_me(current_user: Dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tenant = await db.tenants.find_one({"id": user["tenant_id"]})
    
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name"),
        "tenant_id": user["tenant_id"],
        "business_name": tenant["name"] if tenant else None
    }


# ============ Telegram Bot Endpoints ============

import httpx

TELEGRAM_API_BASE = "https://api.telegram.org/bot"


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
                json={
                    "url": webhook_url,
                    "allowed_updates": ["message"],
                    "drop_pending_updates": True
                },
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
            response.raise_for_status()
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
            response = await http_client.post(
                url,
                json={"chat_id": chat_id, "action": "typing"},
                timeout=10.0
            )
            return True
    except Exception:
        return False


@api_router.post("/telegram/bot", response_model=TelegramBotResponse)
async def connect_telegram_bot(request: TelegramBotCreate, current_user: Dict = Depends(get_current_user)):
    bot_info = await get_bot_info(request.bot_token)
    if not bot_info:
        raise HTTPException(status_code=400, detail="Invalid bot token")
    
    tenant_id = current_user["tenant_id"]
    
    # Get webhook URL
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://teleagent.preview.emergentagent.com')
    webhook_url = f"{backend_url}/api/telegram/webhook"
    
    # Check if bot exists
    existing = await db.telegram_bots.find_one({"tenant_id": tenant_id})
    
    bot_id = existing["id"] if existing else str(uuid.uuid4())
    bot_doc = {
        "id": bot_id,
        "tenant_id": tenant_id,
        "bot_token": request.bot_token,
        "bot_username": bot_info.get("username"),
        "webhook_url": webhook_url,
        "is_active": True,
        "last_webhook_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.telegram_bots.update_one({"id": bot_id}, {"$set": bot_doc})
    else:
        await db.telegram_bots.insert_one(bot_doc)
    
    # Set webhook
    result = await set_telegram_webhook(request.bot_token, webhook_url)
    logger.info(f"Webhook set result: {result}")
    
    return TelegramBotResponse(
        id=bot_id,
        bot_username=bot_info.get("username"),
        is_active=True,
        webhook_url=webhook_url,
        last_webhook_at=None
    )


@api_router.get("/telegram/bot")
async def get_telegram_bot(current_user: Dict = Depends(get_current_user)):
    bot = await db.telegram_bots.find_one({"tenant_id": current_user["tenant_id"]})
    if not bot:
        return None
    
    return {
        "id": bot["id"],
        "bot_username": bot.get("bot_username"),
        "is_active": bot.get("is_active", False),
        "webhook_url": bot.get("webhook_url"),
        "last_webhook_at": bot.get("last_webhook_at")
    }


@api_router.delete("/telegram/bot")
async def disconnect_telegram_bot(current_user: Dict = Depends(get_current_user)):
    bot = await db.telegram_bots.find_one({"tenant_id": current_user["tenant_id"]})
    if bot:
        await delete_telegram_webhook(bot["bot_token"])
        await db.telegram_bots.update_one(
            {"id": bot["id"]},
            {"$set": {"is_active": False}}
        )
    return {"success": True}


# ============ LLM Service ============

from openai import AsyncOpenAI

openai_client = AsyncOpenAI(api_key=os.environ.get('OPENAI_API_KEY'))


def get_system_prompt(config: Optional[Dict] = None) -> str:
    business_name = config.get('business_name', 'our company') if config else 'our company'
    business_description = config.get('business_description', '') if config else ''
    products_services = config.get('products_services', '') if config else ''
    collect_phone = config.get('collect_phone', True) if config else True
    agent_tone = config.get('agent_tone', 'professional') if config else 'professional'
    
    phone_instruction = "Ask for the customer's phone number when appropriate." if collect_phone else ""
    
    return f"""You are a professional sales agent for {business_name}. You communicate primarily in Uzbek (O'zbek tili) and Russian (Русский).

BUSINESS CONTEXT:
{business_description}

PRODUCTS/SERVICES:
{products_services}

YOUR GOALS:
1. Understand customer needs
2. Propose appropriate products/services
3. Close the sale or get commitment
4. If not ready, gather qualification data and classify the lead

BEHAVIOR:
- Be {agent_tone}, confident, and helpful
- Ask clear questions (name, needs, budget, timeline)
- {phone_instruction}
- Keep messages concise
- For returning customers, acknowledge their history

LEAD CLASSIFICATION:
- HOT: Customer wants to buy now, has budget, ready to proceed
- WARM: Interested but needs more info
- COLD: Just browsing or not interested

OUTPUT FORMAT (JSON):
{{
  "reply_text": "Your response to the customer",
  "actions": [
    {{
      "type": "create_or_update_lead",
      "hotness": "hot/warm/cold",
      "score": 0-100,
      "intent": "short description",
      "fields": {{"name": "...", "phone": "...", "product": "...", "budget": "...", "timeline": "..."}},
      "explanation": "why this classification"
    }}
  ]
}}

Always respond in the customer's preferred language (Uzbek or Russian)."""


async def call_sales_agent(messages: List[Dict], config: Optional[Dict] = None) -> Dict:
    try:
        system_prompt = get_system_prompt(config)
        
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
        
        import json
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
            "reply_text": "Kechirasiz, texnik xatolik yuz berdi. / Извините, произошла техническая ошибка."
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
        bot = await db.telegram_bots.find_one({"is_active": True})
        if not bot:
            return {"ok": True}
        
        # Update last webhook time
        await db.telegram_bots.update_one(
            {"id": bot["id"]},
            {"$set": {"last_webhook_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Process in background
        background_tasks.add_task(
            process_telegram_message,
            bot["tenant_id"],
            bot["bot_token"],
            update
        )
        
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
            config = await db.tenant_configs.find_one({"tenant_id": tenant_id})
            greeting = config.get("greeting_message") if config else None
            if not greeting:
                greeting = "Assalomu alaykum! Men sizga qanday yordam bera olaman? / Здравствуйте! Чем могу помочь?"
            await send_telegram_message(bot_token, chat_id, greeting)
            return
        
        # Get or create customer
        customer = await db.customers.find_one({
            "tenant_id": tenant_id,
            "telegram_user_id": user_id
        })
        
        now = datetime.now(timezone.utc).isoformat()
        
        if not customer:
            primary_lang = 'ru' if language_code and language_code.startswith('ru') else 'uz'
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
            await db.customers.insert_one(customer)
        else:
            await db.customers.update_one(
                {"id": customer["id"]},
                {"$set": {"last_seen_at": now}}
            )
        
        # Get or create conversation
        conversation = await db.conversations.find_one({
            "tenant_id": tenant_id,
            "customer_id": customer["id"],
            "status": "active"
        })
        
        if not conversation:
            conversation = {
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "customer_id": customer["id"],
                "status": "active",
                "started_at": now,
                "last_message_at": now
            }
            await db.conversations.insert_one(conversation)
        
        # Save incoming message
        incoming_msg = {
            "id": str(uuid.uuid4()),
            "conversation_id": conversation["id"],
            "sender_type": "user",
            "text": text,
            "created_at": now
        }
        await db.messages.insert_one(incoming_msg)
        
        # Get conversation history
        history_cursor = db.messages.find(
            {"conversation_id": conversation["id"]}
        ).sort("created_at", -1).limit(10)
        history = await history_cursor.to_list(length=10)
        history.reverse()
        
        messages_for_llm = [
            {"role": "assistant" if m["sender_type"] == "agent" else "user", "text": m["text"]}
            for m in history
        ]
        
        # Get config
        config = await db.tenant_configs.find_one({"tenant_id": tenant_id})
        
        # Call LLM
        llm_result = await call_sales_agent(messages_for_llm, config)
        
        # Process actions
        if llm_result.get("actions"):
            for action in llm_result["actions"]:
                if action.get("type") == "create_or_update_lead":
                    await process_lead_action(tenant_id, customer, action)
        
        # Save agent response
        agent_msg = {
            "id": str(uuid.uuid4()),
            "conversation_id": conversation["id"],
            "sender_type": "agent",
            "text": llm_result["reply_text"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.messages.insert_one(agent_msg)
        
        # Update conversation
        await db.conversations.update_one(
            {"id": conversation["id"]},
            {"$set": {"last_message_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Send response
        await send_telegram_message(bot_token, chat_id, llm_result["reply_text"])
        
        # Log event
        await db.event_logs.insert_one({
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "event_type": "message_processed",
            "event_data": {
                "customer_id": customer["id"],
                "conversation_id": conversation["id"]
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        try:
            await send_telegram_message(
                bot_token, 
                update.get("message", {}).get("chat", {}).get("id"),
                "Kechirasiz, texnik xatolik yuz berdi. / Извините, произошла техническая ошибка."
            )
        except Exception:
            pass


async def process_lead_action(tenant_id: str, customer: Dict, action: Dict):
    now = datetime.now(timezone.utc).isoformat()
    
    hotness = action.get("hotness", "warm")
    score = action.get("score", 50)
    intent = action.get("intent", "")
    explanation = action.get("explanation", "")
    fields = action.get("fields", {})
    
    # Check for existing lead
    existing_lead = await db.leads.find_one({
        "tenant_id": tenant_id,
        "customer_id": customer["id"]
    })
    
    lead_data = {
        "tenant_id": tenant_id,
        "customer_id": customer["id"],
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
    
    if existing_lead:
        await db.leads.update_one(
            {"id": existing_lead["id"]},
            {"$set": lead_data}
        )
    else:
        lead_data["id"] = str(uuid.uuid4())
        lead_data["created_at"] = now
        await db.leads.insert_one(lead_data)
    
    # Update customer info if provided
    updates = {}
    if fields.get("name"):
        updates["name"] = fields["name"]
    if fields.get("phone"):
        updates["phone"] = fields["phone"]
    
    if updates:
        await db.customers.update_one(
            {"id": customer["id"]},
            {"$set": updates}
        )


# ============ Dashboard Endpoints ============

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: Dict = Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_conversations = await db.conversations.count_documents({"tenant_id": tenant_id})
    total_leads = await db.leads.count_documents({"tenant_id": tenant_id})
    hot_leads = await db.leads.count_documents({"tenant_id": tenant_id, "final_hotness": "hot"})
    warm_leads = await db.leads.count_documents({"tenant_id": tenant_id, "final_hotness": "warm"})
    cold_leads = await db.leads.count_documents({"tenant_id": tenant_id, "final_hotness": "cold"})
    
    # Count returning customers
    pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$match": {"$expr": {"$ne": ["$first_seen_at", "$last_seen_at"]}}},
        {"$count": "count"}
    ]
    result = await db.customers.aggregate(pipeline).to_list(1)
    returning_customers = result[0]["count"] if result else 0
    
    # Leads today
    leads_today = await db.leads.count_documents({
        "tenant_id": tenant_id,
        "created_at": {"$gte": today.isoformat()}
    })
    
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
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    leads_cursor = db.leads.find({
        "tenant_id": tenant_id,
        "created_at": {"$gte": start_date.isoformat()}
    }).sort("created_at", 1)
    leads = await leads_cursor.to_list(length=1000)
    
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
        result_list.append(LeadsPerDay(
            date=date,
            count=stats["count"],
            hot=stats["hot"],
            warm=stats["warm"],
            cold=stats["cold"]
        ))
    
    return result_list


# ============ Leads Endpoints ============

@api_router.get("/leads", response_model=List[LeadResponse])
async def get_leads(
    status: Optional[str] = None,
    hotness: Optional[str] = None,
    limit: int = 50,
    current_user: Dict = Depends(get_current_user)
):
    tenant_id = current_user["tenant_id"]
    
    query = {"tenant_id": tenant_id}
    if status:
        query["status"] = status
    if hotness:
        query["final_hotness"] = hotness
    
    leads_cursor = db.leads.find(query).sort("created_at", -1).limit(limit)
    leads = await leads_cursor.to_list(length=limit)
    
    result = []
    for lead in leads:
        customer = await db.customers.find_one({"id": lead["customer_id"]})
        result.append(LeadResponse(
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
    
    return result


@api_router.put("/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, status: str, current_user: Dict = Depends(get_current_user)):
    result = await db.leads.update_one(
        {"id": lead_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {"status": status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {"success": True}


# ============ Sales Agent Config Endpoints ============

@api_router.get("/config")
async def get_tenant_config(current_user: Dict = Depends(get_current_user)):
    config = await db.tenant_configs.find_one({"tenant_id": current_user["tenant_id"]})
    if not config:
        return {}
    
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
    update_data = {k: v for k, v in request.model_dump().items() if v is not None}
    
    await db.tenant_configs.update_one(
        {"tenant_id": current_user["tenant_id"]},
        {"$set": update_data},
        upsert=True
    )
    
    return {"success": True}


# ============ Knowledge Base Endpoints ============

@api_router.get("/documents")
async def get_documents(current_user: Dict = Depends(get_current_user)):
    docs_cursor = db.documents.find({"tenant_id": current_user["tenant_id"]}).sort("created_at", -1)
    documents = await docs_cursor.to_list(length=100)
    
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.documents.insert_one(doc)
    
    return {
        "id": doc["id"],
        "title": doc["title"],
        "created_at": doc["created_at"]
    }


@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: Dict = Depends(get_current_user)):
    result = await db.documents.delete_one({
        "id": doc_id,
        "tenant_id": current_user["tenant_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"success": True}


# ============ Integration Status Endpoints ============

@api_router.get("/integrations/status")
async def get_integrations_status(current_user: Dict = Depends(get_current_user)):
    tenant_id = current_user["tenant_id"]
    
    telegram_bot = await db.telegram_bots.find_one({
        "tenant_id": tenant_id,
        "is_active": True
    })
    
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
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# Include router and add middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
