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
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import json

logger = logging.getLogger(__name__)

# Bitrix24 REST API timeout
BITRIX_TIMEOUT = 30.0


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
        """Make REST API call to Bitrix24"""
        url = f"{self.webhook_url}/{method}"
        
        try:
            async with httpx.AsyncClient(timeout=BITRIX_TIMEOUT) as client:
                response = await client.post(url, json=params or {})
                
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
            
            # Get CRM settings
            try:
                crm_settings = await self._call("crm.settings.mode.get")
            except:
                crm_settings = {"MODE": "CLASSIC"}
            
            return {
                "ok": True,
                "portal_user": user.get("NAME", "") + " " + user.get("LAST_NAME", ""),
                "user_email": user.get("EMAIL"),
                "crm_mode": crm_settings.get("MODE", "CLASSIC"),
                "message": "Connection successful!"
            }
        except BitrixAPIError as e:
            return {"ok": False, "message": str(e)}
        except Exception as e:
            return {"ok": False, "message": f"Unexpected error: {str(e)}"}
    
    # ==================== Lead Management ====================
    
    async def create_lead(self, data: Dict[str, Any]) -> str:
        """
        Create a new lead in Bitrix24.
        
        Args:
            data: Lead data with keys: name, phone, email, product, budget, 
                  timeline, notes, source, hotness, score
        
        Returns:
            Lead ID
        """
        fields = {
            "TITLE": data.get("title") or f"Lead: {data.get('name', 'Unknown')}",
            "NAME": data.get("name"),
            "SOURCE_ID": data.get("source", "TELEGRAM"),
            "SOURCE_DESCRIPTION": "TeleAgent AI Sales Bot",
        }
        
        if data.get("phone"):
            fields["PHONE"] = [{"VALUE": data["phone"], "VALUE_TYPE": "WORK"}]
        
        if data.get("email"):
            fields["EMAIL"] = [{"VALUE": data["email"], "VALUE_TYPE": "WORK"}]
        
        # Build comments with all available info
        comments = self._build_lead_comments(data)
        if comments:
            fields["COMMENTS"] = comments
        
        # Map hotness to status
        hotness_status_map = {
            "hot": "IN_PROCESS",  # High priority
            "warm": "NEW",
            "cold": "UC_AWAITING"  # Low priority
        }
        if data.get("hotness") in hotness_status_map:
            fields["STATUS_ID"] = hotness_status_map[data["hotness"]]
        
        result = await self._call("crm.lead.add", {"fields": fields})
        lead_id = str(result) if isinstance(result, int) else str(result.get("ID", result))
        
        logger.info(f"Created Bitrix24 lead: {lead_id}")
        return lead_id
    
    async def update_lead(self, lead_id: str, data: Dict[str, Any]) -> bool:
        """Update an existing lead"""
        fields = {}
        
        if data.get("name"):
            fields["NAME"] = data["name"]
        if data.get("phone"):
            fields["PHONE"] = [{"VALUE": data["phone"], "VALUE_TYPE": "WORK"}]
        if data.get("status"):
            fields["STATUS_ID"] = self._map_status(data["status"])
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
        
        # If asking about leads
        if any(word in question_lower for word in ["lead", "лид", "potential", "prospect"]):
            leads = await self.list_leads(limit=20)
            statuses = await self.get_lead_statuses()
            status_map = {s.get("STATUS_ID"): s.get("NAME") for s in statuses}
            
            lead_summary = []
            for lead in leads:
                status_name = status_map.get(lead.get("STATUS_ID"), lead.get("STATUS_ID"))
                lead_summary.append(f"- {lead.get('TITLE', 'Untitled')} (Status: {status_name}, Created: {lead.get('DATE_CREATE', 'N/A')[:10]})")
            
            context_parts.append(f"## Recent Leads ({len(leads)} total)\n" + "\n".join(lead_summary[:10]))
        
        # If asking about deals/sales
        if any(word in question_lower for word in ["deal", "sale", "сделк", "revenue", "pipeline", "выручк"]):
            deals = await self.list_deals(limit=20)
            
            deal_summary = []
            total_value = 0
            for deal in deals:
                value = float(deal.get("OPPORTUNITY", 0))
                total_value += value
                currency = deal.get("CURRENCY_ID", "USD")
                deal_summary.append(f"- {deal.get('TITLE', 'Untitled')}: {value:,.0f} {currency} (Stage: {deal.get('STAGE_ID')})")
            
            context_parts.append(f"## Recent Deals ({len(deals)} total, Pipeline: {total_value:,.0f})\n" + "\n".join(deal_summary[:10]))
        
        # If asking about products
        if any(word in question_lower for word in ["product", "продукт", "товар", "catalog", "price", "цен"]):
            products = await self.list_products(limit=20)
            
            product_summary = []
            for prod in products:
                price = float(prod.get("PRICE", 0))
                currency = prod.get("CURRENCY_ID", "USD")
                product_summary.append(f"- {prod.get('NAME', 'Unnamed')}: {price:,.0f} {currency}")
            
            context_parts.append(f"## Product Catalog ({len(products)} products)\n" + "\n".join(product_summary[:15]))
        
        # If asking about top/best selling
        if any(word in question_lower for word in ["top", "best", "popular", "selling", "лучш", "популярн"]):
            top_products = await self.get_top_products(limit=10)
            
            if top_products:
                top_summary = []
                for i, prod in enumerate(top_products, 1):
                    top_summary.append(f"{i}. {prod['name']}: {prod['count']} sold, Revenue: {prod['revenue']:,.0f}")
                context_parts.append(f"## Top Selling Products\n" + "\n".join(top_summary))
        
        # If asking about analytics/summary/overview
        if any(word in question_lower for word in ["analytic", "summary", "overview", "статистик", "обзор", "trend", "тренд"]):
            analytics = await self.get_analytics_summary()
            
            context_parts.append(f"""## CRM Analytics Summary
- Total Leads: {analytics['leads']['total']}
- Total Deals: {analytics['deals']['total']}
- Pipeline Value: {analytics['deals']['pipeline_value']:,.0f}
- Won Deals: {analytics['deals']['won_count']} (Value: {analytics['deals']['won_value']:,.0f})
- Conversion Rate: {analytics['conversion_rate']:.1f}%
- Products in Catalog: {analytics['products']['total']}

Lead Sources: {json.dumps(analytics['leads']['by_source'], indent=2)}
Deal Stages: {json.dumps(analytics['deals']['by_stage'], indent=2)}""")
        
        # If asking about customer
        if any(word in question_lower for word in ["customer", "client", "contact", "клиент", "контакт"]):
            # Get some contacts/leads
            leads = await self.list_leads(limit=10)
            context_parts.append(f"## Recent Customers/Leads\n" + 
                               "\n".join([f"- {l.get('NAME', 'Unknown')} ({l.get('PHONE', ['N/A'])})" for l in leads[:10]]))
        
        # Default: provide general overview
        if not context_parts:
            analytics = await self.get_analytics_summary()
            context_parts.append(f"""## CRM Overview
- Total Leads: {analytics['leads']['total']}
- Total Deals: {analytics['deals']['total']}
- Pipeline Value: {analytics['deals']['pipeline_value']:,.0f}
- Conversion Rate: {analytics['conversion_rate']:.1f}%""")
        
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
