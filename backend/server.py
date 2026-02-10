"""AI Sales Agent for Telegram + Bitrix24 - Enhanced Version with Sales Pipeline & RAG"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request, BackgroundTasks, UploadFile, File, Form
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Tuple
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import secrets
import jwt
import httpx
from openai import AsyncOpenAI
import json
import asyncio
import re
import html
from supabase import create_client, Client
import resend

# Import document processor for RAG
from document_processor import (
    process_document,
    semantic_search,
    generate_embedding,
    process_text,
    generate_embeddings_batch
)

# Import Bitrix24 CRM client
from bitrix_crm import BitrixCRMClient, BitrixAPIError, create_bitrix_client

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Supabase client (strip to remove any accidental newlines from env vars)
supabase_url = (os.environ.get('SUPABASE_URL') or '').strip()
supabase_key = (os.environ.get('SUPABASE_SERVICE_KEY') or '').strip()
supabase: Client = create_client(supabase_url, supabase_key)

# Create HTTP/1.1 client for direct REST API calls (avoids HTTP/2 StreamReset issues)
_rest_client = httpx.Client(
    http2=False,
    timeout=30.0,
    headers={
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
)

def db_rest_select(table: str, query_params: dict = None):
    """Direct REST API select to avoid HTTP/2 issues."""
    url = f"{supabase_url}/rest/v1/{table}"
    params = query_params or {}
    params["select"] = params.get("select", "*")
    response = _rest_client.get(url, params=params)
    response.raise_for_status()
    return response.json()

def db_rest_insert(table: str, data: dict):
    """Direct REST API insert to avoid HTTP/2 issues."""
    url = f"{supabase_url}/rest/v1/{table}"
    response = _rest_client.post(url, json=data)
    response.raise_for_status()
    return response.json()

def db_rest_update(table: str, data: dict, eq_column: str, eq_value: str):
    """Direct REST API update to avoid HTTP/2 issues."""
    url = f"{supabase_url}/rest/v1/{table}?{eq_column}=eq.{eq_value}"
    response = _rest_client.patch(url, json=data)
    response.raise_for_status()
    return response.json()

# Initialize Resend for email
# Strip env vars to remove accidental newlines
resend.api_key = (os.environ.get('RESEND_API_KEY') or '').strip()
SENDER_EMAIL = (os.environ.get('SENDER_EMAIL') or 'onboarding@resend.dev').strip()
FRONTEND_URL = (os.environ.get('FRONTEND_URL') or 'http://localhost:3000').strip()

# Log Resend configuration status (without exposing key)
if resend.api_key:
    logger.info(f"Resend API configured with key starting: {resend.api_key[:8]}...")
    logger.info(f"Sender email: {SENDER_EMAIL}")
else:
    logger.warning("RESEND_API_KEY not configured - email sending will fail!")

app = FastAPI(title="TeleAgent - AI Sales Agent")
api_router = APIRouter(prefix="/api")

# ============ Configuration ============
JWT_SECRET = (os.environ.get('JWT_SECRET') or 'teleagent-secret-key').strip()
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
TELEGRAM_API_BASE = "https://api.telegram.org/bot"

# OpenAI client
openai_client = AsyncOpenAI(api_key=(os.environ.get('OPENAI_API_KEY') or '').strip())

# ============ Input Sanitization ============
def sanitize_html(text: str) -> str:
    """Remove HTML tags and escape special characters to prevent XSS attacks."""
    if not text or not isinstance(text, str):
        return text
    # Remove script tags and their contents
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
    # Remove style tags and their contents
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.IGNORECASE | re.DOTALL)
    # Remove all HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Escape HTML entities
    text = html.escape(text)
    return text.strip()

def sanitize_dict(data: dict, fields_to_sanitize: list) -> dict:
    """Sanitize specific string fields in a dictionary."""
    sanitized = data.copy()
    for field in fields_to_sanitize:
        if field in sanitized and isinstance(sanitized[field], str):
            sanitized[field] = sanitize_html(sanitized[field])
    return sanitized

# Fields that should be sanitized before storage
SANITIZE_FIELDS = [
    'business_name', 'business_description', 'products_services',
    'faq_objections', 'greeting_message', 'closing_message', 'name'
]

# ============ Rate Limiting ============
# Simple in-memory rate limiter (for production, use Redis)
from collections import defaultdict
import time

class RateLimiter:
    """Simple rate limiter to prevent message flooding"""
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)

    def is_allowed(self, user_id: str) -> bool:
        """Check if user is within rate limit"""
        now = time.time()
        # Clean old entries
        self.requests[user_id] = [t for t in self.requests[user_id] if now - t < self.window_seconds]

        if len(self.requests[user_id]) >= self.max_requests:
            return False

        self.requests[user_id].append(now)
        return True

    def get_wait_time(self, user_id: str) -> int:
        """Get seconds until next request is allowed"""
        if not self.requests[user_id]:
            return 0
        oldest = min(self.requests[user_id])
        wait = self.window_seconds - (time.time() - oldest)
        return max(0, int(wait))

# Rate limiter: max 10 messages per minute per user
message_rate_limiter = RateLimiter(max_requests=10, window_seconds=60)

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

# ============ Hard Constraints Defaults (Anti-Hallucination) ============
DEFAULT_HARD_CONSTRAINTS = {
    "promo_codes": [],  # [{"code": "SUMMER20", "discount_percent": 20, "valid_until": "2026-03-01"}]
    "payment_plans_enabled": False,
    "discount_authority": "none",  # "none" | "manager_only" | "agent_can_offer"
}

# Multilingual objection keywords for detection
OBJECTION_KEYWORDS = {
    "too_expensive": {
        "en": ["too expensive", "costly", "pricey", "can't afford", "out of budget", "too much", "high price"],
        "uz": ["qimmat", "narx baland", "pul yetmaydi", "byudjet yetmaydi"],
        "ru": ["дорого", "слишком дорого", "не по карману", "дороговато", "цена высокая"]
    },
    "need_to_think": {
        "en": ["need to think", "let me think", "think about it", "not sure yet", "need time", "consider it"],
        "uz": ["o'ylab ko'raman", "o'ylanib qolaman", "vaqt kerak", "qaror qilishim kerak"],
        "ru": ["подумаю", "надо подумать", "нужно время", "дайте время подумать"]
    },
    "need_approval": {
        "en": ["ask my boss", "check with", "need approval", "need to consult", "talk to my"],
        "uz": ["rahbarimga so'rayman", "tekshirib ko'rishim kerak", "maslahatlashishim kerak"],
        "ru": ["спросить начальника", "согласовать", "нужно одобрение", "посоветоваться"]
    },
    "bad_timing": {
        "en": ["not now", "bad time", "not ready", "maybe later", "next month", "not today"],
        "uz": ["hozir emas", "keyinroq", "tayyor emasman", "keyingi oyda"],
        "ru": ["не сейчас", "позже", "не готов", "в следующем месяце", "не сегодня"]
    },
    "competitor": {
        "en": ["other options", "looking elsewhere", "competitor", "found cheaper", "better deal"],
        "uz": ["boshqa variantlar", "boshqa joyda ko'raman", "raqobatchi"],
        "ru": ["другие варианты", "конкурент", "нашёл дешевле", "смотрю другие"]
    }
}

# Valid values for validation
VALID_SALES_STAGES = {"awareness", "interest", "consideration", "intent", "evaluation", "purchase"}
VALID_HOTNESS_VALUES = {"hot", "warm", "cold"}

# Stage order for transition validation
STAGE_ORDER = ["awareness", "interest", "consideration", "intent", "evaluation", "purchase"]

# Startup validation: ensure constants are synchronized
assert set(VALID_SALES_STAGES) == set(STAGE_ORDER), "VALID_SALES_STAGES and STAGE_ORDER must contain same stages"


def validate_stage_transition(current_stage: str, new_stage: str) -> str:
    """
    HIGH: Validate stage transitions to prevent invalid jumps.
    - Allow forward progression (any amount)
    - Allow backward by max 1 stage (customer uncertainty)
    - Prevent suspicious multi-stage regression
    """
    try:
        current_idx = STAGE_ORDER.index(current_stage)
        new_idx = STAGE_ORDER.index(new_stage)

        # Forward progression is always allowed
        if new_idx >= current_idx:
            return new_stage

        # Allow backward by 1 stage (customer changed mind / uncertainty)
        if current_idx - new_idx <= 1:
            logger.info(f"Stage regression allowed: {current_stage} → {new_stage}")
            return new_stage

        # Prevent multi-stage regression (suspicious, likely LLM error)
        logger.warning(f"Prevented suspicious stage regression: {current_stage} → {new_stage}, keeping {current_stage}")
        return current_stage

    except ValueError:
        # Invalid stage, keep current
        return current_stage


def apply_hotness_rules(llm_hotness: str, score: int, stage: str, fields: Dict) -> str:
    """
    HIGH: Apply business rules to override LLM hotness suggestions.
    Ensures consistency between score, stage, and hotness.
    """
    # Rule 1: High score should always be hot
    if score >= 85:
        if llm_hotness != "hot":
            logger.info(f"Hotness override: score {score} requires 'hot', was '{llm_hotness}'")
        return "hot"

    # Rule 2: Score 70-84 should be at least warm
    if score >= 70:
        if llm_hotness == "cold":
            logger.info(f"Hotness override: score {score} too high for 'cold', setting 'warm'")
            return "warm"

    # Rule 3: Low score should not be hot
    if score < 40 and llm_hotness == "hot":
        logger.info(f"Hotness override: score {score} too low for 'hot', setting 'warm'")
        return "warm"

    # Rule 4: Advanced stages should be warmer
    if stage in ["intent", "evaluation", "purchase"]:
        if llm_hotness == "cold":
            return "warm"
        if stage == "purchase" and llm_hotness != "hot":
            return "hot"

    # Rule 5: Immediate timeline + budget = hot
    timeline = fields.get("timeline", "").lower() if fields.get("timeline") else ""
    has_budget = bool(fields.get("budget"))
    urgent_keywords = ["today", "now", "asap", "urgent", "immediately", "hozir", "bugun", "tez"]

    if any(word in timeline for word in urgent_keywords) and has_budget:
        logger.info(f"Hotness override: urgent timeline + budget = 'hot'")
        return "hot"

    # Rule 6: Has phone and budget at consideration+ stage = warm minimum
    if fields.get("phone") and has_budget and stage in ["consideration", "intent", "evaluation", "purchase"]:
        if llm_hotness == "cold":
            return "warm"

    return llm_hotness


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
    # Use int for exp claim per RFC 7519 (NumericDate must be integer seconds)
    return jwt.encode({"user_id": user_id, "tenant_id": tenant_id, "email": email, "exp": int(expiration.timestamp())}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Optional[Dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except:
        return None

def generate_confirmation_token() -> str:
    return secrets.token_urlsafe(32)

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ============ Email Service ============
async def send_confirmation_email(email: str, name: str, token: str) -> bool:
    """Send email confirmation link to new user"""
    try:
        confirmation_url = f"{FRONTEND_URL}/confirm-email?token={token}"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #10b981; margin: 0;">TeleAgent</h1>
                <p style="color: #64748b; margin-top: 5px;">AI Sales Agent Platform</p>
            </div>
            
            <h2 style="color: #1e293b;">Welcome, {name}!</h2>
            
            <p style="color: #475569; line-height: 1.6;">
                Thank you for registering with TeleAgent. Please confirm your email address 
                by clicking the button below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{confirmation_url}" 
                   style="background-color: #10b981; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 6px; font-weight: bold;
                          display: inline-block;">
                    Confirm Email
                </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
                Or copy and paste this link into your browser:<br/>
                <a href="{confirmation_url}" style="color: #10b981; word-break: break-all;">
                    {confirmation_url}
                </a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;"/>
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                If you didn't create an account, you can safely ignore this email.
            </p>
        </div>
        """
        
        params = {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": "Confirm your TeleAgent account",
            "html": html_content
        }
        
        # Run sync SDK in thread to keep FastAPI non-blocking
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Confirmation email sent to {email}, id: {result.get('id')}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send confirmation email to {email}: {e}")
        return False


