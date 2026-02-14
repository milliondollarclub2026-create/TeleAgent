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

if _key:
    try:
        _fernet = Fernet(_key.encode())
        logger.info("Encryption key loaded successfully")
    except Exception as e:
        logger.error(f"Invalid ENCRYPTION_KEY: {e}")
        _fernet = None
else:
    logger.warning("ENCRYPTION_KEY not set — credentials will be stored unencrypted")


def encrypt_value(plaintext: str) -> str:
    """Encrypt a plaintext string. Returns plaintext unchanged if no key configured."""
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
