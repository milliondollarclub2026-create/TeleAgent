"""
Bitrix24 CRM Integration Module
Provides full CRM access via webhook URL for:
- Lead management (create, update, list, search)
- Deal tracking
- Product catalog
- Contact management
- Analytics and insights
"""

import httpx
import logging
import asyncio
import time
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from collections import defaultdict
import json

logger = logging.getLogger(__name__)

# Bitrix24 REST API timeout
BITRIX_TIMEOUT = 30.0

# Bitrix24 rate limiting: max 2 requests per second per webhook
BITRIX_MAX_REQUESTS_PER_SECOND = 2
BITRIX_RATE_LIMIT_WINDOW = 1.0  # seconds


class BitrixRateLimiter:
    """Rate limiter for Bitrix24 API calls to prevent hitting rate limits"""

    def __init__(self, max_requests: int = BITRIX_MAX_REQUESTS_PER_SECOND, window: float = BITRIX_RATE_LIMIT_WINDOW):
        self.max_requests = max_requests
        self.window = window
        self._requests = defaultdict(list)
        self._lock = asyncio.Lock()

    async def acquire(self, webhook_url: str):
        """Wait until we can make a request without hitting rate limit"""
        async with self._lock:
            now = time.time()
            # Clean old entries
            self._requests[webhook_url] = [t for t in self._requests[webhook_url] if now - t < self.window]

            if len(self._requests[webhook_url]) >= self.max_requests:
                # Calculate wait time
                oldest = min(self._requests[webhook_url])
                wait_time = self.window - (now - oldest)
                if wait_time > 0:
                    logger.debug(f"Bitrix rate limit: waiting {wait_time:.2f}s")
                    await asyncio.sleep(wait_time)
                    now = time.time()
                    # Clean again after waiting
                    self._requests[webhook_url] = [t for t in self._requests[webhook_url] if now - t < self.window]

            self._requests[webhook_url].append(now)


# Global rate limiter instance
_bitrix_rate_limiter = BitrixRateLimiter()