async def send_password_reset_email(email: str, name: str, token: str) -> bool:
    """Send password reset link"""
    try:
        reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #10b981; margin: 0;">TeleAgent</h1>
            </div>
            
            <h2 style="color: #1e293b;">Password Reset Request</h2>
            
            <p style="color: #475569; line-height: 1.6;">
                Hi {name}, we received a request to reset your password. 
                Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" 
                   style="background-color: #10b981; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 6px; font-weight: bold;
                          display: inline-block;">
                    Reset Password
                </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
                This link expires in 1 hour. If you didn't request this, ignore this email.
            </p>
        </div>
        """
        
        params = {
            "from": SENDER_EMAIL,
            "to": [email],
            "subject": "Reset your TeleAgent password",
            "html": html_content
        }
        
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Password reset email sent to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        return False


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
    token: Optional[str] = None
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
    closing_message: Optional[str] = None
    agent_tone: Optional[str] = None
    primary_language: Optional[str] = None
    secondary_languages: Optional[List[str]] = None
    emoji_usage: Optional[str] = None
    response_length: Optional[str] = None
    min_response_delay: Optional[int] = None
    max_messages_per_minute: Optional[int] = None
    objection_playbook: Optional[List[Dict]] = None
    closing_scripts: Optional[Dict] = None
    required_fields: Optional[Dict] = None
    active_promotions: Optional[List[Dict]] = None
    # Data collection fields - Essential
    collect_name: Optional[bool] = None
    collect_email: Optional[bool] = None
    # Data collection fields - Purchase Intent
    collect_product: Optional[bool] = None
    collect_budget: Optional[bool] = None
    collect_timeline: Optional[bool] = None
    collect_quantity: Optional[bool] = None
    # Data collection fields - Qualification
    collect_company: Optional[bool] = None
    collect_job_title: Optional[bool] = None
    collect_team_size: Optional[bool] = None
    # Data collection fields - Logistics
    collect_location: Optional[bool] = None
    collect_preferred_time: Optional[bool] = None
    collect_urgency: Optional[bool] = None
    collect_reference: Optional[bool] = None
    collect_notes: Optional[bool] = None
    # Hard constraints for AI anti-hallucination
    promo_codes: Optional[List[Dict]] = None  # [{"code": "SUMMER20", "discount_percent": 20, "valid_until": "2026-03-01"}]
    payment_plans_enabled: Optional[bool] = None
    discount_authority: Optional[str] = None  # "none" | "manager_only" | "agent_can_offer"

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


# Helper function to execute Supabase operations with retry
def db_execute_with_retry(operation, max_retries=3):
    """Execute a Supabase operation with retry logic for connection issues."""
    import time
    last_error = None
    for attempt in range(max_retries):
        try:
            return operation()
        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            # Retry on connection errors
            if 'streamreset' in error_str or 'connection' in error_str or 'timeout' in error_str:
                if attempt < max_retries - 1:
                    time.sleep(0.5 * (attempt + 1))  # Exponential backoff
                    continue
            raise
    raise last_error


# ============ Auth Endpoints (Custom Auth with Resend) ============
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """
    Register a new user with custom auth and Resend email verification.
    Uses direct REST API calls to avoid HTTP/2 StreamReset issues on Render.
    """
    try:
        # Check if user already exists (using direct REST API - HTTP/1.1)
        existing = db_rest_select('users', {'email': f'eq.{request.email}'})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Generate IDs and confirmation token
        user_id = str(uuid.uuid4())
        tenant_id = str(uuid.uuid4())
        confirmation_token = secrets.token_urlsafe(32)

        # Sanitize user input to prevent XSS attacks
        safe_name = sanitize_html(request.name) if request.name else None
        safe_business_name = sanitize_html(request.business_name) if request.business_name else None

        # Create tenant (using direct REST API - HTTP/1.1)
        tenant = {"id": tenant_id, "name": safe_business_name, "timezone": "Asia/Tashkent", "created_at": now_iso()}
        db_rest_insert('tenants', tenant)

        # Token expires in 24 hours for email confirmation
        token_expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()

        # Create user record (using direct REST API - HTTP/1.1)
        user = {
            "id": user_id,
            "email": request.email,
            "password_hash": hash_password(request.password),
            "name": safe_name,
            "tenant_id": tenant_id,
            "role": "admin",
            "email_confirmed": False,
            "confirmation_token": confirmation_token,
            "token_expires_at": token_expires,
            "created_at": now_iso()
        }
        db_rest_insert('users', user)

        # Create default config (using direct REST API - HTTP/1.1)
        config = {
            "tenant_id": tenant_id, "business_name": None, "collect_phone": True,
            "agent_tone": "professional", "primary_language": "uz", "vertical": "default"
        }
        try:
            db_rest_insert('tenant_configs', config)
        except Exception as e:
            logger.warning(f"Could not create tenant config: {e}")

        # Send confirmation email via Resend
        try:
            frontend_url = os.environ.get('FRONTEND_URL', 'https://leadrelay-frontend.onrender.com')
            confirm_url = f"{frontend_url}/confirm-email?token={confirmation_token}"

            logger.info(f"Sending confirmation email from '{SENDER_EMAIL}' to '{request.email}'")
            logger.info(f"Resend API key configured: {bool(resend.api_key)}")
            email_response = resend.emails.send({
                "from": SENDER_EMAIL,
                "to": request.email,
                "subject": "Confirm your LeadRelay account",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #059669;">Welcome to LeadRelay!</h2>
                    <p>Hi {request.name},</p>
                    <p>Thank you for registering. Please confirm your email address by clicking the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{confirm_url}" style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Confirm Email</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="color: #666; word-break: break-all;">{confirm_url}</p>
                    <p>This link will expire in 24 hours.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #999; font-size: 12px;">If you didn't create an account, you can ignore this email.</p>
                </div>
                """
            })
            logger.info(f"Resend response: {email_response}")
        except Exception as e:
            logger.error(f"Failed to send confirmation email: {type(e).__name__}: {e}", exc_info=True)
            logger.error(f"Resend config - API key set: {bool(resend.api_key)}, Sender: {SENDER_EMAIL}")
            # Don't fail registration if email fails - user can request resend

        return AuthResponse(
            token=None,
            user={
                "id": user_id,
                "email": request.email,
                "name": request.name,
                "tenant_id": tenant_id,
                "business_name": request.business_name,
                "email_confirmed": False
            },
            message="Account created! Please check your email to confirm your account before logging in."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@api_router.get("/auth/confirm-email")
async def confirm_email(token: str = None, type: str = None, access_token: str = None):
    """
    Confirm user email using direct REST API to avoid HTTP/2 issues.
    """
    # Handle custom token confirmation (primary method now)
    if token:
        result = db_rest_select('users', {'confirmation_token': f'eq.{token}'})
        if not result:
            raise HTTPException(status_code=400, detail="Invalid or expired confirmation token")

        user = result[0]
        if user.get('email_confirmed'):
            return {"message": "Email already confirmed", "redirect": "/login"}

        # Check token expiration
        token_expires = user.get('token_expires_at')
        if token_expires:
            expires_dt = datetime.fromisoformat(token_expires.replace('Z', '+00:00'))
            if datetime.now(timezone.utc) > expires_dt:
                raise HTTPException(status_code=400, detail="Confirmation token has expired. Please request a new confirmation email.")

        db_rest_update('users', {
            "email_confirmed": True,
            "confirmation_token": None,
            "token_expires_at": None,
            "email_confirmed_at": now_iso()
        }, 'id', user['id'])

        return {"message": "Email confirmed successfully! You can now log in.", "redirect": "/login"}

    raise HTTPException(status_code=400, detail="Invalid confirmation request")


@api_router.post("/auth/resend-confirmation")
async def resend_confirmation(email: EmailStr):
    """Resend confirmation email via Resend using direct REST API"""
    try:
        # Find user using direct REST API (HTTP/1.1)
        result = db_rest_select('users', {'email': f'eq.{email}'})
        if result and not result[0].get('email_confirmed'):
            user = result[0]
            confirmation_token = secrets.token_urlsafe(32)
            # Token expires in 24 hours
            token_expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()

            # Update token with expiration using direct REST API
            db_rest_update('users', {
                "confirmation_token": confirmation_token,
                "token_expires_at": token_expires
            }, 'id', user['id'])

            # Send email via Resend
            frontend_url = os.environ.get('FRONTEND_URL', 'https://leadrelay-frontend.onrender.com')
            confirm_url = f"{frontend_url}/confirm-email?token={confirmation_token}"

            resend.emails.send({
                "from": SENDER_EMAIL,
                "to": email,
                "subject": "Confirm your LeadRelay account",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #059669;">Confirm Your Email</h2>
                    <p>Hi {user.get('name', 'there')},</p>
                    <p>Please confirm your email address by clicking the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{confirm_url}" style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Confirm Email</a>
                    </div>
                    <p>Or copy and paste this link: {confirm_url}</p>
                </div>
                """
            })
        return {"message": "If this email is registered, a confirmation link will be sent."}
    except Exception as e:
        logger.error(f"Resend confirmation error: {type(e).__name__}: {e}", exc_info=True)
        logger.error(f"Resend config - API key set: {bool(resend.api_key)}, Sender: {SENDER_EMAIL}")
        return {"message": "If this email is registered, a confirmation link will be sent."}


@api_router.post("/auth/forgot-password")
async def forgot_password(email: EmailStr):
    """Request password reset via Resend using direct REST API"""
    try:
        result = db_rest_select('users', {'email': f'eq.{email}'})
        if result:
            user = result[0]
            reset_token = secrets.token_urlsafe(32)
            # Token expires in 1 hour
            token_expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()

            # Store reset token in separate field (doesn't interfere with email confirmation)
            db_rest_update('users', {
                "password_reset_token": reset_token,
                "password_reset_expires_at": token_expires
            }, 'id', user['id'])

            # Send email via Resend
            frontend_url = os.environ.get('FRONTEND_URL', 'https://leadrelay-frontend.onrender.com')
            reset_url = f"{frontend_url}/reset-password?token={reset_token}"

            resend.emails.send({
                "from": SENDER_EMAIL,
                "to": email,
                "subject": "Reset your LeadRelay password",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #059669;">Reset Your Password</h2>
                    <p>Hi {user.get('name', 'there')},</p>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}" style="background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
                    </div>
                    <p>Or copy and paste this link: {reset_url}</p>
                    <p>If you didn't request this, you can ignore this email.</p>
                </div>
                """
            })
        return {"message": "If this email is registered, a password reset link will be sent."}
    except Exception as e:
        logger.warning(f"Password reset error: {e}")
        return {"message": "If this email is registered, a password reset link will be sent."}


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password using custom token with direct REST API"""
    try:
        result = db_rest_select('users', {'password_reset_token': f'eq.{request.token}'})
        if not result:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        user = result[0]

        # Check token expiration
        token_expires = user.get('password_reset_expires_at')
        if token_expires:
            expires_dt = datetime.fromisoformat(token_expires.replace('Z', '+00:00'))
            if datetime.now(timezone.utc) > expires_dt:
                raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new password reset.")

        # Update password and clear reset token (doesn't affect email confirmation token)
        db_rest_update('users', {
            "password_hash": hash_password(request.new_password),
            "password_reset_token": None,
            "password_reset_expires_at": None
        }, 'id', user['id'])

        return {"message": "Password reset successfully. You can now log in."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(status_code=400, detail="Password reset failed. Please try again.")


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Login using custom auth with direct REST API to avoid HTTP/2 StreamReset issues.
    """
    # Use direct REST API (HTTP/1.1) instead of supabase-py client
    result = db_rest_select('users', {'email': f'eq.{request.email}'})
    if not result:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = result[0]
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check if email is confirmed
    if not user.get('email_confirmed', False):
        raise HTTPException(
            status_code=403,
            detail="Please confirm your email before logging in. Check your inbox or request a new confirmation link."
        )

    tenant_result = db_rest_select('tenants', {'id': f'eq.{user["tenant_id"]}'})
    tenant = tenant_result[0] if tenant_result else None

    token = create_access_token(user["id"], user["tenant_id"], user["email"])
    return AuthResponse(
        token=token,
        user={"id": user["id"], "email": user["email"], "name": user.get("name"), "tenant_id": user["tenant_id"], "business_name": tenant["name"] if tenant else None, "email_confirmed": user.get("email_confirmed", False)}
    )


@api_router.get("/auth/me")
async def get_me(current_user: Dict = Depends(get_current_user)):
    result = db_rest_select('users', {'id': f'eq.{current_user["user_id"]}'})
    if not result:
        raise HTTPException(status_code=404, detail="User not found")

    user = result[0]
    tenant_result = db_rest_select('tenants', {'id': f'eq.{user["tenant_id"]}'})
    tenant = tenant_result[0] if tenant_result else None

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
            response = await client.post(
                f"{TELEGRAM_API_BASE}{bot_token}/setWebhook", 
                json={"url": webhook_url, "allowed_updates": ["message"], "drop_pending_updates": True}, 
                timeout=30.0
            )
            result = response.json()
            logger.info(f"Webhook setup result: {result}")
            return result
    except Exception as e:
        logger.error(f"Failed to set webhook: {e}")
        return {"ok": False, "error": str(e)}

async def delete_telegram_webhook(bot_token: str) -> Dict:
    try:
        async with httpx.AsyncClient() as client:
            return (await client.post(f"{TELEGRAM_API_BASE}{bot_token}/deleteWebhook", timeout=30.0)).json()
    except Exception as e:
        return {"ok": False, "error": str(e)}

async def send_telegram_message(bot_token: str, chat_id: int, text: str) -> bool:
    """Send a message via Telegram Bot API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{TELEGRAM_API_BASE}{bot_token}/sendMessage", 
                json={
                    "chat_id": chat_id, 
                    "text": text, 
                    "parse_mode": "HTML"
                }, 
                timeout=30.0
            )
            result = response.json()
            
            if not result.get("ok"):
                logger.error(f"Telegram API error: {result}")
                
                # If HTML parse mode failed, try without it
                if "can't parse" in str(result.get("description", "")).lower():
                    response = await client.post(
                        f"{TELEGRAM_API_BASE}{bot_token}/sendMessage", 
                        json={"chat_id": chat_id, "text": text}, 
                        timeout=30.0
                    )
                    result = response.json()
                    
            return result.get("ok", False)
    except Exception as e:
        logger.error(f"Failed to send Telegram message: {e}")
        import traceback
        traceback.print_exc()
        return False

async def send_typing_action(bot_token: str, chat_id: int):
    try:
        async with httpx.AsyncClient() as client:
            await client.post(f"{TELEGRAM_API_BASE}{bot_token}/sendChatAction", json={"chat_id": chat_id, "action": "typing"}, timeout=10.0)
    except:
        pass


# ============ Account Management Endpoints ============
@api_router.delete("/account")
async def delete_account(current_user: Dict = Depends(get_current_user)):
    """Delete user account and all associated data to prevent orphaned instances"""
    user_id = current_user["user_id"]
    tenant_id = current_user["tenant_id"]

    try:
        # Delete in order to respect foreign key constraints
        # 1. Delete messages (via conversation_id since messages has no tenant_id)
        try:
            conv_result = supabase.table('conversations').select('id').eq('tenant_id', tenant_id).execute()
            conversation_ids = [c['id'] for c in conv_result.data] if conv_result.data else []
            if conversation_ids:
                for conv_id in conversation_ids:
                    supabase.table('messages').delete().eq('conversation_id', conv_id).execute()
            logger.info(f"Deleted messages for tenant {tenant_id}")
        except Exception as e:
            logger.warning(f"Could not delete messages: {e}")

        # 2. Delete conversations
        try:
            supabase.table('conversations').delete().eq('tenant_id', tenant_id).execute()
            logger.info(f"Deleted conversations for tenant {tenant_id}")
        except Exception as e:
            logger.warning(f"Could not delete conversations: {e}")

        # 3. Delete leads
        try:
            supabase.table('leads').delete().eq('tenant_id', tenant_id).execute()
            logger.info(f"Deleted leads for tenant {tenant_id}")
        except Exception as e:
            logger.warning(f"Could not delete leads: {e}")

        # 4. Delete customers
        try:
            supabase.table('customers').delete().eq('tenant_id', tenant_id).execute()
            logger.info(f"Deleted customers for tenant {tenant_id}")
        except Exception as e:
            logger.warning(f"Could not delete customers: {e}")

        # 5. Delete documents
        try:
            supabase.table('documents').delete().eq('tenant_id', tenant_id).execute()
            logger.info(f"Deleted documents for tenant {tenant_id}")
        except Exception as e:
            logger.warning(f"Could not delete documents: {e}")

        # 6. Delete event logs
        try:
            supabase.table('event_logs').delete().eq('tenant_id', tenant_id).execute()
            logger.info(f"Deleted event logs for tenant {tenant_id}")
        except Exception as e:
            logger.warning(f"Could not delete event logs: {e}")

        # 7. Disconnect and delete telegram bot
        try:
            tg_result = supabase.table('telegram_bots').select('*').eq('tenant_id', tenant_id).execute()
            if tg_result.data:
                await delete_telegram_webhook(tg_result.data[0]["bot_token"])
            supabase.table('telegram_bots').delete().eq('tenant_id', tenant_id).execute()
            logger.info(f"Deleted telegram bot for tenant {tenant_id}")
        except Exception as e:
            logger.warning(f"Could not delete telegram bot: {e}")

        # 8. Delete tenant config
        try:
            supabase.table('tenant_configs').delete().eq('tenant_id', tenant_id).execute()
            logger.info(f"Deleted tenant config for tenant {tenant_id}")
        except Exception as e:
            logger.warning(f"Could not delete tenant config: {e}")

        # 9. Delete user
        try:
            supabase.table('users').delete().eq('id', user_id).execute()
            logger.info(f"Deleted user {user_id}")
        except Exception as e:
            logger.warning(f"Could not delete user: {e}")

        # 10. Delete tenant
        try:
            supabase.table('tenants').delete().eq('id', tenant_id).execute()
            logger.info(f"Deleted tenant {tenant_id}")
        except Exception as e:
            logger.warning(f"Could not delete tenant: {e}")

        # 11. Clear Bitrix cache if exists
        if tenant_id in _bitrix_webhooks_cache:
            del _bitrix_webhooks_cache[tenant_id]

        logger.info(f"Successfully deleted account for user {user_id}, tenant {tenant_id}")
        return {"success": True, "message": "Account and all data deleted successfully"}

    except Exception as e:
        logger.error(f"Failed to delete account: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete account. Please contact support.")


@api_router.delete("/account/data")
async def delete_account_data(current_user: Dict = Depends(get_current_user)):
    """Delete all user data but keep the account"""
    tenant_id = current_user["tenant_id"]

    try:
        # Delete user data but keep account structure
        # 1. Delete messages (via conversation_id since messages has no tenant_id)
        try:
            conv_result = supabase.table('conversations').select('id').eq('tenant_id', tenant_id).execute()
            conversation_ids = [c['id'] for c in conv_result.data] if conv_result.data else []
            if conversation_ids:
                for conv_id in conversation_ids:
                    supabase.table('messages').delete().eq('conversation_id', conv_id).execute()
        except Exception as e:
            logger.warning(f"Could not delete messages: {e}")

        # 2. Delete conversations
        try:
            supabase.table('conversations').delete().eq('tenant_id', tenant_id).execute()
        except Exception as e:
            logger.warning(f"Could not delete conversations: {e}")

        # 3. Delete leads
        try:
            supabase.table('leads').delete().eq('tenant_id', tenant_id).execute()
        except Exception as e:
            logger.warning(f"Could not delete leads: {e}")

        # 4. Delete customers
        try:
            supabase.table('customers').delete().eq('tenant_id', tenant_id).execute()
        except Exception as e:
            logger.warning(f"Could not delete customers: {e}")

        # 6. Delete documents
        try:
            supabase.table('documents').delete().eq('tenant_id', tenant_id).execute()
        except Exception as e:
            logger.warning(f"Could not delete documents: {e}")

        # 7. Delete event logs
        try:
            supabase.table('event_logs').delete().eq('tenant_id', tenant_id).execute()
        except Exception as e:
            logger.warning(f"Could not delete event logs: {e}")

        # 8. Reset tenant config (but don't delete)
        try:
            supabase.table('tenant_configs').update({
                "business_name": None,
                "business_description": None,
                "products_services": None,
                "bitrix_webhook_url": None,
                "bitrix_connected_at": None
            }).eq('tenant_id', tenant_id).execute()
        except Exception as e:
            logger.warning(f"Could not reset tenant config: {e}")

        # 9. Disconnect telegram bot but keep record
        try:
            tg_result = supabase.table('telegram_bots').select('*').eq('tenant_id', tenant_id).execute()
            if tg_result.data:
                await delete_telegram_webhook(tg_result.data[0]["bot_token"])
                supabase.table('telegram_bots').update({"is_active": False}).eq('tenant_id', tenant_id).execute()
        except Exception as e:
            logger.warning(f"Could not disconnect telegram bot: {e}")

        # 10. Clear Bitrix cache
        if tenant_id in _bitrix_webhooks_cache:
            del _bitrix_webhooks_cache[tenant_id]

        logger.info(f"Successfully deleted data for tenant {tenant_id}")
        return {"success": True, "message": "All data deleted successfully. Your account is preserved."}

    except Exception as e:
        logger.error(f"Failed to delete data: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete data. Please try again.")


# ============ Telegram Bot Endpoints ============
@api_router.post("/telegram/bot")
async def connect_telegram_bot(request: TelegramBotCreate, current_user: Dict = Depends(get_current_user)):
    bot_info = await get_bot_info(request.bot_token)
    if not bot_info:
        raise HTTPException(status_code=400, detail="Invalid bot token")
    
    tenant_id = current_user["tenant_id"]
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://aiagent-hub-17.preview.emergentagent.com')

    # Check if bot already exists for this tenant
    result = supabase.table('telegram_bots').select('*').eq('tenant_id', tenant_id).execute()
    bot_id = result.data[0]['id'] if result.data else str(uuid.uuid4())

    # SECURITY: Use bot-specific webhook URL for proper tenant isolation
    webhook_url = f"{backend_url}/api/telegram/webhook/{bot_id}"

    bot_data = {"id": bot_id, "tenant_id": tenant_id, "bot_token": request.bot_token, "bot_username": bot_info.get("username"), "webhook_url": webhook_url, "is_active": True, "created_at": now_iso()}

    if result.data:
        supabase.table('telegram_bots').update(bot_data).eq('id', bot_id).execute()
    else:
        supabase.table('telegram_bots').insert(bot_data).execute()

    await set_telegram_webhook(request.bot_token, webhook_url)
    logger.info(f"Set webhook for bot {bot_id} (tenant {tenant_id}): {webhook_url}")
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


# ============ Bitrix24 Webhook Integration ============
# Modern webhook-based CRM integration for full AI access

class BitrixWebhookConnect(BaseModel):
    webhook_url: str = Field(..., description="Bitrix24 webhook URL")


class CRMChatRequest(BaseModel):
    message: str = Field(..., description="User question about CRM data", min_length=1, max_length=4000)
    conversation_history: List[Dict] = Field(default=[], description="Previous messages in conversation")


class PaymeConnect(BaseModel):
    merchant_id: str = Field(..., description="Payme Merchant ID")
    secret_key: str = Field(..., description="Payme Secret Key")


class ClickConnect(BaseModel):
    service_id: str = Field(..., description="Click Service ID")
    secret_key: str = Field(..., description="Click Secret Key")


class GoogleSheetsConnect(BaseModel):
    sheet_url: str = Field(..., description="Google Sheets share link (Anyone with link can view)")


# In-memory storage for Bitrix webhooks (fallback when DB columns don't exist)
_bitrix_webhooks_cache = {}

# In-memory storage for payment credentials (fallback when DB columns don't exist)
_payme_credentials_cache = {}
_click_credentials_cache = {}
_google_sheets_cache = {}

# Product catalog cache for CRM pricing queries {tenant_id: {"products": [...], "cached_at": timestamp}}
_product_catalog_cache = {}
PRODUCT_CACHE_TTL = 1800  # 30 minutes

# CRM realtime query timeout
BITRIX_REALTIME_TIMEOUT = 5.0

# VIP customer threshold in UZS
VIP_THRESHOLD_UZS = 10_000_000


def normalize_phone(phone: str) -> str:
    """
    Normalize phone number for Bitrix matching.
    Converts: +998-90-123-45-67 → 998901234567
    Handles various formats: +998 90 123 45 67, 998901234567, etc.
    """
    if not phone:
        return ""
    # Remove all non-digit characters (including +)
    return re.sub(r'\D', '', phone)


async def get_cached_products(tenant_id: str) -> List[Dict]:
    """
    Get product catalog with 30-min caching.
    Returns list of products with pricing info from Bitrix CRM.
    """
    import time

    now = time.time()

    # Check cache
    if tenant_id in _product_catalog_cache:
        cache_entry = _product_catalog_cache[tenant_id]
        if now - cache_entry.get("cached_at", 0) < PRODUCT_CACHE_TTL:
            logger.debug(f"Product catalog cache hit for tenant {tenant_id}")
            return cache_entry.get("products", [])

    # Fetch from Bitrix with timeout
    try:
        bitrix_client = await get_bitrix_client(tenant_id)
        if not bitrix_client:
            return []

        products = await asyncio.wait_for(
            bitrix_client.list_products(limit=100),
            timeout=BITRIX_REALTIME_TIMEOUT
        )

        # Cache the result
        _product_catalog_cache[tenant_id] = {
            "products": products,
            "cached_at": now
        }
        logger.info(f"Cached {len(products)} products for tenant {tenant_id}")
        return products

    except asyncio.TimeoutError:
        logger.warning(f"Product catalog fetch timed out for tenant {tenant_id}")
        return _product_catalog_cache.get(tenant_id, {}).get("products", [])
    except Exception as e:
        logger.warning(f"Could not fetch product catalog: {e}")
        return _product_catalog_cache.get(tenant_id, {}).get("products", [])


async def match_customer_to_bitrix(tenant_id: str, customer_data: Dict) -> Optional[Dict]:
    """
    Match customer phone to Bitrix contact/lead and return CRM context.

    Returns:
        - is_returning_customer: bool
        - total_purchases: int (number of won deals)
        - total_value: float (lifetime spend)
        - recent_products: list (last 3 purchased products)
        - vip_status: bool (> 10M UZS threshold)
        - customer_since: date (first deal date)

    Non-blocking: Returns None on failure, conversation continues.
    """
    phone = customer_data.get("phone")
    if not phone:
        return None

    normalized_phone = normalize_phone(phone)
    if not normalized_phone:
        return None

    try:
        bitrix_client = await get_bitrix_client(tenant_id)
        if not bitrix_client:
            return None

        # Find contact by phone with timeout
        contact = await asyncio.wait_for(
            bitrix_client.find_contact_by_phone(normalized_phone),
            timeout=BITRIX_REALTIME_TIMEOUT
        )

        if not contact:
            # Try with + prefix
            contact = await asyncio.wait_for(
                bitrix_client.find_contact_by_phone(f"+{normalized_phone}"),
                timeout=BITRIX_REALTIME_TIMEOUT
            )

        if not contact:
            return None

        contact_id = contact.get("ID")
        if not contact_id:
            return None

        # Get contact's purchase history
        history = await asyncio.wait_for(
            bitrix_client.get_contact_history(contact_id),
            timeout=BITRIX_REALTIME_TIMEOUT
        )

        if not history.get("is_returning_customer"):
            return None

        # Extract recent product names from deals
        recent_products = []
        recent_deals = history.get("recent_deals", [])
        for deal in recent_deals[:3]:
            deal_title = deal.get("TITLE", "")
            if deal_title:
                recent_products.append(deal_title)

        # Get customer_since date from oldest deal or contact creation
        customer_since = None
        if recent_deals:
            # Get oldest deal date
            dates = [d.get("DATE_CREATE") for d in recent_deals if d.get("DATE_CREATE")]
            if dates:
                customer_since = min(dates)[:10]  # Just the date part
        if not customer_since:
            customer_since = contact.get("DATE_CREATE", "")[:10] if contact.get("DATE_CREATE") else None

        total_value = float(history.get("total_value", 0))

        crm_context = {
            "is_returning_customer": True,
            "total_purchases": history.get("won_deals", 0),
            "total_value": total_value,
            "recent_products": recent_products,
            "vip_status": total_value >= VIP_THRESHOLD_UZS,
            "customer_since": customer_since,
            "contact_name": f"{contact.get('NAME', '')} {contact.get('LAST_NAME', '')}".strip()
        }

        logger.info(f"Matched returning customer: {crm_context['contact_name']}, {crm_context['total_purchases']} purchases, VIP={crm_context['vip_status']}")
        return crm_context

    except asyncio.TimeoutError:
        logger.warning(f"CRM customer matching timed out for tenant {tenant_id}")
        return None
    except Exception as e:
        logger.warning(f"Could not match customer to CRM: {e}")
        return None


async def get_crm_context_for_query(tenant_id: str, user_message: str, customer_phone: str = None) -> Optional[str]:
    """
    Detect keywords and pre-fetch relevant CRM data for the query.

    Keywords detected:
    - price, cost, narx, цена → fetch product catalog with prices
    - product, catalog, товар → fetch product catalog
    - my order, previous, заказ → fetch customer's recent orders

    Returns formatted string for LLM context, or None if no relevant data.
    Non-blocking: Returns None on failure, conversation continues.
    """
    message_lower = user_message.lower()

    # Price/cost keywords (UZ, RU, EN)
    price_keywords = ["price", "cost", "how much", "narx", "qancha", "цена", "стоимость", "сколько стоит"]

    # Product/catalog keywords
    product_keywords = ["product", "catalog", "товар", "каталог", "mahsulot", "katalog", "item", "what do you sell", "nima sotasiz"]

    # Order history keywords
    order_keywords = ["my order", "previous order", "last order", "order history", "заказ", "мой заказ",
                      "buyurtma", "oldingi", "what did i buy", "что я заказывал"]

    context_parts = []

    try:
        # Check for price/product queries → fetch product catalog
        if any(kw in message_lower for kw in price_keywords + product_keywords):
            products = await get_cached_products(tenant_id)
            if products:
                product_lines = []
                for p in products[:20]:  # Limit to 20 products
                    name = p.get("NAME", "Unknown")
                    price = float(p.get("PRICE", 0))
                    currency = p.get("CURRENCY_ID", "UZS")
                    desc = p.get("DESCRIPTION", "")[:50] if p.get("DESCRIPTION") else ""
                    product_lines.append(f"- {name}: {price:,.0f} {currency}" + (f" ({desc}...)" if desc else ""))

                context_parts.append(f"## PRODUCT CATALOG FROM CRM (Use these exact prices)\n" + "\n".join(product_lines))

        # Check for order history queries → fetch customer's orders
        if any(kw in message_lower for kw in order_keywords) and customer_phone:
            normalized_phone = normalize_phone(customer_phone)
            if normalized_phone:
                bitrix_client = await get_bitrix_client(tenant_id)
                if bitrix_client:
                    try:
                        contact = await asyncio.wait_for(
                            bitrix_client.find_contact_by_phone(normalized_phone),
                            timeout=BITRIX_REALTIME_TIMEOUT
                        )
                        if contact and contact.get("ID"):
                            history = await asyncio.wait_for(
                                bitrix_client.get_contact_history(contact["ID"]),
                                timeout=BITRIX_REALTIME_TIMEOUT
                            )
                            if history.get("recent_deals"):
                                order_lines = []
                                for deal in history["recent_deals"][:5]:
                                    title = deal.get("TITLE", "Order")
                                    value = float(deal.get("OPPORTUNITY", 0))
                                    date = deal.get("DATE_CREATE", "")[:10] if deal.get("DATE_CREATE") else "N/A"
                                    stage = deal.get("STAGE_ID", "")
                                    status = "✓ Completed" if "WON" in stage else "In Progress"
                                    order_lines.append(f"- {title}: {value:,.0f} UZS ({date}) - {status}")

                                context_parts.append(f"## CUSTOMER'S ORDER HISTORY\n" + "\n".join(order_lines))
                    except asyncio.TimeoutError:
                        logger.debug("Order history fetch timed out")
                    except Exception as e:
                        logger.debug(f"Could not fetch order history: {e}")

        if context_parts:
            return "\n\n".join(context_parts)
        return None

    except Exception as e:
        logger.warning(f"Could not get CRM context for query: {e}")
        return None


async def get_bitrix_client(tenant_id: str) -> Optional[BitrixCRMClient]:
    """Get Bitrix24 client for tenant if configured"""
    # Check in-memory cache first
    if tenant_id in _bitrix_webhooks_cache:
        return create_bitrix_client(_bitrix_webhooks_cache[tenant_id]['webhook_url'])
    
    # Try tenant_configs table first
    try:
        result = supabase.table('tenant_configs').select('bitrix_webhook_url, bitrix_connected_at').eq('tenant_id', tenant_id).execute()
        if result.data and result.data[0].get('bitrix_webhook_url'):
            webhook_url = result.data[0]['bitrix_webhook_url']
            connected_at = result.data[0].get('bitrix_connected_at')
            _bitrix_webhooks_cache[tenant_id] = {
                'webhook_url': webhook_url,
                'connected_at': connected_at
            }
            logger.info(f"Loaded Bitrix webhook from tenant_configs for tenant {tenant_id}")
            return create_bitrix_client(webhook_url)
    except Exception as e:
        logger.debug(f"Could not get Bitrix from tenant_configs: {e}")
    
    # Try tenants table as fallback
    try:
        result = supabase.table('tenants').select('bitrix_webhook_url, bitrix_connected_at').eq('id', tenant_id).execute()
        if result.data and result.data[0].get('bitrix_webhook_url'):
            webhook_url = result.data[0]['bitrix_webhook_url']
            connected_at = result.data[0].get('bitrix_connected_at')
            _bitrix_webhooks_cache[tenant_id] = {
                'webhook_url': webhook_url,
                'connected_at': connected_at
            }
            logger.info(f"Loaded Bitrix webhook from tenants for tenant {tenant_id}")
            return create_bitrix_client(webhook_url)
    except Exception as e:
        logger.debug(f"Could not get Bitrix from tenants: {e}")
    
    return None


@api_router.post("/bitrix-crm/connect")
async def connect_bitrix_webhook(
    request: BitrixWebhookConnect, 
    current_user: Dict = Depends(get_current_user)
):
    """Connect Bitrix24 CRM via webhook URL"""
    tenant_id = current_user["tenant_id"]
    
    # Ensure webhook URL has proper format
    webhook_url = request.webhook_url.rstrip('/')
    
    # Validate URL format
    if not webhook_url.startswith('https://') and not webhook_url.startswith('http://'):
        raise HTTPException(status_code=400, detail="Webhook URL must start with https:// or http://")
    
    # Test the connection
    client = create_bitrix_client(webhook_url)
    if not client:
        raise HTTPException(status_code=400, detail="Invalid webhook URL")
    
    test_result = await client.test_connection()
    
    if not test_result.get("ok"):
        raise HTTPException(status_code=400, detail=f"Connection failed: {test_result.get('message')}")
    
    connected_at = now_iso()
    
    # Store in memory cache (always works)
    _bitrix_webhooks_cache[tenant_id] = {
        'webhook_url': webhook_url,
        'connected_at': connected_at,
        'portal_user': test_result.get('portal_user')
    }
    logger.info(f"Stored Bitrix webhook in cache for tenant {tenant_id}")
    
    # Try to save to database - attempt tenant_configs first, then tenants
    saved_to_db = False
    db_error_message = ""
    
    # Try tenant_configs table first
    try:
        result = supabase.table('tenant_configs').update({
            "bitrix_webhook_url": webhook_url,
            "bitrix_connected_at": connected_at
        }).eq('tenant_id', tenant_id).execute()
        if result.data:
            saved_to_db = True
            logger.info(f"Saved Bitrix webhook to tenant_configs for tenant {tenant_id}")
    except Exception as e:
        db_error_message = str(e)
        logger.debug(f"Could not save to tenant_configs: {e}")
    
    # Fallback to tenants table if tenant_configs didn't work
    if not saved_to_db:
        try:
            result = supabase.table('tenants').update({
                "bitrix_webhook_url": webhook_url,
                "bitrix_connected_at": connected_at
            }).eq('id', tenant_id).execute()
            if result.data:
                saved_to_db = True
                logger.info(f"Saved Bitrix webhook to tenants for tenant {tenant_id}")
        except Exception as e:
            db_error_message = str(e)
            logger.debug(f"Could not save to tenants: {e}")
    
    persistence_note = ""
    if not saved_to_db:
        persistence_note = " ⚠️ Note: Connection saved in memory only. Add 'bitrix_webhook_url' and 'bitrix_connected_at' columns to tenant_configs table in Supabase for persistence across restarts."
    
    return {
        "success": True,
        "message": f"Bitrix24 CRM connected successfully!{persistence_note}",
        "portal_user": test_result.get("portal_user"),
        "crm_mode": test_result.get("crm_mode"),
        "persisted": saved_to_db
    }


@api_router.post("/bitrix-crm/test")
async def test_bitrix_webhook(current_user: Dict = Depends(get_current_user)):
    """Test Bitrix24 CRM connection"""
    tenant_id = current_user["tenant_id"]
    
    client = await get_bitrix_client(tenant_id)
    if not client:
        return {"ok": False, "message": "Bitrix24 not connected"}
    
    return await client.test_connection()


@api_router.post("/bitrix-crm/disconnect")
async def disconnect_bitrix_webhook(current_user: Dict = Depends(get_current_user)):
    """Disconnect Bitrix24 CRM"""
    tenant_id = current_user["tenant_id"]
    
    # Clear from memory cache
    if tenant_id in _bitrix_webhooks_cache:
        del _bitrix_webhooks_cache[tenant_id]
        logger.info(f"Cleared Bitrix cache for tenant {tenant_id}")
    
    # Try to clear from tenant_configs table
    try:
        supabase.table('tenant_configs').update({
            "bitrix_webhook_url": None,
            "bitrix_connected_at": None
        }).eq('tenant_id', tenant_id).execute()
        logger.info(f"Cleared Bitrix from tenant_configs for tenant {tenant_id}")
    except Exception as e:
        logger.debug(f"Could not clear tenant_configs: {e}")
    
    # Also try to clear from tenants table
    try:
        supabase.table('tenants').update({
            "bitrix_webhook_url": None,
            "bitrix_connected_at": None
        }).eq('id', tenant_id).execute()
        logger.info(f"Cleared Bitrix from tenants for tenant {tenant_id}")
    except Exception as e:
        logger.debug(f"Could not clear tenants: {e}")
    
    return {"success": True, "message": "Bitrix24 disconnected"}


@api_router.get("/bitrix-crm/status")
async def get_bitrix_webhook_status(current_user: Dict = Depends(get_current_user)):
    """Get Bitrix24 CRM connection status"""
    tenant_id = current_user["tenant_id"]
    
    # Check memory cache first
    if tenant_id in _bitrix_webhooks_cache:
        return {
            "connected": True,
            "connected_at": _bitrix_webhooks_cache[tenant_id].get('connected_at'),
            "portal_user": _bitrix_webhooks_cache[tenant_id].get('portal_user'),
            "source": "cache"
        }
    
    # Try tenant_configs table
    try:
        result = supabase.table('tenant_configs').select('bitrix_webhook_url, bitrix_connected_at').eq('tenant_id', tenant_id).execute()
        if result.data and result.data[0].get('bitrix_webhook_url'):
            webhook_url = result.data[0]['bitrix_webhook_url']
            connected_at = result.data[0].get('bitrix_connected_at')
            # Populate cache for future requests
            _bitrix_webhooks_cache[tenant_id] = {
                'webhook_url': webhook_url,
                'connected_at': connected_at
            }
            return {
                "connected": True,
                "connected_at": connected_at,
                "source": "database"
            }
    except Exception as e:
        logger.debug(f"Could not check tenant_configs: {e}")
    
    # Fallback to tenants table
    try:
        result = supabase.table('tenants').select('bitrix_webhook_url, bitrix_connected_at').eq('id', tenant_id).execute()
        if result.data and result.data[0].get('bitrix_webhook_url'):
            webhook_url = result.data[0]['bitrix_webhook_url']
            connected_at = result.data[0].get('bitrix_connected_at')
            # Populate cache for future requests
            _bitrix_webhooks_cache[tenant_id] = {
                'webhook_url': webhook_url,
                'connected_at': connected_at
            }
            return {
                "connected": True,
                "connected_at": connected_at,
                "source": "database"
            }
    except Exception as e:
        logger.debug(f"Could not check tenants: {e}")
    
    return {"connected": False, "connected_at": None}


@api_router.get("/bitrix-crm/leads")
async def get_bitrix_leads(
    limit: int = 50,
    current_user: Dict = Depends(get_current_user)
):
    """Get leads from Bitrix24 CRM"""
    client = await get_bitrix_client(current_user["tenant_id"])
    if not client:
        raise HTTPException(status_code=400, detail="Bitrix24 not connected")
    
    try:
        leads = await client.list_leads(limit=limit)
        return {"leads": leads, "total": len(leads)}
    except BitrixAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/bitrix-crm/deals")
async def get_bitrix_deals(
    limit: int = 50,
    current_user: Dict = Depends(get_current_user)
):
    """Get deals from Bitrix24 CRM"""
    client = await get_bitrix_client(current_user["tenant_id"])
    if not client:
        raise HTTPException(status_code=400, detail="Bitrix24 not connected")
    
    try:
        deals = await client.list_deals(limit=limit)
        return {"deals": deals, "total": len(deals)}
    except BitrixAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/bitrix-crm/products")
async def get_bitrix_products(
    limit: int = 100,
    current_user: Dict = Depends(get_current_user)
):
    """Get products from Bitrix24 CRM"""
    client = await get_bitrix_client(current_user["tenant_id"])
    if not client:
        raise HTTPException(status_code=400, detail="Bitrix24 not connected")
    
    try:
        products = await client.list_products(limit=limit)
        return {"products": products, "total": len(products)}
    except BitrixAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/bitrix-crm/analytics")
async def get_bitrix_analytics(current_user: Dict = Depends(get_current_user)):
    """Get CRM analytics summary"""
    client = await get_bitrix_client(current_user["tenant_id"])
    if not client:
        raise HTTPException(status_code=400, detail="Bitrix24 not connected")
    
    try:
        analytics = await client.get_analytics_summary()
        top_products = await client.get_top_products(limit=10)
        analytics["top_products"] = top_products
        return analytics
    except BitrixAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/bitrix-crm/chat")
async def crm_chat(
    request: CRMChatRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    CRM Chat - AI-powered chat interface for querying CRM data.
    Ask questions like:
    - "What are our top selling products?"
    - "Show me leads from this week"
    - "What's our conversion rate?"
    - "How many deals are in the pipeline?"
    """
    tenant_id = current_user["tenant_id"]
    
    client = await get_bitrix_client(tenant_id)
    if not client:
        raise HTTPException(status_code=400, detail="Bitrix24 not connected. Please connect your CRM first.")
    
    try:
        # Get relevant CRM context based on the question
        crm_context = await client.get_context_for_ai(request.message)
        
        # Build conversation messages
        messages = [
            {
                "role": "system",
                "content": f"""You are a helpful CRM assistant for a business using Bitrix24.
You have access to the following CRM data:

{crm_context}

## Response Guidelines

### Formatting Rules (IMPORTANT):
- **Always use markdown formatting** for better readability
- Use **bold** for key metrics, names, and important numbers
- Use numbered lists (1. 2. 3.) for ordered items like rankings or steps
- Use bullet points (- or •) for unordered lists
- Use tables when comparing multiple items with multiple attributes
- Add line breaks between sections for clarity

### Structure Your Responses:
- Start with a **direct answer** to the question
- Follow with **supporting details** using lists or tables
- End with **insights or recommendations** when relevant

### Examples of Good Formatting:
- "You have **50 total leads**" (bold key numbers)
- "**Top 3 Leads by Value:**\\n1. John Smith - $5,000\\n2. Jane Doe - $3,500" (numbered lists)
- "| Status | Count |\\n|--------|-------|\\n| New | 10 |" (tables for comparisons)

### Content Rules:
- Be specific with numbers and facts from the data
- If asked about trends, provide analysis with the data
- Keep responses concise but comprehensive
- If data is insufficient, clearly state what's missing

Language: Respond in the same language the user uses (English, Russian, or Uzbek)."""
            }
        ]
        
        # Add conversation history
        for msg in request.conversation_history[-10:]:  # Last 10 messages
            role = "assistant" if msg.get("role") == "assistant" else "user"
            messages.append({"role": role, "content": msg.get("text", msg.get("content", ""))})
        
        # Add current message
        messages.append({"role": "user", "content": request.message})
        
        # Call OpenAI
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.3,
            max_tokens=1000
        )
        
        reply = response.choices[0].message.content
        
        return {
            "reply": reply,
            "crm_context_used": True,
            "data_sources": ["leads", "deals", "products", "analytics"]
        }
        
    except BitrixAPIError as e:
        raise HTTPException(status_code=500, detail=f"CRM error: {str(e)}")
    except Exception as e:
        logger.error(f"CRM Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Payment Gateway Endpoints ============

@api_router.post("/payme/connect")
async def connect_payme(
    request: PaymeConnect,
    current_user: Dict = Depends(get_current_user)
):
    """Connect Payme payment gateway"""
    tenant_id = current_user["tenant_id"]
    connected_at = datetime.utcnow().isoformat()

    # Store in memory cache
    _payme_credentials_cache[tenant_id] = {
        'merchant_id': request.merchant_id,
        'secret_key': request.secret_key,
        'connected_at': connected_at
    }
    logger.info(f"Stored Payme credentials in cache for tenant {tenant_id}")

    # Try to save to database
    saved_to_db = False
    try:
        result = supabase.table('tenant_configs').update({
            "payme_merchant_id": request.merchant_id,
            "payme_secret_key": request.secret_key,
            "payme_connected_at": connected_at
        }).eq('tenant_id', tenant_id).execute()
        if result.data:
            saved_to_db = True
            logger.info(f"Saved Payme credentials to database for tenant {tenant_id}")
    except Exception as e:
        logger.debug(f"Could not save Payme to database (columns may not exist): {e}")

    return {
        "success": True,
        "message": "Payme connected successfully!",
        "connected_at": connected_at,
        "persisted": saved_to_db
    }


@api_router.get("/payme/status")
async def get_payme_status(current_user: Dict = Depends(get_current_user)):
    """Get Payme connection status"""
    tenant_id = current_user["tenant_id"]

    # Check memory cache first
    if tenant_id in _payme_credentials_cache:
        return {
            "connected": True,
            "connected_at": _payme_credentials_cache[tenant_id].get('connected_at'),
            "source": "cache"
        }

    # Try database
    try:
        result = supabase.table('tenant_configs').select('payme_merchant_id, payme_connected_at').eq('tenant_id', tenant_id).execute()
        if result.data and result.data[0].get('payme_merchant_id'):
            connected_at = result.data[0].get('payme_connected_at')
            return {
                "connected": True,
                "connected_at": connected_at,
                "source": "database"
            }
    except Exception as e:
        logger.debug(f"Could not check Payme status from database: {e}")

    return {"connected": False, "connected_at": None}


@api_router.post("/payme/test")
async def test_payme_connection(current_user: Dict = Depends(get_current_user)):
    """Test Payme connection (validates credentials are stored)"""
    tenant_id = current_user["tenant_id"]

    # Check if credentials exist
    if tenant_id in _payme_credentials_cache:
        return {"ok": True, "message": "Payme credentials are configured"}

    # Check database
    try:
        result = supabase.table('tenant_configs').select('payme_merchant_id').eq('tenant_id', tenant_id).execute()
        if result.data and result.data[0].get('payme_merchant_id'):
            return {"ok": True, "message": "Payme credentials are configured"}
    except Exception as e:
        logger.debug(f"Could not check Payme from database: {e}")

    return {"ok": False, "message": "Payme not connected"}


@api_router.post("/payme/disconnect")
async def disconnect_payme(current_user: Dict = Depends(get_current_user)):
    """Disconnect Payme payment gateway"""
    tenant_id = current_user["tenant_id"]

    # Clear from memory cache
    if tenant_id in _payme_credentials_cache:
        del _payme_credentials_cache[tenant_id]
        logger.info(f"Cleared Payme from cache for tenant {tenant_id}")

    # Try to clear from database
    try:
        supabase.table('tenant_configs').update({
            "payme_merchant_id": None,
            "payme_secret_key": None,
            "payme_connected_at": None
        }).eq('tenant_id', tenant_id).execute()
        logger.info(f"Cleared Payme from database for tenant {tenant_id}")
    except Exception as e:
        logger.debug(f"Could not clear Payme from database: {e}")

    return {"success": True, "message": "Payme disconnected"}


@api_router.post("/click/connect")
async def connect_click(
    request: ClickConnect,
    current_user: Dict = Depends(get_current_user)
):
    """Connect Click payment gateway"""
    tenant_id = current_user["tenant_id"]
    connected_at = datetime.utcnow().isoformat()

    # Store in memory cache
    _click_credentials_cache[tenant_id] = {
        'service_id': request.service_id,
        'secret_key': request.secret_key,
        'connected_at': connected_at
    }
    logger.info(f"Stored Click credentials in cache for tenant {tenant_id}")

    # Try to save to database
    saved_to_db = False
    try:
        result = supabase.table('tenant_configs').update({
            "click_service_id": request.service_id,
            "click_secret_key": request.secret_key,
            "click_connected_at": connected_at
        }).eq('tenant_id', tenant_id).execute()
        if result.data:
            saved_to_db = True
            logger.info(f"Saved Click credentials to database for tenant {tenant_id}")
    except Exception as e:
        logger.debug(f"Could not save Click to database (columns may not exist): {e}")

    return {
        "success": True,
        "message": "Click connected successfully!",
        "connected_at": connected_at,
        "persisted": saved_to_db
    }


@api_router.get("/click/status")
async def get_click_status(current_user: Dict = Depends(get_current_user)):
    """Get Click connection status"""
    tenant_id = current_user["tenant_id"]

    # Check memory cache first
    if tenant_id in _click_credentials_cache:
        return {
            "connected": True,
            "connected_at": _click_credentials_cache[tenant_id].get('connected_at'),
            "source": "cache"
        }

    # Try database
    try:
        result = supabase.table('tenant_configs').select('click_service_id, click_connected_at').eq('tenant_id', tenant_id).execute()
        if result.data and result.data[0].get('click_service_id'):
            connected_at = result.data[0].get('click_connected_at')
            return {
                "connected": True,
                "connected_at": connected_at,
                "source": "database"
            }
    except Exception as e:
        logger.debug(f"Could not check Click status from database: {e}")

    return {"connected": False, "connected_at": None}


@api_router.post("/click/test")
async def test_click_connection(current_user: Dict = Depends(get_current_user)):
    """Test Click connection (validates credentials are stored)"""
    tenant_id = current_user["tenant_id"]

    # Check if credentials exist
    if tenant_id in _click_credentials_cache:
        return {"ok": True, "message": "Click credentials are configured"}

    # Check database
    try:
        result = supabase.table('tenant_configs').select('click_service_id').eq('tenant_id', tenant_id).execute()
        if result.data and result.data[0].get('click_service_id'):
            return {"ok": True, "message": "Click credentials are configured"}
    except Exception as e:
        logger.debug(f"Could not check Click from database: {e}")

    return {"ok": False, "message": "Click not connected"}


@api_router.post("/click/disconnect")
async def disconnect_click(current_user: Dict = Depends(get_current_user)):
    """Disconnect Click payment gateway"""
    tenant_id = current_user["tenant_id"]

    # Clear from memory cache
    if tenant_id in _click_credentials_cache:
        del _click_credentials_cache[tenant_id]
        logger.info(f"Cleared Click from cache for tenant {tenant_id}")

    # Try to clear from database
    try:
        supabase.table('tenant_configs').update({
            "click_service_id": None,
            "click_secret_key": None,
            "click_connected_at": None
        }).eq('tenant_id', tenant_id).execute()
        logger.info(f"Cleared Click from database for tenant {tenant_id}")
    except Exception as e:
        logger.debug(f"Could not clear Click from database: {e}")

    return {"success": True, "message": "Click disconnected"}


# ============ Google Sheets Endpoints ============

def _extract_sheet_id(url: str) -> Optional[str]:
    """Extract Google Sheet ID from a share URL."""
    import re
    # Matches: https://docs.google.com/spreadsheets/d/SHEET_ID/...
    match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', url)
    return match.group(1) if match else None


@api_router.post("/google-sheets/connect")
async def connect_google_sheets(
    request: GoogleSheetsConnect,
    current_user: Dict = Depends(get_current_user)
):
    """Connect a Google Sheet (must be shared as 'Anyone with link can view')"""
    tenant_id = current_user["tenant_id"]

    sheet_id = _extract_sheet_id(request.sheet_url)
    if not sheet_id:
        raise HTTPException(status_code=400, detail="Invalid Google Sheets URL. Please paste a valid share link.")

    # Test that the sheet is publicly accessible by fetching first row as CSV
    import httpx
    test_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(test_url)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail="Could not access the sheet. Make sure it's shared as 'Anyone with the link can view'."
                )
            # Verify it's actually CSV content (not an HTML error page)
            content_type = resp.headers.get('content-type', '')
            if 'text/csv' not in content_type and 'text/plain' not in content_type and 'application/csv' not in content_type:
                # Google sometimes returns HTML login page for non-public sheets
                if '<html' in resp.text[:200].lower():
                    raise HTTPException(
                        status_code=400,
                        detail="Sheet is not publicly accessible. Set sharing to 'Anyone with the link can view'."
                    )
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Could not reach Google Sheets: {str(e)}")

    connected_at = datetime.utcnow().isoformat()

    # Store in memory cache
    _google_sheets_cache[tenant_id] = {
        'sheet_url': request.sheet_url,
        'sheet_id': sheet_id,
        'connected_at': connected_at
    }
    logger.info(f"Stored Google Sheets config in cache for tenant {tenant_id}")

    # Try to save to database
    saved_to_db = False
    try:
        result = supabase.table('tenant_configs').update({
            "google_sheet_url": request.sheet_url,
            "google_sheet_id": sheet_id,
            "google_sheet_connected_at": connected_at
        }).eq('tenant_id', tenant_id).execute()
        if result.data:
            saved_to_db = True
            logger.info(f"Saved Google Sheets config to database for tenant {tenant_id}")
    except Exception as e:
        logger.debug(f"Could not save Google Sheets to database (columns may not exist): {e}")

    return {
        "success": True,
        "message": "Google Sheet connected successfully!",
        "sheet_id": sheet_id,
        "connected_at": connected_at,
        "persisted": saved_to_db
    }


