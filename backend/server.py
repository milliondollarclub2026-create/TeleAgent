"""AI Sales Agent for Telegram + Bitrix24 - Enhanced Version with Sales Pipeline & RAG"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request, BackgroundTasks, UploadFile, File, Form
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
import asyncio
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

# Initialize Supabase client
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

# Initialize Resend for email
resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
FRONTEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://saleschat-ai-1.preview.emergentagent.com')

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


# ============ Auth Endpoints (Supabase Auth) ============
@api_router.post("/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """
    Register a new user using Supabase Auth.
    Supabase handles email confirmation automatically.
    """
    try:
        # Use Supabase Auth for registration - it handles email confirmation
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {
                    "name": request.name,
                    "business_name": request.business_name
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Registration failed")
        
        supabase_user = auth_response.user
        user_id = str(supabase_user.id)
        
        # Check if user already exists in our users table
        existing = supabase.table('users').select('*').eq('email', request.email).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create tenant
        tenant_id = str(uuid.uuid4())
        tenant = {"id": tenant_id, "name": request.business_name, "timezone": "Asia/Tashkent", "created_at": now_iso()}
        supabase.table('tenants').insert(tenant).execute()
        
        # Create user record in our users table (linked to Supabase Auth user)
        user = {
            "id": user_id,
            "email": request.email,
            "password_hash": hash_password(request.password),  # Keep for backward compat
            "name": request.name,
            "tenant_id": tenant_id,
            "role": "admin",
            "email_confirmed": False,  # Will be updated when Supabase confirms
            "confirmation_token": None,
            "created_at": now_iso()
        }
        supabase.table('users').insert(user).execute()
        
        # Create default config
        config = {
            "tenant_id": tenant_id, "business_name": request.business_name, "collect_phone": True,
            "agent_tone": "professional", "primary_language": "uz", "vertical": "default"
        }
        try:
            supabase.table('tenant_configs').insert(config).execute()
        except Exception as e:
            logger.warning(f"Could not create tenant config: {e}")
        
        # Create JWT token for immediate use (limited access until email confirmed)
        token = create_access_token(user_id, tenant_id, request.email)
        
        # Check if email confirmation is required
        email_confirmed = supabase_user.email_confirmed_at is not None
        
        return AuthResponse(
            token=token,
            user={
                "id": user_id,
                "email": request.email,
                "name": request.name,
                "tenant_id": tenant_id,
                "business_name": request.business_name,
                "email_confirmed": email_confirmed
            },
            message="Account created! Please check your email to confirm your account." if not email_confirmed else "Account created successfully!"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        # Check if it's a duplicate email error from Supabase
        if "already registered" in str(e).lower() or "already been registered" in str(e).lower():
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@api_router.get("/auth/confirm-email")
async def confirm_email(token: str = None, type: str = None, access_token: str = None):
    """
    Confirm user email - handles both custom tokens and Supabase redirects.
    Supabase sends: /confirm-email?access_token=...&type=signup
    """
    # Handle Supabase Auth callback
    if access_token and type == "signup":
        try:
            # Verify the Supabase session
            session_response = supabase.auth.get_user(access_token)
            if session_response and session_response.user:
                supabase_user = session_response.user
                
                # Update our users table
                supabase.table('users').update({
                    "email_confirmed": True,
                    "email_confirmed_at": now_iso()
                }).eq('email', supabase_user.email).execute()
                
                return {"message": "Email confirmed successfully! You can now log in.", "redirect": "/login"}
        except Exception as e:
            logger.error(f"Supabase confirmation error: {e}")
    
    # Handle custom token (fallback for legacy)
    if token:
        result = supabase.table('users').select('*').eq('confirmation_token', token).execute()
        if not result.data:
            raise HTTPException(status_code=400, detail="Invalid or expired confirmation token")
        
        user = result.data[0]
        if user.get('email_confirmed'):
            return {"message": "Email already confirmed", "redirect": "/login"}
        
        supabase.table('users').update({
            "email_confirmed": True,
            "confirmation_token": None,
            "email_confirmed_at": now_iso()
        }).eq('id', user['id']).execute()
        
        return {"message": "Email confirmed successfully! You can now log in.", "redirect": "/login"}
    
    raise HTTPException(status_code=400, detail="Invalid confirmation request")


@api_router.post("/auth/resend-confirmation")
async def resend_confirmation(email: EmailStr):
    """Resend confirmation email via Supabase Auth"""
    try:
        # Use Supabase to resend confirmation
        supabase.auth.resend({
            "type": "signup",
            "email": email
        })
        return {"message": "If this email is registered, a confirmation link will be sent."}
    except Exception as e:
        logger.warning(f"Resend confirmation error: {e}")
        return {"message": "If this email is registered, a confirmation link will be sent."}


@api_router.post("/auth/forgot-password")
async def forgot_password(email: EmailStr):
    """Request password reset via Supabase Auth"""
    try:
        # Use Supabase Auth for password reset
        supabase.auth.reset_password_email(email)
        return {"message": "If this email is registered, a password reset link will be sent."}
    except Exception as e:
        logger.warning(f"Password reset error: {e}")
        return {"message": "If this email is registered, a password reset link will be sent."}


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password - uses Supabase Auth if available"""
    # Try Supabase Auth update first
    try:
        supabase.auth.update_user({"password": request.new_password})
        return {"message": "Password reset successfully. You can now log in."}
    except Exception as e:
        logger.warning(f"Supabase auth update failed: {e}")
    
    # Fallback to custom token
    try:
        result = supabase.table('users').select('*').eq('reset_token', request.token).execute()
        if not result.data:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
        user = result.data[0]
        
        # Update password in our table
        supabase.table('users').update({
            "password_hash": hash_password(request.new_password)
        }).eq('id', user['id']).execute()
        
        return {"message": "Password reset successfully. You can now log in."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(status_code=400, detail="Password reset failed. Please try again.")


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Login using Supabase Auth with fallback to custom users table.
    Syncs email confirmation status from Supabase.
    """
    # Try Supabase Auth first
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if auth_response.user:
            supabase_user = auth_response.user
            email_confirmed = supabase_user.email_confirmed_at is not None
            
            # Get user from our table
            result = supabase.table('users').select('*').eq('email', request.email).execute()
            
            if result.data:
                user = result.data[0]
                
                # Sync email confirmation status
                if email_confirmed and not user.get('email_confirmed'):
                    supabase.table('users').update({
                        "email_confirmed": True,
                        "email_confirmed_at": now_iso()
                    }).eq('id', user['id']).execute()
                    user['email_confirmed'] = True
                
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
                        "email_confirmed": user.get("email_confirmed", email_confirmed)
                    }
                )
    except Exception as e:
        logger.info(f"Supabase auth login failed, trying fallback: {e}")
    
    # Fallback to custom users table
    result = supabase.table('users').select('*').eq('email', request.email).execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = result.data[0]
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if email is confirmed
    if not user.get('email_confirmed', False):
        raise HTTPException(
            status_code=403, 
            detail="Please confirm your email before logging in. Check your inbox or request a new confirmation link."
        )
    
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


# ============ Telegram Bot Endpoints ============
@api_router.post("/telegram/bot")
async def connect_telegram_bot(request: TelegramBotCreate, current_user: Dict = Depends(get_current_user)):
    bot_info = await get_bot_info(request.bot_token)
    if not bot_info:
        raise HTTPException(status_code=400, detail="Invalid bot token")
    
    tenant_id = current_user["tenant_id"]
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://saleschat-ai-1.preview.emergentagent.com')
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


# ============ Bitrix24 Webhook Integration ============
# Modern webhook-based CRM integration for full AI access

class BitrixWebhookConnect(BaseModel):
    webhook_url: str = Field(..., description="Bitrix24 webhook URL")


class CRMChatRequest(BaseModel):
    message: str = Field(..., description="User question about CRM data")
    conversation_history: List[Dict] = Field(default=[], description="Previous messages in conversation")


# In-memory storage for Bitrix webhooks (fallback when DB columns don't exist)
_bitrix_webhooks_cache = {}


async def get_bitrix_client(tenant_id: str) -> Optional[BitrixCRMClient]:
    """Get Bitrix24 client for tenant if configured"""
    # Check in-memory cache first
    if tenant_id in _bitrix_webhooks_cache:
        return create_bitrix_client(_bitrix_webhooks_cache[tenant_id]['webhook_url'])
    
    # Try tenant_configs
    try:
        result = supabase.table('tenant_configs').select('bitrix_webhook_url').eq('tenant_id', tenant_id).execute()
        if result.data and result.data[0].get('bitrix_webhook_url'):
            webhook_url = result.data[0]['bitrix_webhook_url']
            _bitrix_webhooks_cache[tenant_id] = {'webhook_url': webhook_url}
            return create_bitrix_client(webhook_url)
    except Exception as e:
        logger.debug(f"Could not get Bitrix from tenant_configs: {e}")
    
    # Try tenants table
    try:
        result = supabase.table('tenants').select('bitrix_webhook_url').eq('id', tenant_id).execute()
        if result.data and result.data[0].get('bitrix_webhook_url'):
            webhook_url = result.data[0]['bitrix_webhook_url']
            _bitrix_webhooks_cache[tenant_id] = {'webhook_url': webhook_url}
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
    
    # Test the connection
    client = create_bitrix_client(webhook_url)
    if not client:
        raise HTTPException(status_code=400, detail="Invalid webhook URL")
    
    test_result = await client.test_connection()
    
    if not test_result.get("ok"):
        raise HTTPException(status_code=400, detail=f"Connection failed: {test_result.get('message')}")
    
    # Store in memory cache (always works)
    _bitrix_webhooks_cache[tenant_id] = {
        'webhook_url': webhook_url,
        'connected_at': now_iso(),
        'portal_user': test_result.get('portal_user')
    }
    logger.info(f"Stored Bitrix webhook in cache for tenant {tenant_id}")
    
    # Try to save to database (may fail if columns don't exist)
    saved_to_db = False
    try:
        supabase.table('tenant_configs').update({
            "bitrix_webhook_url": webhook_url
        }).eq('tenant_id', tenant_id).execute()
        saved_to_db = True
    except Exception as e:
        logger.debug(f"Could not save to tenant_configs: {e}")
    
    if not saved_to_db:
        try:
            supabase.table('tenants').update({
                "bitrix_webhook_url": webhook_url
            }).eq('id', tenant_id).execute()
            saved_to_db = True
        except Exception as e:
            logger.debug(f"Could not save to tenants: {e}")
    
    return {
        "success": True,
        "message": "Bitrix24 CRM connected successfully!" + ("" if saved_to_db else " (Note: Add 'bitrix_webhook_url' column to tenant_configs in Supabase for persistence)"),
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
    
    # Try both tables
    try:
        supabase.table('tenant_configs').update({
            "bitrix_webhook_url": None,
            "bitrix_connected_at": None
        }).eq('tenant_id', tenant_id).execute()
    except:
        pass
    
    try:
        supabase.table('tenants').update({
            "bitrix_webhook_url": None,
            "bitrix_connected_at": None
        }).eq('id', tenant_id).execute()
    except:
        pass
    
    return {"success": True, "message": "Bitrix24 disconnected"}


@api_router.get("/bitrix-crm/status")
async def get_bitrix_webhook_status(current_user: Dict = Depends(get_current_user)):
    """Get Bitrix24 CRM connection status"""
    tenant_id = current_user["tenant_id"]
    
    # Try tenant_configs first
    try:
        result = supabase.table('tenant_configs').select('bitrix_webhook_url, bitrix_connected_at').eq('tenant_id', tenant_id).execute()
        if result.data and result.data[0].get('bitrix_webhook_url'):
            return {
                "connected": True,
                "connected_at": result.data[0].get('bitrix_connected_at')
            }
    except:
        pass
    
    # Fallback to tenants
    try:
        result = supabase.table('tenants').select('bitrix_webhook_url, bitrix_connected_at').eq('id', tenant_id).execute()
        if result.data and result.data[0].get('bitrix_webhook_url'):
            return {
                "connected": True,
                "connected_at": result.data[0].get('bitrix_connected_at')
            }
    except:
        pass
    
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

Answer the user's questions based on this data. Be specific with numbers and facts.
If asked about trends or comparisons, use the data provided to give insights.
Keep responses concise but informative. Use formatting (bullet points, numbers) when helpful.
If the data doesn't contain enough information to answer, say so clearly.

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


async def call_sales_agent(messages: List[Dict], config: Dict, lead_context: Dict = None, business_context: List[str] = None, tenant_id: str = None, user_query: str = None) -> Dict:
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
    """Handle incoming Telegram webhook updates"""
    try:
        update = await request.json()
        logger.info(f"Received Telegram update: {json.dumps(update, default=str)[:500]}")
        
        message = update.get("message")
        if not message or not isinstance(message, dict):
            logger.debug("No valid message in update, ignoring")
            return {"ok": True}
        
        text = message.get("text")
        if not text:
            logger.debug("No text in message, ignoring")
            return {"ok": True}
        
        # Get the bot that received this message
        # We need to identify which bot this came from - Telegram sends bot_id in the update
        # But since we don't have that, we check all active bots
        result = supabase.table('telegram_bots').select('*').eq('is_active', True).execute()
        
        if not result.data:
            logger.warning("No active Telegram bots configured")
            return {"ok": True}
        
        # For now, process with first active bot (single-tenant scenario)
        # TODO: In multi-tenant, we'd need to verify the bot_token matches
        bot = result.data[0]
        
        # Update last webhook timestamp
        try:
            supabase.table('telegram_bots').update({"last_webhook_at": now_iso()}).eq('id', bot['id']).execute()
        except Exception as e:
            logger.warning(f"Could not update webhook timestamp: {e}")
        
        # Process message in background
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
        
        # Get business context (Semantic RAG)
        logger.info(f"Fetching RAG context for: '{text[:50]}...'")
        business_context = await get_business_context_semantic(tenant_id, text)
        logger.info(f"RAG returned {len(business_context)} context chunks")
        
        # Call enhanced LLM
        llm_result = await call_sales_agent(messages_for_llm, config, lead_context, business_context, tenant_id, text)
        
        # Update or create lead with enhanced data
        await update_lead_from_llm(tenant_id, customer, existing_lead, llm_result)
        
        # Save agent response
        reply_text = llm_result.get("reply_text", "I'm here to help!")
        supabase.table('messages').insert({"id": str(uuid.uuid4()), "conversation_id": conversation['id'], "sender_type": "agent", "text": reply_text, "created_at": now_iso()}).execute()
        
        # Update conversation
        supabase.table('conversations').update({"last_message_at": now_iso()}).eq('id', conversation['id']).execute()
        
        # Send response to Telegram
        success = await send_telegram_message(bot_token, chat_id, reply_text)
        if success:
            logger.info(f"Sent response to {username or user_id}: '{reply_text[:50]}...'")
        else:
            logger.error(f"Failed to send Telegram message to chat {chat_id}")
        
        # Log event (ignore errors)
        try:
            supabase.table('event_logs').insert({
                "id": str(uuid.uuid4()), "tenant_id": tenant_id, "event_type": "message_processed",
                "event_data": {
                    "customer_id": customer['id'], "conversation_id": conversation['id'],
                    "sales_stage": llm_result.get("sales_stage"), "hotness": llm_result.get("hotness"),
                    "objection_detected": llm_result.get("objection_detected"),
                    "closing_used": llm_result.get("closing_technique_used"),
                    "rag_context_used": len(business_context) > 0
                },
                "created_at": now_iso()
            }).execute()
        except Exception as e:
            logger.warning(f"Could not log event: {e}")
        
        # Sync to Bitrix if connected
        await sync_lead_to_bitrix(tenant_id, customer, llm_result)
        
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
    
    # Average response time (mock for now - would need message timestamps)
    avg_response_time = 2.3  # seconds - placeholder
    
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
    query = supabase.table('leads').select('*').eq('tenant_id', current_user["tenant_id"])
    if status:
        query = query.eq('status', status)
    if hotness:
        query = query.eq('final_hotness', hotness)
    # Note: sales_stage filter requires the column to exist in Supabase schema
    # Skipping stage filter if column doesn't exist
    
    try:
        result = query.order('created_at', desc=True).limit(limit).execute()
    except Exception as e:
        logger.warning(f"Leads query error: {e}")
        result = supabase.table('leads').select('*').eq('tenant_id', current_user["tenant_id"]).order('created_at', desc=True).limit(limit).execute()
    
    response = []
    for lead in (result.data or []):
        try:
            cust_result = supabase.table('customers').select('*').eq('id', lead['customer_id']).execute()
            customer = cust_result.data[0] if cust_result.data else None
        except Exception:
            customer = None
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
    try:
        supabase.table('leads').update({"sales_stage": stage}).eq('id', lead_id).execute()
    except Exception as e:
        # Column may not exist in schema
        logger.warning(f"Could not update sales_stage: {e}")
        return {"success": True, "note": "Stage tracking requires database schema update"}
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
    result = supabase.table('documents').select('*').eq('id', doc_id).eq('tenant_id', current_user["tenant_id"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    supabase.table('documents').delete().eq('id', doc_id).execute()
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
        "google_sheets": {"connected": False, "sheet_id": None}
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
        leads_result = supabase.table('leads').select('id').eq('tenant_id', current_user["tenant_id"]).execute()
        convos_result = supabase.table('conversations').select('id').eq('tenant_id', current_user["tenant_id"]).execute()
        telegram_result = supabase.table('telegram_bots').select('*').eq('tenant_id', current_user["tenant_id"]).eq('is_active', True).execute()
        
        agent_config = config.data[0]
        
        return [{
            "id": current_user["tenant_id"],
            "name": agent_config.get('business_name', 'My Agent'),
            "status": "active" if telegram_result.data else "inactive",
            "channel": "telegram" if telegram_result.data else None,
            "leads_count": len(leads_result.data) if leads_result.data else 0,
            "conversations_count": len(convos_result.data) if convos_result.data else 0,
            "created_at": agent_config.get('created_at', now_iso())
        }]
    except Exception as e:
        logger.error(f"Get agents error: {e}")
        return []


@api_router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, current_user: Dict = Depends(get_current_user)):
    """Delete an agent (resets config)"""
    try:
        # Reset the config
        supabase.table('tenant_configs').update({
            "business_name": None,
            "business_description": None,
            "products_services": None
        }).eq('tenant_id', current_user["tenant_id"]).execute()
        
        # Delete documents
        supabase.table('documents').delete().eq('tenant_id', current_user["tenant_id"]).execute()
        
        # Delete telegram bot
        supabase.table('telegram_bots').delete().eq('tenant_id', current_user["tenant_id"]).execute()
        
        return {"success": True}
    except Exception as e:
        logger.error(f"Delete agent error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete agent")


# ============ Test Chat Endpoint ============
class TestChatRequest(BaseModel):
    message: str
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
        
        # Call LLM
        llm_result = await call_sales_agent(messages_for_llm, config, lead_context, business_context, tenant_id, request.message)
        
        return {
            "reply": llm_result.get("reply_text", "I'm here to help! What would you like to know?"),
            "sales_stage": llm_result.get("sales_stage", "awareness"),
            "hotness": llm_result.get("hotness", "warm"),
            "score": llm_result.get("score", 50),
            "fields_collected": llm_result.get("fields_collected", {}),
            "rag_context_used": len(business_context) > 0,
            "rag_context_count": len(business_context)
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
