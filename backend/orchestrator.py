"""Sales Agent Orchestrator - Main conversation handler"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from models import (
    Tenant, Customer, Conversation, Message, Lead, 
    TenantConfig, Document, EventLog
)
from llm_service import (
    call_sales_agent, summarize_conversation,
    SalesAgentInput, CustomerProfile, LeadContext, get_default_system_prompt
)
from telegram_service import send_message, send_typing_action
from bitrix_service import BitrixService, map_lead_to_bitrix_fields

logger = logging.getLogger(__name__)


async def get_or_create_customer(
    db: AsyncSession,
    tenant_id: str,
    telegram_user_id: str,
    username: Optional[str] = None,
    first_name: Optional[str] = None,
    language_code: Optional[str] = None
) -> Customer:
    """Get existing customer or create a new one"""
    result = await db.execute(
        select(Customer).where(
            and_(
                Customer.tenant_id == tenant_id,
                Customer.telegram_user_id == telegram_user_id
            )
        )
    )
    customer = result.scalar_one_or_none()
    
    if customer:
        # Update last seen
        customer.last_seen_at = datetime.now(timezone.utc)
        if username and not customer.telegram_username:
            customer.telegram_username = username
        if first_name and not customer.name:
            customer.name = first_name
        await db.commit()
        return customer
    
    # Create new customer
    primary_lang = 'ru' if language_code and language_code.startswith('ru') else 'uz'
    customer = Customer(
        tenant_id=tenant_id,
        telegram_user_id=telegram_user_id,
        telegram_username=username,
        name=first_name,
        primary_language=primary_lang,
        first_seen_at=datetime.now(timezone.utc),
        last_seen_at=datetime.now(timezone.utc)
    )
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    
    return customer


async def get_or_create_conversation(
    db: AsyncSession,
    tenant_id: str,
    customer_id: str
) -> Conversation:
    """Get active conversation or create a new one"""
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.tenant_id == tenant_id,
                Conversation.customer_id == customer_id,
                Conversation.status == 'active'
            )
        ).order_by(Conversation.started_at.desc())
    )
    conversation = result.scalar_one_or_none()
    
    if conversation:
        return conversation
    
    # Create new conversation
    conversation = Conversation(
        tenant_id=tenant_id,
        customer_id=customer_id,
        status='active',
        started_at=datetime.now(timezone.utc),
        last_message_at=datetime.now(timezone.utc)
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    
    return conversation


async def get_conversation_history(
    db: AsyncSession,
    conversation_id: str,
    limit: int = 10
) -> List[Dict[str, str]]:
    """Get recent messages from conversation"""
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    messages = result.scalars().all()
    
    # Reverse to get chronological order
    history = []
    for msg in reversed(messages):
        role = "assistant" if msg.sender_type == "agent" else "user"
        history.append({"role": role, "text": msg.text})
    
    return history


async def get_customer_lead(
    db: AsyncSession,
    tenant_id: str,
    customer_id: str
) -> Optional[Lead]:
    """Get existing lead for customer"""
    result = await db.execute(
        select(Lead).where(
            and_(
                Lead.tenant_id == tenant_id,
                Lead.customer_id == customer_id
            )
        ).order_by(Lead.created_at.desc())
    )
    return result.scalar_one_or_none()


async def get_business_context(
    db: AsyncSession,
    tenant_id: str,
    query: str
) -> List[str]:
    """Get relevant business context from documents (simple keyword search for now)"""
    result = await db.execute(
        select(Document).where(Document.tenant_id == tenant_id)
    )
    documents = result.scalars().all()
    
    # Simple keyword matching for MVP (replace with vector search later)
    context = []
    query_words = set(query.lower().split())
    
    for doc in documents:
        if doc.content:
            doc_words = set(doc.content.lower().split())
            if query_words & doc_words:  # If any word matches
                # Add a snippet
                snippet = doc.content[:500] + "..." if len(doc.content) > 500 else doc.content
                context.append(f"{doc.title}: {snippet}")
    
    return context[:5]  # Return top 5 matches


async def get_tenant_config(
    db: AsyncSession,
    tenant_id: str
) -> Optional[Dict[str, Any]]:
    """Get tenant configuration"""
    result = await db.execute(
        select(TenantConfig).where(TenantConfig.tenant_id == tenant_id)
    )
    config = result.scalar_one_or_none()
    
    if config:
        return {
            "vertical": config.vertical,
            "business_name": config.business_name,
            "business_description": config.business_description,
            "products_services": config.products_services,
            "faq_objections": config.faq_objections,
            "collect_phone": config.collect_phone,
            "greeting_message": config.greeting_message,
            "agent_tone": config.agent_tone,
            "primary_language": config.primary_language
        }
    return None


async def log_event(
    db: AsyncSession,
    tenant_id: str,
    event_type: str,
    event_data: Dict[str, Any]
) -> None:
    """Log an event for analytics"""
    event = EventLog(
        tenant_id=tenant_id,
        event_type=event_type,
        event_data=event_data,
        created_at=datetime.now(timezone.utc)
    )
    db.add(event)
    await db.commit()


async def handle_incoming_message(
    db: AsyncSession,
    tenant_id: str,
    bot_token: str,
    update_data: Dict[str, Any]
) -> bool:
    """Main orchestrator function to handle incoming Telegram messages"""
    try:
        chat_id = update_data.get("chat_id")
        user_id = update_data.get("user_id")
        text = update_data.get("text", "")
        username = update_data.get("username")
        first_name = update_data.get("first_name")
        language_code = update_data.get("language_code")
        
        # Send typing indicator
        await send_typing_action(bot_token, chat_id)
        
        # Handle /start command
        if text.strip() == "/start":
            config = await get_tenant_config(db, tenant_id)
            greeting = config.get("greeting_message") if config else None
            if not greeting:
                greeting = "Assalomu alaykum! Men sizga qanday yordam bera olaman? / Здравствуйте! Чем могу помочь?"
            await send_message(bot_token, chat_id, greeting)
            return True
        
        # Step 1: Get or create customer
        customer = await get_or_create_customer(
            db, tenant_id, user_id, username, first_name, language_code
        )
        
        # Step 2: Get or create conversation
        conversation = await get_or_create_conversation(db, tenant_id, customer.id)
        
        # Step 3: Save incoming message
        incoming_msg = Message(
            conversation_id=conversation.id,
            sender_type="user",
            text=text,
            raw_payload=update_data,
            created_at=datetime.now(timezone.utc)
        )
        db.add(incoming_msg)
        
        # Step 4: Get conversation history
        history = await get_conversation_history(db, conversation.id, limit=10)
        
        # Step 5: Get existing lead context
        existing_lead = await get_customer_lead(db, tenant_id, customer.id)
        lead_context = LeadContext(
            existing_lead_status=existing_lead.status if existing_lead else None,
            existing_lead_hotness=existing_lead.final_hotness if existing_lead else None
        )
        
        # Step 6: Get business context
        business_context = await get_business_context(db, tenant_id, text)
        
        # Step 7: Get tenant config and build system prompt
        config = await get_tenant_config(db, tenant_id)
        system_prompt = get_default_system_prompt(config)
        
        # Step 8: Build customer profile
        customer_profile = CustomerProfile(
            is_returning=customer.first_seen_at != customer.last_seen_at,
            name=customer.name,
            primary_language=customer.primary_language or 'uz',
            segments=customer.segments or []
        )
        
        # Step 9: Prepare LLM input
        llm_input = SalesAgentInput(
            system_instructions=system_prompt,
            conversation_history=history,
            customer_profile=customer_profile,
            lead_context=lead_context,
            business_context=business_context,
            language_preferences={
                "primary": customer.primary_language or "uz",
                "allowed": ["uz", "ru"]
            },
            latest_user_message=text
        )
        
        # Step 10: Call LLM
        llm_output = await call_sales_agent(llm_input)
        
        # Step 11: Process actions
        if llm_output.actions:
            for action in llm_output.actions:
                if action.get("type") == "create_or_update_lead":
                    await process_lead_action(
                        db, tenant_id, customer, existing_lead, action, history
                    )
                elif action.get("type") == "update_customer_profile":
                    await process_customer_update(db, customer, action)
        
        # Step 12: Save agent response
        agent_msg = Message(
            conversation_id=conversation.id,
            sender_type="agent",
            text=llm_output.reply_text,
            created_at=datetime.now(timezone.utc)
        )
        db.add(agent_msg)
        
        # Update conversation last message time
        conversation.last_message_at = datetime.now(timezone.utc)
        
        await db.commit()
        
        # Step 13: Send response to Telegram
        await send_message(bot_token, chat_id, llm_output.reply_text)
        
        # Step 14: Log event
        await log_event(db, tenant_id, "message_processed", {
            "customer_id": customer.id,
            "conversation_id": conversation.id,
            "has_actions": bool(llm_output.actions)
        })
        
        return True
        
    except Exception as e:
        logger.error(f"Error in orchestrator: {str(e)}")
        # Send fallback message
        try:
            await send_message(
                bot_token, 
                update_data.get("chat_id"),
                "Kechirasiz, texnik xatolik yuz berdi. / Извините, произошла техническая ошибка."
            )
        except Exception:
            pass
        return False


async def process_lead_action(
    db: AsyncSession,
    tenant_id: str,
    customer: Customer,
    existing_lead: Optional[Lead],
    action: Dict[str, Any],
    history: List[Dict[str, str]]
) -> None:
    """Process lead creation/update action from LLM"""
    hotness = action.get("hotness", "warm")
    score = action.get("score", 50)
    intent = action.get("intent", "")
    explanation = action.get("explanation", "")
    fields = action.get("fields", {})
    
    # Apply business rules for hotness adjustment
    final_hotness = apply_hotness_rules(hotness, score, fields)
    
    if existing_lead:
        # Update existing lead
        existing_lead.llm_hotness_suggestion = hotness
        existing_lead.final_hotness = final_hotness
        existing_lead.score = score
        existing_lead.intent = intent
        existing_lead.llm_explanation = explanation
        existing_lead.last_interaction_at = datetime.now(timezone.utc)
        
        if fields.get("name"):
            customer.name = fields["name"]
        if fields.get("phone"):
            customer.phone = fields["phone"]
            existing_lead.product = fields.get("product")
            existing_lead.budget = fields.get("budget")
            existing_lead.timeline = fields.get("timeline")
            existing_lead.additional_notes = fields.get("additional_notes")
    else:
        # Create new lead
        new_lead = Lead(
            tenant_id=tenant_id,
            customer_id=customer.id,
            status="new",
            llm_hotness_suggestion=hotness,
            final_hotness=final_hotness,
            score=score,
            intent=intent,
            llm_explanation=explanation,
            product=fields.get("product"),
            budget=fields.get("budget"),
            timeline=fields.get("timeline"),
            additional_notes=fields.get("additional_notes"),
            source_channel="telegram",
            created_at=datetime.now(timezone.utc),
            last_interaction_at=datetime.now(timezone.utc)
        )
        db.add(new_lead)
        
        if fields.get("name"):
            customer.name = fields["name"]
        if fields.get("phone"):
            customer.phone = fields["phone"]
    
    # Log lead event
    await log_event(db, tenant_id, "lead_created" if not existing_lead else "lead_updated", {
        "customer_id": customer.id,
        "hotness": final_hotness,
        "score": score
    })
    
    # Sync to Bitrix (demo mode)
    bitrix = BitrixService(is_demo=True)
    conversation_summary = await summarize_conversation(history)
    
    bitrix_data = map_lead_to_bitrix_fields(
        customer_name=customer.name,
        phone=customer.phone,
        hotness=final_hotness,
        score=score,
        intent=intent,
        conversation_summary=conversation_summary,
        explanation=explanation
    )
    
    if existing_lead and existing_lead.crm_lead_id:
        await bitrix.update_lead(existing_lead.crm_lead_id, bitrix_data)
    else:
        result = await bitrix.create_lead(bitrix_data)
        if result.get("result") and not existing_lead:
            # Will be set on the new lead after commit
            pass


async def process_customer_update(
    db: AsyncSession,
    customer: Customer,
    action: Dict[str, Any]
) -> None:
    """Process customer profile update action"""
    if action.get("primary_language"):
        customer.primary_language = action["primary_language"]
    
    if action.get("segments_add"):
        current_segments = customer.segments or []
        new_segments = list(set(current_segments + action["segments_add"]))
        customer.segments = new_segments


def apply_hotness_rules(llm_hotness: str, score: int, fields: Dict[str, Any]) -> str:
    """Apply business rules to adjust lead hotness"""
    # Rule: If score is very high, ensure at least warm
    if score >= 80 and llm_hotness == "cold":
        return "warm"
    
    # Rule: If timeline is immediate and budget is mentioned, consider hot
    timeline = (fields.get("timeline") or "").lower()
    budget = fields.get("budget")
    
    if timeline and any(word in timeline for word in ["today", "now", "bugun", "hozir", "сегодня", "сейчас"]):
        if budget:
            return "hot"
        return "warm"
    
    return llm_hotness
