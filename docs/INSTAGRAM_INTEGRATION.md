# Instagram DM Integration

## Overview

LeadRelay supports Instagram Direct Messages as a sales channel alongside Telegram. The same AI sales agent serves both channels through a channel-agnostic message processing architecture.

**Scope**: Text-only MVP. Images, stickers, and attachments are ignored.

---

## Complete Setup Guide

Follow these steps in order. The code is already deployed; you only need to configure Meta and your environment variables.

### Prerequisites

Before starting, make sure you have:

- A **Facebook account** with admin access to a Facebook Page
- An **Instagram Business or Creator account** linked to that Facebook Page
- Access to your **Render dashboard** (to set environment variables)
- Your backend deployed and accessible at its public URL

---

### Step 1: Confirm Your Backend URL

The Instagram OAuth flow requires Meta to redirect back to your backend. You need to know your backend's public URL.

**On Render**, your backend gets an auto-assigned URL like `https://your-app-name.onrender.com`. Alternatively, you may have a custom domain.

Check which environment variable your backend uses by looking at what is set on Render:

| Variable | Purpose |
|----------|---------|
| `BACKEND_PUBLIC_URL` | Preferred. Set this to your backend's public URL |
| `RENDER_EXTERNAL_URL` | Auto-set by Render. Fallback if `BACKEND_PUBLIC_URL` is not set |
| `REACT_APP_BACKEND_URL` | Last fallback. May already be set |

The OAuth redirect URI will be: `{your-backend-url}/api/instagram/oauth/callback`

**Action**: Note down your backend's public URL. You will need it in Steps 3 and 4.

---

### Step 2: Create a Meta Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **"My Apps"** in the top-right corner
3. Click **"Create App"**
4. Choose app type: **"Business"**
5. Fill in:
   - **App name**: `LeadRelay` (or any name you prefer)
   - **App contact email**: your email
   - **Business Account**: select yours (or create one)
6. Click **"Create App"**

After creation, you will land on the App Dashboard. Note down:

- **App ID** (shown at the top of the dashboard)
- **App Secret** (click "Show" next to App Secret; you may need to re-enter your password)

---

### Step 3: Configure Instagram Messaging

From your Meta App Dashboard:

1. In the left sidebar, click **"Add Product"**
2. Find **"Messenger"** and click **"Set Up"**
   - (Messenger covers both Facebook and Instagram messaging)
3. Under **"Instagram Settings"**:
   - Click **"Connect"** or **"Add Instagram Account"**
   - Log in with the Instagram Business account you want to automate
   - Grant all requested permissions

#### Configure Permissions

In the App Dashboard sidebar, go to **"App Review" > "Permissions and Features"**. Request the following:

| Permission | Purpose |
|------------|---------|
| `instagram_basic` | Read Instagram account info |
| `instagram_manage_messages` | Send and receive DMs |
| `pages_manage_metadata` | Subscribe to webhook events |
| `pages_messaging` | Send messages via the Page |

For development/testing, these permissions work immediately for your own accounts. For production (other users connecting their accounts), you need Meta App Review (Step 7).

---

### Step 4: Configure the Webhook

Still in the Meta App Dashboard:

1. Go to **"Messenger" > "Instagram Settings"** (or **"Webhooks"** section)
2. Click **"Configure Webhooks"** (or **"Edit Callback URL"**)
3. Fill in:
   - **Callback URL**: `https://{your-backend-url}/api/instagram/webhook`
     - Example: `https://your-app.onrender.com/api/instagram/webhook`
   - **Verify Token**: Choose a random secret string (e.g., `my_leadrelay_ig_verify_2024`)
     - Write this down; you will put it in your environment variables
4. Click **"Verify and Save"**
   - Meta sends a GET request to your callback URL with the verify token
   - Your backend must be running and accessible for this to succeed
5. After verification succeeds, **subscribe to these webhook fields**:
   - `messages`
   - `messaging_postbacks`

