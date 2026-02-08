# Bitrix24 MCP Integration - Technical Design Document

## Overview
This document outlines the technical implementation for integrating Bitrix24 CRM via MCP (Model Context Protocol) connection token. This approach allows tenants to connect their Bitrix24 portals without requiring OAuth flows or marketplace apps.

---

## 1. Data Model

### Option A: Extend `tenants` Table (Recommended)
Add these columns to the existing `tenants` table:

```sql
ALTER TABLE tenants ADD COLUMN bitrix_mcp_token TEXT;
ALTER TABLE tenants ADD COLUMN bitrix_mcp_url TEXT DEFAULT 'https://mcp.bitrix24.com/mcp/';
ALTER TABLE tenants ADD COLUMN bitrix_mcp_connected_at TIMESTAMPTZ;
```

### Option B: Separate Table (Alternative)
If preferred, create a dedicated table:

```sql
CREATE TABLE integrations_bitrix_mcp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) UNIQUE,
    mcp_token TEXT NOT NULL,
    mcp_url TEXT DEFAULT 'https://mcp.bitrix24.com/mcp/',
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'active', -- active, error, paused
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE integrations_bitrix_mcp ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON integrations_bitrix_mcp
    FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

## 2. Backend Implementation

### 2.1 Pydantic Models

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class BitrixMcpConnect(BaseModel):
    mcp_token: str = Field(..., min_length=10, description="Bitrix24 MCP connection token")
    mcp_url: Optional[str] = Field(default="https://mcp.bitrix24.com/mcp/", description="MCP server URL")

class BitrixMcpStatus(BaseModel):
    connected: bool
    mcp_url: Optional[str]
    connected_at: Optional[datetime]
    last_sync_at: Optional[datetime]
    sync_status: Optional[str]

class BitrixMcpTestResult(BaseModel):
    ok: bool
    message: Optional[str]
    portal_info: Optional[dict]
```

### 2.2 MCP Client Module