@api_router.get("/google-sheets/status")
async def get_google_sheets_status(current_user: Dict = Depends(get_current_user)):
    """Get Google Sheets connection status"""
    tenant_id = current_user["tenant_id"]

    # Check memory cache first
    if tenant_id in _google_sheets_cache:
        return {
            "connected": True,
            "sheet_url": _google_sheets_cache[tenant_id].get('sheet_url'),
            "sheet_id": _google_sheets_cache[tenant_id].get('sheet_id'),
            "connected_at": _google_sheets_cache[tenant_id].get('connected_at'),
            "source": "cache"
        }

    # Try database
    try:
        result = supabase.table('tenant_configs').select('google_sheet_url, google_sheet_id, google_sheet_connected_at').eq('tenant_id', tenant_id).execute()
        if result.data and result.data[0].get('google_sheet_id'):
            return {
                "connected": True,
                "sheet_url": result.data[0].get('google_sheet_url'),
                "sheet_id": result.data[0].get('google_sheet_id'),
                "connected_at": result.data[0].get('google_sheet_connected_at'),
                "source": "database"
            }
    except Exception as e:
        logger.debug(f"Could not check Google Sheets status from database: {e}")

    return {"connected": False, "sheet_url": None, "sheet_id": None, "connected_at": None}


@api_router.post("/google-sheets/test")
async def test_google_sheets_connection(current_user: Dict = Depends(get_current_user)):
    """Test Google Sheets connection by fetching data"""
    tenant_id = current_user["tenant_id"]

    sheet_id = None
    if tenant_id in _google_sheets_cache:
        sheet_id = _google_sheets_cache[tenant_id].get('sheet_id')
    else:
        try:
            result = supabase.table('tenant_configs').select('google_sheet_id').eq('tenant_id', tenant_id).execute()
            if result.data and result.data[0].get('google_sheet_id'):
                sheet_id = result.data[0]['google_sheet_id']
        except Exception:
            pass

    if not sheet_id:
        return {"ok": False, "message": "Google Sheets not connected"}

    # Try to fetch the sheet
    import httpx
    test_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(test_url)
            if resp.status_code == 200:
                # Count rows for feedback
                lines = resp.text.strip().split('\n')
                row_count = len(lines) - 1  # exclude header
                return {"ok": True, "message": f"Sheet accessible. {row_count} data rows found."}
            else:
                return {"ok": False, "message": "Sheet is no longer accessible. Check sharing settings."}
    except Exception as e:
        return {"ok": False, "message": f"Connection failed: {str(e)}"}


