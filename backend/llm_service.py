"""LLM Service for Sales Agent - OpenAI Integration"""
import os
import json
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from token_logger import log_token_usage_fire_and_forget

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
    agent_tone = config.get('agent_tone', 'friendly_professional') if config else 'friendly_professional'
    primary_language = config.get('primary_language', 'uz') if config else 'uz'
    secondary_languages = config.get('secondary_languages', ['ru', 'en']) if config else ['ru', 'en']
    emoji_usage = config.get('emoji_usage', 'moderate') if config else 'moderate'
    response_length = config.get('response_length', 'balanced') if config else 'balanced'

    # Map language codes to names
    lang_map = {'uz': 'Uzbek (O\'zbek tili)', 'ru': 'Russian (Русский)', 'en': 'English'}
    primary_lang_name = lang_map.get(primary_language, primary_language)
    secondary_lang_names = [lang_map.get(l, l) for l in (secondary_languages or [])]
    languages_text = f"Primary: {primary_lang_name}"
    if secondary_lang_names:
        languages_text += f", Also: {', '.join(secondary_lang_names)}"

    # Map tone to description
    tone_map = {
        'professional': 'formal, business-like, and precise',
        'friendly_professional': 'warm but professional, approachable yet competent',
        'casual': 'relaxed, conversational, and friendly like chatting with a friend',
        'luxury': 'elegant, sophisticated, and premium-feeling'
    }
    tone_description = tone_map.get(agent_tone, agent_tone)

    # Emoji instructions
    emoji_instructions = {
        'never': 'NEVER use emojis in your responses. Keep text purely professional.',
        'minimal': 'Use emojis very sparingly - only 1 emoji per 3-4 messages, and only for greetings.',
        'moderate': 'Use emojis occasionally to add warmth - about 1-2 per message where appropriate.',
        'frequent': 'Use emojis liberally to create a friendly, expressive tone - 2-3 per message.'
    }
    emoji_instruction = emoji_instructions.get(emoji_usage, emoji_instructions['moderate'])

    # Response length instructions
    length_instructions = {
        'concise': 'Keep responses SHORT and to the point - 1-2 sentences max. Be direct.',
        'balanced': 'Use moderate length responses - 2-4 sentences. Provide enough detail without rambling.',
        'detailed': 'Provide thorough, comprehensive responses. Include relevant details and explanations.'
    }
    length_instruction = length_instructions.get(response_length, length_instructions['balanced'])

    phone_instruction = "Ask for the customer's phone number when appropriate to follow up." if collect_phone else ""

    return f"""You are a sales agent for {business_name}.

CRITICAL LANGUAGE RULE:
You MUST detect the language the customer is currently writing in and respond in THAT EXACT LANGUAGE.
- If customer writes in English → You MUST reply in English
- If customer writes in Russian → You MUST reply in Russian
- If customer writes in Uzbek → You MUST reply in Uzbek
- NEVER switch languages unless the customer switches first
- This is NON-NEGOTIABLE. Always match the customer's language.

Supported languages: {languages_text}
Fallback (only if language is truly unclear): {primary_lang_name}

BUSINESS CONTEXT:
{business_description}

PRODUCTS/SERVICES:
{products_services}

YOUR GOALS (in order of priority):
1. Understand the customer's needs and pain points
2. Propose appropriate products or services from our catalog
3. Close the sale or get a commitment (booking, appointment, order)
4. If not ready to buy, gather qualification data and classify the lead correctly

COMMUNICATION STYLE:
- Tone: Be {tone_description}
- {emoji_instruction}
- {length_instruction}
- {phone_instruction}
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
- reply_text: Your message to the customer (MUST be in the same language they wrote to you)
- actions: Array of actions (optional), which can include:
  - create_or_update_lead: with hotness, score, intent, fields, explanation
  - update_customer_profile: with primary_language, segments_add

FINAL REMINDER: Your reply_text MUST be in the SAME LANGUAGE the customer used in their latest message. This is mandatory."""


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


async def summarize_conversation(messages: List[Dict[str, str]], tenant_id: Optional[str] = None) -> str:
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

        # Log token usage for billing/transparency (fire-and-forget)
        if tenant_id and hasattr(response, 'usage') and response.usage:
            log_token_usage_fire_and_forget(
                tenant_id=tenant_id,
                model="gpt-4o-mini",
                request_type="summarization",
                input_tokens=response.usage.prompt_tokens,
                output_tokens=response.usage.completion_tokens,
            )

        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Summarization failed: {str(e)}")
        return "Conversation summary not available."
