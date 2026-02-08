"""AI Sales Agent for Telegram + Bitrix24 - Main Server with Supabase"""
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
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from sqlalchemy.orm import selectinload
import hashlib
import secrets
import jwt
import httpx
from openai import AsyncOpenAI
import json

from database import get_db, engine, Base, AsyncSessionLocal
from models import (
    Tenant, User, TelegramBot, Customer, Conversation, Message, 
    Lead, Document, TenantConfig, EventLog
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create tenant
    tenant_id = str(uuid.uuid4())
    tenant = Tenant(
        id=tenant_id,
        name=request.business_name,
        created_at=datetime.now(timezone.utc)
    )
    db.add(tenant)
    
    # Create user with confirmation token
    user_id = str(uuid.uuid4())
    confirmation_token = generate_confirmation_token()
    user = User(
        id=user_id,
        email=request.email,
        password_hash=hash_password(request.password),
        name=request.name,
        tenant_id=tenant_id,
        role="admin",
        email_confirmed=False,
        confirmation_token=confirmation_token,
        created_at=datetime.now(timezone.utc)
    )
    db.add(user)
    
    # Create default config
    config = TenantConfig(
        tenant_id=tenant_id,
        business_name=request.business_name,
        collect_phone=True,
        agent_tone="professional",
        primary_language="uz",
        vertical="default"
    )
    db.add(config)
    
    await db.commit()
    
    # Generate token
    token = create_access_token(user_id, tenant_id, request.email)
    
    # TODO: Send confirmation email (for now, auto-confirm)
    # In production, integrate with email service like SendGrid/Resend
    
    return AuthResponse(
        token=token,
        user={
            "id": user_id,
            "email": request.email,
            "name": request.name,
            "tenant_id": tenant_id,
            "business_name": tenant.name,
            "email_confirmed": False
        },
        message="Account created. Please check your email to confirm your account."
    )


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Get tenant
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    
    token = create_access_token(user.id, user.tenant_id, user.email)
    
    return AuthResponse(
        token=token,
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "tenant_id": user.tenant_id,
            "business_name": tenant.name if tenant else None,
            "email_confirmed": user.email_confirmed
        }
    )


@api_router.get("/auth/me")
async def get_me(current_user: Dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == current_user["user_id"]))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_result.scalar_one_or_none()
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "tenant_id": user.tenant_id,
        "business_name": tenant.name if tenant else None,
        "email_confirmed": user.email_confirmed
    }


@api_router.get("/auth/confirm/{token}")
async def confirm_email(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.confirmation_token == token))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid confirmation token")
    
    user.email_confirmed = True
    user.confirmation_token = None
    await db.commit()
    
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
async def connect_telegram_bot(request: TelegramBotCreate, current_user: Dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    bot_info = await get_bot_info(request.bot_token)
    if not bot_info:
        raise HTTPException(status_code=400, detail="Invalid bot token")
    
    tenant_id = current_user["tenant_id"]
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://teleagent.preview.emergentagent.com')
    webhook_url = f"{backend_url}/api/telegram/webhook"
    
    # Check existing
    result = await db.execute(select(TelegramBot).where(TelegramBot.tenant_id == tenant_id))
    existing = result.scalar_one_or_none()
    
    bot_id = existing.id if existing else str(uuid.uuid4())
    
    if existing:
        existing.bot_token = request.bot_token
        existing.bot_username = bot_info.get("username")
        existing.webhook_url = webhook_url
        existing.is_active = True
    else:
        bot = TelegramBot(
            id=bot_id,
            tenant_id=tenant_id,
            bot_token=request.bot_token,
            bot_username=bot_info.get("username"),
            webhook_url=webhook_url,
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        db.add(bot)
    
    await db.commit()
    
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
async def get_telegram_bot(current_user: Dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TelegramBot).where(TelegramBot.tenant_id == current_user["tenant_id"]))
    bot = result.scalar_one_or_none()
    
    if not bot:
        return None
    
    return {
        "id": bot.id,
        "bot_username": bot.bot_username,
        "is_active": bot.is_active,
        "webhook_url": bot.webhook_url,
        "last_webhook_at": bot.last_webhook_at.isoformat() if bot.last_webhook_at else None
    }


@api_router.delete("/telegram/bot")
async def disconnect_telegram_bot(current_user: Dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TelegramBot).where(TelegramBot.tenant_id == current_user["tenant_id"]))
    bot = result.scalar_one_or_none()
    
    if bot:
        await delete_telegram_webhook(bot.bot_token)
        bot.is_active = False
        await db.commit()
    
    return {"success": True}