```python
import httpx
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)

# Constants
DEFAULT_MCP_URL = "https://mcp.bitrix24.com/mcp/"
MCP_TIMEOUT = 30.0

class BitrixMcpClient:
    """Client for Bitrix24 MCP API"""
    
    def __init__(self, tenant_id: str, token: str, mcp_url: str = DEFAULT_MCP_URL):
        self.tenant_id = tenant_id
        self.token = token
        self.mcp_url = mcp_url.rstrip('/')
    
    async def _call(self, method: str, params: dict = None) -> dict:
        """Make MCP API call"""
        # MCP uses JSON-RPC 2.0 format
        payload = {
            "jsonrpc": "2.0",
            "id": str(uuid.uuid4()),
            "method": method,
            "params": params or {}
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"  # May need adjustment per Bitrix docs
        }
        
        async with httpx.AsyncClient(timeout=MCP_TIMEOUT) as client:
            response = await client.post(
                self.mcp_url,
                json=payload,
                headers=headers
            )
            
            if not response.is_success:
                raise BitrixMcpError(f"MCP request failed: {response.status_code} - {response.text}")
            
            result = response.json()
            
            if "error" in result:
                raise BitrixMcpError(f"MCP error: {result['error']}")
            
            return result.get("result", {})
    
    async def test_connection(self) -> dict:
        """Test the MCP connection"""
        try:
            # Call a simple method to verify connection
            result = await self._call("crm.lead.list", {"select": ["ID"], "limit": 1})
            return {"ok": True, "message": "Connection successful"}
        except Exception as e:
            return {"ok": False, "message": str(e)}
    
    async def create_lead(self, data: dict) -> str:
        """Create a new lead in Bitrix24"""
        fields = {
            "TITLE": data.get("name", "New Lead from TeleAgent"),
            "NAME": data.get("name"),
            "PHONE": [{"VALUE": data.get("phone"), "VALUE_TYPE": "WORK"}] if data.get("phone") else None,
            "COMMENTS": self._build_comments(data),
            "SOURCE_ID": "TELEGRAM",  # Custom source
            "UF_CRM_TELEAGENT_SCORE": data.get("score", 50),
            "UF_CRM_TELEAGENT_HOTNESS": data.get("hotness", "warm")
        }
        
        # Remove None values
        fields = {k: v for k, v in fields.items() if v is not None}
        
        result = await self._call("crm.lead.add", {"fields": fields})
        return str(result)
    
    async def update_lead(self, lead_id: str, data: dict) -> None:
        """Update an existing lead"""
        fields = {}
        
        if data.get("name"):
            fields["NAME"] = data["name"]
        if data.get("phone"):
            fields["PHONE"] = [{"VALUE": data["phone"], "VALUE_TYPE": "WORK"}]
        if data.get("score") is not None:
            fields["UF_CRM_TELEAGENT_SCORE"] = data["score"]
        if data.get("hotness"):
            fields["UF_CRM_TELEAGENT_HOTNESS"] = data["hotness"]
        if data.get("status"):
            fields["STATUS_ID"] = self._map_status(data["status"])
        
        if data.get("notes"):
            fields["COMMENTS"] = data["notes"]
        
        if fields:
            await self._call("crm.lead.update", {"id": lead_id, "fields": fields})
    
    async def find_lead_by_phone(self, phone: str) -> List[dict]:
        """Find leads by phone number"""
        result = await self._call("crm.lead.list", {
            "filter": {"PHONE": phone},
            "select": ["ID", "TITLE", "NAME", "STATUS_ID", "UF_CRM_TELEAGENT_SCORE", "UF_CRM_TELEAGENT_HOTNESS"]
        })
        return result if isinstance(result, list) else []
    
    async def get_lead(self, lead_id: str) -> Optional[dict]:
        """Get lead details"""
        try:
            return await self._call("crm.lead.get", {"id": lead_id})
        except:
            return None
    
    def _build_comments(self, data: dict) -> str:
        """Build comments field from lead data"""
        lines = ["=== TeleAgent Lead ==="]
        
        if data.get("product"):
            lines.append(f"Product Interest: {data['product']}")
        if data.get("budget"):
            lines.append(f"Budget: {data['budget']}")
        if data.get("timeline"):
            lines.append(f"Timeline: {data['timeline']}")
        if data.get("intent"):
            lines.append(f"Intent: {data['intent']}")
        if data.get("notes"):
            lines.append(f"Notes: {data['notes']}")
        
        lines.append(f"Score: {data.get('score', 50)}/100")
        lines.append(f"Hotness: {data.get('hotness', 'warm')}")
        
        return "\n".join(lines)
    
    def _map_status(self, status: str) -> str:
        """Map TeleAgent status to Bitrix24 status ID"""
        mapping = {
            "new": "NEW",
            "qualified": "UC_QUALIFIED",
            "contacted": "IN_PROCESS",
            "won": "CONVERTED",
            "lost": "JUNK"
        }
        return mapping.get(status, "NEW")


class BitrixMcpError(Exception):
    """Custom exception for Bitrix MCP errors"""
    pass
```

### 2.3 API Endpoints

```python
# Add to server.py

@api_router.post("/bitrix-mcp/connect")
async def connect_bitrix_mcp(
    request: BitrixMcpConnect, 
    current_user: Dict = Depends(get_current_user)
):
    """Connect Bitrix24 via MCP token"""
    tenant_id = current_user["tenant_id"]
    
    # Test the connection first
    client = BitrixMcpClient(tenant_id, request.mcp_token, request.mcp_url)
    test_result = await client.test_connection()
    
    if not test_result["ok"]:
        raise HTTPException(status_code=400, detail=f"Connection failed: {test_result['message']}")
    
    # Save to database
    update_data = {
        "bitrix_mcp_token": request.mcp_token,
        "bitrix_mcp_url": request.mcp_url,
        "bitrix_mcp_connected_at": now_iso()
    }
    
    supabase.table('tenants').update(update_data).eq('id', tenant_id).execute()
    
    return {
        "success": True,
        "message": "Bitrix24 connected successfully",
        "connected_at": update_data["bitrix_mcp_connected_at"]
    }


@api_router.post("/bitrix-mcp/test")
async def test_bitrix_mcp(current_user: Dict = Depends(get_current_user)):
    """Test existing Bitrix24 MCP connection"""
    tenant_id = current_user["tenant_id"]
    
    # Get stored credentials
    result = supabase.table('tenants').select('bitrix_mcp_token, bitrix_mcp_url').eq('id', tenant_id).execute()
    
    if not result.data or not result.data[0].get('bitrix_mcp_token'):
        raise HTTPException(status_code=400, detail="Bitrix24 MCP not configured")
    
    tenant = result.data[0]
    client = BitrixMcpClient(tenant_id, tenant['bitrix_mcp_token'], tenant.get('bitrix_mcp_url', DEFAULT_MCP_URL))
    
    return await client.test_connection()


@api_router.post("/bitrix-mcp/disconnect")
async def disconnect_bitrix_mcp(current_user: Dict = Depends(get_current_user)):
    """Disconnect Bitrix24 MCP"""
    tenant_id = current_user["tenant_id"]
    
    supabase.table('tenants').update({
        "bitrix_mcp_token": None,
        "bitrix_mcp_url": None,
        "bitrix_mcp_connected_at": None
    }).eq('id', tenant_id).execute()
    
    return {"success": True, "message": "Bitrix24 disconnected"}


@api_router.get("/bitrix-mcp/status")
async def get_bitrix_mcp_status(current_user: Dict = Depends(get_current_user)):
    """Get Bitrix24 MCP connection status"""
    tenant_id = current_user["tenant_id"]
    
    result = supabase.table('tenants').select(
        'bitrix_mcp_token, bitrix_mcp_url, bitrix_mcp_connected_at'
    ).eq('id', tenant_id).execute()
    
    if not result.data:
        return BitrixMcpStatus(connected=False)
    
    tenant = result.data[0]
    return BitrixMcpStatus(
        connected=bool(tenant.get('bitrix_mcp_token')),
        mcp_url=tenant.get('bitrix_mcp_url'),
        connected_at=tenant.get('bitrix_mcp_connected_at')
    )
```