**Important**: Your backend must already be deployed with the `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` environment variable set (Step 5) before Meta can verify the webhook. If you have not set the env var yet, do Step 5 first, deploy, then come back to this step.

---

### Step 5: Set Environment Variables

Add these three variables to your backend environment. On Render, go to your backend service > "Environment" tab.

| Variable | Value | Where to find it |
|----------|-------|-------------------|
| `META_APP_ID` | Your Meta App ID (e.g., `123456789012345`) | Meta App Dashboard, top of page |
| `META_APP_SECRET` | Your Meta App Secret | Meta App Dashboard > "Settings" > "Basic" > "App Secret" |
| `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` | The random string you chose in Step 4 | You created this yourself |

Also ensure these are set (they likely already are):

| Variable | Value |
|----------|-------|
| `BACKEND_PUBLIC_URL` | Your backend's public URL (e.g., `https://your-app.onrender.com`) |
| `FRONTEND_URL` | Your frontend URL (e.g., `https://leadrelay.net`) |

**Action**: After setting these, redeploy your backend on Render.

---

### Step 6: Configure OAuth Redirect URI in Meta

Meta requires you to whitelist the exact redirect URI your app uses.

1. In the Meta App Dashboard, go to **"Settings" > "Basic"**
2. Scroll down to **"App Domains"**:
   - Add your backend domain (e.g., `your-app.onrender.com`)
3. Go to **"Facebook Login" > "Settings"** (if the product is added) or **"Use Cases" > "Authenticate and request data"**
4. Under **"Valid OAuth Redirect URIs"**, add:
   ```
   https://{your-backend-url}/api/instagram/oauth/callback
   ```
   - Example: `https://your-app.onrender.com/api/instagram/oauth/callback`
5. Click **"Save Changes"**

---

### Step 7: Test the Integration

After deploying with the environment variables set:

1. **Log in to LeadRelay** at your frontend URL
2. Go to **"Connections"** in the sidebar
3. You should see an **"Instagram DM"** card
4. Click **"Connect"**
5. This redirects you to Facebook/Instagram to authorize
6. After authorizing, you are redirected back to LeadRelay with a success message
7. **Send a DM** to your connected Instagram Business account from a different Instagram account
8. The AI agent should respond automatically

#### Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "Connect" button does nothing | `META_APP_ID` not set | Check Render env vars, redeploy |
| OAuth redirects to a 404 | Redirect URI mismatch | Ensure `BACKEND_PUBLIC_URL` is correct and the URI is whitelisted in Meta |
| Webhook verification fails | `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` mismatch | Ensure the value in Render matches what you entered in Meta |
| DMs are received but no response | Check backend logs | Look for errors in Render logs; common: token expired, missing permissions |
| Bot responds to its own messages | Should not happen | Two layers of echo prevention are built in |

---

### Step 8: Submit for Meta App Review (Production)

For your own accounts, the integration works immediately. For other LeadRelay users to connect their Instagram accounts, Meta requires App Review.

1. In the Meta App Dashboard, go to **"App Review" > "Requests"**
2. Click **"Request Permissions"** for:
   - `instagram_basic`
   - `instagram_manage_messages`
   - `pages_manage_metadata`
   - `pages_messaging`
3. For each permission, you need to provide:
   - **A description** of why you need it
   - **A screencast** (2-5 minutes) showing the feature in action
4. Record a screencast showing:
   - A user connecting their Instagram in LeadRelay
   - A customer sending a DM to the connected Instagram
   - The AI agent replying automatically
   - The conversation appearing in LeadRelay's dialogue page
5. Submit the review request
6. Meta typically reviews within 1-5 business days

Once approved, any Instagram Business account can connect via OAuth.

---

## Technical Reference

### Architecture

```
Instagram User sends DM
        |
        v
  Meta Webhook (POST /api/instagram/webhook)
        |
        v
  parse_instagram_webhook()  -->  Skip non-text, skip echoes
        |
        v
  Lookup instagram_accounts by page_id  -->  Get tenant_id + access_token
        |
        v
  process_instagram_message()  (thin wrapper)
        |
        v
  process_channel_message()  (shared with Telegram)
        |
        v
  AI Agent generates response  -->  ig_send_message()
```