# ============ LLM Service ============
def get_system_prompt(config: Optional[Dict] = None) -> str:
    """
    Generates the system prompt for the AI Sales Agent.
    
    SALES AGENT BEHAVIOR EXPLANATION:
    ================================
    The AI Sales Agent operates as a professional salesperson with these key behaviors:
    
    1. GOAL HIERARCHY:
       - First: Understand customer needs through targeted questions
       - Second: Propose appropriate products/services from the business catalog
       - Third: Close the sale or get commitment (booking, order, appointment)
       - Fourth: If not ready to buy, gather qualification data and classify lead
    
    2. COMMUNICATION STYLE:
       - Multilingual: Responds in customer's preferred language (Uzbek/Russian/English)
       - Concise: Avoids long paragraphs, uses clear bullet points
       - Professional yet warm: Adapts tone based on config
       - Proactive: Asks targeted questions to understand needs
    
    3. LEAD CLASSIFICATION LOGIC:
       - HOT: Customer explicitly wants to buy NOW, has budget, ready to proceed
       - WARM: Interested but needs more info, comparing options, timeline unclear
       - COLD: Just browsing, no clear interest, or explicitly not interested
       - Agent provides explanation for each classification
    
    4. DATA COLLECTION:
       - Name, phone (if enabled), product interest
       - Budget, timeline, specific requirements
       - Objections and concerns for follow-up
    
    5. RAG INTEGRATION:
       - Uses uploaded documents to answer product/service questions
       - Falls back to asking clarifying questions if info not available
       - Never invents prices or policies not in knowledge base
    """
    
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

FACTUAL CONSTRAINTS:
- Only use information from the business context provided
- If pricing or policy info is missing, give a general answer or ask to confirm
- Never invent specific numbers or make promises you can't verify

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


async def get_business_context(db: AsyncSession, tenant_id: str, query: str) -> List[str]:
    """
    RAG SYSTEM EXPLANATION:
    =======================
    Currently implements simple keyword matching for MVP.
    
    HOW IT WORKS:
    1. Fetches all documents for the tenant
    2. Splits query and document content into words
    3. Finds documents with matching keywords
    4. Returns top 5 relevant snippets (500 chars each)
    
    SUPPORTED DOCUMENT TYPES:
    - Text documents (pasted content)
    - In future: PDF, DOCX, TXT files with text extraction
    
    FUTURE IMPROVEMENTS:
    - Vector embeddings using OpenAI/pgvector
    - Semantic search for better relevance
    - Document chunking for large files
    - Metadata-based filtering
    """
    result = await db.execute(select(Document).where(Document.tenant_id == tenant_id))
    documents = result.scalars().all()
    
    context = []
    query_words = set(query.lower().split())
    
    for doc in documents:
        if doc.content:
            doc_words = set(doc.content.lower().split())
            # Find matching keywords
            if query_words & doc_words:
                snippet = doc.content[:500] + "..." if len(doc.content) > 500 else doc.content
                context.append(f"[{doc.title}]: {snippet}")
    
    return context[:5]


async def call_sales_agent(messages: List[Dict], config: Optional[Dict] = None, business_context: List[str] = None) -> Dict:
    try:
        system_prompt = get_system_prompt(config)
        
        # Add business context to system prompt
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
            "reply_text": "Kechirasiz, texnik xatolik yuz berdi. / Извините, произошла техническая ошибка. / Sorry, a technical error occurred."
        }


# ============ Telegram Webhook Handler ============
@api_router.post("/telegram/webhook")
async def telegram_webhook(request: Request, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    try:
        update = await request.json()
        logger.info(f"Received Telegram update: {update}")
        
        message = update.get("message")
        if not message or not message.get("text"):
            return {"ok": True}
        
        # Get active bot
        result = await db.execute(select(TelegramBot).where(TelegramBot.is_active == True))
        bot = result.scalar_one_or_none()
        
        if not bot:
            return {"ok": True}
        
        # Update last webhook time
        bot.last_webhook_at = datetime.now(timezone.utc)
        await db.commit()
        
        # Process in background
        background_tasks.add_task(process_telegram_message, bot.tenant_id, bot.bot_token, update)
        
        return {"ok": True}
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"ok": True}


