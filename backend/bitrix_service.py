"""Bitrix24 CRM Service - Demo Mode Implementation"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)

# In-memory storage for demo mode
demo_leads_storage: Dict[str, Dict[str, Any]] = {}
demo_contacts_storage: Dict[str, Dict[str, Any]] = {}


class BitrixService:
    """Bitrix24 CRM integration service - Demo mode for now"""
    
    def __init__(self, domain: Optional[str] = None, access_token: Optional[str] = None, is_demo: bool = True):
        self.domain = domain
        self.access_token = access_token
        self.is_demo = is_demo
        self.api_url = f"https://{domain}/rest" if domain else None
    
    async def create_lead(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a lead in Bitrix24 (Demo mode: stores in memory)"""
        if self.is_demo:
            return await self._demo_create_lead(lead_data)
        
        # Real implementation would go here
        # async with httpx.AsyncClient() as client:
        #     response = await client.post(
        #         f"{self.api_url}/crm.lead.add",
        #         params={"auth": self.access_token},
        #         json={"fields": lead_data}
        #     )
        #     return response.json()
        return {"error": "Real Bitrix integration not configured"}
    
    async def _demo_create_lead(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """Demo mode: Create a lead in memory"""
        lead_id = str(uuid.uuid4())[:8].upper()
        
        demo_lead = {
            "ID": lead_id,
            "TITLE": lead_data.get("TITLE", "Telegram Lead"),
            "NAME": lead_data.get("NAME"),
            "PHONE": [{"VALUE": lead_data.get("PHONE")}] if lead_data.get("PHONE") else [],
            "SOURCE_ID": "TELEGRAM",
            "STATUS_ID": "NEW",
            "COMMENTS": lead_data.get("COMMENTS"),
            "UF_CRM_HOTNESS": lead_data.get("UF_CRM_HOTNESS", "warm"),
            "UF_CRM_SCORE": lead_data.get("UF_CRM_SCORE", 50),
            "DATE_CREATE": datetime.now(timezone.utc).isoformat(),
            "DATE_MODIFY": datetime.now(timezone.utc).isoformat()
        }
        
        demo_leads_storage[lead_id] = demo_lead
        logger.info(f"[DEMO] Created lead: {lead_id}")
        
        return {"result": lead_id, "time": {"start": datetime.now(timezone.utc).timestamp()}}
    
    async def update_lead(self, lead_id: str, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a lead in Bitrix24"""
        if self.is_demo:
            return await self._demo_update_lead(lead_id, lead_data)
        
        return {"error": "Real Bitrix integration not configured"}
    
    async def _demo_update_lead(self, lead_id: str, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """Demo mode: Update a lead in memory"""
        if lead_id not in demo_leads_storage:
            return {"error": "Lead not found"}
        
        demo_leads_storage[lead_id].update(lead_data)
        demo_leads_storage[lead_id]["DATE_MODIFY"] = datetime.now(timezone.utc).isoformat()
        logger.info(f"[DEMO] Updated lead: {lead_id}")
        
        return {"result": True}
    
    async def get_lead(self, lead_id: str) -> Optional[Dict[str, Any]]:
        """Get a lead from Bitrix24"""
        if self.is_demo:
            return demo_leads_storage.get(lead_id)
        
        return None
    
    async def search_leads_by_phone(self, phone: str) -> List[Dict[str, Any]]:
        """Search leads by phone number"""
        if self.is_demo:
            results = []
            for lead in demo_leads_storage.values():
                phones = lead.get("PHONE", [])
                for p in phones:
                    if p.get("VALUE") == phone:
                        results.append(lead)
                        break
            return results
        
        return []
    
    async def get_all_leads(self, tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all leads (demo mode)"""
        if self.is_demo:
            return list(demo_leads_storage.values())
        return []
    
    async def create_contact(self, contact_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a contact in Bitrix24"""
        if self.is_demo:
            contact_id = str(uuid.uuid4())[:8].upper()
            demo_contacts_storage[contact_id] = {
                "ID": contact_id,
                **contact_data,
                "DATE_CREATE": datetime.now(timezone.utc).isoformat()
            }
            return {"result": contact_id}
        
        return {"error": "Real Bitrix integration not configured"}
    
    async def search_contacts_by_phone(self, phone: str) -> List[Dict[str, Any]]:
        """Search contacts by phone"""
        if self.is_demo:
            results = []
            for contact in demo_contacts_storage.values():
                if contact.get("PHONE") == phone:
                    results.append(contact)
            return results
        return []


def map_lead_to_bitrix_fields(
    customer_name: Optional[str],
    phone: Optional[str],
    hotness: str,
    score: int,
    intent: str,
    conversation_summary: str,
    explanation: str
) -> Dict[str, Any]:
    """Map internal lead data to Bitrix24 fields"""
    return {
        "TITLE": f"Telegram Lead - {intent}" if intent else "Telegram Lead",
        "NAME": customer_name,
        "PHONE": phone,
        "SOURCE_ID": "TELEGRAM",
        "COMMENTS": f"""
Conversation Summary:
{conversation_summary}

AI Classification:
- Hotness: {hotness}
- Score: {score}/100
- Reasoning: {explanation}
""".strip(),
        "UF_CRM_HOTNESS": hotness,
        "UF_CRM_SCORE": score
    }
