-- Add conversation_state column to dashboard_chat_messages for multi-turn context.
ALTER TABLE dashboard_chat_messages
ADD COLUMN IF NOT EXISTS conversation_state JSONB DEFAULT NULL;
