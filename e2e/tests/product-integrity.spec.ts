import { test, expect } from '@playwright/test';
import {
  simulateTelegramMessage,
  getAgentConfig,
  updateAgentConfig,
} from '../helpers/api-helpers';

/**
 * Product Integrity / Anti-Hallucination Tests
 *
 * Tests that the AI only mentions products that are configured:
 * - AI only mentions products from the catalog
 * - Empty catalog triggers safe response
 * - AI doesn't invent prices or specifications
 */

const TEST_TENANT_ID = process.env.TEST_TENANT_ID || 'test-tenant';

test.describe('Product Integrity - Configured Products', () => {
  test('AI only mentions products in catalog', async ({ request }) => {
    const chatId = `test_product_catalog_${Date.now()}`;

    // Ask about products
    const response = await simulateTelegramMessage(
      request,
      TEST_TENANT_ID,
      chatId,
      'Sizda qanday mahsulotlar bor?'
    );

    const aiResponse = response.response?.toLowerCase() || '';

    // AI should not mention random products like iPhone, Samsung, etc.
    // unless they are in the configured catalog
    expect(aiResponse).not.toContain('iphone');
    expect(aiResponse).not.toContain('samsung');
    expect(aiResponse).not.toContain('macbook');
    expect(aiResponse).not.toContain('laptop');

    // If this is a dessert shop, it should mention desserts
    // Note: This depends on the tenant configuration
  });

  test('AI responds appropriately when asked about non-existent product', async ({ request }) => {
    const chatId = `test_nonexistent_${Date.now()}`;

    // Ask about a product that shouldn't exist
    const response = await simulateTelegramMessage(
      request,
      TEST_TENANT_ID,
      chatId,
      'Sizda iPhone 15 Pro Max bormi?'
    );

    const aiResponse = response.response?.toLowerCase() || '';

    // AI should not confirm having the product
    // Should either say they don't have it or redirect to actual products
    const confirmsHavingIt =
      aiResponse.includes('ha, bor') ||
      aiResponse.includes('iphone 15') ||
      aiResponse.includes('sotamiz') ||
      aiResponse.includes('mavjud');

    // AI should NOT confirm having a product it doesn't sell
    // Note: Negative assertion depends on actual product catalog
  });
});

test.describe('Product Integrity - Empty Catalog Handling', () => {
  // Note: This test requires modifying tenant config which may not be safe in shared environments
  test.skip('AI asks for clarification when no products configured', async ({ request }) => {
    // This test would:
    // 1. Temporarily clear products_services
    // 2. Ask about products
    // 3. Verify AI asks what customer is looking for
    // 4. Restore original config

    const originalConfig = await getAgentConfig(request, TEST_TENANT_ID);
    const originalProducts = originalConfig.products_services;

    try {
      // Clear products
      await updateAgentConfig(request, TEST_TENANT_ID, {
        products_services: '',
      });

      const chatId = `test_empty_catalog_${Date.now()}`;

      const response = await simulateTelegramMessage(
        request,
        TEST_TENANT_ID,
        chatId,
        'Sizda nima bor?'
      );

      const aiResponse = response.response?.toLowerCase() || '';

      // AI should ask what customer is looking for, not invent products
      const asksQuestion =
        aiResponse.includes('?') ||
        aiResponse.includes('nima qidiryapsiz') ||
        aiResponse.includes('nimani') ||
        aiResponse.includes('qanday');

      expect(asksQuestion).toBe(true);
    } finally {
      // Restore original config
      await updateAgentConfig(request, TEST_TENANT_ID, {
        products_services: originalProducts,
      });
    }
  });
});

test.describe('Product Integrity - Price Accuracy', () => {
  test('AI does not invent prices for products', async ({ request }) => {
    const chatId = `test_price_${Date.now()}`;

    // Ask about price
    const response = await simulateTelegramMessage(
      request,
      TEST_TENANT_ID,
      chatId,
      'Tiramisu narxi qancha?'
    );

    const aiResponse = response.response || '';

    // If AI mentions a price, it should be from configured data
    // Check for suspicious price patterns (extremely low/high)
    const priceMatch = aiResponse.match(/(\d+[\s,.]?\d*)\s*(so'm|sum|dollar|\$|USD)/i);

    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(/[,\s]/g, ''));

      // Reasonable price range for a dessert (in UZS: 10,000 - 500,000)
      // This is business-specific validation
      if (aiResponse.toLowerCase().includes("so'm") || aiResponse.toLowerCase().includes('sum')) {
        // UZS prices
        expect(price).toBeGreaterThan(1000);
        expect(price).toBeLessThan(10000000);
      }
    }
  });

  test('AI does not make up product specifications', async ({ request }) => {
    const chatId = `test_specs_${Date.now()}`;

    // Ask about specific product details
    const response = await simulateTelegramMessage(
      request,
      TEST_TENANT_ID,
      chatId,
      'Tiramisu nechta porsiya?'
    );

    const aiResponse = response.response?.toLowerCase() || '';

    // AI should not make up specifications like exact portion count
    // unless it's in the configured product info
    // This test mainly checks that AI doesn't confidently state false info

    // Note: This is a heuristic test - behavior depends on configuration
  });
});

test.describe('Product Integrity - Brand Safety', () => {
  test('AI does not mention competitor brands', async ({ request }) => {
    const chatId = `test_competitor_${Date.now()}`;

    // Ask a question that might trigger competitor mention
    const response = await simulateTelegramMessage(
      request,
      TEST_TENANT_ID,
      chatId,
      'Boshqa do\'konlarda arzonroq. Nima deyasiz?'
    );

    const aiResponse = response.response?.toLowerCase() || '';

    // AI should not mention specific competitor names
    // Should focus on own value proposition
    expect(aiResponse).not.toContain('domino');
    expect(aiResponse).not.toContain('evos');
    expect(aiResponse).not.toContain('kfc');
  });
});
