"""SQLAlchemy Models for AI Sales Agent"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, Float, Text, DateTime, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

# Tenants table
class Tenant(Base):
    __tablename__ = 'tenants'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    timezone = Column(String(50), default='Asia/Tashkent')
    created_at = Column(DateTime(timezone=True), default=utc_now)

# Users table (for admin login)
class User(Base):
    __tablename__ = 'users'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255))
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), index=True)
    role = Column(String(50), default='admin')
    email_confirmed = Column(Boolean, default=False)
    confirmation_token = Column(String(100))
    created_at = Column(DateTime(timezone=True), default=utc_now)

# Telegram bots table
class TelegramBot(Base):
    __tablename__ = 'telegram_bots'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True)
    bot_token = Column(String(255), nullable=False)
    bot_username = Column(String(255))
    webhook_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    last_webhook_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utc_now)

# Customers table
class Customer(Base):
    __tablename__ = 'customers'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True)
    telegram_user_id = Column(String(50), index=True)
    telegram_username = Column(String(255))
    phone = Column(String(50))
    name = Column(String(255))
    primary_language = Column(String(10), default='uz')
    segments = Column(JSON, default=list)
    first_seen_at = Column(DateTime(timezone=True), default=utc_now)
    last_seen_at = Column(DateTime(timezone=True), default=utc_now)
    
    __table_args__ = (
        Index('ix_customers_tenant_telegram', 'tenant_id', 'telegram_user_id'),
    )

# Conversations table
class Conversation(Base):
    __tablename__ = 'conversations'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey('customers.id', ondelete='CASCADE'), nullable=False, index=True)
    status = Column(String(20), default='active')
    started_at = Column(DateTime(timezone=True), default=utc_now)
    ended_at = Column(DateTime(timezone=True))
    last_message_at = Column(DateTime(timezone=True), default=utc_now)

# Messages table
class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False, index=True)
    sender_type = Column(String(20), nullable=False)
    text = Column(Text, nullable=False)
    raw_payload = Column(JSON)
    created_at = Column(DateTime(timezone=True), default=utc_now)

# Leads table
class Lead(Base):
    __tablename__ = 'leads'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey('customers.id', ondelete='CASCADE'), nullable=False, index=True)
    crm_lead_id = Column(String(100))
    status = Column(String(20), default='new', index=True)
    sales_stage = Column(String(50), default='awareness', index=True)  # Added: Track sales pipeline stage
    llm_hotness_suggestion = Column(String(20))
    final_hotness = Column(String(20), default='warm', index=True)
    score = Column(Integer, default=50)
    close_probability = Column(Float)
    source_channel = Column(String(50), default='telegram')
    llm_explanation = Column(Text)
    intent = Column(String(255))
    product = Column(String(255))
    budget = Column(String(100))
    timeline = Column(String(100))
    additional_notes = Column(Text)
    fields_collected = Column(JSON, default=dict)  # Added: Store all collected customer fields
    customer_name = Column(String(255))  # Added: Denormalized for quick access
    customer_phone = Column(String(50))  # Added: Denormalized for quick access
    last_interaction_at = Column(DateTime(timezone=True), default=utc_now)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        Index('ix_leads_tenant_customer', 'tenant_id', 'customer_id'),
    )

# Documents for RAG
class Document(Base):
    __tablename__ = 'documents'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text)
    file_type = Column(String(50))
    file_size = Column(Integer)
    doc_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now)

# Tenant configuration
class TenantConfig(Base):
    __tablename__ = 'tenant_configs'
    
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), primary_key=True)
    vertical = Column(String(50), default='default')
    business_name = Column(String(255))
    business_description = Column(Text)
    products_services = Column(Text)
    faq_objections = Column(Text)
    collect_phone = Column(Boolean, default=True)
    lead_fields_json = Column(JSON, default=dict)
    qualification_rules_json = Column(JSON, default=dict)
    greeting_message = Column(Text)
    agent_tone = Column(String(50), default='professional')
    primary_language = Column(String(10), default='uz')

# Event logs for analytics
class EventLog(Base):
    __tablename__ = 'event_logs'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), index=True)
    event_type = Column(String(50), nullable=False, index=True)
    event_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)
