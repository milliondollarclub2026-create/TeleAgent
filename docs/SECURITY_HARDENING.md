# LeadRelay Security Hardening

## Overview

This document tracks the security hardening progress for LeadRelay. Security work is organized in phases, each addressing a specific set of vulnerabilities or improvements.

**Current Security Rating**: ~4.5/5

---

## Phase 1 (Completed: Feb 2026)

Phase 1 raised the security posture from **2.5/5 to 3.8/5**.

### Changes

| # | Fix | Details |
|---|-----|---------|
| 1 | Bcrypt password hashing | Migrated from SHA-256 to bcrypt with adaptive cost factor. Legacy SHA-256 passwords are transparently upgraded on next login. |
| 2 | Fernet credential encryption | All sensitive credentials (bot tokens, API keys, webhook secrets) encrypted at rest using Fernet AES-128-CBC via `crypto_utils.py`. |
| 3 | CORS hardening | Origins restricted to configured `CORS_ORIGINS` env var. Defaults to `localhost` only if unset. |
| 4 | Row-Level Security (RLS) | Enabled on all tenant-scoped tables (`leads`, `customers`, `conversations`, `messages`, `documents`, `telegram_bots`, `tenant_configs`, `instagram_accounts`, `media_library`). |
| 5 | Log redaction | PII (emails, IDs, tokens) redacted in all log output via `redact_email()` and `redact_id()` helpers. |
| 6 | Webhook secret verification | Telegram webhooks use HMAC-SHA256 secret tokens. Instagram webhooks verify SHA-256 signatures. |
| 7 | GDPR endpoints | Added `DELETE /api/account` (Article 17 erasure) and `GET /api/account/export` (Article 20 portability). |
| 8 | Startup validation | Server refuses to start if `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, or `JWT_SECRET` are missing. |
| 9 | Input sanitization | HTML/XSS sanitization on all user-facing text fields before storage. |
| 10 | Bot-specific webhook URLs | Each Telegram bot gets a unique webhook URL with its bot ID, preventing cross-bot interference. |

---

## Phase 2 (Completed: Feb 2026)

Phase 2 raised the security posture from **3.8/5 to ~4.5/5**, addressing 15 remaining gaps across 6 batches.

### Batch 1: Error Message Sanitization

**Problem**: ~27 HTTP error responses leaked internal details via `str(e)` (DB errors, stack traces, file paths). 10 locations used `traceback.print_exc()` which writes to stdout instead of structured logging.

**Fix**:
- All `HTTPException(status_code=500, detail=str(e))` replaced with generic `"An internal error occurred. Please try again."` messages
- All `HTTPException(status_code=500, detail=f"...{str(e)}")` similarly sanitized
- All `traceback.print_exc()` replaced with `logger.exception()` for structured logging with full stack traces in server logs only

**Locations fixed**: 25 HTTPException replacements + 10 traceback replacements across `backend/server.py`

### Batch 2: Authentication Hardening

#### 2A: Auth Rate Limiting
**Problem**: Login, register, forgot-password, and resend-confirmation had no rate limiting, enabling brute-force attacks.

**Fix**: IP-based rate limiter — 5 attempts per 5-minute window. Returns HTTP 429 on exceed. Applied to:
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/forgot-password`
- `POST /api/auth/resend-confirmation`

#### 2B: Password Policy
**Problem**: Users could register with single-character passwords.

**Fix**: `validate_password_strength()` enforces:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit

Applied to registration and password reset endpoints.

#### 2C: Logout & Token Revocation
**Problem**: Stolen JWT tokens could not be revoked until 24-hour expiry.

**Fix**:
- Added `jti` (JWT ID) claim to all tokens using `secrets.token_hex(16)`
- In-memory `_token_blacklist` set checked on every `verify_token()` call
- `POST /api/auth/logout` endpoint adds token's `jti` to blacklist
- Blacklist persisted to `token_blacklist` DB table for cross-restart durability
- Blacklist loaded from DB on server startup
- Expired entries cleaned up on each logout call

**Migration**: `token_blacklist` table with `jti VARCHAR(64) PRIMARY KEY` and `expires_at TIMESTAMPTZ` + index.

### Batch 3: Input Validation & File Upload Security

#### 3A: Pydantic Model Validation
**Problem**: Unbounded string fields allowed payload-based DOS.

**Fix**: Added `Field(max_length=N)` to all key Pydantic models:

| Model | Field | Max Length |
|-------|-------|-----------|
| `RegisterRequest` | name | 100 |
| `RegisterRequest` | business_name | 200 |
| `RegisterRequest` | password | 128 |
| `LoginRequest` | password | 128 |
| `TenantConfigUpdate` | business_name | 200 |
| `TenantConfigUpdate` | business_description | 2000 |
| `TenantConfigUpdate` | products_services | 5000 |
| `TenantConfigUpdate` | faq_objections | 5000 |
| `TenantConfigUpdate` | greeting_message | 1000 |
| `TenantConfigUpdate` | closing_message | 1000 |
| `TenantConfigUpdate` | other string fields | 50-100 |
| `ResetPasswordRequest` | new_password | 128 |
| `ResetPasswordRequest` | token | 256 |

#### 3B: File Upload Magic Byte Validation
**Problem**: Extension-only checks allowed uploading disguised executables (e.g., rename .exe to .pdf).