@api_router.post("/google-sheets/disconnect")
async def disconnect_google_sheets(current_user: Dict = Depends(get_current_user)):
    """Disconnect Google Sheets"""
    tenant_id = current_user["tenant_id"]

    # Clear from memory cache
    if tenant_id in _google_sheets_cache:
        del _google_sheets_cache[tenant_id]
        logger.info(f"Cleared Google Sheets from cache for tenant {tenant_id}")

    # Try to clear from database
    try:
        supabase.table('tenant_configs').update({
            "google_sheet_url": None,
            "google_sheet_id": None,
            "google_sheet_connected_at": None
        }).eq('tenant_id', tenant_id).execute()
        logger.info(f"Cleared Google Sheets from database for tenant {tenant_id}")
    except Exception as e:
        logger.debug(f"Could not clear Google Sheets from database: {e}")

    return {"success": True, "message": "Google Sheets disconnected"}


# ============ Enhanced LLM Service ============

def _build_dynamic_context_sections(
    detected_objection: Optional[Dict],
    closing_script: Optional[Dict],
    contact_urgency: Optional[str],
    product_context: Optional[str]
) -> str:
    """Build dynamic context sections for objection handling, closing, and contact collection."""
    sections = []

    # Objection enforcement section
    if detected_objection and detected_objection.get('response_strategy'):
        sections.append(f"""## ⚠️ ACTIVE OBJECTION DETECTED: {detected_objection.get('objection', 'Unknown')}

Detected keyword: "{detected_objection.get('detected_keyword', '')}"

You MUST:
1. Acknowledge their concern empathetically - show you understand
2. Use this EXACT strategy: {detected_objection.get('response_strategy')}
3. After addressing objection, guide conversation back toward the sale
4. If objection persists, attempt to collect contact info for follow-up
5. Do NOT apologize for prices or offer unauthorized discounts""")

    # Closing script trigger section
    if closing_script:
        sections.append(f"""## 🎯 CLOSING OPPORTUNITY DETECTED

Reason: {closing_script.get('reason', 'Customer shows buying signals')}
Recommended closing technique: **{closing_script.get('script_key', 'soft_close')}**

Adapt this script to the conversation:
"{closing_script.get('script_text', '')}"

CRITICAL: NEVER end a high-score conversation without:
1. Completing the sale, OR
2. Collecting phone number for follow-up, OR
3. Scheduling a specific follow-up time""")

    # Contact collection urgency section
    if contact_urgency:
        sections.append(contact_urgency)

    # Product context section
    if product_context:
        sections.append(product_context)

    return "\n\n".join(sections)


def _build_crm_context_section(crm_context: Optional[Dict]) -> str:
    """Build the CRM context section for the system prompt."""
    if not crm_context or not crm_context.get("is_returning_customer"):
        return ""

    total_purchases = crm_context.get("total_purchases", 0)
    total_value = crm_context.get("total_value", 0)
    vip_status = "YES - VIP CUSTOMER" if crm_context.get("vip_status") else "No"
    customer_since = crm_context.get("customer_since", "N/A")
    contact_name = crm_context.get("contact_name", "")
    recent_products = crm_context.get("recent_products", [])

    recent_products_text = ""
    if recent_products:
        recent_products_text = f"\n- Recent Purchases: {', '.join(recent_products[:3])}"

    return f"""## 🌟 RETURNING CUSTOMER ALERT
This is a RETURNING CUSTOMER with purchase history in our CRM!

**Customer Profile:**
- Name in CRM: {contact_name if contact_name else 'Not available'}
- Customer Since: {customer_since}
- Total Purchases: {total_purchases} orders
- Lifetime Value: {total_value:,.0f} UZS
- VIP Status: {vip_status}{recent_products_text}

**SPECIAL INSTRUCTIONS FOR RETURNING CUSTOMERS:**
1. Acknowledge them as a valued customer ("Welcome back!" / "Xush kelibsiz!" / "Рады видеть вас снова!")
2. Reference their past purchases if relevant to current conversation
3. Offer loyalty benefits or personalized recommendations
4. Be extra attentive - they know our products and expect premium service
5. If VIP: Prioritize their requests, offer exclusive deals if appropriate

"""


def get_enhanced_system_prompt(
    config: Dict,
    lead_context: Dict = None,
    crm_context: Dict = None,
    detected_objection: Dict = None,
    closing_script: Dict = None,
    contact_urgency: str = None,
    product_context: str = None
) -> str:
    """Generate comprehensive system prompt with sales pipeline, CRM awareness, and enforcement layers"""

    business_name = config.get('business_name', 'our company')
    business_description = config.get('business_description', '')
    products_services = config.get('products_services', '')
    agent_tone = config.get('agent_tone', 'friendly_professional')
    collect_phone = config.get('collect_phone', True)
    primary_language = config.get('primary_language', 'uz')
    secondary_languages = config.get('secondary_languages', ['ru', 'en'])
    emoji_usage = config.get('emoji_usage', 'moderate')
    response_length = config.get('response_length', 'balanced')

    # Map language codes to names
    lang_map = {'uz': 'Uzbek', 'ru': 'Russian', 'en': 'English'}
    primary_lang_name = lang_map.get(primary_language, primary_language)
    secondary_lang_names = [lang_map.get(l, l) for l in (secondary_languages or [])]
    all_languages = [primary_lang_name] + secondary_lang_names

    # Map tone to description
    tone_map = {
        'professional': 'formal and business-like',
        'friendly_professional': 'warm but professional',
        'casual': 'relaxed and conversational',
        'luxury': 'elegant and sophisticated'
    }
    tone_description = tone_map.get(agent_tone, agent_tone)

    # Emoji instructions
    emoji_map = {
        'never': 'Do NOT use any emojis.',
        'minimal': 'Use emojis sparingly (max 1 per 3-4 messages).',
        'moderate': 'Use emojis occasionally (1-2 per message).',
        'frequent': 'Use emojis freely (2-3 per message).'
    }
    emoji_instruction = emoji_map.get(emoji_usage, emoji_map['moderate'])

    # Response length instructions
    length_map = {
        'concise': 'Keep responses SHORT (1-2 sentences max).',
        'balanced': 'Use moderate length (2-4 sentences).',
        'detailed': 'Provide thorough responses with details.'
    }
    length_instruction = length_map.get(response_length, length_map['balanced'])

    # Get objection playbook (use 'or' to handle explicit None values from DB)
    objection_playbook = config.get('objection_playbook') or DEFAULT_OBJECTION_PLAYBOOK
    objection_text = "\n".join([f"- If customer says '{obj['objection']}': {obj['response_strategy']}" for obj in objection_playbook])

    # Get closing scripts (use 'or' to handle explicit None values from DB)
    closing_scripts = config.get('closing_scripts') or DEFAULT_CLOSING_SCRIPTS
    closing_text = "\n".join([f"- {script['name']}: \"{script['script']}\" (Use when: {script['use_when']})" for script in closing_scripts.values()])

    # Get required fields (use 'or' to handle explicit None values from DB)
    required_fields = config.get('required_fields') or DEFAULT_REQUIRED_FIELDS
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
- Tone: {tone_description}
- Languages: {'/'.join(all_languages)} - respond in the customer's language (default: {primary_lang_name})
- {emoji_instruction}
- {length_instruction}
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

{get_hard_constraints_section(config)}

{get_handoff_instructions(config)}

{_build_dynamic_context_sections(detected_objection, closing_script, contact_urgency, product_context)}

{_build_crm_context_section(crm_context)}## REQUIRED INFORMATION TO COLLECT
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
    "next_action": "What AI should focus on next turn",
    "needs_human_handoff": false,
    "handoff_reason": "null or reason for escalation"
}}

## CRITICAL RULES
1. NEVER fabricate product info not in your context
2. NEVER be aggressive or pushy
3. ALWAYS advance the conversation toward a goal
4. ALWAYS respond in the customer's language
5. If you don't have information, ask clarifying questions
6. Track ALL information customer shares in fields_collected
7. When all required fields are collected AND customer shows intent, attempt a close

## FIELD EXTRACTION RULES (ANTI-HALLUCINATION)
CRITICAL: Only extract information the customer EXPLICITLY stated:
- If customer says "I'm Sardor" → set name: "Sardor"
- If customer says "call me at 901234567" → set phone: "901234567"
- If customer mentions a specific product → set product: that product name
- If customer mentions budget like "5 million" → set budget: "5 million"
- If customer mentions timing like "next week" → set timeline: "next week"

NEVER INVENT OR GUESS:
- If customer just says "I'm interested" → DO NOT set name/phone/budget
- If customer says "I'm a business owner" → DO NOT assume company name or budget
- If information is ambiguous → set field to null and ask clarifying question

## SCORING GUIDELINES
- 0-30: Cold lead, just browsing, no clear interest
- 31-50: Early interest, asking general questions
- 51-70: Engaged, considering options, some buying signals
- 71-85: High intent, discussing specifics, ready to decide
- 86-100: Ready to buy, just needs final confirmation

## STAGE TRANSITION RULES
- AWARENESS → INTEREST: Customer asks specific questions about products
- INTEREST → CONSIDERATION: Customer shares budget/timeline OR compares options
- CONSIDERATION → INTENT: Customer says "I want to buy" or shows clear purchase intent
- INTENT → EVALUATION: Customer raises objections or says "let me think"
- EVALUATION → PURCHASE: Customer explicitly commits or asks "how do I pay/order"
- NEVER skip more than 1 stage forward in a single turn
- Stages can go backward by 1 if customer shows reduced interest

## OUTPUT EXAMPLES

Example 1 - New customer asking about products:
{{"reply_text": "Assalomu alaykum! Sizga qanday yordam bera olaman?", "sales_stage": "awareness", "stage_change_reason": null, "hotness": "warm", "score": 30, "intent": "initial_inquiry", "objection_detected": null, "closing_technique_used": null, "fields_collected": {{"name": null, "phone": null, "product": null, "budget": null, "timeline": null}}, "next_action": "Ask about specific needs"}}

Example 2 - Customer shares name and interest:
{{"reply_text": "Rahmat, Sardor! Qaysi mahsulot sizni qiziqtiradi?", "sales_stage": "interest", "stage_change_reason": "Customer engaged with specific question", "hotness": "warm", "score": 45, "intent": "product_inquiry", "objection_detected": null, "closing_technique_used": null, "fields_collected": {{"name": "Sardor", "phone": null, "product": null, "budget": null, "timeline": null}}, "next_action": "Identify product interest"}}