async def process_telegram_message(tenant_id: str, bot_token: str, update: Dict):
    async with AsyncSessionLocal() as db:
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
                config_result = await db.execute(select(TenantConfig).where(TenantConfig.tenant_id == tenant_id))
                config = config_result.scalar_one_or_none()
                greeting = config.greeting_message if config and config.greeting_message else None
                if not greeting:
                    greeting = "Assalomu alaykum! Men sizga qanday yordam bera olaman?\nЗдравствуйте! Чем могу помочь?\nHello! How can I help you?"
                await send_telegram_message(bot_token, chat_id, greeting)
                return
            
            # Get or create customer
            result = await db.execute(
                select(Customer).where(
                    and_(Customer.tenant_id == tenant_id, Customer.telegram_user_id == user_id)
                )
            )
            customer = result.scalar_one_or_none()
            
            now = datetime.now(timezone.utc)
            
            if not customer:
                # Detect language from Telegram language_code
                if language_code:
                    if language_code.startswith('ru'):
                        primary_lang = 'ru'
                    elif language_code.startswith('en'):
                        primary_lang = 'en'
                    else:
                        primary_lang = 'uz'
                else:
                    primary_lang = 'uz'
                    
                customer = Customer(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant_id,
                    telegram_user_id=user_id,
                    telegram_username=username,
                    name=first_name,
                    primary_language=primary_lang,
                    segments=[],
                    first_seen_at=now,
                    last_seen_at=now
                )
                db.add(customer)
            else:
                customer.last_seen_at = now
            
            # Get or create conversation
            conv_result = await db.execute(
                select(Conversation).where(
                    and_(
                        Conversation.tenant_id == tenant_id,
                        Conversation.customer_id == customer.id,
                        Conversation.status == 'active'
                    )
                )
            )
            conversation = conv_result.scalar_one_or_none()
            
            if not conversation:
                conversation = Conversation(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant_id,
                    customer_id=customer.id,
                    status='active',
                    started_at=now,
                    last_message_at=now
                )
                db.add(conversation)
            
            # Save incoming message
            incoming_msg = Message(
                id=str(uuid.uuid4()),
                conversation_id=conversation.id,
                sender_type="user",
                text=text,
                created_at=now
            )
            db.add(incoming_msg)
            
            await db.commit()
            
            # Get conversation history
            history_result = await db.execute(
                select(Message)
                .where(Message.conversation_id == conversation.id)
                .order_by(desc(Message.created_at))
                .limit(10)
            )
            history = list(reversed(history_result.scalars().all()))
            
            messages_for_llm = [
                {"role": "assistant" if m.sender_type == "agent" else "user", "text": m.text}
                for m in history
            ]
            
            # Get config
            config_result = await db.execute(select(TenantConfig).where(TenantConfig.tenant_id == tenant_id))
            config = config_result.scalar_one_or_none()
            config_dict = {
                "business_name": config.business_name if config else None,
                "business_description": config.business_description if config else None,
                "products_services": config.products_services if config else None,
                "collect_phone": config.collect_phone if config else True,
                "agent_tone": config.agent_tone if config else "professional"
            } if config else None
            
            # Get business context (RAG)
            business_context = await get_business_context(db, tenant_id, text)
            
            # Call LLM
            llm_result = await call_sales_agent(messages_for_llm, config_dict, business_context)
            
            # Process actions
            if llm_result.get("actions"):
                for action in llm_result["actions"]:
                    if action.get("type") == "create_or_update_lead":
                        await process_lead_action(db, tenant_id, customer, action)
            
            # Save agent response
            agent_msg = Message(
                id=str(uuid.uuid4()),
                conversation_id=conversation.id,
                sender_type="agent",
                text=llm_result["reply_text"],
                created_at=datetime.now(timezone.utc)
            )
            db.add(agent_msg)
            
            # Update conversation
            conversation.last_message_at = datetime.now(timezone.utc)
            
            await db.commit()
            
            # Send response
            await send_telegram_message(bot_token, chat_id, llm_result["reply_text"])
            
            # Log event
            event = EventLog(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                event_type="message_processed",
                event_data={"customer_id": customer.id, "conversation_id": conversation.id},
                created_at=datetime.now(timezone.utc)
            )
            db.add(event)
            await db.commit()
            
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


