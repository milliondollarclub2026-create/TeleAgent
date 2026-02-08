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
    
    # Relationships
    telegram_bots = relationship('TelegramBot', back_populates='tenant', cascade='all, delete-orphan')
    customers = relationship('Customer', back_populates='tenant', cascade='all, delete-orphan')
    leads = relationship('Lead', back_populates='tenant', cascade='all, delete-orphan')
    documents = relationship('Document', back_populates='tenant', cascade='all, delete-orphan')
    config = relationship('TenantConfig', back_populates='tenant', uselist=False, cascade='all, delete-orphan')
    bitrix_integration = relationship('IntegrationBitrix', back_populates='tenant', uselist=False, cascade='all, delete-orphan')
    sheets_integration = relationship('IntegrationGoogleSheets', back_populates='tenant', uselist=False, cascade='all, delete-orphan')

# Users table (for admin login)
class User(Base):
    __tablename__ = 'users'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255))
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), index=True)
    role = Column(String(50), default='admin')
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    tenant = relationship('Tenant')

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
    
    tenant = relationship('Tenant', back_populates='telegram_bots')

# Bitrix24 integration
class IntegrationBitrix(Base):
    __tablename__ = 'integrations_bitrix'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, unique=True)
    bitrix_domain = Column(String(255))
    access_token = Column(Text)
    refresh_token = Column(Text)
    expires_at = Column(DateTime(timezone=True))
    connected_at = Column(DateTime(timezone=True))
    is_demo = Column(Boolean, default=True)
    
    tenant = relationship('Tenant', back_populates='bitrix_integration')

# Google Sheets integration
class IntegrationGoogleSheets(Base):
    __tablename__ = 'integrations_google_sheets'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, unique=True)
    sheet_id = Column(String(255))
    sheet_name = Column(String(255))
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    tenant = relationship('Tenant', back_populates='sheets_integration')

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
    
    tenant = relationship('Tenant', back_populates='customers')
    conversations = relationship('Conversation', back_populates='customer', cascade='all, delete-orphan')
    leads = relationship('Lead', back_populates='customer', cascade='all, delete-orphan')
    
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
    
    customer = relationship('Customer', back_populates='conversations')
    messages = relationship('Message', back_populates='conversation', cascade='all, delete-orphan')

# Messages table
class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False, index=True)
    sender_type = Column(String(20), nullable=False)
    text = Column(Text, nullable=False)
    raw_payload = Column(JSON)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    conversation = relationship('Conversation', back_populates='messages')

# Leads table
class Lead(Base):
    __tablename__ = 'leads'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey('customers.id', ondelete='CASCADE'), nullable=False, index=True)
    crm_lead_id = Column(String(100))
    status = Column(String(20), default='new', index=True)
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
    last_interaction_at = Column(DateTime(timezone=True), default=utc_now)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    tenant = relationship('Tenant', back_populates='leads')
    customer = relationship('Customer', back_populates='leads')

# Documents for RAG
class Document(Base):
    __tablename__ = 'documents'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text)
    file_type = Column(String(50))
    file_size = Column(Integer)
    metadata = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    tenant = relationship('Tenant', back_populates='documents')

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
    
    tenant = relationship('Tenant', back_populates='config')

# Prompt versions
class PromptVersion(Base):
    __tablename__ = 'prompt_versions'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), index=True)
    version_name = Column(String(100))
    system_prompt = Column(Text, nullable=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

# Event logs for analytics
class EventLog(Base):
    __tablename__ = 'event_logs'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), index=True)
    event_type = Column(String(50), nullable=False, index=True)
    event_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)