### Channel-Agnostic Design

`process_channel_message()` in `server.py` handles all shared logic:
- Tenant config lookup, greeting handling
- Customer get/create, conversation get/create
- Message history, RAG context, lead scoring
- LLM call, response validation, human handoff
- CRM updates, event logging

Each channel provides a thin wrapper that:
1. Parses channel-specific message format
2. Provides `send_fn` (how to send a reply) and optional `typing_fn`
3. Calls `process_channel_message()` with `channel="telegram"` or `channel="instagram"`

### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `backend/instagram_service.py` | Created | Instagram Graph API client (OAuth, messaging, webhooks) |
| `backend/server.py` | Modified | Added endpoints, refactored message processing, token refresh |
| `frontend/src/pages/InstagramSetupPage.js` | Created | Instagram connection page with OAuth flow |
| `frontend/src/pages/AgentOnboarding.js` | Modified | Step 2 is now "Channels" with both Telegram and Instagram |
| `frontend/src/pages/ConnectionsPage.js` | Modified | Added Instagram DM card |
| `frontend/src/pages/AgentDialoguePage.js` | Modified | Dynamic channel icons (Telegram blue, Instagram pink) |
| `frontend/src/pages/TelegramSetupPage.js` | Modified | Design consistency fixes (icon containers) |
| `frontend/src/App.js` | Modified | Added Instagram routes |
| `migrations/004_instagram_integration.sql` | Created | Database schema for Instagram integration |

### Database Schema

#### `instagram_accounts` table
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID, PK | Primary key |
| `tenant_id` | UUID, FK | References tenants(id) |
| `instagram_page_id` | VARCHAR(100) | Connected Facebook Page ID |
| `instagram_user_id` | VARCHAR(100) | Instagram Business account ID |
| `instagram_username` | VARCHAR(255) | Instagram username |
| `access_token` | TEXT | Long-lived Page access token (60-day) |
| `token_expires_at` | TIMESTAMPTZ | When the token expires |
| `token_refreshed_at` | TIMESTAMPTZ | Last refresh timestamp |
| `is_active` | BOOLEAN | Whether the connection is active |
| `last_webhook_at` | TIMESTAMPTZ | Last webhook received |
| `created_at` | TIMESTAMPTZ | When the account was connected |

#### Added columns on existing tables
- `customers.instagram_user_id` (VARCHAR) - Instagram user ID for customer matching
- `customers.instagram_username` (VARCHAR) - Instagram username
- `conversations.source_channel` (VARCHAR, default 'telegram') - Which channel the conversation came from

#### Row Level Security
RLS is enabled on `instagram_accounts` with a service-role-only policy.

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/instagram/oauth/start` | JWT | Returns `{oauth_url}` for Meta OAuth |
| GET | `/api/instagram/oauth/callback` | State JWT | Meta redirects here after user authorizes |
| GET | `/api/instagram/account` | JWT | Get connected IG account details |
| DELETE | `/api/instagram/account` | JWT | Disconnect (deactivate) IG account |
| GET | `/api/instagram/webhook` | Verify token | Meta webhook verification (echo challenge) |
| POST | `/api/instagram/webhook` | None (Meta) | Receive DM webhook events |
| GET | `/api/integrations/status` | JWT | Now includes `instagram` key in response |

### Token Refresh

A background loop runs every 6 hours to refresh tokens expiring within 10 days. Long-lived tokens last 60 days. The loop sleeps first on startup to avoid an unnecessary immediate refresh.

### Self-Message Prevention

Two layers of defense prevent the bot from responding to its own messages:
1. `parse_instagram_webhook()` skips messages with `is_echo: true`
2. Webhook handler skips messages where `sender_id` matches `page_id` or `instagram_user_id`
