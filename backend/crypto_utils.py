"""Application-level encryption for sensitive credentials using Fernet (AES-128-CBC).

Usage:
    from crypto_utils import encrypt_value, decrypt_value

    # Encrypt before INSERT/UPDATE
    encrypted = encrypt_value(plaintext_token)

    # Decrypt after SELECT
    plaintext = decrypt_value(encrypted_token)

Requires ENCRYPTION_KEY env var (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
"""
import os
import logging
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)

_key = (os.environ.get('ENCRYPTION_KEY') or '').strip()
_fernet = None

# Detect production: Render sets RENDER_EXTERNAL_URL, or user sets BACKEND_PUBLIC_URL
_is_production = bool(
    (os.environ.get('RENDER_EXTERNAL_URL') or '').strip()
    or (os.environ.get('BACKEND_PUBLIC_URL') or '').strip()
)

if _key:
    try:
        _fernet = Fernet(_key.encode())
        logger.info("Encryption key loaded successfully")
    except Exception as e:
        logger.error(f"Invalid ENCRYPTION_KEY: {e}")
        _fernet = None
        if _is_production:
            raise RuntimeError(
                "ENCRYPTION_KEY is set but invalid. Cannot start in production without working encryption. "
                "Generate a valid key with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
else:
    if _is_production:
        raise RuntimeError(
            "ENCRYPTION_KEY is required in production. Credentials cannot be stored unencrypted. "
            "Generate a key with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    logger.warning("ENCRYPTION_KEY not set — credentials will be stored unencrypted (development only)")


def encrypt_value(plaintext: str) -> str:
    """Encrypt a plaintext string. Returns plaintext unchanged if no key configured (dev only)."""
    if not _fernet or not plaintext:
        return plaintext
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a ciphertext string. Returns input unchanged if not encrypted or no key."""
    if not _fernet or not ciphertext:
        return ciphertext
    try:
        return _fernet.decrypt(ciphertext.encode()).decode()
    except (InvalidToken, Exception):
        # Graceful fallback for unencrypted values during migration
        return ciphertext