Example 3 - Customer ready to buy:
{{"reply_text": "Ajoyib! Buyurtmangizni rasmiylashtiraman. Telefon raqamingizni aytasizmi?", "sales_stage": "purchase", "stage_change_reason": "Customer said they want to order", "hotness": "hot", "score": 92, "intent": "ready_to_purchase", "objection_detected": null, "closing_technique_used": "assumptive_close", "fields_collected": {{"name": "Sardor", "phone": null, "product": "Premium Package", "budget": "5 million", "timeline": "today"}}, "next_action": "Collect phone number to confirm order"}}"""


async def get_business_context_semantic(tenant_id: str, query: str, top_k: int = 5) -> List[str]:
    """
    Semantic RAG - finds relevant context using embeddings.
    First loads from DB cache, then performs semantic search.
    """
    try:
        # Ensure embeddings are loaded from DB for this tenant
        await load_embeddings_from_db(tenant_id)
        
        # Collect all chunks from memory cache for this tenant
        all_chunks = []
        for doc_id, doc_data in document_embeddings_cache.items():
            if doc_data.get("tenant_id") == tenant_id:
                all_chunks.extend(doc_data.get("chunks", []))
        
        # If we have chunks with embeddings, use semantic search
        if all_chunks and all_chunks[0].get("embedding"):
            logger.info(f"Performing semantic search over {len(all_chunks)} chunks for tenant {tenant_id}")
            results = await semantic_search(query, all_chunks, top_k=top_k, min_similarity=0.25)
            context = [
                f"[{r.get('source', 'Document')}] (relevance: {r['similarity']:.0%}): {r['text'][:600]}"
                for r in results
            ]
            if context:
                logger.info(f"Found {len(context)} relevant chunks for query: {query[:50]}...")
            return context
        
        # Fallback to keyword matching from database content
        logger.info(f"No embeddings found, falling back to keyword search for tenant {tenant_id}")
        result = supabase.table('documents').select('title, content').eq('tenant_id', tenant_id).execute()
        
        if not result.data:
            return []
        
        context = []
        query_words = set(query.lower().split())
        
        for doc in result.data:
            content = doc.get('content', '')
            # Skip placeholder content
            if content and not content.startswith('[File:') and query_words & set(content.lower().split()):
                snippet = content[:500] + "..." if len(content) > 500 else content
                context.append(f"[{doc.get('title', 'Document')}]: {snippet}")
        
        return context[:top_k]
        
    except Exception as e:
        logger.error(f"RAG context retrieval error: {e}")
        import traceback
        traceback.print_exc()
        return []


# Keep sync version for backwards compatibility
def get_business_context(tenant_id: str, query: str) -> List[str]:
    """Sync wrapper - returns empty list, use async version instead"""
    return []


def validate_llm_output(result: Dict, current_stage: str = 'awareness') -> Dict:
    """Validate and sanitize LLM output to ensure data integrity"""
    validated = {}

    # Validate reply_text
    validated['reply_text'] = result.get('reply_text', 'I apologize, let me help you.')
    if not isinstance(validated['reply_text'], str) or not validated['reply_text'].strip():
        validated['reply_text'] = 'I apologize, let me help you.'

    # Validate sales_stage - must be a valid stage
    raw_stage = result.get('sales_stage', current_stage)
    if isinstance(raw_stage, str) and raw_stage.lower() in VALID_SALES_STAGES:
        validated['sales_stage'] = raw_stage.lower()
    else:
        logger.warning(f"Invalid sales_stage '{raw_stage}', defaulting to '{current_stage}'")
        validated['sales_stage'] = current_stage

    # Validate hotness - must be hot, warm, or cold
    raw_hotness = result.get('hotness', 'warm')
    if isinstance(raw_hotness, str) and raw_hotness.lower() in VALID_HOTNESS_VALUES:
        validated['hotness'] = raw_hotness.lower()
    else:
        logger.warning(f"Invalid hotness '{raw_hotness}', defaulting to 'warm'")
        validated['hotness'] = 'warm'

    # Validate score - must be 0-100
    raw_score = result.get('score', 50)
    try:
        score = int(raw_score)
        validated['score'] = max(0, min(100, score))  # Clamp to 0-100
    except (TypeError, ValueError):
        logger.warning(f"Invalid score '{raw_score}', defaulting to 50")
        validated['score'] = 50

    # Pass through other fields with type validation (LLM can return wrong types)
    stage_reason = result.get('stage_change_reason')
    validated['stage_change_reason'] = str(stage_reason) if stage_reason is not None and stage_reason != "" else None

    intent = result.get('intent', '')
    validated['intent'] = str(intent) if intent is not None else ''

    objection = result.get('objection_detected')
    validated['objection_detected'] = str(objection) if objection is not None and objection != "" else None

    closing = result.get('closing_technique_used')
    validated['closing_technique_used'] = str(closing) if closing is not None and closing != "" else None

    next_action = result.get('next_action')
    validated['next_action'] = str(next_action) if next_action is not None else None

    # Validate fields_collected - must be a dict with string/null values
    raw_fields = result.get('fields_collected', {})
    if isinstance(raw_fields, dict):
        # Ensure all values are strings or None
        validated['fields_collected'] = {
            k: str(v) if v is not None and v != "" else None
            for k, v in raw_fields.items()
        }
    else:
        logger.warning(f"Invalid fields_collected type, defaulting to empty dict")
        validated['fields_collected'] = {}

    # Validate human handoff fields (Phase 5)
    needs_handoff = result.get('needs_human_handoff')
    validated['needs_human_handoff'] = bool(needs_handoff) if needs_handoff is not None else False

    handoff_reason = result.get('handoff_reason')
    validated['handoff_reason'] = str(handoff_reason) if handoff_reason and validated['needs_human_handoff'] else None

    return validated


# ============ Phase 2: Objection Detection ============
def detect_objection(message: str, objection_playbook: List[Dict]) -> Optional[Dict]:
    """
    Detect objection type from message using multilingual keywords.
    Returns the matched objection with its response strategy, or None.
    """
    if not message:
        return None

    message_lower = message.lower()

    # First check against OBJECTION_KEYWORDS for type detection
    for objection_type, lang_keywords in OBJECTION_KEYWORDS.items():
        for lang, keywords in lang_keywords.items():
            for keyword in keywords:
                if keyword in message_lower:
                    # Found objection type, now get strategy from playbook
                    for playbook_item in objection_playbook:
                        playbook_keywords = playbook_item.get('keywords', [])
                        # Match if any playbook keyword matches or objection type matches
                        if any(pk.lower() in message_lower for pk in playbook_keywords):
                            return {
                                "type": objection_type,
                                "objection": playbook_item.get('objection'),
                                "response_strategy": playbook_item.get('response_strategy'),
                                "detected_keyword": keyword
                            }
                    # If no playbook match, return basic info
                    return {
                        "type": objection_type,
                        "objection": objection_type.replace('_', ' ').title(),
                        "response_strategy": None,
                        "detected_keyword": keyword
                    }

    # Also check playbook keywords directly
    for playbook_item in objection_playbook:
        playbook_keywords = playbook_item.get('keywords', [])
        for keyword in playbook_keywords:
            if keyword.lower() in message_lower:
                return {
                    "type": "custom",
                    "objection": playbook_item.get('objection'),
                    "response_strategy": playbook_item.get('response_strategy'),
                    "detected_keyword": keyword
                }

    return None


# ============ Phase 3: Closing Script Triggers ============
def get_closing_script_for_context(
    score: int,
    stage: str,
    fields_collected: Dict,
    closing_scripts: Dict
) -> Optional[Dict]:
    """
    Select appropriate closing script based on score, stage, and collected fields.
    Returns the script to use or None if not appropriate to close.
    """
    if not closing_scripts:
        closing_scripts = DEFAULT_CLOSING_SCRIPTS

    has_phone = bool(fields_collected.get('phone'))
    has_name = bool(fields_collected.get('name'))
    has_product = bool(fields_collected.get('product'))
    has_budget = bool(fields_collected.get('budget'))

    # High score at evaluation/intent stage = time to close
    if score >= 70 and stage in ["intent", "evaluation", "purchase"]:
        # Customer ready to buy - use assumptive close
        if score >= 85 and has_product:
            script = closing_scripts.get('assumptive_close', DEFAULT_CLOSING_SCRIPTS['assumptive_close'])
            return {
                "script_key": "assumptive_close",
                "script_text": script['script'],
                "reason": f"Score {score}+ with product interest indicates high buying intent"
            }

        # Customer interested but hesitating - use summary close
        if has_product and has_budget:
            script = closing_scripts.get('summary_close', DEFAULT_CLOSING_SCRIPTS['summary_close'])
            return {
                "script_key": "summary_close",
                "script_text": script['script'],
                "reason": f"Customer has shared product interest and budget, ready to summarize value"
            }

        # Customer showing interest but not committed - soft close
        if score >= 60:
            script = closing_scripts.get('soft_close', DEFAULT_CLOSING_SCRIPTS['soft_close'])
            return {
                "script_key": "soft_close",
                "script_text": script['script'],
                "reason": f"Score {score} shows interest, attempt soft close"
            }

    # Multiple options discussed - use alternative close
    if stage == "consideration" and has_product and score >= 50:
        script = closing_scripts.get('alternative_close', DEFAULT_CLOSING_SCRIPTS['alternative_close'])
        return {
            "script_key": "alternative_close",
            "script_text": script['script'],
            "reason": "Customer in consideration stage with product interest"
        }

    return None


# ============ Phase 4: Contact Collection Triggers ============
def get_contact_collection_urgency(score: int, fields_collected: Dict, stage: str) -> Optional[str]:
    """
    Generate contact collection instructions based on score and collected fields.
    Returns urgency instruction string or None.
    """
    has_phone = bool(fields_collected.get('phone'))
    has_name = bool(fields_collected.get('name'))

    if has_phone:
        return None  # Already have contact

    # Critical: Score 80+ without phone
    if score >= 80:
        return """## CRITICAL: COLLECT CONTACT NOW

Score is 80+. This is a HOT lead. You MUST collect phone number in this response.
Use assumptive language: "I'll process this for you. What's the best number to confirm your order?"
Do NOT let this conversation end without phone number."""

    # High priority: Score 60-79
    if score >= 60:
        priority = "HIGH" if score >= 70 else "MEDIUM"
        return f"""## {priority} PRIORITY: Request Contact

Score is {score}. This customer is engaged and showing buying interest.
Naturally request phone number: "To provide you with the best service, may I have your phone number?"
If they hesitate, explain benefit: "This helps us process your order faster and keep you updated." """

    # Moderate: Score 40-59 at consideration+ stage
    if score >= 40 and stage in ["consideration", "intent", "evaluation", "purchase"]:
        return """## Contact Collection Reminder

Customer is engaged. When appropriate, ask for contact information to follow up.
Keep it natural and value-focused: "Would you like me to send you more details? I can reach you at..."  """

    return None


# ============ Phase 5: Human Handoff ============
async def log_handoff_request(
    tenant_id: str,
    conversation_id: str,
    customer_phone: Optional[str],
    customer_name: Optional[str],
    reason: str
):
    """Log a human handoff request for manager follow-up."""
    try:
        handoff_data = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "event_type": "human_handoff_requested",
            "event_data": {
                "conversation_id": conversation_id,
                "customer_phone": customer_phone,
                "customer_name": customer_name,
                "reason": reason,
                "status": "pending"
            },
            "created_at": now_iso()
        }
        supabase.table('event_logs').insert(handoff_data).execute()
        logger.info(f"Human handoff logged for tenant {tenant_id}: {reason}")
    except Exception as e:
        logger.error(f"Failed to log handoff request: {e}")


def get_handoff_instructions(config: Dict) -> str:
    """Generate human handoff protocol instructions for system prompt."""
    discount_authority = config.get('discount_authority', 'none')

    return f"""## HUMAN HANDOFF PROTOCOL

Set needs_human_handoff: true and provide handoff_reason when:
1. Customer explicitly asks for human/manager ("I want to talk to a real person")
2. Customer requests discount you cannot authorize (discount_authority: {discount_authority})
3. Customer has complaint about past service or product quality
4. Technical questions not covered in your knowledge base
5. Legal questions, contract concerns, or warranty disputes
6. Customer becomes frustrated or angry
7. Complex custom requirements beyond standard offerings

When setting handoff=true:
- STILL attempt to collect phone number if not already collected
- Reassure customer: "I'll have our manager contact you shortly"
- Provide expected response time if known

IMPORTANT: Handoff is NOT failure - it's professional escalation."""


# ============ Phase 6: Response Validation ============
def validate_response_promises(
    response: str,
    config: Dict,
    crm_products: List[str] = None,
    kb_products: List[str] = None
) -> Tuple[bool, List[str]]:
    """
    Validate response doesn't promise unauthorized things.
    Returns (is_valid, list_of_violations).
    """
    violations = []
    response_lower = response.lower()

    # Check 1: Discount promises when not authorized
    discount_authority = config.get('discount_authority', 'none')
    promo_codes = config.get('promo_codes', [])

    discount_keywords = ['discount', 'скидка', 'chegirma', '% off', 'reduced price', 'special price']
    has_discount_mention = any(kw in response_lower for kw in discount_keywords)

    if has_discount_mention:
        # Check if it's an authorized promo code
        promo_mentioned = any(promo.get('code', '').lower() in response_lower for promo in promo_codes)
        if not promo_mentioned and discount_authority == 'none':
            violations.append('unauthorized_discount')

    # Check 2: Payment plan promises when not enabled
    payment_plans_enabled = config.get('payment_plans_enabled', False)
    payment_keywords = ['payment plan', 'installment', 'to\'lov rejasi', 'рассрочка', 'bo\'lib to\'lash']

    if any(kw in response_lower for kw in payment_keywords) and not payment_plans_enabled:
        violations.append('unauthorized_payment_plan')

    # Check 3: Product hallucinations (if we have product lists)
    all_known_products = set()
    if crm_products:
        all_known_products.update(p.lower() for p in crm_products if p)
    if kb_products:
        all_known_products.update(p.lower() for p in kb_products if p)

    # Common hallucination patterns to check
    hallucination_patterns = ['iphone', 'samsung', 'apple watch', 'airpods', 'macbook']
    for pattern in hallucination_patterns:
        if pattern in response_lower and pattern not in ' '.join(all_known_products).lower():
            # Only flag if we have a product list and this isn't in it
            if all_known_products:
                violations.append(f'possible_hallucination:{pattern}')

    return (len(violations) == 0, violations)


def correct_response_if_needed(response: str, violations: List[str], config: Dict) -> str:
    """
    Add disclaimer or correction if problematic content detected.
    Returns corrected response.
    """
    if not violations:
        return response

    corrections = []

    if 'unauthorized_discount' in violations:
        corrections.append("Regarding pricing, for any special discounts please speak with our manager who can assist you further.")

    if 'unauthorized_payment_plan' in violations:
        corrections.append("Payment options would need to be discussed with our sales manager.")

    # For hallucinations, we just log - don't modify as it might break flow
    hallucination_violations = [v for v in violations if v.startswith('possible_hallucination:')]
    if hallucination_violations:
        logger.warning(f"Possible product hallucinations detected: {hallucination_violations}")

    if corrections:
        # Append corrections to response
        correction_text = "\n\n" + " ".join(corrections)
        return response + correction_text

    return response


# ============ Phase 7: Product Context Builder ============
def build_product_context(crm_products: List[Dict], kb_products: List[str], config: Dict) -> str:
    """
    Combine CRM and knowledge base product info into authoritative context.
    This ensures AI only mentions real products with correct pricing.
    """
    context_parts = []
    context_parts.append("## AUTHORITATIVE PRODUCT CATALOG")
    context_parts.append("These are the ONLY products you can mention. DO NOT invent products not listed here.\n")

    # CRM products (with pricing)
    if crm_products:
        context_parts.append("### Products from CRM (Authoritative Pricing):")
        for product in crm_products[:20]:  # Limit to 20 products
            name = product.get('name', product.get('NAME', 'Unknown'))
            price = product.get('price', product.get('PRICE', 'Contact for price'))
            currency = product.get('currency', product.get('CURRENCY_ID', 'UZS'))
            description = product.get('description', product.get('DESCRIPTION', ''))[:100]
            context_parts.append(f"- **{name}**: {price} {currency}")
            if description:
                context_parts.append(f"  {description}")

    # KB products (from documents)
    if kb_products:
        context_parts.append("\n### Products from Knowledge Base:")
        for product in kb_products[:10]:
            context_parts.append(f"- {product}")

    # Hard constraints
    context_parts.append("\n### PRICING RULES:")
    context_parts.append("- CRM prices are FINAL and AUTHORITATIVE")
    context_parts.append("- NEVER apologize for prices - they are fair and justified")
    context_parts.append("- If asked about a product not listed above, say 'I don't have information about that specific product, but I'd be happy to check with our team.'")

    # Discount rules
    discount_authority = config.get('discount_authority', 'none')
    promo_codes = config.get('promo_codes', [])

    if discount_authority == 'none':
        context_parts.append("- You CANNOT offer discounts. If asked, refer to manager.")
    elif discount_authority == 'manager_only':
        context_parts.append("- Only managers can authorize discounts. You may say 'Let me connect you with our manager for special pricing.'")

    if promo_codes:
        context_parts.append("\n### ACTIVE PROMO CODES (You CAN mention these):")
        for promo in promo_codes:
            valid_until = promo.get('valid_until', 'Limited time')
            context_parts.append(f"- Code: {promo.get('code')} - {promo.get('discount_percent')}% off (valid until {valid_until})")

    payment_plans = config.get('payment_plans_enabled', False)
    if payment_plans:
        context_parts.append("\n- Payment plans ARE available. You can offer installment options.")
    else:
        context_parts.append("\n- Payment plans are NOT available. Do not offer or mention installments.")

    return "\n".join(context_parts)


def get_hard_constraints_section(config: Dict) -> str:
    """Generate the hard constraints section for system prompt."""
    discount_authority = config.get('discount_authority', 'none')
    payment_plans = config.get('payment_plans_enabled', False)
    promo_codes = config.get('promo_codes', [])

    constraints = []
    constraints.append("## HARD CONSTRAINTS - NEVER VIOLATE\n")
    constraints.append("You MUST NEVER:")
    constraints.append("1. Invent products - Only mention products from CRM or knowledge base")
    constraints.append("2. Make up business services not in your context")
    constraints.append("3. Apologize for correct prices - CRM prices are FINAL and justified")
    constraints.append("4. Give wrong business identity - You represent ONLY this specific business")

    if discount_authority == 'none':
        constraints.append("5. Promise ANY discounts - You have NO discount authority")
        constraints.append("   → If customer asks for discount: 'I understand budget is important. Let me connect you with our manager who may be able to help.'")
    elif discount_authority == 'manager_only':
        constraints.append("5. Promise discounts without manager - Only mention promo codes if configured")

    if not payment_plans:
        constraints.append("6. Offer payment plans or installments - This is NOT configured")
        constraints.append("   → If asked: 'Currently we accept full payment. I can check with management for options.'")

    if promo_codes:
        constraints.append(f"\nACTIVE PROMO CODES you CAN mention: {', '.join(p['code'] for p in promo_codes)}")

    constraints.append("\nWhen you cannot fulfill a request, set needs_human_handoff: true")

    return "\n".join(constraints)


async def call_sales_agent(
    messages: List[Dict],
    config: Dict,
    lead_context: Dict = None,
    business_context: List[str] = None,
    tenant_id: str = None,
    user_query: str = None,
    crm_context: Dict = None,
    crm_query_context: str = None,
    detected_objection: Dict = None,
    closing_script: Dict = None,
    contact_urgency: str = None,
    product_context: str = None
) -> Dict:
    """Call LLM with enhanced sales pipeline, CRM awareness, and enforcement layers"""
    current_stage = lead_context.get('sales_stage', 'awareness') if lead_context else 'awareness'

    try:
        # Generate system prompt with all dynamic enforcement sections
        system_prompt = get_enhanced_system_prompt(
            config,
            lead_context,
            crm_context,
            detected_objection,
            closing_script,
            contact_urgency,
            product_context
        )

        if business_context:
            system_prompt += "\n\n## RELEVANT BUSINESS INFORMATION\n" + "\n".join(business_context)

        # Add CRM query context (product pricing, order history) if available
        if crm_query_context:
            system_prompt += "\n\n" + crm_query_context

        api_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            role = "assistant" if msg.get("role") == "assistant" else "user"
            api_messages.append({"role": role, "content": msg.get("text", "")})

        # CRITICAL: Add timeout to prevent indefinite hangs
        response = await asyncio.wait_for(
            openai_client.chat.completions.create(
                model="gpt-4o",
                messages=api_messages,
                temperature=0.7,
                max_tokens=1500,
                response_format={"type": "json_object"}
            ),
            timeout=45.0  # 45 second timeout for LLM calls
        )

        content = response.choices[0].message.content
        logger.info(f"LLM Response: {content[:500]}...")

        result = json.loads(content)
        # Validate and sanitize LLM output
        return validate_llm_output(result, current_stage)

    except asyncio.TimeoutError:
        logger.error("LLM call timed out after 45 seconds")
        return {
            "reply_text": "I apologize, I'm experiencing delays. Please try again in a moment.",
            "sales_stage": current_stage,
            "hotness": "warm",
            "score": 50,
            "fields_collected": {}
        }
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        return {
            "reply_text": "I apologize, please try again.",
            "sales_stage": current_stage,
            "hotness": "warm",
            "score": 50,
            "fields_collected": {}
        }
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        import traceback
        traceback.print_exc()
        return {
            "reply_text": "I apologize, a technical error occurred. Please try again.",
            "sales_stage": current_stage,
            "hotness": "warm",
            "score": 50,
            "fields_collected": {}
        }


