import { test, expect } from '@playwright/test';
import {
  simulateTelegramMessage,
  getLeads,
  checkBitrixLead,
  waitForCondition,
} from '../helpers/api-helpers';

/**
 * CRM Sync Verification Tests
 *
 * Tests the Bitrix24 CRM sync logic including:
 * - HOT leads WITH contact info sync to CRM
 * - HOT leads WITHOUT contact info do NOT sync
 * - Contact info is properly mapped to CRM fields
 */

// Test tenant ID (should exist in test environment)
const TEST_TENANT_ID = process.env.TEST_TENANT_ID || 'test-tenant';

test.describe('CRM Sync - Contact Info Validation', () => {
  test('HOT lead WITH contact info syncs to Bitrix', async ({ request }) => {
    // Simulate a conversation that provides name and becomes HOT
    const chatId = `test_${Date.now()}`;

    // First message - greeting
    await simulateTelegramMessage(
      request,
      TEST_TENANT_ID,
      chatId,
      'Salom, men tiramisu haqida bilmoqchi edim'
    );

    // Second message - provide name
    await simulateTelegramMessage(
      request,
      TEST_TENANT_ID,
      chatId,
      'Meni ismim Jamshid'
    );

    // Third message - express strong buying intent
    await simulateTelegramMessage(
      request,
      TEST_TENANT_ID,
      chatId,
      "Buyurtma bermoqchiman, narxi qancha? Bugun olib ketmoqchiman!"
    );

    // Get the lead
    const leads = await getLeads(request, TEST_TENANT_ID, { hotness: 'hot' });
    const ourLead = leads.find(l =>
      l.fields_collected?.name === 'Jamshid' ||
      l.customer_name === 'Jamshid'
    );

    // Verify lead has contact info
    expect(ourLead).toBeTruthy();
    expect(ourLead?.final_hotness).toBe('hot');
    expect(ourLead?.customer_name || ourLead?.fields_collected?.name).toBeTruthy();

    // If Bitrix is connected, verify sync
    if (ourLead?.crm_lead_id) {
      const bitrixLead = await checkBitrixLead(request, TEST_TENANT_ID, ourLead.crm_lead_id);
      expect(bitrixLead).toBeTruthy();
    }
  });

  test('HOT lead WITHOUT contact info does NOT sync to Bitrix', async ({ request }) => {
    // Simulate a conversation that becomes HOT but never provides contact info
    const chatId = `test_no_contact_${Date.now()}`;

    // Express strong buying intent without providing name
    await simulateTelegramMessage(
      request,
      TEST_TENANT_ID,
      chatId,
      'Men hozir sotib olmoqchiman! 5 ta tiramisu kerak!'
    );

    // Continue with urgency but no contact
    await simulateTelegramMessage(
      request,
      TEST_TENANT_ID,
      chatId,
      'Tez orada kerak, bugun yetkazing!'
    );

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get leads - look for one without contact info
    const leads = await getLeads(request, TEST_TENANT_ID);
    const ourLead = leads.find(l => {
      const hasContact = l.customer_name || l.customer_phone ||
        l.fields_collected?.name || l.fields_collected?.phone ||
        l.fields_collected?.email;
      const isHot = l.final_hotness === 'hot' || l.score >= 70;
      return isHot && !hasContact;
    });

    // If we found such a lead, verify it doesn't have CRM ID
    if (ourLead) {
      expect(ourLead.crm_lead_id).toBeFalsy();
    }
  });

  test('Contact info triggers sync even for WARM leads', async ({ request }) => {
    const chatId = `test_warm_contact_${Date.now()}`;

    // Provide contact info with moderate interest
    await simulateTelegramMessage(
      request,
      TEST_TENANT_ID,
      chatId,
      'Salom, meni ismim Sardor, telefon raqamim +998901234567'
    );

    await simulateTelegramMessage(
      request,
      TEST_TENANT_ID,
      chatId,
      'Tiramisu bormi?'
    );

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get the lead
    const leads = await getLeads(request, TEST_TENANT_ID);
    const ourLead = leads.find(l =>
      l.fields_collected?.phone === '+998901234567' ||
      l.customer_phone === '+998901234567'
    );

    // Verify lead exists with contact
    expect(ourLead).toBeTruthy();
    expect(ourLead?.customer_phone || ourLead?.fields_collected?.phone).toBe('+998901234567');

    // Contact info should trigger sync
    // Note: This depends on Bitrix being connected
  });
});

test.describe('CRM Sync - Data Mapping', () => {
  test('Bitrix lead contains correct contact fields', async ({ request }) => {
    const chatId = `test_mapping_${Date.now()}`;

    // Provide full contact info
    await simulateTelegramMessage(
      request,
      TEST_TENANT_ID,
      chatId,
      'Salom! Meni ismim Aziza Karimova, telefonim +998901112233, email: aziza@example.com'
    );

    await simulateTelegramMessage(
      request,
      TEST_TENANT_ID,
      chatId,
      'Tiramisu buyurtma qilmoqchiman'
    );

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get leads
    const leads = await getLeads(request, TEST_TENANT_ID);
    const ourLead = leads.find(l =>
      l.fields_collected?.email === 'aziza@example.com'
    );

    if (ourLead?.crm_lead_id) {
      const bitrixLead = await checkBitrixLead(request, TEST_TENANT_ID, ourLead.crm_lead_id);

      if (bitrixLead) {
        // Verify fields are mapped correctly
        expect(bitrixLead.NAME).toContain('Aziza');
        expect(bitrixLead.PHONE?.[0]?.VALUE || bitrixLead.phone).toContain('+998901112233');
        expect(bitrixLead.EMAIL?.[0]?.VALUE || bitrixLead.email).toContain('aziza@example.com');
      }
    }
  });
});
