"""Authentication Service using JWT"""
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv
import bcrypt
import hashlib
import jwt
from pydantic import BaseModel, EmailStr

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

JWT_SECRET = (os.environ.get('JWT_SECRET') or '').strip()
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is required")

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


class TokenData(BaseModel):
    user_id: str
    tenant_id: str
    email: str
    exp: datetime


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against a stored hash.

    Supports both bcrypt (new) and SHA256 (legacy) formats.
    bcrypt hashes start with '$2b$'; legacy hashes use 'salt:hash' format.
    """
    try:
        if stored_hash.startswith('$2b$'):
            return bcrypt.checkpw(password.encode(), stored_hash.encode())
        # Legacy SHA256 format: salt:hash
        if ':' in stored_hash:
            salt, hash_value = stored_hash.split(":", 1)
            password_hash = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
            return password_hash == hash_value
        return False
    except Exception:
        return False


def needs_rehash(stored_hash: str) -> bool:
    """Check if a password hash needs to be upgraded to bcrypt."""
    return not stored_hash.startswith('$2b$')


def create_access_token(user_id: str, tenant_id: str, email: str) -> str:
    """Create a JWT access token"""
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "tenant_id": tenant_id,
        "email": email,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Optional[TokenData]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return TokenData(
            user_id=payload["user_id"],
            tenant_id=payload["tenant_id"],
            email=payload["email"],
            exp=datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        )
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {str(e)}")
        return None