async def process_lead_action(db: AsyncSession, tenant_id: str, customer: Customer, action: Dict):
    now = datetime.now(timezone.utc)
    
    hotness = action.get("hotness", "warm")
    score = action.get("score", 50)
    intent = action.get("intent", "")
    explanation = action.get("explanation", "")
    fields = action.get("fields", {})
    
    # Check for existing lead
    result = await db.execute(
        select(Lead).where(
            and_(Lead.tenant_id == tenant_id, Lead.customer_id == customer.id)
        )
    )
    existing_lead = result.scalar_one_or_none()
    
    if existing_lead:
        existing_lead.llm_hotness_suggestion = hotness
        existing_lead.final_hotness = hotness
        existing_lead.score = score
        existing_lead.intent = intent
        existing_lead.llm_explanation = explanation
        existing_lead.product = fields.get("product")
        existing_lead.budget = fields.get("budget")
        existing_lead.timeline = fields.get("timeline")
        existing_lead.additional_notes = fields.get("additional_notes")
        existing_lead.last_interaction_at = now
    else:
        lead = Lead(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            customer_id=customer.id,
            status="new",
            llm_hotness_suggestion=hotness,
            final_hotness=hotness,
            score=score,
            intent=intent,
            llm_explanation=explanation,
            product=fields.get("product"),
            budget=fields.get("budget"),
            timeline=fields.get("timeline"),
            additional_notes=fields.get("additional_notes"),
            source_channel="telegram",
            created_at=now,
            last_interaction_at=now
        )
        db.add(lead)
    
    # Update customer info
    if fields.get("name"):
        customer.name = fields["name"]
    if fields.get("phone"):
        customer.phone = fields["phone"]