### 2.4 Integration with Message Processing

Update the `process_telegram_message` function to sync leads to Bitrix24:

```python
async def sync_lead_to_bitrix_mcp(tenant_id: str, customer: dict, lead_data: dict):
    """Sync lead to Bitrix24 via MCP"""
    try:
        # Get MCP credentials
        result = supabase.table('tenants').select(
            'bitrix_mcp_token, bitrix_mcp_url'
        ).eq('id', tenant_id).execute()
        
        if not result.data or not result.data[0].get('bitrix_mcp_token'):
            return  # MCP not configured
        
        tenant = result.data[0]
        client = BitrixMcpClient(
            tenant_id, 
            tenant['bitrix_mcp_token'], 
            tenant.get('bitrix_mcp_url', DEFAULT_MCP_URL)
        )
        
        # Get phone if available
        phone = lead_data.get('fields_collected', {}).get('phone')
        
        # Check if lead exists by phone
        existing_leads = []
        if phone:
            existing_leads = await client.find_lead_by_phone(phone)
        
        # Prepare lead data
        crm_data = {
            "name": customer.get('name') or lead_data.get('fields_collected', {}).get('name'),
            "phone": phone,
            "product": lead_data.get('fields_collected', {}).get('product'),
            "budget": lead_data.get('fields_collected', {}).get('budget'),
            "intent": lead_data.get('intent'),
            "score": lead_data.get('score', 50),
            "hotness": lead_data.get('hotness', 'warm')
        }
        
        if existing_leads:
            # Update existing lead
            lead_id = existing_leads[0]['ID']
            await client.update_lead(lead_id, crm_data)
            logger.info(f"Updated Bitrix24 lead {lead_id} for tenant {tenant_id}")
        else:
            # Create new lead
            lead_id = await client.create_lead(crm_data)
            logger.info(f"Created Bitrix24 lead {lead_id} for tenant {tenant_id}")
            
            # Store CRM lead ID in local database
            # (Optional: Add crm_lead_id column to leads table)
        
    except Exception as e:
        logger.error(f"Bitrix24 MCP sync error for tenant {tenant_id}: {e}")
```

---

## 3. Frontend Implementation

### 3.1 Bitrix24 Connection UI Component

Create `/app/frontend/src/components/BitrixMcpConnection.js`:

