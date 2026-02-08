"""LLM Service for Sales Agent - OpenAI Integration"""
import os
import json
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

# Pydantic models for structured output
class LeadFields(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    product: Optional[str] = None
    budget: Optional[str] = None
    timeline: Optional[str] = None
    additional_notes: Optional[str] = None

class CreateOrUpdateLeadAction(BaseModel):
    type: str = "create_or_update_lead"
    hotness: str = Field(description="hot, warm, or cold")
    score: int = Field(ge=0, le=100, description="Score from 0 to 100")
    intent: str = Field(description="Short label describing user intent")
    fields: LeadFields = Field(default_factory=LeadFields)
    explanation: str = Field(description="Why this hotness/score was assigned")

class UpdateCustomerProfileAction(BaseModel):
    type: str = "update_customer_profile"
    primary_language: Optional[str] = None
    segments_add: Optional[List[str]] = None

class SalesAgentOutput(BaseModel):
    reply_text: str
    actions: Optional[List[Dict[str, Any]]] = None

class CustomerProfile(BaseModel):
    is_returning: bool = False
    name: Optional[str] = None
    primary_language: str = "uz"
    total_purchases: Optional[int] = None
    last_purchase_date: Optional[str] = None
    segments: Optional[List[str]] = None

class LeadContext(BaseModel):
    existing_lead_status: Optional[str] = None
    existing_lead_hotness: Optional[str] = None

class SalesAgentInput(BaseModel):
    system_instructions: str
    conversation_history: List[Dict[str, str]]
    customer_profile: CustomerProfile
    lead_context: LeadContext
    business_context: List[str]
    language_preferences: Dict[str, Any]
    latest_user_message: str

def get_default_system_prompt(config: Optional[Dict] = None) -> str:
    """Generate default system prompt for sales agent"""
    business_name = config.get('business_name', 'our company') if config else 'our company'
    business_description = config.get('business_description', '') if config else ''
    products_services = config.get('products_services', '') if config else ''
    collect_phone = config.get('collect_phone', True) if config else True
    agent_tone = config.get('agent_tone', 'professional') if config else 'professional'
    
    phone_instruction = "Ask for the customer's phone number when appropriate to follow up." if collect_phone else ""
    
    return f"""You are a professional sales agent for {business_name}. You communicate primarily in Uzbek (O'zbek tili) and Russian (Русский), switching based on the customer's preference.

BUSINESS CONTEXT:
{business_description}

PRODUCTS/SERVICES:
{products_services}

YOUR GOALS (in order of priority):
1. Understand the customer's needs and pain points
2. Propose appropriate products or services from our catalog
3. Close the sale or get a commitment (booking, appointment, order)
4. If not ready to buy, gather qualification data and classify the lead correctly

BEHAVIOR GUIDELINES:
- Be {agent_tone}, confident, and helpful
- Ask clear, targeted questions (name, needs, budget, timeline)
- {phone_instruction}
- Keep messages concise - avoid long paragraphs
- If user is returning/high-value, acknowledge their history
- Use polite greetings and sign-offs appropriate to the language

LEAD CLASSIFICATION:
- HOT: Customer explicitly wants to buy now, has budget, ready to proceed
- WARM: Interested but needs more information, comparing options, or timeline is unclear
- COLD: Just browsing, no clear interest, or explicitly not interested
- When in doubt, choose WARM or COLD - never fabricate interest

FACTUAL CONSTRAINTS:
- Only use information from the business context provided
- If pricing or policy info is missing, give a general answer or ask to confirm
- Never invent specific numbers or make promises you can't verify

OUTPUT FORMAT:
You must respond with a JSON object containing:
- reply_text: Your message to the customer
- actions: Array of actions (optional), which can include:
  - create_or_update_lead: with hotness, score, intent, fields, explanation
  - update_customer_profile: with primary_language, segments_add

Always respond in the customer's preferred language."""


async def call_sales_agent(input_data: SalesAgentInput) -> SalesAgentOutput:
    """Call OpenAI to generate sales agent response"""
    try:
        # Build messages for OpenAI
        messages = [
            {"role": "system", "content": input_data.system_instructions}
        ]
        
        # Add customer profile context
        profile_context = f"""
CUSTOMER PROFILE:
- Returning customer: {"Yes" if input_data.customer_profile.is_returning else "No"}
- Name: {input_data.customer_profile.name or "Unknown"}
- Preferred language: {input_data.customer_profile.primary_language}
- Previous purchases: {input_data.customer_profile.total_purchases or 0}
- Segments: {", ".join(input_data.customer_profile.segments or [])}

CURRENT LEAD STATUS:
- Status: {input_data.lead_context.existing_lead_status or "New conversation"}
- Hotness: {input_data.lead_context.existing_lead_hotness or "Not classified"}

BUSINESS KNOWLEDGE:
{chr(10).join(input_data.business_context) if input_data.business_context else "No specific knowledge available."}
"""
        messages.append({"role": "system", "content": profile_context})
        
        # Add conversation history
        for msg in input_data.conversation_history:
            role = "assistant" if msg.get("role") == "assistant" else "user"
            messages.append({"role": role, "content": msg.get("text", "")})
        
        # Add latest message
        messages.append({"role": "user", "content": input_data.latest_user_message})
        
        # Call OpenAI
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.7,
            max_tokens=1000,
            response_format={"type": "json_object"}
        )
        
        # Parse response
        content = response.choices[0].message.content
        logger.info(f"LLM Response: {content}")
        
        try:
            result = json.loads(content)
            return SalesAgentOutput(
                reply_text=result.get("reply_text", "Kechirasiz, xatolik yuz berdi. Iltimos, qayta urinib ko'ring."),
                actions=result.get("actions")
            )
        except json.JSONDecodeError:
            # If not valid JSON, treat as plain text response
            return SalesAgentOutput(reply_text=content)
            
    except Exception as e:
        logger.error(f"LLM call failed: {str(e)}")
        return SalesAgentOutput(
            reply_text="Kechirasiz, texnik xatolik yuz berdi. Iltimos, bir ozdan so'ng qayta urinib ko'ring. / Извините, произошла техническая ошибка. Пожалуйста, попробуйте позже."
        )


async def summarize_conversation(messages: List[Dict[str, str]]) -> str:
    """Summarize a conversation for CRM notes"""
    try:
        conversation_text = "\n".join([f"{m['role']}: {m['text']}" for m in messages])
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Summarize this sales conversation in 2-3 sentences. Focus on: customer needs, products discussed, outcome. Write in English."
                },
                {"role": "user", "content": conversation_text}
            ],
            temperature=0.3,
            max_tokens=200
        )
        
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Summarization failed: {str(e)}")
        return "Conversation summary not available."