# ============ Telegram Webhook Handler ============
@api_router.post("/telegram/webhook/{bot_id}")
async def telegram_webhook_with_bot_id(bot_id: str, request: Request, background_tasks: BackgroundTasks):
    """Handle incoming Telegram webhook updates with bot-specific URL (SECURE - multi-tenant safe)"""
    try:
        update = await request.json()
        logger.info(f"Received Telegram update for bot {bot_id}: {json.dumps(update, default=str)[:500]}")

        message = update.get("message")
        if not message or not isinstance(message, dict):
            logger.debug("No valid message in update, ignoring")
            return {"ok": True}

        text = message.get("text")
        if not text:
            logger.debug("No text in message, ignoring")
            return {"ok": True}

        # CRITICAL: Message length validation to prevent DoS and cost explosion
        MAX_MESSAGE_LENGTH = 4000
        if len(text) > MAX_MESSAGE_LENGTH:
            logger.warning(f"Message too long ({len(text)} chars), truncating to {MAX_MESSAGE_LENGTH}")
            text = text[:MAX_MESSAGE_LENGTH] + "..."
            message["text"] = text

        # CRITICAL: Rate limiting to prevent flooding
        user_id = str(message.get("from", {}).get("id", "unknown"))
        if not message_rate_limiter.is_allowed(user_id):
            wait_time = message_rate_limiter.get_wait_time(user_id)
            logger.warning(f"Rate limit exceeded for user {user_id}, wait {wait_time}s")
            return {"ok": True}

        # SECURITY: Get the SPECIFIC bot by ID - ensures tenant isolation
        result = supabase.table('telegram_bots').select('*').eq('id', bot_id).eq('is_active', True).execute()

        if not result.data:
            logger.warning(f"No active bot found with id {bot_id}")
            return {"ok": True}

        bot = result.data[0]
        logger.info(f"Processing message for tenant {bot['tenant_id']}")

        # Update last webhook timestamp
        try:
            supabase.table('telegram_bots').update({"last_webhook_at": now_iso()}).eq('id', bot['id']).execute()
        except Exception as e:
            logger.warning(f"Could not update webhook timestamp: {e}")

        # Process message in background with correct tenant
        background_tasks.add_task(process_telegram_message, bot["tenant_id"], bot["bot_token"], update)
        return {"ok": True}
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in webhook: {e}")
        return {"ok": True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        import traceback
        traceback.print_exc()
        return {"ok": True}


@api_router.post("/telegram/webhook")
async def telegram_webhook_legacy(request: Request, background_tasks: BackgroundTasks):
    """
    DEPRECATED: Legacy webhook endpoint without bot_id.
    For security, new bots should use /telegram/webhook/{bot_id}
    This endpoint only works for single-tenant scenarios as a fallback.
    """
    logger.warning("DEPRECATED: Using legacy /telegram/webhook endpoint without bot_id. Migrate to /telegram/webhook/{bot_id}")

    try:
        update = await request.json()

        message = update.get("message")
        if not message or not isinstance(message, dict):
            return {"ok": True}

        text = message.get("text")
        if not text:
            return {"ok": True}

        # Rate limiting
        user_id = str(message.get("from", {}).get("id", "unknown"))
        if not message_rate_limiter.is_allowed(user_id):
            return {"ok": True}

        # SECURITY WARNING: This queries all bots - only safe in single-tenant mode
        # Get the first active bot as fallback (DEPRECATED behavior)
        result = supabase.table('telegram_bots').select('*').eq('is_active', True).limit(1).execute()

        if not result.data:
            logger.warning("No active Telegram bots configured")
            return {"ok": True}

        bot = result.data[0]
        logger.warning(f"Legacy webhook: Processing for tenant {bot['tenant_id']} - PLEASE MIGRATE TO /telegram/webhook/{bot['id']}")

        try:
            supabase.table('telegram_bots').update({"last_webhook_at": now_iso()}).eq('id', bot['id']).execute()
        except Exception as e:
            logger.warning(f"Could not update webhook timestamp: {e}")

        background_tasks.add_task(process_telegram_message, bot["tenant_id"], bot["bot_token"], update)
        return {"ok": True}

    except Exception as e:
        logger.error(f"Legacy webhook error: {e}")
        return {"ok": True}


async def process_telegram_message(tenant_id: str, bot_token: str, update: Dict):
    """Process incoming Telegram message with enhanced sales pipeline"""
    chat_id = None
    try:
        message = update.get("message", {})
        text = message.get("text", "")
        chat_id = message.get("chat", {}).get("id")
        from_user = message.get("from", {})
        user_id = str(from_user.get("id"))
        username = from_user.get("username")
        first_name = from_user.get("first_name")
        language_code = from_user.get("language_code")
        
        logger.info(f"Processing message from {username or user_id}: '{text[:100]}...' for tenant {tenant_id}")
        
        if not chat_id:
            logger.error("No chat_id in message")
            return
        
        # Send typing indicator
        await send_typing_action(bot_token, chat_id)
        
        # Get tenant config
        config_result = supabase.table('tenant_configs').select('*').eq('tenant_id', tenant_id).execute()
        config = config_result.data[0] if config_result.data else {}
        
        # Handle /start command
        if text.strip() == "/start":
            business_name = config.get("business_name", "")
            greeting = config.get("greeting_message")
            if not greeting:
                if business_name:
                    greeting = f"Hello! 👋 Welcome to {business_name}. How can I help you today?\n\nAssalomu alaykum! Sizga qanday yordam bera olaman?\n\nЗдравствуйте! Чем могу помочь?"
                else:
                    greeting = "Hello! Welcome. How can I help you today?\n\nAssalomu alaykum! Sizga qanday yordam bera olaman?\n\nЗдравствуйте! Чем могу помочь?"
            await send_telegram_message(bot_token, chat_id, greeting)
            logger.info(f"Sent greeting to {username or user_id}")
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
            logger.info(f"Created new customer: {customer['id']}")
        else:
            customer = customer_result.data[0]
            supabase.table('customers').update({"last_seen_at": now}).eq('id', customer['id']).execute()
        
        # Get or create conversation
        conv_result = supabase.table('conversations').select('*').eq('tenant_id', tenant_id).eq('customer_id', customer['id']).eq('status', 'active').execute()
        
        if not conv_result.data:
            conversation = {"id": str(uuid.uuid4()), "tenant_id": tenant_id, "customer_id": customer['id'], "status": "active", "started_at": now, "last_message_at": now}
            supabase.table('conversations').insert(conversation).execute()
            logger.info(f"Created new conversation: {conversation['id']}")
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

        # Get customer phone for CRM matching
        # Try from: customer record, existing lead, or collected fields
        customer_phone = (
            customer.get("phone") or
            (existing_lead.get("customer_phone") if existing_lead else None) or
            (existing_lead.get("fields_collected", {}).get("phone") if existing_lead else None)
        )

        # CRM Integration: Match customer to Bitrix at conversation start
        crm_context = None
        if customer_phone:
            crm_context = await match_customer_to_bitrix(tenant_id, {"phone": customer_phone})
            if crm_context:
                logger.info(f"CRM matched returning customer: VIP={crm_context.get('vip_status')}, purchases={crm_context.get('total_purchases')}")

        # CRM Integration: Get on-demand CRM data based on query keywords
        crm_query_context = await get_crm_context_for_query(tenant_id, text, customer_phone)
        if crm_query_context:
            logger.info(f"CRM query context fetched: {len(crm_query_context)} chars")

        # Get business context (Semantic RAG)
        logger.info(f"Fetching RAG context for: '{text[:50]}...'")
        business_context = await get_business_context_semantic(tenant_id, text)
        logger.info(f"RAG returned {len(business_context)} context chunks")

        # ============ NEW: Phase 2 - Objection Detection ============
        objection_playbook = config.get('objection_playbook') or DEFAULT_OBJECTION_PLAYBOOK
        detected_objection = detect_objection(text, objection_playbook)
        if detected_objection:
            logger.info(f"Objection detected: {detected_objection.get('type')} - keyword: {detected_objection.get('detected_keyword')}")

        # ============ NEW: Phase 3 - Closing Script Trigger ============
        current_score = existing_lead.get('score', 50) if existing_lead else 50
        current_stage = lead_context.get('sales_stage', 'awareness')
        fields_collected = lead_context.get('fields_collected', {})
        closing_scripts = config.get('closing_scripts') or DEFAULT_CLOSING_SCRIPTS
        closing_script = get_closing_script_for_context(current_score, current_stage, fields_collected, closing_scripts)
        if closing_script:
            logger.info(f"Closing script triggered: {closing_script.get('script_key')} - {closing_script.get('reason')}")

        # ============ NEW: Phase 4 - Contact Collection Urgency ============
        contact_urgency = get_contact_collection_urgency(current_score, fields_collected, current_stage)
        if contact_urgency:
            logger.info(f"Contact collection urgency: score={current_score}, has_phone={bool(fields_collected.get('phone'))}")

        # ============ NEW: Phase 7 - Product Context Builder ============
        # Get CRM products if available
        crm_products = []
        if crm_query_context:
            # Extract product names from CRM context (simplified)
            crm_products = [p.get('name', p.get('NAME', '')) for p in (crm_context or {}).get('recent_products', []) if p]

        # Get KB products from business context
        kb_products = []
        for ctx in business_context:
            if 'product' in ctx.lower() or 'mahsulot' in ctx.lower():
                kb_products.append(ctx[:100])  # First 100 chars as product context

        product_context = build_product_context(crm_products, kb_products, config) if (crm_products or kb_products) else None

        # Call enhanced LLM with all enforcement layers
        llm_result = await call_sales_agent(
            messages_for_llm, config, lead_context, business_context,
            tenant_id, text, crm_context, crm_query_context,
            detected_objection, closing_script, contact_urgency, product_context
        )

        # ============ NEW: Phase 6 - Response Validation ============
        reply_text = llm_result.get("reply_text", "I'm here to help!")
        is_valid, violations = validate_response_promises(reply_text, config, crm_products, kb_products)
        if not is_valid:
            logger.warning(f"Response validation violations: {violations}")
            reply_text = correct_response_if_needed(reply_text, violations, config)
            llm_result["reply_text"] = reply_text

        # ============ NEW: Phase 5 - Human Handoff Handling ============
        if llm_result.get("needs_human_handoff"):
            customer_name = fields_collected.get('name') or customer.get('name') or first_name
            handoff_phone = fields_collected.get('phone') or customer_phone
            handoff_reason = llm_result.get("handoff_reason", "Customer requested human assistance")
            await log_handoff_request(
                tenant_id,
                conversation['id'],
                handoff_phone,
                customer_name,
                handoff_reason
            )
            logger.info(f"Human handoff requested: {handoff_reason}")

        # Update or create lead with enhanced data
        await update_lead_from_llm(tenant_id, customer, existing_lead, llm_result)
        supabase.table('messages').insert({"id": str(uuid.uuid4()), "conversation_id": conversation['id'], "sender_type": "agent", "text": reply_text, "created_at": now_iso()}).execute()
        
        # Update conversation
        supabase.table('conversations').update({"last_message_at": now_iso()}).eq('id', conversation['id']).execute()
        
        # Send response to Telegram
        success = await send_telegram_message(bot_token, chat_id, reply_text)
        if success:
            logger.info(f"Sent response to {username or user_id}: '{reply_text[:50]}...'")
        else:
            logger.error(f"Failed to send Telegram message to chat {chat_id}")
        
        # Log event with enhanced enforcement metrics (ignore errors)
        try:
            supabase.table('event_logs').insert({
                "id": str(uuid.uuid4()), "tenant_id": tenant_id, "event_type": "message_processed",
                "event_data": {
                    "customer_id": customer['id'], "conversation_id": conversation['id'],
                    "sales_stage": llm_result.get("sales_stage"), "hotness": llm_result.get("hotness"),
                    "score": llm_result.get("score"),
                    "objection_detected": llm_result.get("objection_detected"),
                    "closing_used": llm_result.get("closing_technique_used"),
                    "rag_context_used": len(business_context) > 0,
                    "crm_returning_customer": crm_context.get("is_returning_customer") if crm_context else False,
                    "crm_vip_customer": crm_context.get("vip_status") if crm_context else False,
                    "crm_query_context_used": bool(crm_query_context),
                    # New enforcement layer metrics
                    "objection_playbook_triggered": bool(detected_objection),
                    "objection_type": detected_objection.get("type") if detected_objection else None,
                    "closing_script_triggered": bool(closing_script),
                    "closing_script_type": closing_script.get("script_key") if closing_script else None,
                    "contact_urgency_active": bool(contact_urgency),
                    "response_validation_violations": violations if not is_valid else [],
                    "human_handoff_requested": llm_result.get("needs_human_handoff", False),
                    "handoff_reason": llm_result.get("handoff_reason")
                },
                "created_at": now_iso()
            }).execute()
        except Exception as e:
            logger.warning(f"Could not log event: {e}")

        # Note: Bitrix sync is handled inside update_lead_from_llm() with correct lead_data

    except Exception as e:
        logger.error(f"Error processing Telegram message: {e}")
        import traceback
        traceback.print_exc()
        
        # Send error message to user
        if chat_id and bot_token:
            try:
                error_msg = "I apologize, I'm having trouble processing your message. Please try again in a moment."
                await send_telegram_message(bot_token, chat_id, error_msg)
            except Exception as send_error:
                logger.error(f"Could not send error message: {send_error}")


async def update_lead_from_llm(tenant_id: str, customer: Dict, existing_lead: Optional[Dict], llm_result: Dict):
    """Update lead with LLM analysis results"""
    now = now_iso()

    try:
        # Merge fields collected
        existing_fields = existing_lead.get("fields_collected", {}) if existing_lead else {}
        if not isinstance(existing_fields, dict):
            existing_fields = {}
        new_fields = llm_result.get("fields_collected", {})
        if not isinstance(new_fields, dict):
            new_fields = {}

        # Only update non-null values
        # HIGH: Fix merge logic - distinguish between None (not provided) and empty string/zero (explicit value)
        merged_fields = {**existing_fields}
        for k, v in new_fields.items():
            if v is not None:  # Allow empty strings and zeros, but not None
                merged_fields[k] = v

        # Validate sales_stage with transition rules
        current_stage = existing_lead.get("sales_stage", "awareness") if existing_lead else "awareness"
        new_stage = llm_result.get("sales_stage", "awareness")

        if new_stage not in VALID_SALES_STAGES:
            new_stage = current_stage
        else:
            # HIGH: Stage transition validation - prevent invalid jumps
            new_stage = validate_stage_transition(current_stage, new_stage)

        # Validate hotness before saving
        hotness = llm_result.get("hotness", "warm")
        if hotness not in VALID_HOTNESS_VALUES:
            hotness = "warm"

        # Validate score before saving
        score = llm_result.get("score", 50)
        try:
            score = max(0, min(100, int(score)))
        except (TypeError, ValueError):
            score = 50

        # HIGH: Apply business rules to override LLM hotness when appropriate
        final_hotness = apply_hotness_rules(hotness, score, new_stage, merged_fields)

        # HIGH: Build additional_notes to preserve sales intelligence
        sales_intelligence = {}
        if llm_result.get("stage_change_reason"):
            sales_intelligence["stage_change_reason"] = llm_result["stage_change_reason"]
        if llm_result.get("objection_detected"):
            sales_intelligence["objection_detected"] = llm_result["objection_detected"]
        if llm_result.get("closing_technique_used"):
            sales_intelligence["closing_technique_used"] = llm_result["closing_technique_used"]

        additional_notes = json.dumps(sales_intelligence) if sales_intelligence else None

        lead_data = {
            "tenant_id": tenant_id,
            "customer_id": customer['id'],
            "status": existing_lead.get("status") or "new" if existing_lead else "new",
            "sales_stage": new_stage,
            "llm_hotness_suggestion": hotness,
            "final_hotness": final_hotness,
            "score": score,
            "intent": llm_result.get("intent"),
            "llm_explanation": llm_result.get("next_action"),
            "product": merged_fields.get("product"),
            "budget": merged_fields.get("budget"),
            "timeline": merged_fields.get("timeline"),
            "customer_name": merged_fields.get("name"),
            "customer_phone": merged_fields.get("phone"),
            "fields_collected": merged_fields,
            "additional_notes": additional_notes,
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
            try:
                supabase.table('customers').update(customer_updates).eq('id', customer['id']).execute()
            except Exception as e:
                logger.warning(f"Failed to update customer: {e}")

        # Update or create lead with race condition handling
        # Uses upsert to handle unique constraint (tenant_id, customer_id)
        lead_id = None
        if existing_lead:
            supabase.table('leads').update(lead_data).eq('id', existing_lead['id']).execute()
            lead_id = existing_lead['id']
            logger.info(f"Updated lead {existing_lead['id']} - stage: {new_stage}, hotness: {final_hotness}, score: {score}")
        else:
            lead_data["id"] = str(uuid.uuid4())
            lead_data["created_at"] = now
            try:
                supabase.table('leads').insert(lead_data).execute()
                lead_id = lead_data["id"]
                logger.info(f"Created new lead {lead_data['id']} - stage: {new_stage}, hotness: {final_hotness}, score: {score}")
            except Exception as insert_error:
                # Handle race condition: if unique constraint fails, fetch and update the existing lead
                if "duplicate key" in str(insert_error).lower() or "unique constraint" in str(insert_error).lower():
                    logger.info(f"Race condition detected, fetching existing lead for customer {customer['id']}")
                    existing = supabase.table('leads').select('id').eq('tenant_id', tenant_id).eq('customer_id', customer['id']).execute()
                    if existing.data:
                        lead_id = existing.data[0]['id']
                        supabase.table('leads').update(lead_data).eq('id', lead_id).execute()
                        logger.info(f"Updated existing lead {lead_id} after race condition")
                    else:
                        raise insert_error
                else:
                    raise insert_error

        # Sync to Bitrix24 if connected (async, non-blocking)
        try:
            await sync_lead_to_bitrix(tenant_id, customer, lead_data, existing_lead)
        except Exception as bitrix_error:
            logger.warning(f"Bitrix sync error (non-blocking): {bitrix_error}")

    except Exception as e:
        logger.error(f"Failed to update/create lead: {e}")
        import traceback
        traceback.print_exc()
        # Don't re-raise - we don't want to break message flow for DB errors


async def sync_lead_to_bitrix(tenant_id: str, customer: Dict, lead_data: Dict, existing_lead: Optional[Dict] = None):
    """Sync lead to Bitrix24 CRM if connected"""
    try:
        client = await get_bitrix_client(tenant_id)
        if not client:
            # Bitrix not connected, skip silently
            return

        # Prepare lead data for Bitrix24
        fields_collected = lead_data.get("fields_collected", {}) or {}
        bitrix_lead_data = {
            "title": f"Telegram Lead: {fields_collected.get('name') or customer.get('name') or customer.get('telegram_username') or 'Unknown'}",
            "name": fields_collected.get("name") or customer.get("name"),
            "phone": fields_collected.get("phone") or customer.get("phone"),
            "product": fields_collected.get("product") or lead_data.get("product"),
            "budget": fields_collected.get("budget") or lead_data.get("budget"),
            "timeline": fields_collected.get("timeline") or lead_data.get("timeline"),
            "intent": lead_data.get("intent"),
            "hotness": lead_data.get("final_hotness") or lead_data.get("llm_hotness_suggestion") or "warm",
            "score": lead_data.get("score", 50),
            "notes": f"Sales Stage: {lead_data.get('sales_stage', 'awareness')}\nIntent: {lead_data.get('intent', 'N/A')}\nSource: Telegram"
        }

        # Check if we have a Bitrix lead ID to update
        crm_lead_id = existing_lead.get("crm_lead_id") if existing_lead else None

        if crm_lead_id:
            # Update existing lead in Bitrix
            await client.update_lead(crm_lead_id, bitrix_lead_data)
            logger.info(f"Updated Bitrix24 lead {crm_lead_id} for tenant {tenant_id}")
        else:
            # Create new lead in Bitrix
            # Only create if lead has meaningful data (phone or high-stage)
            sales_stage = lead_data.get("sales_stage", "awareness")
            has_phone = bool(bitrix_lead_data.get("phone"))
            is_high_intent = sales_stage in ["intent", "evaluation", "purchase"]
            score = lead_data.get("score", 0)
            is_hot = lead_data.get("final_hotness") == "hot" or score >= 70

            if has_phone or is_high_intent or is_hot:
                new_lead_id = await client.create_lead(bitrix_lead_data)
                logger.info(f"Created Bitrix24 lead {new_lead_id} for tenant {tenant_id}")

                # Store the Bitrix lead ID in our database for future updates
                if existing_lead:
                    try:
                        supabase.table('leads').update({
                            "crm_lead_id": new_lead_id
                        }).eq('id', existing_lead['id']).execute()
                    except Exception as e:
                        logger.warning(f"Failed to save Bitrix lead ID: {e}")
            else:
                logger.debug(f"Skipping Bitrix sync - lead not qualified enough (stage: {sales_stage}, score: {score})")

    except Exception as e:
        logger.warning(f"Bitrix24 sync failed (non-blocking): {e}")
        # Don't re-raise - Bitrix sync failure shouldn't break message flow


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


@api_router.get("/dashboard/analytics")
async def get_agent_analytics(days: int = 7, current_user: Dict = Depends(get_current_user)):
    """
    Comprehensive analytics for the agent performance dashboard.
    Returns conversation stats, lead insights, top products, and score distribution.
    """
    tenant_id = current_user["tenant_id"]
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    prev_start_date = (datetime.now(timezone.utc) - timedelta(days=days*2)).isoformat()
    
    # Current period data
    # Note: conversations table uses 'started_at' instead of 'created_at'
    try:
        conversations = supabase.table('conversations').select('*').eq('tenant_id', tenant_id).gte('started_at', start_date).execute()
    except Exception as e:
        logger.warning(f"Conversations query error: {e}")
        conversations = type('obj', (object,), {'data': []})()
    
    try:
        leads = supabase.table('leads').select('*').eq('tenant_id', tenant_id).gte('created_at', start_date).execute()
    except Exception as e:
        logger.warning(f"Leads query error: {e}")
        leads = type('obj', (object,), {'data': []})()
    
    # Previous period for comparison
    try:
        prev_conversations = supabase.table('conversations').select('id', count='exact').eq('tenant_id', tenant_id).gte('started_at', prev_start_date).lt('started_at', start_date).execute()
        prev_convos = prev_conversations.count or 0
    except Exception as e:
        logger.warning(f"Prev conversations query error: {e}")
        prev_convos = 0
    
    try:
        prev_leads = supabase.table('leads').select('id', count='exact').eq('tenant_id', tenant_id).gte('created_at', prev_start_date).lt('created_at', start_date).execute()
        prev_leads_count = prev_leads.count or 0
    except Exception as e:
        logger.warning(f"Prev leads query error: {e}")
        prev_leads_count = 0
    
    current_convos = len(conversations.data or [])
    current_leads = leads.data or []
    
    # Calculate metrics
    total_leads = len(current_leads)
    hot_leads = sum(1 for l in current_leads if l.get('final_hotness') == 'hot')
    warm_leads = sum(1 for l in current_leads if l.get('final_hotness') == 'warm')
    cold_leads = sum(1 for l in current_leads if l.get('final_hotness') == 'cold')
    
    # Conversion rate (qualified or won / total)
    qualified_leads = sum(1 for l in current_leads if l.get('status') in ['qualified', 'won'])
    conversion_rate = (qualified_leads / total_leads * 100) if total_leads > 0 else 0
    
    # Average response time - only show real data, 0 if no conversations yet
    avg_response_time = 0  # Will be calculated when we have real message data
    
    # Calculate changes
    convos_change = ((current_convos - prev_convos) / prev_convos * 100) if prev_convos > 0 else 0
    leads_change = ((total_leads - prev_leads_count) / prev_leads_count * 100) if prev_leads_count > 0 else 0
    
    # Top products mentioned (from lead intent/product fields)
    products_count = {}
    for lead in current_leads:
        product = lead.get('product') or lead.get('intent') or 'General Inquiry'
        # Clean up product name
        product_clean = product[:50] if product else 'General Inquiry'
        products_count[product_clean] = products_count.get(product_clean, 0) + 1
    
    top_products = sorted(products_count.items(), key=lambda x: x[1], reverse=True)[:5]
    top_products_list = [{"name": p[0], "count": p[1], "percentage": round(p[1] / total_leads * 100, 1) if total_leads > 0 else 0} for p in top_products]
    
    # Score distribution
    score_ranges = {"0-25": 0, "26-50": 0, "51-75": 0, "76-100": 0}
    for lead in current_leads:
        score = lead.get('score', 50)
        if score <= 25:
            score_ranges["0-25"] += 1
        elif score <= 50:
            score_ranges["26-50"] += 1
        elif score <= 75:
            score_ranges["51-75"] += 1
        else:
            score_ranges["76-100"] += 1
    
    # Leads by stage
    leads_by_stage = {}
    for stage in SALES_STAGES.keys():
        leads_by_stage[stage] = sum(1 for l in current_leads if l.get('sales_stage') == stage)
    
    # Hotness distribution for chart
    hotness_distribution = [
        {"name": "Hot", "value": hot_leads, "color": "#f97316"},
        {"name": "Warm", "value": warm_leads, "color": "#eab308"},
        {"name": "Cold", "value": cold_leads, "color": "#3b82f6"}
    ]
    
    # Daily trend
    daily_trend = {}
    for lead in current_leads:
        date_str = lead.get("created_at", "")[:10]
        if date_str:
            daily_trend[date_str] = daily_trend.get(date_str, 0) + 1
    
    daily_data = []
    for i in range(days):
        date = (datetime.now(timezone.utc) - timedelta(days=days-1-i)).strftime("%Y-%m-%d")
        daily_data.append({"date": date, "leads": daily_trend.get(date, 0)})
    
    return {
        "summary": {
            "conversations": {"value": current_convos, "change": round(convos_change, 1)},
            "leads": {"value": total_leads, "change": round(leads_change, 1)},
            "conversion_rate": {"value": round(conversion_rate, 1), "change": 0},
            "avg_response_time": {"value": avg_response_time, "change": 0}
        },
        "hotness_distribution": hotness_distribution,
        "score_distribution": score_ranges,
        "leads_by_stage": leads_by_stage,
        "top_products": top_products_list,
        "daily_trend": daily_data,
        "period_days": days
    }


# ============ Leads Endpoints ============
@api_router.get("/leads")
async def get_leads(status: Optional[str] = None, hotness: Optional[str] = None, stage: Optional[str] = None, limit: int = 50, current_user: Dict = Depends(get_current_user)):
    """Get leads with customer data - optimized to avoid N+1 queries"""
    query = supabase.table('leads').select('*').eq('tenant_id', current_user["tenant_id"])
    if status:
        query = query.eq('status', status)
    if hotness:
        query = query.eq('final_hotness', hotness)
    if stage:
        query = query.eq('sales_stage', stage)

    try:
        result = query.order('created_at', desc=True).limit(limit).execute()
    except Exception as e:
        logger.warning(f"Leads query error: {e}")
        result = supabase.table('leads').select('*').eq('tenant_id', current_user["tenant_id"]).order('created_at', desc=True).limit(limit).execute()

    leads = result.data or []
    if not leads:
        return []

    # Fetch all customers in ONE query instead of N queries (fixes N+1 problem)
    # SECURITY: Include tenant_id filter for defense-in-depth
    tenant_id = current_user["tenant_id"]
    customer_ids = list(set(lead['customer_id'] for lead in leads if lead.get('customer_id')))
    customers_map = {}
    if customer_ids:
        try:
            cust_result = supabase.table('customers').select('id, name, phone').in_('id', customer_ids).eq('tenant_id', tenant_id).execute()
            customers_map = {c['id']: c for c in (cust_result.data or [])}
        except Exception as e:
            logger.warning(f"Failed to fetch customers: {e}")

    response = []
    for lead in leads:
        customer = customers_map.get(lead.get('customer_id'))
        # Prefer lead's collected data, fallback to customer record
        customer_name = lead.get("customer_name") or (customer.get("name") if customer else None)
        customer_phone = lead.get("customer_phone") or (customer.get("phone") if customer else None)

        response.append({
            "id": lead["id"],
            "customer_id": lead.get("customer_id"),
            "customer_name": customer_name,
            "customer_phone": customer_phone,
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


VALID_LEAD_STATUSES = {"new", "qualified", "won", "lost"}

@api_router.put("/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, status: str, current_user: Dict = Depends(get_current_user)):
    if status not in VALID_LEAD_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(VALID_LEAD_STATUSES)}")
    result = supabase.table('leads').select('*').eq('id', lead_id).eq('tenant_id', current_user["tenant_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    try:
        # SECURITY: Include tenant_id filter for defense-in-depth against IDOR
        supabase.table('leads').update({
            "status": status,
            "last_interaction_at": now_iso()
        }).eq('id', lead_id).eq('tenant_id', current_user["tenant_id"]).execute()
        logger.info(f"Updated lead {lead_id} status to {status}")
    except Exception as e:
        logger.error(f"Failed to update lead status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update lead status")
    return {"success": True}


@api_router.put("/leads/{lead_id}/stage")
async def update_lead_stage(lead_id: str, stage: str, current_user: Dict = Depends(get_current_user)):
    if stage not in SALES_STAGES:
        raise HTTPException(status_code=400, detail="Invalid sales stage")
    result = supabase.table('leads').select('*').eq('id', lead_id).eq('tenant_id', current_user["tenant_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    try:
        # SECURITY: Include tenant_id filter for defense-in-depth against IDOR
        supabase.table('leads').update({
            "sales_stage": stage,
            "last_interaction_at": now_iso()
        }).eq('id', lead_id).eq('tenant_id', current_user["tenant_id"]).execute()
        logger.info(f"Updated lead {lead_id} stage to {stage}")
    except Exception as e:
        logger.error(f"Failed to update lead stage: {e}")
        raise HTTPException(status_code=500, detail="Failed to update lead stage")
    return {"success": True}


@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user: Dict = Depends(get_current_user)):
    """Delete a lead"""
    # Verify lead exists and belongs to this tenant
    result = supabase.table('leads').select('*').eq('id', lead_id).eq('tenant_id', current_user["tenant_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    try:
        # SECURITY: Include tenant_id filter for defense-in-depth against IDOR
        supabase.table('leads').delete().eq('id', lead_id).eq('tenant_id', current_user["tenant_id"]).execute()
        logger.info(f"Deleted lead {lead_id} for tenant {current_user['tenant_id']}")
    except Exception as e:
        logger.error(f"Failed to delete lead: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete lead")
    return {"success": True}


# ============ Conversations Endpoints ============
from math import ceil

@api_router.get("/conversations")
async def list_conversations(
    current_user: Dict = Depends(get_current_user),
    page: int = 1,
    limit: int = 20,
    filter: str = "all",  # all, ongoing, hot, warm, cold
    search: Optional[str] = None
):
    """
    List all conversations for the tenant with pagination and filters.
    - filter: all, ongoing (active in last 15 mins), hot, warm, cold (by lead hotness)
    - search: search by customer name or phone
    """
    tenant_id = current_user["tenant_id"]

    # Clamp limit
    limit = min(max(1, limit), 100)
    offset = (page - 1) * limit

    try:
        # Base query - get conversations with customer and lead data
        # We need to manually join since Supabase doesn't support complex joins well

        # First get all conversations for tenant
        query = supabase.table('conversations').select('*').eq('tenant_id', tenant_id)

        # Filter by ongoing (last_message_at within 15 minutes)
        if filter == "ongoing":
            fifteen_min_ago = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
            query = query.gte('last_message_at', fifteen_min_ago)

        # Order by most recent activity
        query = query.order('last_message_at', desc=True)

        # Get all matching conversations first (for total count and filtering)
        all_convos_result = query.execute()
        all_convos = all_convos_result.data or []

        # Enrich with customer and lead data
        customer_ids = list(set(c['customer_id'] for c in all_convos if c.get('customer_id')))

        customers_map = {}
        leads_map = {}

        if customer_ids:
            # Fetch customers
            customers_result = supabase.table('customers').select('*').in_('id', customer_ids).execute()
            for cust in (customers_result.data or []):
                customers_map[cust['id']] = cust

            # Fetch leads (most recent per customer)
            leads_result = supabase.table('leads').select('*').eq('tenant_id', tenant_id).in_('customer_id', customer_ids).execute()
            for lead in (leads_result.data or []):
                # Keep most recent lead per customer
                cust_id = lead.get('customer_id')
                if cust_id:
                    if cust_id not in leads_map or lead.get('created_at', '') > leads_map[cust_id].get('created_at', ''):
                        leads_map[cust_id] = lead

        # Enrich and filter conversations
        enriched_convos = []
        for conv in all_convos:
            cust_id = conv.get('customer_id')
            customer = customers_map.get(cust_id, {})
            lead = leads_map.get(cust_id)

            # Apply search filter
            if search:
                search_lower = search.lower()
                name_match = (customer.get('name') or '').lower().find(search_lower) >= 0
                phone_match = (customer.get('phone') or '').find(search) >= 0
                if not name_match and not phone_match:
                    continue

            # Apply hotness filter
            hotness = lead.get('final_hotness') if lead else 'cold'
            if filter in ['hot', 'warm', 'cold'] and hotness != filter:
                continue

            enriched_convos.append({
                **conv,
                'customers': customer,
                'leads': [lead] if lead else []
            })

        # Calculate total and paginate
        total = len(enriched_convos)
        total_pages = ceil(total / limit) if total > 0 else 1

        # Apply pagination
        paginated = enriched_convos[offset:offset + limit]

        return {
            "conversations": paginated,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        }

    except Exception as e:
        logger.error(f"Failed to fetch conversations: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch conversations")


@api_router.get("/conversations/by-customer/{customer_id}")
async def get_conversation_by_customer(
    customer_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get the most recent conversation for a customer.
    Used for deep-linking from Leads page to Dialogue.
    """
    tenant_id = current_user["tenant_id"]

    try:
        # SECURITY: Verify customer belongs to tenant
        customer_check = supabase.table('customers').select('id').eq('id', customer_id).eq('tenant_id', tenant_id).execute()
        if not customer_check.data:
            raise HTTPException(status_code=404, detail="Customer not found")

        # Get most recent conversation for this customer
        result = supabase.table('conversations').select('*').eq('tenant_id', tenant_id).eq('customer_id', customer_id).order('last_message_at', desc=True).limit(1).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="No conversation found for this customer")

        conversation = result.data[0]

        # Enrich with customer data
        customer_result = supabase.table('customers').select('*').eq('id', customer_id).execute()
        customer = customer_result.data[0] if customer_result.data else {}

        # Get lead data
        lead_result = supabase.table('leads').select('*').eq('tenant_id', tenant_id).eq('customer_id', customer_id).order('created_at', desc=True).limit(1).execute()
        lead = lead_result.data[0] if lead_result.data else None

        return {
            **conversation,
            'customers': customer,
            'leads': [lead] if lead else []
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch conversation by customer: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch conversation")


@api_router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    current_user: Dict = Depends(get_current_user),
    after: Optional[str] = None  # For real-time: fetch only messages after this timestamp
):
    """
    Get messages for a conversation.
    - after: ISO timestamp to fetch only newer messages (for polling)
    """
    tenant_id = current_user["tenant_id"]

    try:
        # SECURITY: Verify conversation belongs to tenant
        conv_check = supabase.table('conversations').select('id').eq('id', conversation_id).eq('tenant_id', tenant_id).execute()
        if not conv_check.data:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Fetch messages
        query = supabase.table('messages').select('*').eq('conversation_id', conversation_id)

        if after:
            query = query.gt('created_at', after)

        query = query.order('created_at')
        result = query.execute()

        return {"messages": result.data or []}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch messages")


# ============ Config Endpoints ============
@api_router.get("/config")
async def get_tenant_config(current_user: Dict = Depends(get_current_user)):
    result = supabase.table('tenant_configs').select('*').eq('tenant_id', current_user["tenant_id"]).execute()
    if not result.data:
        return {
            "objection_playbook": DEFAULT_OBJECTION_PLAYBOOK,
            "closing_scripts": DEFAULT_CLOSING_SCRIPTS,
            "required_fields": DEFAULT_REQUIRED_FIELDS,
            "promo_codes": [],
            "payment_plans_enabled": False,
            "discount_authority": "none"
        }
    
    config = result.data[0]
    return {
        "vertical": config.get("vertical"),
        "business_name": config.get("business_name"),
        "business_description": config.get("business_description"),
        "products_services": config.get("products_services"),
        "faq_objections": config.get("faq_objections"),
        "greeting_message": config.get("greeting_message"),
        "closing_message": config.get("closing_message"),
        "agent_tone": config.get("agent_tone"),
        "response_length": config.get("response_length"),
        "emoji_usage": config.get("emoji_usage"),
        "primary_language": config.get("primary_language"),
        "secondary_languages": config.get("secondary_languages"),
        "min_response_delay": config.get("min_response_delay"),
        "max_messages_per_minute": config.get("max_messages_per_minute"),
        # Data collection fields - Essential
        "collect_name": config.get("collect_name", True),
        "collect_phone": config.get("collect_phone", True),
        "collect_email": config.get("collect_email", False),
        # Data collection fields - Purchase Intent
        "collect_product": config.get("collect_product", True),
        "collect_budget": config.get("collect_budget", False),
        "collect_timeline": config.get("collect_timeline", False),
        "collect_quantity": config.get("collect_quantity", False),
        # Data collection fields - Qualification
        "collect_company": config.get("collect_company", False),
        "collect_job_title": config.get("collect_job_title", False),
        "collect_team_size": config.get("collect_team_size", False),
        # Data collection fields - Logistics
        "collect_location": config.get("collect_location", False),
        "collect_preferred_time": config.get("collect_preferred_time", False),
        "collect_urgency": config.get("collect_urgency", False),
        "collect_reference": config.get("collect_reference", False),
        "collect_notes": config.get("collect_notes", False),
        # Legacy fields
        "objection_playbook": config.get("objection_playbook") or DEFAULT_OBJECTION_PLAYBOOK,
        "closing_scripts": config.get("closing_scripts") or DEFAULT_CLOSING_SCRIPTS,
        "required_fields": config.get("required_fields") or DEFAULT_REQUIRED_FIELDS,
        "active_promotions": config.get("active_promotions") or [],
        # Hard constraints (anti-hallucination)
        "promo_codes": config.get("promo_codes") or [],
        "payment_plans_enabled": config.get("payment_plans_enabled", False),
        "discount_authority": config.get("discount_authority", "none")
    }


@api_router.put("/config")
async def update_tenant_config(request: TenantConfigUpdate, current_user: Dict = Depends(get_current_user)):
    # Valid database columns for tenant_configs table
    VALID_DB_COLUMNS = {
        'business_name', 'business_description', 'products_services', 'vertical',
        'greeting_message', 'closing_message', 'agent_tone', 'response_length',
        'emoji_usage', 'primary_language', 'secondary_languages',
        'min_response_delay', 'max_messages_per_minute', 'faq_objections',
        'lead_fields_json', 'qualification_rules_json',
        'bitrix_webhook_url', 'bitrix_connected_at',
        # Data collection fields
        'collect_name', 'collect_phone', 'collect_email', 'collect_product',
        'collect_budget', 'collect_timeline', 'collect_quantity',
        'collect_company', 'collect_job_title', 'collect_team_size',
        'collect_location', 'collect_preferred_time', 'collect_urgency',
        'collect_reference', 'collect_notes',
        # Hard constraints (anti-hallucination)
        'promo_codes', 'payment_plans_enabled', 'discount_authority'
    }

    # Filter to only include valid database columns and non-None values
    update_data = {k: v for k, v in request.model_dump().items() if v is not None and k in VALID_DB_COLUMNS}

    # Sanitize user input to prevent XSS attacks
    update_data = sanitize_dict(update_data, SANITIZE_FIELDS)

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


# ============ Documents Endpoints (Enhanced with RAG) ============

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

# In-memory cache for document embeddings (per tenant)
# This cache is populated from DB on first access
document_embeddings_cache = {}
_cache_loaded_tenants = set()  # Track which tenants have been loaded


async def load_embeddings_from_db(tenant_id: str):
    """Load document embeddings from database into memory cache for a tenant"""
    global _cache_loaded_tenants
    
    if tenant_id in _cache_loaded_tenants:
        return  # Already loaded
    
    try:
        # Get all documents for this tenant that have chunks stored
        result = supabase.table('documents').select('*').eq('tenant_id', tenant_id).execute()
        
        if not result.data:
            _cache_loaded_tenants.add(tenant_id)
            return
        
        for doc in result.data:
            doc_id = doc['id']
            
            # Skip if already in cache
            if doc_id in document_embeddings_cache:
                continue
            
            # Check if document has chunks stored in chunks_data column
            chunks_data = doc.get('chunks_data')
            if chunks_data:
                try:
                    # Parse JSON chunks data
                    if isinstance(chunks_data, str):
                        chunks = json.loads(chunks_data)
                    else:
                        chunks = chunks_data
                    
                    document_embeddings_cache[doc_id] = {
                        "chunks": chunks,
                        "chunk_count": len(chunks),
                        "tenant_id": tenant_id
                    }
                    logger.info(f"Loaded {len(chunks)} chunks for document {doc_id} from DB")
                except Exception as e:
                    logger.warning(f"Could not parse chunks_data for doc {doc_id}: {e}")
            else:
                # For legacy documents without chunks_data, try to process content
                content = doc.get('content', '')
                if content and not content.startswith('[File:'):
                    # This is a text document with actual content
                    chunks = process_text(content, doc.get('title', 'Document'))
                    if chunks:
                        # Generate embeddings
                        try:
                            chunk_texts = [c["text"] for c in chunks]
                            embeddings = await generate_embeddings_batch(chunk_texts)
                            
                            chunks_with_embeddings = []
                            for chunk, embedding in zip(chunks, embeddings):
                                chunks_with_embeddings.append({
                                    "text": chunk["text"],
                                    "source": chunk.get("source", doc.get('title', 'Document')),
                                    "token_count": chunk.get("token_count", 0),
                                    "embedding": embedding
                                })
                            
                            document_embeddings_cache[doc_id] = {
                                "chunks": chunks_with_embeddings,
                                "chunk_count": len(chunks_with_embeddings),
                                "tenant_id": tenant_id
                            }
                            
                            # Save to DB for future loads
                            await save_chunks_to_db(doc_id, chunks_with_embeddings)
                            logger.info(f"Generated and cached {len(chunks)} chunks for legacy doc {doc_id}")
                        except Exception as e:
                            logger.warning(f"Could not generate embeddings for doc {doc_id}: {e}")
        
        _cache_loaded_tenants.add(tenant_id)
        logger.info(f"Finished loading embeddings for tenant {tenant_id}")
        
    except Exception as e:
        logger.error(f"Error loading embeddings from DB for tenant {tenant_id}: {e}")


async def save_chunks_to_db(doc_id: str, chunks: List[Dict]):
    """Save document chunks with embeddings to database"""
    try:
        # Store chunks as JSON in the chunks_data column
        # Note: We'll need to add this column if it doesn't exist
        chunks_json = json.dumps(chunks)
        
        supabase.table('documents').update({
            "chunks_data": chunks_json,
            "chunk_count": len(chunks)
        }).eq('id', doc_id).execute()
        
        logger.info(f"Saved {len(chunks)} chunks to DB for document {doc_id}")
    except Exception as e:
        # Column might not exist yet - log but don't fail
        logger.warning(f"Could not save chunks to DB (column may not exist): {e}")


@api_router.get("/documents")
async def get_documents(current_user: Dict = Depends(get_current_user)):
    """List all documents for the tenant"""
    try:
        tenant_id = current_user["tenant_id"]
        
        # Ensure embeddings are loaded from DB
        await load_embeddings_from_db(tenant_id)
        
        result = supabase.table('documents').select('*').eq('tenant_id', tenant_id).order('created_at', desc=True).execute()
    except Exception as e:
        logger.warning(f"Documents query error: {e}")
        return []
    
    return [
        {
            "id": doc["id"],
            "title": doc["title"],
            "file_type": doc.get("file_type", "text"),
            "file_size": doc.get("file_size"),
            "chunk_count": doc.get("chunk_count") or document_embeddings_cache.get(doc["id"], {}).get("chunk_count", 1),
            "created_at": doc.get("created_at", "")
        } 
        for doc in (result.data or [])
    ]


@api_router.post("/documents")
async def create_document(request: DocumentCreate, current_user: Dict = Depends(get_current_user)):
    """Create a text document with automatic embedding generation"""
    try:
        tenant_id = current_user["tenant_id"]
        
        # Process text content into chunks
        chunks = process_text(request.content, request.title)
        
        if not chunks:
            raise HTTPException(status_code=400, detail="No content could be processed")
        
        # Generate embeddings for chunks
        chunk_texts = [chunk["text"] for chunk in chunks]
        embeddings = await generate_embeddings_batch(chunk_texts)
        
        # Prepare chunks with embeddings
        chunks_with_embeddings = []
        for chunk, embedding in zip(chunks, embeddings):
            chunks_with_embeddings.append({
                "text": chunk["text"],
                "source": chunk.get("source", request.title),
                "token_count": chunk.get("token_count", 0),
                "embedding": embedding
            })
        
        doc_id = str(uuid.uuid4())
        
        # Store document in Supabase with chunks
        doc = {
            "id": doc_id,
            "tenant_id": tenant_id,
            "title": request.title,
            "content": request.content,  # Store actual content
            "file_type": "text",
            "file_size": len(request.content),
            "chunk_count": len(chunks),
            "chunks_data": json.dumps(chunks_with_embeddings),  # Store chunks with embeddings
            "created_at": now_iso()
        }
        
        try:
            supabase.table('documents').insert(doc).execute()
        except Exception as e:
            # If chunks_data or chunk_count columns don't exist, try without them
            logger.warning(f"Insert with chunks_data failed, trying without: {e}")
            doc_without_chunks = {k: v for k, v in doc.items() if k not in ['chunks_data', 'chunk_count']}
            try:
                supabase.table('documents').insert(doc_without_chunks).execute()
            except Exception as e2:
                logger.error(f"Document insert failed: {e2}")
                raise HTTPException(status_code=500, detail=str(e2))
        
        # Store in memory cache
        document_embeddings_cache[doc_id] = {
            "chunks": chunks_with_embeddings,
            "chunk_count": len(chunks),
            "tenant_id": tenant_id
        }
        
        logger.info(f"Document created: {request.title}, {len(chunks)} chunks with embeddings")
        
        return {
            "id": doc_id,
            "title": request.title,
            "chunk_count": len(chunks),
            "created_at": doc["created_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    current_user: Dict = Depends(get_current_user)
):
    """
    Upload a file (PDF, DOCX, Excel, CSV, Image, TXT) and process it for RAG.
    Files are chunked and embedded for semantic search.
    """
    try:
        tenant_id = current_user["tenant_id"]
        
        # Validate file size
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_FILE_SIZE // 1024 // 1024}MB")
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        filename = file.filename or "uploaded_file"
        doc_title = title or filename
        content_type = file.content_type or "application/octet-stream"
        
        logger.info(f"Processing upload: {filename}, type: {content_type}, size: {file_size}")
        
        # Process document and generate embeddings
        chunks, embeddings = await process_document(file_content, filename, content_type)
        
        # Prepare chunks with embeddings
        chunks_with_embeddings = []
        extracted_text = []
        for chunk, embedding in zip(chunks, embeddings):
            chunks_with_embeddings.append({
                "text": chunk["text"],
                "source": chunk.get("source", filename),
                "token_count": chunk.get("token_count", 0),
                "embedding": embedding
            })
            extracted_text.append(chunk["text"])
        
        # Determine file type category
        filename_lower = filename.lower()
        if filename_lower.endswith('.pdf'):
            file_type = "pdf"
        elif filename_lower.endswith('.docx'):
            file_type = "docx"
        elif filename_lower.endswith(('.xlsx', '.xls', '.csv')):
            file_type = "spreadsheet"
        elif filename_lower.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
            file_type = "image"
        else:
            file_type = "text"
        
        doc_id = str(uuid.uuid4())
        
        # Store document in Supabase WITH actual content and chunks
        full_content = "\n\n".join(extracted_text)  # Store extracted text
        doc = {
            "id": doc_id,
            "tenant_id": tenant_id,
            "title": doc_title,
            "content": full_content[:50000] if full_content else f"[File: {filename}]",  # Store actual extracted text (limit size)
            "file_type": file_type,
            "file_size": file_size,
            "chunk_count": len(chunks),
            "chunks_data": json.dumps(chunks_with_embeddings),  # Store chunks with embeddings
            "created_at": now_iso()
        }
        
        try:
            supabase.table('documents').insert(doc).execute()
        except Exception as e:
            # If chunks_data column doesn't exist, try without it
            logger.warning(f"Insert with chunks_data failed, trying without: {e}")
            doc_without_chunks = {k: v for k, v in doc.items() if k not in ['chunks_data', 'chunk_count']}
            try:
                supabase.table('documents').insert(doc_without_chunks).execute()
            except Exception as e2:
                logger.error(f"Document insert failed: {e2}")
                raise HTTPException(status_code=500, detail=str(e2))
        
        # Store embeddings in memory cache
        document_embeddings_cache[doc_id] = {
            "chunks": chunks_with_embeddings,
            "chunk_count": len(chunks),
            "tenant_id": tenant_id
        }
        
        logger.info(f"Document uploaded: {doc_title}, {len(chunks)} chunks, {file_type}")
        
        return {
            "id": doc_id,
            "title": doc_title,
            "file_type": file_type,
            "file_size": file_size,
            "chunk_count": len(chunks),
            "created_at": doc["created_at"],
            "message": f"Successfully processed {filename} into {len(chunks)} searchable chunks"
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")


@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: Dict = Depends(get_current_user)):
    """Delete a document"""
    tenant_id = current_user["tenant_id"]
    result = supabase.table('documents').select('*').eq('id', doc_id).eq('tenant_id', tenant_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    # SECURITY: Include tenant_id in delete for defense-in-depth against IDOR
    supabase.table('documents').delete().eq('id', doc_id).eq('tenant_id', tenant_id).execute()
    # Also remove from cache
    if doc_id in document_embeddings_cache:
        del document_embeddings_cache[doc_id]
    return {"success": True}


@api_router.post("/documents/search")
async def search_documents(
    query: str,
    top_k: int = 5,
    current_user: Dict = Depends(get_current_user)
):
    """
    Semantic search across all tenant documents.
    Returns the most relevant chunks based on query similarity.
    """
    try:
        tenant_id = current_user["tenant_id"]
        
        # Collect all chunks from memory cache for this tenant
        all_chunks = []
        for doc_id, doc_data in document_embeddings_cache.items():
            if doc_data.get("tenant_id") == tenant_id:
                all_chunks.extend(doc_data.get("chunks", []))
        
        if not all_chunks:
            return {"results": [], "message": "No documents with embeddings found. Please upload or create documents first.", "total_chunks_searched": 0}
        
        # Perform semantic search
        results = await semantic_search(query, all_chunks, top_k=top_k)
        
        return {
            "results": results,
            "total_chunks_searched": len(all_chunks),
            "query": query
        }
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        "google_sheets": {
            "connected": tenant_id in _google_sheets_cache or False,
            "sheet_id": _google_sheets_cache.get(tenant_id, {}).get('sheet_id')
        }
    }


# ============ Agents Endpoints ============
@api_router.get("/agents")
async def get_agents(current_user: Dict = Depends(get_current_user)):
    """List all agents for the user"""
    # For now, treat each tenant config as an agent
    try:
        config = supabase.table('tenant_configs').select('*').eq('tenant_id', current_user["tenant_id"]).execute()

        if not config.data or not config.data[0].get('business_name'):
            return []

        # Get stats
        leads_result = supabase.table('leads').select('id, status').eq('tenant_id', current_user["tenant_id"]).execute()
        convos_result = supabase.table('conversations').select('id').eq('tenant_id', current_user["tenant_id"]).execute()
        telegram_result = supabase.table('telegram_bots').select('*').eq('tenant_id', current_user["tenant_id"]).eq('is_active', True).execute()

        # Check Bitrix connection status
        bitrix_connected = False
        tenant_id = current_user["tenant_id"]
        if tenant_id in _bitrix_webhooks_cache:
            bitrix_connected = True
        else:
            try:
                bx_result = supabase.table('tenant_configs').select('bitrix_webhook_url').eq('tenant_id', tenant_id).execute()
                if bx_result.data and bx_result.data[0].get('bitrix_webhook_url'):
                    bitrix_connected = True
            except:
                pass

        agent_config = config.data[0]

        # Calculate conversion rate
        total_leads = len(leads_result.data) if leads_result.data else 0
        won_leads = len([l for l in (leads_result.data or []) if l.get('status') == 'won'])
        conversion_rate = round((won_leads / total_leads * 100), 1) if total_leads > 0 else 0

        # Calculate average response time (in seconds)
        avg_response_time = None
        try:
            # Get conversation IDs for this tenant first
            if convos_result.data:
                convo_ids = [c['id'] for c in convos_result.data]
                if convo_ids:
                    # Fetch messages for these conversations
                    messages_result = supabase.table('messages').select('conversation_id, sender_type, created_at').in_('conversation_id', convo_ids).order('created_at').execute()
                    if messages_result.data:
                        response_times = []
                        messages_by_convo = {}
                        for msg in messages_result.data:
                            cid = msg.get('conversation_id')
                            if cid not in messages_by_convo:
                                messages_by_convo[cid] = []
                            messages_by_convo[cid].append(msg)

                        for cid, msgs in messages_by_convo.items():
                            for i in range(1, len(msgs)):
                                if msgs[i-1].get('sender_type') == 'user' and msgs[i].get('sender_type') == 'agent':
                                    try:
                                        t1 = datetime.fromisoformat(msgs[i-1]['created_at'].replace('Z', '+00:00'))
                                        t2 = datetime.fromisoformat(msgs[i]['created_at'].replace('Z', '+00:00'))
                                        diff = (t2 - t1).total_seconds()
                                        if diff > 0 and diff < 3600:  # Only count if less than 1 hour
                                            response_times.append(diff)
                                    except:
                                        pass

                        if response_times:
                            avg_response_time = round(sum(response_times) / len(response_times), 1)
        except Exception as e:
            logger.warning(f"Could not calculate avg response time: {e}")

        return [{
            "id": current_user["tenant_id"],
            "name": agent_config.get('business_name', 'My Agent'),
            "status": "active" if telegram_result.data else "inactive",
            "channel": "telegram" if telegram_result.data else None,
            "bitrix_connected": bitrix_connected,
            "leads_count": total_leads,
            "conversations_count": len(convos_result.data) if convos_result.data else 0,
            "conversion_rate": conversion_rate,
            "avg_response_time": avg_response_time,
            "created_at": agent_config.get('created_at', now_iso())
        }]
    except Exception as e:
        logger.error(f"Get agents error: {e}")
        return []


@api_router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, current_user: Dict = Depends(get_current_user)):
    """Delete an agent and all associated data (comprehensive cleanup)"""
    tenant_id = current_user["tenant_id"]

    try:
        # 1. Delete messages (via conversation_id since messages has no tenant_id)
        try:
            conv_result = supabase.table('conversations').select('id').eq('tenant_id', tenant_id).execute()
            conversation_ids = [c['id'] for c in conv_result.data] if conv_result.data else []
            if conversation_ids:
                for conv_id in conversation_ids:
                    supabase.table('messages').delete().eq('conversation_id', conv_id).execute()
            logger.info(f"Deleted messages for agent {agent_id}")
        except Exception as e:
            logger.warning(f"Could not delete messages: {e}")

        # 2. Delete conversations
        try:
            supabase.table('conversations').delete().eq('tenant_id', tenant_id).execute()
            logger.info(f"Deleted conversations for agent {agent_id}")
        except Exception as e:
            logger.warning(f"Could not delete conversations: {e}")

        # 3. Delete leads
        try:
            supabase.table('leads').delete().eq('tenant_id', tenant_id).execute()
            logger.info(f"Deleted leads for agent {agent_id}")
        except Exception as e:
            logger.warning(f"Could not delete leads: {e}")

        # 4. Delete customers
        try:
            supabase.table('customers').delete().eq('tenant_id', tenant_id).execute()
            logger.info(f"Deleted customers for agent {agent_id}")
        except Exception as e:
            logger.warning(f"Could not delete customers: {e}")

        # 5. Delete documents and clear embeddings cache
        try:
            supabase.table('documents').delete().eq('tenant_id', tenant_id).execute()
            # Clear embeddings cache for this tenant
            global document_embeddings_cache, _cache_loaded_tenants
            keys_to_delete = [k for k in document_embeddings_cache if k.startswith(tenant_id)]
            for k in keys_to_delete:
                del document_embeddings_cache[k]
            _cache_loaded_tenants.discard(tenant_id)
            logger.info(f"Deleted documents for agent {agent_id}")
        except Exception as e:
            logger.warning(f"Could not delete documents: {e}")

        # 6. Delete event logs
        try:
            supabase.table('event_logs').delete().eq('tenant_id', tenant_id).execute()
            logger.info(f"Deleted event logs for agent {agent_id}")
        except Exception as e:
            logger.warning(f"Could not delete event logs: {e}")

        # 7. Disconnect and delete telegram bot
        try:
            tg_result = supabase.table('telegram_bots').select('*').eq('tenant_id', tenant_id).execute()
            if tg_result.data:
                await delete_telegram_webhook(tg_result.data[0]["bot_token"])
            supabase.table('telegram_bots').delete().eq('tenant_id', tenant_id).execute()
            logger.info(f"Deleted telegram bot for agent {agent_id}")
        except Exception as e:
            logger.warning(f"Could not delete telegram bot: {e}")

        # 8. Clear Bitrix webhook from cache
        try:
            if tenant_id in _bitrix_webhooks_cache:
                del _bitrix_webhooks_cache[tenant_id]
            logger.info(f"Cleared Bitrix cache for agent {agent_id}")
        except Exception as e:
            logger.warning(f"Could not clear Bitrix cache: {e}")

        # 9. Reset the config (but don't delete tenant)
        try:
            supabase.table('tenant_configs').update({
                "business_name": None,
                "business_description": None,
                "products_services": None,
                "faq_objections": None,
                "greeting_message": None,
                "closing_message": None,
                "bitrix_webhook_url": None,
                "bitrix_connected_at": None
            }).eq('tenant_id', tenant_id).execute()
            logger.info(f"Reset config for agent {agent_id}")
        except Exception as e:
            logger.warning(f"Could not reset config: {e}")

        return {"success": True, "message": "Agent and all associated data deleted successfully"}
    except Exception as e:
        logger.error(f"Delete agent error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete agent")


# ============ Test Chat Endpoint ============
class TestChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_history: List[Dict] = []

@api_router.post("/chat/test")
async def test_chat(request: TestChatRequest, current_user: Dict = Depends(get_current_user)):
    """
    Test the AI agent in browser without Telegram.
    Simulates a conversation for testing purposes.
    """
    try:
        tenant_id = current_user["tenant_id"]
        
        # Get config
        config_result = supabase.table('tenant_configs').select('*').eq('tenant_id', tenant_id).execute()
        config = config_result.data[0] if config_result.data else {}
        
        # Build conversation context
        lead_context = {
            "sales_stage": "awareness",
            "fields_collected": {},
            "score": 50
        }
        
        # Format messages for LLM
        messages_for_llm = []
        for msg in request.conversation_history:
            role = "assistant" if msg.get("role") == "agent" else "user"
            messages_for_llm.append({"role": role, "text": msg.get("text", "")})
        messages_for_llm.append({"role": "user", "text": request.message})
        
        # Get RAG context (ensure embeddings are loaded)
        logger.info(f"Test chat: Getting RAG context for '{request.message[:50]}...'")
        business_context = await get_business_context_semantic(tenant_id, request.message)
        logger.info(f"Test chat: Found {len(business_context)} RAG context chunks")

        # CRM Integration: Get on-demand CRM data based on query keywords
        # (Customer matching not available in test mode - no phone)
        crm_query_context = await get_crm_context_for_query(tenant_id, request.message, None)
        if crm_query_context:
            logger.info(f"Test chat: CRM query context fetched: {len(crm_query_context)} chars")

        # Call LLM with CRM context
        llm_result = await call_sales_agent(
            messages_for_llm, config, lead_context, business_context,
            tenant_id, request.message, None, crm_query_context
        )

        return {
            "reply": llm_result.get("reply_text", "I'm here to help! What would you like to know?"),
            "sales_stage": llm_result.get("sales_stage", "awareness"),
            "hotness": llm_result.get("hotness", "warm"),
            "score": llm_result.get("score", 50),
            "fields_collected": llm_result.get("fields_collected", {}),
            "rag_context_used": len(business_context) > 0,
            "rag_context_count": len(business_context),
            "crm_context_used": bool(crm_query_context)
        }
        
    except Exception as e:
        logger.error(f"Test chat error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


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
