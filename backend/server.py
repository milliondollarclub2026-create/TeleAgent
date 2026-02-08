"""AI Sales Agent for Telegram + Bitrix24 - Main Server"""
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

from database import get_db, engine, Base
from models import (
    Tenant, User, TelegramBot, Customer, Conversation, Message, 
    Lead, Document, TenantConfig, PromptVersion, EventLog,
    IntegrationBitrix, IntegrationGoogleSheets
)
from auth_service import hash_password, verify_password, create_access_token, verify_token, TokenData
from telegram_service import (
    set_webhook, delete_webhook, get_webhook_info, get_bot_info, parse_telegram_update
)
from orchestrator import handle_incoming_message
from bitrix_service import BitrixService

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
    last_webhook_at: Optional[datetime]

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
    created_at: datetime
    last_interaction_at: datetime

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

async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> TokenData:
    """Verify JWT token and return current user data"""
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
    """Register a new user and tenant"""
    # Check if email exists
    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create tenant
    tenant = Tenant(
        name=request.business_name,
        created_at=datetime.now(timezone.utc)
    )
    db.add(tenant)
    await db.flush()
    
    # Create user
    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        name=request.name,
        tenant_id=tenant.id,
        role="admin",
        created_at=datetime.now(timezone.utc)
    )
    db.add(user)
    
    # Create default tenant config
    config = TenantConfig(
        tenant_id=tenant.id,
        business_name=request.business_name,
        collect_phone=True,
        agent_tone="professional",
        primary_language="uz"
    )
    db.add(config)
    
    await db.commit()
    
    # Generate token
    token = create_access_token(user.id, tenant.id, user.email)
    
    return AuthResponse(
        token=token,
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "tenant_id": tenant.id,
            "business_name": tenant.name
        }
    )


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login and get access token"""
    result = await db.execute(
        select(User).options(selectinload(User.tenant)).where(User.email == request.email)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token(user.id, user.tenant_id, user.email)
    
    return AuthResponse(
        token=token,
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "tenant_id": user.tenant_id,
            "business_name": user.tenant.name if user.tenant else None
        }
    )


@api_router.get("/auth/me")
async def get_me(current_user: TokenData = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get current user info"""
    result = await db.execute(
        select(User).options(selectinload(User.tenant)).where(User.id == current_user.user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "tenant_id": user.tenant_id,
        "business_name": user.tenant.name if user.tenant else None
    }


# ============ Telegram Bot Endpoints ============

@api_router.post("/telegram/bot", response_model=TelegramBotResponse)
async def connect_telegram_bot(
    request: TelegramBotCreate,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Connect a Telegram bot"""
    # Get bot info
    bot_info = await get_bot_info(request.bot_token)
    if not bot_info:
        raise HTTPException(status_code=400, detail="Invalid bot token")
    
    # Check if bot already exists for this tenant
    result = await db.execute(
        select(TelegramBot).where(TelegramBot.tenant_id == current_user.tenant_id)
    )
    existing_bot = result.scalar_one_or_none()
    
    # Get webhook URL
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', '').replace('https://', '').replace('http://', '')
    if not backend_url:
        # Fallback to constructing from request
        backend_url = "teleagent.preview.emergentagent.com"
    webhook_url = f"https://{backend_url}/api/telegram/webhook"
    
    if existing_bot:
        # Update existing bot
        existing_bot.bot_token = request.bot_token
        existing_bot.bot_username = bot_info.get("username")
        existing_bot.webhook_url = webhook_url
        existing_bot.is_active = True
        bot = existing_bot
    else:
        # Create new bot
        bot = TelegramBot(
            tenant_id=current_user.tenant_id,
            bot_token=request.bot_token,
            bot_username=bot_info.get("username"),
            webhook_url=webhook_url,
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
        db.add(bot)
    
    await db.commit()
    await db.refresh(bot)
    
    # Set webhook
    result = await set_webhook(request.bot_token, webhook_url)
    logger.info(f"Webhook set result: {result}")
    
    return TelegramBotResponse(
        id=bot.id,
        bot_username=bot.bot_username,
        is_active=bot.is_active,
        webhook_url=bot.webhook_url,
        last_webhook_at=bot.last_webhook_at
    )


@api_router.get("/telegram/bot", response_model=Optional[TelegramBotResponse])
async def get_telegram_bot(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get connected Telegram bot"""
    result = await db.execute(
        select(TelegramBot).where(TelegramBot.tenant_id == current_user.tenant_id)
    )
    bot = result.scalar_one_or_none()
    
    if not bot:
        return None
    
    return TelegramBotResponse(
        id=bot.id,
        bot_username=bot.bot_username,
        is_active=bot.is_active,
        webhook_url=bot.webhook_url,
        last_webhook_at=bot.last_webhook_at
    )


@api_router.delete("/telegram/bot")
async def disconnect_telegram_bot(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Disconnect Telegram bot"""
    result = await db.execute(
        select(TelegramBot).where(TelegramBot.tenant_id == current_user.tenant_id)
    )
    bot = result.scalar_one_or_none()
    
    if bot:
        await delete_webhook(bot.bot_token)
        bot.is_active = False
        await db.commit()
    
    return {"success": True}


@api_router.post("/telegram/webhook")
async def telegram_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Handle incoming Telegram webhook"""
    try:
        update = await request.json()
        logger.info(f"Received Telegram update: {update}")
        
        # Parse update
        parsed = parse_telegram_update(update)
        if not parsed:
            return {"ok": True}
        
        # Find bot by checking all active bots (in production, use bot token from webhook URL)
        result = await db.execute(
            select(TelegramBot).where(TelegramBot.is_active == True)
        )
        bots = result.scalars().all()
        
        for bot in bots:
            # Update last webhook time
            bot.last_webhook_at = datetime.now(timezone.utc)
            
            # Process message in background
            background_tasks.add_task(
                process_telegram_message,
                bot.tenant_id,
                bot.bot_token,
                parsed
            )
            break  # For MVP, process with first active bot
        
        await db.commit()
        return {"ok": True}
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"ok": True}  # Always return ok to Telegram


async def process_telegram_message(tenant_id: str, bot_token: str, update_data: Dict[str, Any]):
    """Process Telegram message in background"""
    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        try:
            await handle_incoming_message(db, tenant_id, bot_token, update_data)
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")


# ============ Dashboard Endpoints ============

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard statistics"""
    tenant_id = current_user.tenant_id
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Total conversations
    conv_result = await db.execute(
        select(func.count(Conversation.id)).where(Conversation.tenant_id == tenant_id)
    )
    total_conversations = conv_result.scalar() or 0
    
    # Total leads
    leads_result = await db.execute(
        select(func.count(Lead.id)).where(Lead.tenant_id == tenant_id)
    )
    total_leads = leads_result.scalar() or 0
    
    # Hot leads
    hot_result = await db.execute(
        select(func.count(Lead.id)).where(
            and_(Lead.tenant_id == tenant_id, Lead.final_hotness == "hot")
        )
    )
    hot_leads = hot_result.scalar() or 0
    
    # Warm leads
    warm_result = await db.execute(
        select(func.count(Lead.id)).where(
            and_(Lead.tenant_id == tenant_id, Lead.final_hotness == "warm")
        )
    )
    warm_leads = warm_result.scalar() or 0
    
    # Cold leads
    cold_result = await db.execute(
        select(func.count(Lead.id)).where(
            and_(Lead.tenant_id == tenant_id, Lead.final_hotness == "cold")
        )
    )
    cold_leads = cold_result.scalar() or 0
    
    # Returning customers
    returning_result = await db.execute(
        select(func.count(Customer.id)).where(
            and_(
                Customer.tenant_id == tenant_id,
                Customer.first_seen_at != Customer.last_seen_at
            )
        )
    )
    returning_customers = returning_result.scalar() or 0
    
    # Leads today
    today_result = await db.execute(
        select(func.count(Lead.id)).where(
            and_(Lead.tenant_id == tenant_id, Lead.created_at >= today)
        )
    )
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
async def get_leads_per_day(
    days: int = 7,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get leads per day for the last N days"""
    tenant_id = current_user.tenant_id
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    result = await db.execute(
        select(Lead).where(
            and_(
                Lead.tenant_id == tenant_id,
                Lead.created_at >= start_date
            )
        ).order_by(Lead.created_at)
    )
    leads = result.scalars().all()
    
    # Group by date
    daily_stats = {}
    for lead in leads:
        date_str = lead.created_at.strftime("%Y-%m-%d")
        if date_str not in daily_stats:
            daily_stats[date_str] = {"count": 0, "hot": 0, "warm": 0, "cold": 0}
        daily_stats[date_str]["count"] += 1
        if lead.final_hotness == "hot":
            daily_stats[date_str]["hot"] += 1
        elif lead.final_hotness == "warm":
            daily_stats[date_str]["warm"] += 1
        else:
            daily_stats[date_str]["cold"] += 1
    
    # Fill in missing dates
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
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get leads with optional filters"""
    query = select(Lead).options(selectinload(Lead.customer)).where(
        Lead.tenant_id == current_user.tenant_id
    )
    
    if status:
        query = query.where(Lead.status == status)
    if hotness:
        query = query.where(Lead.final_hotness == hotness)
    
    query = query.order_by(desc(Lead.created_at)).limit(limit)
    
    result = await db.execute(query)
    leads = result.scalars().all()
    
    return [
        LeadResponse(
            id=lead.id,
            customer_name=lead.customer.name if lead.customer else None,
            customer_phone=lead.customer.phone if lead.customer else None,
            status=lead.status,
            final_hotness=lead.final_hotness,
            score=lead.score,
            intent=lead.intent,
            product=lead.product,
            llm_explanation=lead.llm_explanation,
            source_channel=lead.source_channel,
            created_at=lead.created_at,
            last_interaction_at=lead.last_interaction_at
        )
        for lead in leads
    ]


@api_router.put("/leads/{lead_id}/status")
async def update_lead_status(
    lead_id: str,
    status: str,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update lead status"""
    result = await db.execute(
        select(Lead).where(
            and_(Lead.id == lead_id, Lead.tenant_id == current_user.tenant_id)
        )
    )
    lead = result.scalar_one_or_none()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead.status = status
    await db.commit()
    
    return {"success": True}


# ============ Sales Agent Config Endpoints ============

@api_router.get("/config")
async def get_tenant_config(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get tenant configuration"""
    result = await db.execute(
        select(TenantConfig).where(TenantConfig.tenant_id == current_user.tenant_id)
    )
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
async def update_tenant_config(
    request: TenantConfigUpdate,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update tenant configuration"""
    result = await db.execute(
        select(TenantConfig).where(TenantConfig.tenant_id == current_user.tenant_id)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        config = TenantConfig(tenant_id=current_user.tenant_id)
        db.add(config)
    
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    
    await db.commit()
    
    return {"success": True}


# ============ Knowledge Base Endpoints ============

@api_router.get("/documents")
async def get_documents(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all documents"""
    result = await db.execute(
        select(Document).where(Document.tenant_id == current_user.tenant_id).order_by(desc(Document.created_at))
    )
    documents = result.scalars().all()
    
    return [
        {
            "id": doc.id,
            "title": doc.title,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "created_at": doc.created_at.isoformat()
        }
        for doc in documents
    ]


@api_router.post("/documents")
async def create_document(
    request: DocumentCreate,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new document"""
    doc = Document(
        tenant_id=current_user.tenant_id,
        title=request.title,
        content=request.content,
        file_type="text",
        file_size=len(request.content),
        created_at=datetime.now(timezone.utc)
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    
    return {
        "id": doc.id,
        "title": doc.title,
        "created_at": doc.created_at.isoformat()
    }


@api_router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a document"""
    result = await db.execute(
        select(Document).where(
            and_(Document.id == doc_id, Document.tenant_id == current_user.tenant_id)
        )
    )
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await db.delete(doc)
    await db.commit()
    
    return {"success": True}


# ============ Integration Status Endpoints ============

@api_router.get("/integrations/status")
async def get_integrations_status(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get status of all integrations"""
    tenant_id = current_user.tenant_id
    
    # Telegram status
    tg_result = await db.execute(
        select(TelegramBot).where(
            and_(TelegramBot.tenant_id == tenant_id, TelegramBot.is_active == True)
        )
    )
    telegram_bot = tg_result.scalar_one_or_none()
    
    # Bitrix status
    bitrix_result = await db.execute(
        select(IntegrationBitrix).where(IntegrationBitrix.tenant_id == tenant_id)
    )
    bitrix = bitrix_result.scalar_one_or_none()
    
    # Google Sheets status
    sheets_result = await db.execute(
        select(IntegrationGoogleSheets).where(IntegrationGoogleSheets.tenant_id == tenant_id)
    )
    sheets = sheets_result.scalar_one_or_none()
    
    return {
        "telegram": {
            "connected": telegram_bot is not None,
            "bot_username": telegram_bot.bot_username if telegram_bot else None,
            "last_webhook_at": telegram_bot.last_webhook_at.isoformat() if telegram_bot and telegram_bot.last_webhook_at else None
        },
        "bitrix": {
            "connected": bitrix is not None and not bitrix.is_demo,
            "is_demo": bitrix.is_demo if bitrix else True,
            "domain": bitrix.bitrix_domain if bitrix else None
        },
        "google_sheets": {
            "connected": sheets is not None and sheets.is_active,
            "sheet_id": sheets.sheet_id if sheets else None
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