# ============ Dashboard Endpoints ============
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: Dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tenant_id = current_user["tenant_id"]
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    conv_result = await db.execute(select(func.count(Conversation.id)).where(Conversation.tenant_id == tenant_id))
    total_conversations = conv_result.scalar() or 0
    
    leads_result = await db.execute(select(func.count(Lead.id)).where(Lead.tenant_id == tenant_id))
    total_leads = leads_result.scalar() or 0
    
    hot_result = await db.execute(select(func.count(Lead.id)).where(and_(Lead.tenant_id == tenant_id, Lead.final_hotness == "hot")))
    hot_leads = hot_result.scalar() or 0
    
    warm_result = await db.execute(select(func.count(Lead.id)).where(and_(Lead.tenant_id == tenant_id, Lead.final_hotness == "warm")))
    warm_leads = warm_result.scalar() or 0
    
    cold_result = await db.execute(select(func.count(Lead.id)).where(and_(Lead.tenant_id == tenant_id, Lead.final_hotness == "cold")))
    cold_leads = cold_result.scalar() or 0
    
    returning_result = await db.execute(
        select(func.count(Customer.id)).where(
            and_(Customer.tenant_id == tenant_id, Customer.first_seen_at != Customer.last_seen_at)
        )
    )
    returning_customers = returning_result.scalar() or 0
    
    today_result = await db.execute(select(func.count(Lead.id)).where(and_(Lead.tenant_id == tenant_id, Lead.created_at >= today)))
    leads_today = today_result.scalar() or 0
    
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
async def get_leads_per_day(days: int = 7, current_user: Dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tenant_id = current_user["tenant_id"]
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    result = await db.execute(
        select(Lead).where(and_(Lead.tenant_id == tenant_id, Lead.created_at >= start_date)).order_by(Lead.created_at)
    )
    leads = result.scalars().all()
    
    daily_stats = {}
    for lead in leads:
        date_str = lead.created_at.strftime("%Y-%m-%d")
        if date_str not in daily_stats:
            daily_stats[date_str] = {"count": 0, "hot": 0, "warm": 0, "cold": 0}
        daily_stats[date_str]["count"] += 1
        if lead.final_hotness in daily_stats[date_str]:
            daily_stats[date_str][lead.final_hotness] += 1
    
    result_list = []
    for i in range(days):
        date = (datetime.now(timezone.utc) - timedelta(days=days-1-i)).strftime("%Y-%m-%d")
        stats = daily_stats.get(date, {"count": 0, "hot": 0, "warm": 0, "cold": 0})
        result_list.append(LeadsPerDay(date=date, count=stats["count"], hot=stats["hot"], warm=stats["warm"], cold=stats["cold"]))
    
    return result_list


# ============ Leads Endpoints ============
@api_router.get("/leads", response_model=List[LeadResponse])
async def get_leads(status: Optional[str] = None, hotness: Optional[str] = None, limit: int = 50, current_user: Dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tenant_id = current_user["tenant_id"]
    
    query = select(Lead).where(Lead.tenant_id == tenant_id)
    if status:
        query = query.where(Lead.status == status)
    if hotness:
        query = query.where(Lead.final_hotness == hotness)
    
    query = query.order_by(desc(Lead.created_at)).limit(limit)
    result = await db.execute(query)
    leads = result.scalars().all()
    
    response = []
    for lead in leads:
        cust_result = await db.execute(select(Customer).where(Customer.id == lead.customer_id))
        customer = cust_result.scalar_one_or_none()
        response.append(LeadResponse(
            id=lead.id,
            customer_name=customer.name if customer else None,
            customer_phone=customer.phone if customer else None,
            status=lead.status,
            final_hotness=lead.final_hotness,
            score=lead.score,
            intent=lead.intent,
            product=lead.product,
            llm_explanation=lead.llm_explanation,
            source_channel=lead.source_channel,
            created_at=lead.created_at.isoformat(),
            last_interaction_at=lead.last_interaction_at.isoformat()
        ))
    
    return response


@api_router.put("/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, status: str, current_user: Dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Lead).where(and_(Lead.id == lead_id, Lead.tenant_id == current_user["tenant_id"])))
    lead = result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead.status = status
    await db.commit()
    
    return {"success": True}


# ============ Sales Agent Config Endpoints ============
@api_router.get("/config")
async def get_tenant_config(current_user: Dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TenantConfig).where(TenantConfig.tenant_id == current_user["tenant_id"]))
    config = result.scalar_one_or_none()
    
    if not config:
        return {}
    
    return {
        "vertical": config.vertical,
        "business_name": config.business_name,
        "business_description": config.business_description,
        "products_services": config.products_services,
        "faq_objections": config.faq_objections,
        "collect_phone": config.collect_phone,
        "greeting_message": config.greeting_message,
        "agent_tone": config.agent_tone,
        "primary_language": config.primary_language
    }


@api_router.put("/config")
async def update_tenant_config(request: TenantConfigUpdate, current_user: Dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TenantConfig).where(TenantConfig.tenant_id == current_user["tenant_id"]))
    config = result.scalar_one_or_none()
    
    if not config:
        config = TenantConfig(tenant_id=current_user["tenant_id"])
        db.add(config)
    
    update_data = {k: v for k, v in request.model_dump().items() if v is not None}
    for key, value in update_data.items():
        setattr(config, key, value)
    
    await db.commit()
    return {"success": True}


# ============ Knowledge Base Endpoints ============
@api_router.get("/documents")
async def get_documents(current_user: Dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    GET ALL DOCUMENTS FOR RAG
    
    Currently supports: Text documents (pasted content)
    Future support: PDF, DOCX, TXT file uploads with extraction
    """
    result = await db.execute(select(Document).where(Document.tenant_id == current_user["tenant_id"]).order_by(desc(Document.created_at)))
    documents = result.scalars().all()
    
    return [
        {
            "id": doc.id,
            "title": doc.title,
            "file_type": doc.file_type or "text",
            "file_size": doc.file_size,
            "created_at": doc.created_at.isoformat()
        }
        for doc in documents
    ]


@api_router.post("/documents")
async def create_document(request: DocumentCreate, current_user: Dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    CREATE A DOCUMENT FOR RAG
    
    The document content is stored as plain text and used for keyword-based RAG.
    Upload business information like:
    - Product catalogs with prices
    - Service descriptions
    - FAQ and common objections
    - Company policies
    - Contact information
    """
    doc = Document(
        id=str(uuid.uuid4()),
        tenant_id=current_user["tenant_id"],
        title=request.title,
        content=request.content,
        file_type="text",
        file_size=len(request.content),
        created_at=datetime.now(timezone.utc)
    )
    db.add(doc)
    await db.commit()
    
    return {"id": doc.id, "title": doc.title, "created_at": doc.created_at.isoformat()}


@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: Dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(and_(Document.id == doc_id, Document.tenant_id == current_user["tenant_id"])))
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await db.delete(doc)
    await db.commit()
    
    return {"success": True}


# ============ Integration Status Endpoints ============
@api_router.get("/integrations/status")
async def get_integrations_status(current_user: Dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tenant_id = current_user["tenant_id"]
    
    tg_result = await db.execute(select(TelegramBot).where(and_(TelegramBot.tenant_id == tenant_id, TelegramBot.is_active == True)))
    telegram_bot = tg_result.scalar_one_or_none()
    
    return {
        "telegram": {
            "connected": telegram_bot is not None,
            "bot_username": telegram_bot.bot_username if telegram_bot else None,
            "last_webhook_at": telegram_bot.last_webhook_at.isoformat() if telegram_bot and telegram_bot.last_webhook_at else None
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


# Create tables on startup
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")


@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()