**Fix**: `validate_file_magic()` verifies first bytes of uploaded files against expected magic bytes:

| Format | Magic Bytes |
|--------|------------|
| PDF | `%PDF` |
| DOCX/XLSX | `PK\x03\x04` (ZIP/OOXML) |
| XLS | `\xd0\xcf\x11\xe0` (OLE2) |
| PNG | `\x89PNG` |
| JPG/JPEG | `\xff\xd8\xff` |
| GIF | `GIF87a` / `GIF89a` |
| WEBP | `RIFF` |
| CSV/TXT | Skipped (text-based) |

Applied to: document upload, global document upload, and media upload endpoints.

### Batch 4: Debug Endpoint Removal, Security Headers & CSRF

#### 4A: Debug Endpoint Removal
**Problem**: `GET /api/debug/email-test` was unauthenticated and exposed API key prefix and sender email.

**Fix**: Entire endpoint deleted (lines 952-996).

#### 4B: Security Headers Middleware
**Problem**: No security headers — missing HSTS, clickjacking protection, MIME sniffing protection.

**Fix**: HTTP middleware adds to every response:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HTTPS only)

#### 4C: CSRF Origin Checking
**Problem**: CORS alone is insufficient for CSRF protection on state-changing requests.

**Fix**: Middleware validates `Origin` (or `Referer`) header on POST/PUT/DELETE/PATCH requests against configured `CORS_ORIGINS`. Exempt paths:
- `/api/telegram/webhook/*` (inbound webhooks)
- `/api/instagram/webhook/*` (inbound webhooks)
- `/health`, `/api/health` (health checks)

Requests with no Origin header pass through (allows Postman/curl usage).

### Batch 5: Security Page (Frontend)

**New file**: `frontend/src/pages/SecurityPage.js`
**Route**: `/security` (public, no auth required)

Sections:
1. **Hero** — "Security at LeadRelay" with commitment statement
2. **Security Practices** — 6-card grid (Encryption at Rest, Encryption in Transit, Authentication, Access Control, Infrastructure, Monitoring)
3. **AI & Data Handling** — How GPT-4o processes messages (no training, context-window only, per-request)
4. **Integration Security** — Telegram, Instagram, Bitrix24 security details
5. **Data Practices** — GDPR Article 17 & 20, data retention, data minimization
6. **Compliance Roadmap** — Checklist of implemented vs. planned items (SOC 2, pen testing, bug bounty)
7. **Vulnerability Disclosure** — Contact security@leadrelay.net

### Batch 6: Landing Page Trust Section

**File**: `frontend/src/pages/LandingPage.js`

Added above the footer:
- **Trust badges section** with 4 cards: Encrypted at Rest, GDPR Ready, Multi-Tenant Isolation, Webhook Verified
- **"Learn more" link** to `/security` page
- **Security link** added to footer Legal navigation

---

## Database Migrations (Phase 2)

| Migration | Purpose |
|-----------|---------|
| `create_token_blacklist` | JWT revocation table (`jti`, `expires_at`) |
| `enable_rls_token_blacklist_and_media` | RLS + policies for `token_blacklist` (service-role only) and `media_library` (tenant isolation) |

---

## Verification Checklist

| Test | Expected Result | Status |
|------|----------------|--------|
| Hit 500-error endpoints | Response says "An internal error occurred" | Done |
| 6 rapid login attempts | 6th returns HTTP 429 | Done |
| Register with "abc" | Fails with password complexity message | Done |
| Login → logout → reuse token | Token rejected after logout | Done |
| Send 1MB business_name | Fails with validation error | Done |
| Rename .exe to .pdf, upload | Fails magic byte check | Done |
| `GET /api/debug/email-test` | Returns 404 (endpoint removed) | Done |
| Check response headers | Includes X-Content-Type-Options, X-Frame-Options, etc. | Done |
| POST from foreign origin | Returns 403 "Origin not allowed" | Done |
| Visit `/security` | Renders all 7 sections | Done |
| Landing page trust section | 4 badges visible, link to /security works | Done |
| Supabase security advisors | `token_blacklist` and `media_library` RLS enabled | Done |

---

## Files Modified (Phase 2 Summary)

| File | Changes |
|------|---------|
| `backend/server.py` | Error sanitization (35 locations), auth rate limiting, password policy, logout endpoint, input validation, file magic bytes, debug removal, security headers, CSRF |
| `frontend/src/pages/SecurityPage.js` | **NEW** — Public security practices page |
| `frontend/src/App.js` | Added `/security` route |
| `frontend/src/pages/LandingPage.js` | Trust section + footer security link |
| Supabase | `token_blacklist` table + RLS policies |

---

## Environment Variables

No new environment variables were added. All changes use existing config:
- `CORS_ORIGINS` — Used by CSRF middleware
- `JWT_SECRET` — Used for token JTI claims

---

## Architecture Decisions

1. **In-memory rate limiter** — Acceptable for single-instance deployment on Render. For multi-instance, would need Redis.
2. **In-memory token blacklist + DB persistence** — Hybrid approach gives fast verification with restart durability. Expired entries auto-cleaned.
3. **CSRF via Origin header** — Chosen over CSRF tokens because the API is stateless JWT-based. Origin checking is the standard approach for token-authenticated APIs.
4. **Generic error messages** — All 500 responses use the same generic message. Structured logging with `logger.exception()` preserves full stack traces server-side.