class BitrixCRMClient:
    """
    Client for Bitrix24 CRM REST API via webhook.
    Provides comprehensive CRM access for AI-powered sales agents.
    """
    
    def __init__(self, webhook_url: str):
        """
        Initialize with Bitrix24 webhook URL.
        
        Args:
            webhook_url: Full webhook URL like https://portal.bitrix24.kz/rest/1/abc123/
        """
        self.webhook_url = webhook_url.rstrip('/')
        self._http_client = None
    
    async def _call(self, method: str, params: dict = None) -> dict:
        """Make REST API call to Bitrix24 with rate limiting"""
        # Apply rate limiting before making request
        await _bitrix_rate_limiter.acquire(self.webhook_url)

        # Bitrix24 REST API expects method.json or method endpoint
        url = f"{self.webhook_url}/{method}.json"

        try:
            async with httpx.AsyncClient(timeout=BITRIX_TIMEOUT) as client:
                if params:
                    response = await client.post(url, json=params)
                else:
                    response = await client.get(url)
                
                if response.status_code != 200:
                    logger.error(f"Bitrix24 API error: {response.status_code} - {response.text}")
                    raise BitrixAPIError(f"API error: {response.status_code}")
                
                data = response.json()
                
                if "error" in data:
                    error_msg = data.get("error_description", data.get("error", "Unknown error"))
                    logger.error(f"Bitrix24 error: {error_msg}")
                    raise BitrixAPIError(error_msg)
                
                return data.get("result", data)
                
        except httpx.TimeoutException:
            raise BitrixAPIError("Connection timeout - please check your Bitrix24 portal")
        except httpx.RequestError as e:
            raise BitrixAPIError(f"Connection error: {str(e)}")
    
    # ==================== Connection Test ====================
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test the webhook connection and get portal info"""
        try:
            # Get current user info
            user = await self._call("user.current")
            
            # Handle case where user might be a dict or something else
            if not isinstance(user, dict):
                return {"ok": False, "message": f"Unexpected user response type: {type(user)}"}
            
            # Get CRM settings - result can be an integer (mode ID) not a dict
            try:
                crm_settings = await self._call("crm.settings.mode.get")
                # crm.settings.mode.get returns an integer: 0=classic, 1=simple
                if isinstance(crm_settings, int):
                    crm_mode = "SIMPLE" if crm_settings == 1 else "CLASSIC"
                elif isinstance(crm_settings, dict):
                    crm_mode = crm_settings.get("MODE", "CLASSIC")
                else:
                    crm_mode = "CLASSIC"
            except:
                crm_mode = "CLASSIC"
            
            portal_user = f"{user.get('NAME', '')} {user.get('LAST_NAME', '')}".strip()
            
            return {
                "ok": True,
                "portal_user": portal_user,
                "user_email": user.get("EMAIL"),
                "crm_mode": crm_mode,
                "message": "Connection successful!"
            }
        except BitrixAPIError as e:
            return {"ok": False, "message": str(e)}
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"ok": False, "message": f"Unexpected error: {str(e)}"}
    
    # ==================== Lead Management ====================
    
    async def create_lead(self, data: Dict[str, Any]) -> str:
        """
        Create a new lead in Bitrix24.

        All leads go to "NEW" status (Yangi lead) regardless of hotness.
        Hotness is tracked via emoji in title and details in COMMENTS.

        Args:
            data: Lead data with keys: title, name, last_name, phone, email,
                  company, notes, source, hotness, score

        Returns:
            Lead ID
        """
        fields = {
            "TITLE": data.get("title") or f"Lead: {data.get('name', 'Unknown')}",
            "STATUS_ID": "NEW",  # Always "Yangi lead" - hotness shown in title emoji
            "SOURCE_ID": "REPEAT_SALE",  # "Telegram" in Bitrix (or fallback to source param)
            "SOURCE_DESCRIPTION": "TeleAgent AI Sales Bot",
            "OPENED": "Y",  # Visible to all employees
        }

        # Override source if specified and not TELEGRAM
        if data.get("source") and data["source"] not in ["TELEGRAM", "REPEAT_SALE"]:
            fields["SOURCE_ID"] = data["source"]

        # Name fields
        if data.get("name"):
            fields["NAME"] = data["name"]
        if data.get("last_name"):
            fields["LAST_NAME"] = data["last_name"]

        # Contact fields
        if data.get("phone"):
            fields["PHONE"] = [{"VALUE": data["phone"], "VALUE_TYPE": "WORK"}]
        if data.get("email"):
            fields["EMAIL"] = [{"VALUE": data["email"], "VALUE_TYPE": "WORK"}]

        # Company
        if data.get("company"):
            fields["COMPANY_TITLE"] = data["company"]

        # Use notes directly for COMMENTS (built by server.py with full summary)
        if data.get("notes"):
            fields["COMMENTS"] = data["notes"]
        else:
            # Fallback to building comments from data
            fields["COMMENTS"] = self._build_lead_comments(data)

        result = await self._call("crm.lead.add", {"fields": fields})
        lead_id = str(result) if isinstance(result, int) else str(result.get("ID", result))

        logger.info(f"Created Bitrix24 lead: {lead_id}")
        return lead_id

    async def update_lead(self, lead_id: str, data: Dict[str, Any]) -> bool:
        """
        Update an existing lead in Bitrix24.

        Updates title (with hotness emoji), contact info, and COMMENTS summary.
        Does NOT change STATUS_ID - all leads stay in "Yangi lead".
        """
        fields = {}

        # Title with hotness emoji
        if data.get("title"):
            fields["TITLE"] = data["title"]

        # Name fields
        if data.get("name"):
            fields["NAME"] = data["name"]
        if data.get("last_name"):
            fields["LAST_NAME"] = data["last_name"]

        # Contact fields
        if data.get("phone"):
            fields["PHONE"] = [{"VALUE": data["phone"], "VALUE_TYPE": "WORK"}]
        if data.get("email"):
            fields["EMAIL"] = [{"VALUE": data["email"], "VALUE_TYPE": "WORK"}]

        # Company
        if data.get("company"):
            fields["COMPANY_TITLE"] = data["company"]

        # Comments/Notes (full summary from server.py)
        if data.get("notes"):
            fields["COMMENTS"] = data["notes"]

        if fields:
            await self._call("crm.lead.update", {"id": lead_id, "fields": fields})
            logger.info(f"Updated Bitrix24 lead: {lead_id}")

        return True
    
    async def get_lead(self, lead_id: str) -> Optional[Dict]:
        """Get lead details by ID"""
        try:
            return await self._call("crm.lead.get", {"id": lead_id})
        except:
            return None
    
    async def find_leads_by_phone(self, phone: str) -> List[Dict]:
        """Find leads by phone number"""
        try:
            result = await self._call("crm.lead.list", {
                "filter": {"PHONE": phone},
                "select": ["ID", "TITLE", "NAME", "STATUS_ID", "DATE_CREATE", "COMMENTS"]
            })
            return result if isinstance(result, list) else []
        except:
            return []
    
    async def list_leads(self, limit: int = 50, filter_params: dict = None) -> List[Dict]:
        """List leads with optional filters"""
        params = {
            "select": ["ID", "TITLE", "NAME", "PHONE", "STATUS_ID", "DATE_CREATE", "SOURCE_ID"],
            "order": {"DATE_CREATE": "DESC"}
        }
        if filter_params:
            params["filter"] = filter_params
        if limit:
            params["start"] = 0
        
        try:
            result = await self._call("crm.lead.list", params)
            leads = result if isinstance(result, list) else []
            return leads[:limit]
        except:
            return []
    
    async def get_lead_statuses(self) -> List[Dict]:
        """Get all lead statuses"""
        try:
            result = await self._call("crm.status.list", {
                "filter": {"ENTITY_ID": "STATUS"}
            })
            return result if isinstance(result, list) else []
        except:
            return []
    
    # ==================== Deal Management ====================
    
    async def list_deals(self, limit: int = 50, filter_params: dict = None) -> List[Dict]:
        """List deals with optional filters"""
        params = {
            "select": ["ID", "TITLE", "STAGE_ID", "OPPORTUNITY", "CURRENCY_ID", 
                      "CONTACT_ID", "COMPANY_ID", "DATE_CREATE", "CLOSEDATE"],
            "order": {"DATE_CREATE": "DESC"}
        }
        if filter_params:
            params["filter"] = filter_params
        
        try:
            result = await self._call("crm.deal.list", params)
            deals = result if isinstance(result, list) else []
            return deals[:limit]
        except:
            return []
    
    async def get_deal(self, deal_id: str) -> Optional[Dict]:
        """Get deal details"""
        try:
            return await self._call("crm.deal.get", {"id": deal_id})
        except:
            return None
    
    async def get_deal_stages(self) -> List[Dict]:
        """Get all deal stages"""
        try:
            result = await self._call("crm.dealcategory.stage.list", {"id": 0})
            return result if isinstance(result, list) else []
        except:
            return []
    
    # ==================== Product Catalog ====================
    
    async def list_products(self, limit: int = 100) -> List[Dict]:
        """List all products in catalog"""
        try:
            result = await self._call("crm.product.list", {
                "select": ["ID", "NAME", "DESCRIPTION", "PRICE", "CURRENCY_ID", 
                          "ACTIVE", "SECTION_ID", "MEASURE"],
                "filter": {"ACTIVE": "Y"},
                "order": {"NAME": "ASC"}
            })
            products = result if isinstance(result, list) else []
            return products[:limit]
        except:
            return []
    
    async def get_product(self, product_id: str) -> Optional[Dict]:
        """Get product details"""
        try:
            return await self._call("crm.product.get", {"id": product_id})
        except:
            return None
    
    async def search_products(self, query: str) -> List[Dict]:
        """Search products by name"""
        try:
            result = await self._call("crm.product.list", {
                "filter": {"%NAME": query, "ACTIVE": "Y"},
                "select": ["ID", "NAME", "DESCRIPTION", "PRICE", "CURRENCY_ID"]
            })
            return result if isinstance(result, list) else []
        except:
            return []
    
    # ==================== Contact Management ====================
    
    async def find_contact_by_phone(self, phone: str) -> Optional[Dict]:
        """Find contact by phone number"""
        try:
            result = await self._call("crm.contact.list", {
                "filter": {"PHONE": phone},
                "select": ["ID", "NAME", "LAST_NAME", "PHONE", "EMAIL", "DATE_CREATE"]
            })
            contacts = result if isinstance(result, list) else []
            return contacts[0] if contacts else None
        except:
            return None
    
    async def get_contact_history(self, contact_id: str) -> Dict:
        """Get contact's purchase history and interactions"""
        try:
            # Get deals for this contact
            deals = await self._call("crm.deal.list", {
                "filter": {"CONTACT_ID": contact_id},
                "select": ["ID", "TITLE", "STAGE_ID", "OPPORTUNITY", "DATE_CREATE", "CLOSEDATE"]
            })
            
            # Calculate totals
            total_deals = len(deals) if isinstance(deals, list) else 0
            total_value = sum(float(d.get("OPPORTUNITY", 0)) for d in (deals if isinstance(deals, list) else []))
            won_deals = [d for d in (deals if isinstance(deals, list) else []) 
                        if d.get("STAGE_ID", "").startswith("WON")]
            
            return {
                "total_deals": total_deals,
                "won_deals": len(won_deals),
                "total_value": total_value,
                "is_returning_customer": total_deals > 0,
                "recent_deals": deals[:5] if isinstance(deals, list) else []
            }
        except:
            return {"total_deals": 0, "won_deals": 0, "total_value": 0, "is_returning_customer": False}
    
    # ==================== Analytics ====================
    
    async def get_analytics_summary(self, days: int = 30) -> Dict:
        """Get CRM analytics summary for dashboard"""
        try:
            # Get recent leads
            leads = await self.list_leads(limit=500)
            
            # Get recent deals
            deals = await self.list_deals(limit=500)
            
            # Get products
            products = await self.list_products(limit=100)
            
            # Calculate lead stats
            lead_count = len(leads)
            lead_sources = {}
            for lead in leads:
                source = lead.get("SOURCE_ID", "OTHER")
                lead_sources[source] = lead_sources.get(source, 0) + 1
            
            # Calculate deal stats
            deal_count = len(deals)
            total_pipeline = sum(float(d.get("OPPORTUNITY", 0)) for d in deals)
            won_deals = [d for d in deals if "WON" in str(d.get("STAGE_ID", ""))]
            won_value = sum(float(d.get("OPPORTUNITY", 0)) for d in won_deals)
            
            # Deal stages distribution
            stages = {}
            for deal in deals:
                stage = deal.get("STAGE_ID", "UNKNOWN")
                stages[stage] = stages.get(stage, 0) + 1
            
            return {
                "leads": {
                    "total": lead_count,
                    "by_source": lead_sources
                },
                "deals": {
                    "total": deal_count,
                    "pipeline_value": total_pipeline,
                    "won_count": len(won_deals),
                    "won_value": won_value,
                    "by_stage": stages
                },
                "products": {
                    "total": len(products)
                },
                "conversion_rate": (len(won_deals) / lead_count * 100) if lead_count > 0 else 0
            }
        except Exception as e:
            logger.error(f"Analytics error: {e}")
            return {
                "leads": {"total": 0, "by_source": {}},
                "deals": {"total": 0, "pipeline_value": 0, "won_count": 0, "won_value": 0, "by_stage": {}},
                "products": {"total": 0},
                "conversion_rate": 0
            }
    
    async def get_top_products(self, limit: int = 10) -> List[Dict]:
        """Get top selling products based on deal product rows"""
        try:
            # Get recent won deals
            deals = await self._call("crm.deal.list", {
                "filter": {"STAGE_ID": "WON"},
                "select": ["ID"],
                "order": {"DATE_CREATE": "DESC"}
            })
            
            if not deals:
                return []
            
            # Count products in deals
            product_counts = {}
            for deal in deals[:100]:  # Last 100 won deals
                try:
                    products = await self._call("crm.deal.productrows.get", {"id": deal["ID"]})
                    for prod in (products if isinstance(products, list) else []):
                        prod_id = prod.get("PRODUCT_ID")
                        prod_name = prod.get("PRODUCT_NAME", f"Product {prod_id}")
                        if prod_id:
                            if prod_id not in product_counts:
                                product_counts[prod_id] = {"name": prod_name, "count": 0, "revenue": 0}
                            product_counts[prod_id]["count"] += int(prod.get("QUANTITY", 1))
                            product_counts[prod_id]["revenue"] += float(prod.get("PRICE", 0)) * int(prod.get("QUANTITY", 1))
                except:
                    continue
            
            # Sort by count
            sorted_products = sorted(product_counts.values(), key=lambda x: x["count"], reverse=True)
            return sorted_products[:limit]
        except:
            return []
    
    # ==================== CRM Chat AI Context ====================
    
    async def get_context_for_ai(self, question: str) -> str:
        """
        Gather relevant CRM context for AI to answer questions.
        Returns structured data that AI can use to answer CRM-related queries.
        """
        context_parts = []
        
        question_lower = question.lower()
        
        # Keywords for different data types
        lead_keywords = ["lead", "лид", "potential", "prospect", "новые", "new", "hot", "warm", "cold", "качеств"]
        deal_keywords = ["deal", "sale", "сделк", "revenue", "pipeline", "выручк", "доход", "money", "деньг"]
        product_keywords = ["product", "продукт", "товар", "catalog", "price", "цен", "item", "наимен"]
        top_keywords = ["top", "best", "popular", "selling", "лучш", "популярн", "most", "highest", "самы"]
        analytics_keywords = ["analytic", "summary", "overview", "статистик", "обзор", "trend", "тренд", "report", "отчет", "kpi", "metric", "показател"]
        customer_keywords = ["customer", "client", "contact", "клиент", "контакт", "покупател", "buyer"]
        all_keywords = ["all", "все", "show me", "покажи", "list", "список", "how many", "сколько", "count"]
        
        # If asking about leads
        if any(word in question_lower for word in lead_keywords):
            leads = await self.list_leads(limit=30)
            statuses = await self.get_lead_statuses()
            status_map = {s.get("STATUS_ID"): s.get("NAME") for s in statuses}
            
            lead_summary = []
            status_counts = {}
            for lead in leads:
                status_id = lead.get("STATUS_ID", "UNKNOWN")
                status_name = status_map.get(status_id, status_id)
                status_counts[status_name] = status_counts.get(status_name, 0) + 1
                lead_summary.append(f"- {lead.get('TITLE', 'Untitled')} | Status: {status_name} | Source: {lead.get('SOURCE_ID', 'N/A')} | Created: {lead.get('DATE_CREATE', 'N/A')[:10]}")
            
            status_breakdown = "\n".join([f"  - {status}: {count}" for status, count in sorted(status_counts.items(), key=lambda x: -x[1])])
            context_parts.append(f"## Leads ({len(leads)} total)\n\n**By Status:**\n{status_breakdown}\n\n**Recent Leads:**\n" + "\n".join(lead_summary[:15]))
        
        # If asking about deals/sales
        if any(word in question_lower for word in deal_keywords):
            deals = await self.list_deals(limit=30)
            stages = await self.get_deal_stages()
            stage_map = {s.get("STATUS_ID"): s.get("NAME") for s in stages}
            
            deal_summary = []
            total_value = 0
            stage_values = {}
            for deal in deals:
                value = float(deal.get("OPPORTUNITY", 0))
                total_value += value
                currency = deal.get("CURRENCY_ID", "USD")
                stage_id = deal.get("STAGE_ID", "UNKNOWN")
                stage_name = stage_map.get(stage_id, stage_id)
                
                if stage_name not in stage_values:
                    stage_values[stage_name] = {"count": 0, "value": 0}
                stage_values[stage_name]["count"] += 1
                stage_values[stage_name]["value"] += value
                
                deal_summary.append(f"- {deal.get('TITLE', 'Untitled')}: {value:,.0f} {currency} | Stage: {stage_name} | Created: {deal.get('DATE_CREATE', 'N/A')[:10]}")
            
            stage_breakdown = "\n".join([f"  - {stage}: {data['count']} deals, {data['value']:,.0f} value" for stage, data in sorted(stage_values.items(), key=lambda x: -x[1]['value'])])
            context_parts.append(f"## Deals ({len(deals)} total, Pipeline Value: {total_value:,.0f})\n\n**By Stage:**\n{stage_breakdown}\n\n**Recent Deals:**\n" + "\n".join(deal_summary[:15]))
        
        # If asking about products
        if any(word in question_lower for word in product_keywords):
            products = await self.list_products(limit=30)
            
            product_summary = []
            for prod in products:
                price = float(prod.get("PRICE", 0))
                currency = prod.get("CURRENCY_ID", "USD")
                active = "Active" if prod.get("ACTIVE") == "Y" else "Inactive"
                desc = prod.get("DESCRIPTION", "")[:50] + "..." if prod.get("DESCRIPTION") else "No description"
                product_summary.append(f"- {prod.get('NAME', 'Unnamed')}: {price:,.0f} {currency} ({active})")
            
            context_parts.append(f"## Product Catalog ({len(products)} products)\n" + "\n".join(product_summary[:20]))
        
        # If asking about top/best selling
        if any(word in question_lower for word in top_keywords):
            top_products = await self.get_top_products(limit=10)
            
            if top_products:
                top_summary = []
                for i, prod in enumerate(top_products, 1):
                    top_summary.append(f"{i}. {prod['name']}: {prod['count']} units sold, Revenue: {prod['revenue']:,.0f}")
                context_parts.append(f"## Top Selling Products (by units sold)\n" + "\n".join(top_summary))
            else:
                context_parts.append("## Top Selling Products\nNo sales data available yet.")
        
        # If asking about analytics/summary/overview
        if any(word in question_lower for word in analytics_keywords) or any(word in question_lower for word in all_keywords):
            analytics = await self.get_analytics_summary()
            
            context_parts.append(f"""## CRM Analytics Summary
            
**Key Metrics:**
- Total Leads: {analytics['leads']['total']}
- Total Deals: {analytics['deals']['total']}
- Pipeline Value: {analytics['deals']['pipeline_value']:,.0f}
- Won Deals: {analytics['deals']['won_count']} (Value: {analytics['deals']['won_value']:,.0f})
- Conversion Rate: {analytics['conversion_rate']:.1f}%
- Products in Catalog: {analytics['products']['total']}

**Lead Sources:**
{json.dumps(analytics['leads']['by_source'], indent=2)}

**Deal Stages:**
{json.dumps(analytics['deals']['by_stage'], indent=2)}""")
        
        # If asking about customer
        if any(word in question_lower for word in customer_keywords):
            leads = await self.list_leads(limit=15)
            customer_info = []
            for l in leads:
                phone = l.get('PHONE', [])
                phone_str = phone[0].get('VALUE', 'N/A') if isinstance(phone, list) and phone else str(phone) if phone else 'N/A'
                customer_info.append(f"- {l.get('NAME', 'Unknown')} | Phone: {phone_str} | Source: {l.get('SOURCE_ID', 'N/A')}")
            context_parts.append(f"## Customers/Leads ({len(leads)} shown)\n" + "\n".join(customer_info))
        
        # Default: provide general overview if nothing matched
        if not context_parts:
            analytics = await self.get_analytics_summary()
            leads = await self.list_leads(limit=10)
            deals = await self.list_deals(limit=10)
            
            lead_list = "\n".join([f"- {l.get('TITLE', 'Untitled')} ({l.get('STATUS_ID', 'N/A')})" for l in leads[:5]])
            deal_list = "\n".join([f"- {d.get('TITLE', 'Untitled')}: {float(d.get('OPPORTUNITY', 0)):,.0f}" for d in deals[:5]])
            
            context_parts.append(f"""## CRM Overview

**Summary:**
- Total Leads: {analytics['leads']['total']}
- Total Deals: {analytics['deals']['total']}
- Pipeline Value: {analytics['deals']['pipeline_value']:,.0f}
- Conversion Rate: {analytics['conversion_rate']:.1f}%

**Recent Leads:**
{lead_list}

**Recent Deals:**
{deal_list}""")
        
        return "\n\n".join(context_parts)
    
    # ==================== Helper Methods ====================
    
    def _build_lead_comments(self, data: Dict) -> str:
        """Build comments field from lead data"""
        lines = ["═══ TeleAgent AI Lead ═══"]
        
        if data.get("product"):
            lines.append(f"🛒 Product Interest: {data['product']}")
        if data.get("budget"):
            lines.append(f"💰 Budget: {data['budget']}")
        if data.get("timeline"):
            lines.append(f"📅 Timeline: {data['timeline']}")
        if data.get("intent"):
            lines.append(f"🎯 Intent: {data['intent']}")
        if data.get("notes"):
            lines.append(f"📝 Notes: {data['notes']}")
        
        lines.append(f"🔥 Hotness: {data.get('hotness', 'warm').upper()}")
        lines.append(f"📊 Score: {data.get('score', 50)}/100")
        lines.append(f"═══════════════════════")
        
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
        return mapping.get(status.lower(), "NEW")


class BitrixAPIError(Exception):
    """Custom exception for Bitrix24 API errors"""
    pass


# ==================== Factory Function ====================

def create_bitrix_client(webhook_url: str) -> Optional[BitrixCRMClient]:
    """Create a Bitrix24 client if webhook URL is provided"""
    if not webhook_url:
        return None
    return BitrixCRMClient(webhook_url)