```jsx
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  Link2, 
  Unlink, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function BitrixMcpConnection({ token }) {
  const [status, setStatus] = useState({ connected: false, loading: true });
  const [mcpToken, setMcpToken] = useState('');
  const [mcpUrl, setMcpUrl] = useState('https://mcp.bitrix24.com/mcp/');
  const [showToken, setShowToken] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/bitrix-mcp/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setStatus({ ...data, loading: false });
    } catch (error) {
      setStatus({ connected: false, loading: false });
    }
  };

  const handleConnect = async () => {
    if (!mcpToken.trim()) {
      toast.error('Please enter your MCP token');
      return;
    }

    setConnecting(true);
    try {
      const response = await fetch(`${API_URL}/api/bitrix-mcp/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ mcp_token: mcpToken, mcp_url: mcpUrl })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Bitrix24 connected successfully!');
        setMcpToken('');
        fetchStatus();
      } else {
        toast.error(data.detail || 'Connection failed');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await fetch(`${API_URL}/api/bitrix-mcp/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.ok) {
        toast.success('Connection test successful!');
      } else {
        toast.error(`Test failed: ${data.message}`);
      }
    } catch (error) {
      toast.error('Test failed. Please check your connection.');
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Bitrix24?')) return;

    try {
      const response = await fetch(`${API_URL}/api/bitrix-mcp/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        toast.success('Bitrix24 disconnected');
        fetchStatus();
      }
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  if (status.loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <img 
                  src="/bitrix24-icon.svg" 
                  alt="Bitrix24" 
                  className="w-5 h-5"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
              Bitrix24 CRM
            </CardTitle>
            <CardDescription className="mt-1">
              Connect your Bitrix24 portal to automatically sync leads
            </CardDescription>
          </div>
          {status.connected && (
            <div className="flex items-center gap-1 text-emerald-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              Connected
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {status.connected ? (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">MCP Connection Active</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Connected on {new Date(status.connected_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleTest}
                    disabled={testing}
                  >
                    {testing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-1" />
                    )}
                    Test
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={handleDisconnect}
                  >
                    <Unlink className="w-4 h-4 mr-1" />
                    Disconnect
                  </Button>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-slate-500">
              Leads will automatically sync to your Bitrix24 CRM when customers interact with your bot.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-2">How to get your MCP token:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Go to your Bitrix24 portal</li>
                <li>Navigate to <strong>Apps → MCP Connections</strong></li>
                <li>Click <strong>Get Connection Token</strong></li>
                <li>Copy and paste the token below</li>
              </ol>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="mcp-token">MCP Token</Label>
                <div className="relative mt-1">
                  <Input
                    id="mcp-token"
                    type={showToken ? 'text' : 'password'}
                    value={mcpToken}
                    onChange={(e) => setMcpToken(e.target.value)}
                    placeholder="Paste your Bitrix24 MCP token"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="mcp-url">MCP URL (Advanced)</Label>
                <Input
                  id="mcp-url"
                  value={mcpUrl}
                  onChange={(e) => setMcpUrl(e.target.value)}
                  placeholder="https://mcp.bitrix24.com/mcp/"
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Only change this if instructed by Bitrix24 support
                </p>
              </div>
            </div>
            
            <Button 
              onClick={handleConnect}
              disabled={connecting || !mcpToken.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              Connect Bitrix24
            </Button>
            
            <a 
              href="https://helpdesk.bitrix24.com/open/18465692/" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              Learn more about MCP connections
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 4. Security Considerations

1. **Token Storage**: Store MCP tokens encrypted at rest (consider using Supabase Vault or similar)
2. **RLS Policies**: Ensure tokens are only accessible to the tenant owner
3. **Rate Limiting**: Implement rate limiting for MCP calls to avoid Bitrix24 API limits
4. **Error Handling**: Never expose raw MCP errors to users (could leak token info)
5. **Audit Logging**: Log all CRM sync operations for debugging

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Add database columns to tenants table
- [ ] Implement BitrixMcpClient class
- [ ] Create connect/disconnect/test endpoints
- [ ] Basic error handling

### Phase 2: CRM Integration (Week 2)
- [ ] Implement create_lead method
- [ ] Implement update_lead method
- [ ] Implement find_lead_by_phone method
- [ ] Wire into message processing flow

### Phase 3: UI & Polish (Week 3)
- [ ] Create BitrixMcpConnection component
- [ ] Add to Connections page
- [ ] Add status indicators
- [ ] Comprehensive error messages

### Phase 4: Testing & Docs (Week 4)
- [ ] Unit tests for MCP client
- [ ] Integration tests
- [ ] User documentation
- [ ] Error recovery procedures

---

## 6. Open Questions

1. **MCP Authentication Header**: The exact header format for MCP authentication needs verification from Bitrix24 docs
2. **Custom Fields**: Should we create custom fields in Bitrix24 for TeleAgent-specific data (score, hotness)?
3. **Bi-directional Sync**: Should changes in Bitrix24 be synced back to TeleAgent?
4. **Webhook Support**: Does MCP support webhooks for real-time updates?

---

## 7. References

- [Bitrix24 MCP Documentation](https://helpdesk.bitrix24.com/open/18465692/)
- [Bitrix24 REST API Reference](https://training.bitrix24.com/rest_help/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
