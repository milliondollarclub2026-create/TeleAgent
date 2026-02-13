import { APIRequestContext } from '@playwright/test';

/**
 * API helper utilities for LeadRelay e2e tests
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export interface Lead {
  id: string;
  customer_id: string;
  tenant_id: string;
  score: number;
  final_hotness: string;
  customer_name?: string;
  customer_phone?: string;
  fields_collected?: Record<string, any>;
  crm_lead_id?: string;
  sales_stage?: string;
}

export interface Customer {
  id: string;
  telegram_chat_id: string;
  telegram_username?: string;
  name?: string;
  phone?: string;
}

/**
 * Create a test lead via API
 */
export async function createTestLead(
  request: APIRequestContext,
  tenantId: string,
  data: Partial<Lead>
): Promise<Lead> {
  const response = await request.post(`${BACKEND_URL}/api/leads`, {
    data: {
      tenant_id: tenantId,
      score: 50,
      final_hotness: 'warm',
      sales_stage: 'awareness',
      ...data,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create lead: ${response.status()}`);
  }

  return response.json();
}

/**
 * Get a lead by ID
 */
export async function getLeadById(
  request: APIRequestContext,
  tenantId: string,
  leadId: string
): Promise<Lead | null> {
  const response = await request.get(`${BACKEND_URL}/api/leads/${leadId}`, {
    headers: {
      'x-tenant-id': tenantId,
    },
  });

  if (response.status() === 404) {
    return null;
  }

  if (!response.ok()) {
    throw new Error(`Failed to get lead: ${response.status()}`);
  }

  return response.json();
}

/**
 * Get leads by filter
 */
export async function getLeads(
  request: APIRequestContext,
  tenantId: string,
  filters?: {
    hotness?: 'hot' | 'warm' | 'cold';
    search?: string;
  }
): Promise<Lead[]> {
  const params = new URLSearchParams();
  if (filters?.hotness) params.set('hotness', filters.hotness);
  if (filters?.search) params.set('search', filters.search);

  const url = `${BACKEND_URL}/api/leads?${params.toString()}`;

  const response = await request.get(url, {
    headers: {
      'x-tenant-id': tenantId,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to get leads: ${response.status()}`);
  }

  const data = await response.json();
  return data.leads || data;
}

/**
 * Simulate a Telegram message to the bot
 */
export async function simulateTelegramMessage(
  request: APIRequestContext,
  tenantId: string,
  chatId: string,
  message: string
): Promise<{ response: string; lead?: Lead }> {
  const response = await request.post(`${BACKEND_URL}/webhook/telegram/${tenantId}`, {
    data: {
      update_id: Date.now(),
      message: {
        message_id: Date.now(),
        from: {
          id: parseInt(chatId),
          is_bot: false,
          first_name: 'Test',
          username: 'testuser',
        },
        chat: {
          id: parseInt(chatId),
          first_name: 'Test',
          type: 'private',
        },
        date: Math.floor(Date.now() / 1000),
        text: message,
      },
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Failed to simulate message: ${response.status()} - ${text}`);
  }

  return response.json();
}

/**
 * Get agent configuration
 */
export async function getAgentConfig(
  request: APIRequestContext,
  tenantId: string
): Promise<Record<string, any>> {
  const response = await request.get(`${BACKEND_URL}/api/config/${tenantId}`);

  if (!response.ok()) {
    throw new Error(`Failed to get config: ${response.status()}`);
  }

  return response.json();
}

/**
 * Update agent configuration
 */
export async function updateAgentConfig(
  request: APIRequestContext,
  tenantId: string,
  config: Record<string, any>
): Promise<void> {
  const response = await request.put(`${BACKEND_URL}/api/config/${tenantId}`, {
    data: config,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to update config: ${response.status()}`);
  }
}

/**
 * Check Bitrix CRM lead exists
 */
export async function checkBitrixLead(
  request: APIRequestContext,
  tenantId: string,
  crmLeadId: string
): Promise<Record<string, any> | null> {
  try {
    const response = await request.get(
      `${BACKEND_URL}/api/bitrix/lead/${crmLeadId}`,
      {
        headers: {
          'x-tenant-id': tenantId,
        },
      }
    );

    if (response.status() === 404) {
      return null;
    }

    if (!response.ok()) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

/**
 * Wait for condition with timeout
 */
export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = 10000,
  interval: number = 500
): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return false;
}
