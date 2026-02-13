import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  ArrowLeft,
  Copy,
  Check,
  FileText,
  ShoppingBag,
  HelpCircle,
  FileCheck,
  MessageSquare,
  Lightbulb,
  Target,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

// Helper function to convert markdown to plain text for copying
const markdownToPlainText = (markdown) => {
  return markdown
    // Remove headers but keep text
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove bullet points but keep content
    .replace(/^[\s]*[-•]\s+/gm, '• ')
    // Remove numbered lists formatting
    .replace(/^\d+\.\s+/gm, '')
    // Remove table formatting
    .replace(/\|/g, ' ')
    .replace(/^[-:|\s]+$/gm, '')
    // Remove horizontal rules
    .replace(/^---+$/gm, '─────────────────────')
    // Remove extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Full template content for each category
const TEMPLATES = [
  {
    id: 'productCatalog',
    title: 'Product Catalog',
    icon: ShoppingBag,
    description: 'Help your AI accurately answer pricing and product questions',
    template: `# Product Catalog - [Your Business Name]

## Product 1: [Product Name]
- **Price:** $XXX (or price range)
- **Description:** Brief 2-3 sentence description of the product
- **Key Features:**
  - Feature 1
  - Feature 2
  - Feature 3
- **Specifications:** Size, weight, materials, etc.
- **Availability:** In stock / Made to order / Limited
- **Warranty:** X months/years

## Product 2: [Product Name]
- **Price:** $XXX
- **Description:** Brief description
- **Key Features:**
  - Feature 1
  - Feature 2
- **Best For:** Describe ideal customer or use case

## Pricing Tiers (if applicable)
| Tier | Price | Features |
|------|-------|----------|
| Basic | $X/mo | Feature list |
| Pro | $X/mo | Feature list |
| Enterprise | Custom | Feature list |

## Bundle Deals
- Bundle A: Product 1 + Product 2 = $XXX (Save X%)
- Bundle B: Description

## Current Promotions
- [Describe any active discounts or offers]

---

**Tip:** Include specific prices, availability, and any current promotions so your AI can give accurate quotes.`
  },
  {
    id: 'companyFAQ',
    title: 'Company FAQs',
    icon: HelpCircle,
    description: 'Common questions your AI should answer instantly',
    template: `# Frequently Asked Questions - [Your Business Name]

## Ordering & Payments

**Q: What payment methods do you accept?**

A: We accept Visa, Mastercard, PayPal, and bank transfers. For orders over $X, we also offer installment plans.

**Q: Is there a minimum order amount?**

A: [Yes/No]. [If yes: Minimum order is $X]

**Q: Can I modify my order after placing it?**

A: Orders can be modified within X hours of placement. Contact us at [contact method].

## Shipping & Delivery

**Q: How long does shipping take?**

A:
- Standard shipping: X-X business days
- Express shipping: X-X business days
- Same-day delivery (if available): Available in [cities/areas]

**Q: Do you ship internationally?**

A: [Yes/No]. [If yes: List countries or regions]

**Q: How much does shipping cost?**

A:
- Orders under $X: $X shipping
- Orders over $X: Free shipping
- Express: Additional $X

## Returns & Refunds

**Q: What is your return policy?**

A: We accept returns within X days of delivery. Items must be [conditions].

**Q: How do I initiate a return?**

A: [Step-by-step process]

**Q: How long do refunds take?**

A: Refunds are processed within X business days after we receive the return.

## Support

**Q: How can I contact customer support?**

A:
- Phone: [number] (Hours: X-X)
- Email: [email]
- Telegram: [handle]
- Response time: Within X hours

---

**Tip:** Add your most frequently asked questions. The more specific, the better your AI can help customers.`
  },
  {
    id: 'policiesTerms',
    title: 'Policies & Terms',
    icon: FileCheck,
    description: 'Essential policies for handling customer concerns',
    template: `# Business Policies - [Your Business Name]

## Return Policy

**Eligibility:**
- Items can be returned within X days of purchase
- Must be unused and in original packaging
- Proof of purchase required

**Non-Returnable Items:**
- [List items that cannot be returned]
- Customized/personalized items
- [Other exceptions]

**Process:**
1. Contact us at [contact method]
2. Receive return authorization
3. Ship item to [address]
4. Refund processed within X days

**Refund Method:**
- Original payment method
- Store credit (with X% bonus)

## Warranty Policy

**Coverage:**
- Standard warranty: X months/years
- Extended warranty available: X months/years for $X

**What's Covered:**
- Manufacturing defects
- [Other covered issues]

**What's NOT Covered:**
- Physical damage
- Normal wear and tear
- Unauthorized modifications

## Privacy Policy Summary

**Data We Collect:**
- Name, phone, email for order processing
- [Other data points]

**How We Use It:**
- Order fulfillment
- Customer support
- [Other uses]

**We Never:**
- Sell your data to third parties
- Share without consent

## Terms of Service Highlights

- Prices subject to change without notice
- We reserve the right to refuse service
- [Other key terms]

---

**Tip:** Keep policies clear and customer-friendly. Your AI will use these to handle disputes professionally.`
  },
  {
    id: 'salesScripts',
    title: 'Sales Scripts',
    icon: MessageSquare,
    description: 'Guide your AI on handling sales situations',
    template: `# Sales Scripts & Guidelines - [Your Business Name]

## Greeting Scripts

**New Customer:**

"Welcome! I'm here to help you find exactly what you need. What brings you to [Business Name] today?"

**Returning Customer:**

"Welcome back! Great to see you again. How can I help you today?"

## Product Inquiry Responses

**When asked about [Popular Product]:**

"[Product Name] is one of our best sellers! It's perfect for [use case] because [key benefit]. The price is $X, and it comes with [warranty/extras]. Would you like to know more about the specifications?"

**When asked for recommendations:**

"I'd be happy to help! To give you the best recommendation, could you tell me:
1. What will you mainly use it for?
2. Do you have a budget in mind?
3. Any specific features that are must-haves?"

## Objection Handling

**"It's too expensive"**

"I understand budget is important. Let me share why customers find this is great value: [list benefits]. We also offer [payment plans/alternatives]. Would a more affordable option interest you?"

**"I need to think about it"**

"Of course, take your time! Just so you know, [mention any urgency like limited stock, current promotion]. Can I answer any other questions to help with your decision?"

**"I found it cheaper elsewhere"**

"Thanks for sharing that. With us, you also get [unique benefits: warranty, support, authenticity guarantee]. Plus, [any current offers]. Would you like me to see if there's anything special we can do?"

## Closing Techniques

**After answering questions:**

"Does this sound like what you're looking for? I can help you get started with your order right away."

**Creating urgency (when appropriate):**

"Just a heads up - we only have X left in stock / This promotion ends [date]. Would you like to secure yours now?"

## When to Escalate

Transfer to human when:
- Customer is upset or frustrated
- Complex technical questions
- Requests for special pricing/bulk orders
- Complaints about previous orders

---

**Tip:** These scripts guide your AI's tone and approach. Customize them to match your brand voice.`
  }
];

const DocumentTemplatesPage = () => {
  const navigate = useNavigate();
  const [copiedId, setCopiedId] = useState(null);

  const copyTemplate = (template, id) => {
    // Convert markdown to plain text for copying
    const plainText = markdownToPlainText(template);
    navigator.clipboard.writeText(plainText);
    setCopiedId(id);
    toast.success('Template copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto py-2 animate-fade-in">
      {/* Back Navigation */}
      <button
        onClick={() => navigate('/app/global-knowledge')}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={1.75} />
        Back to Shared Knowledge Base
      </button>

      {/* Page Header */}
      <div className="flex items-start gap-3.5 mb-8">
        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
          <FileText className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Document Templates</h1>
          <p className="text-sm text-slate-500 mt-0.5">Ready-to-use templates for your knowledge base</p>
        </div>
      </div>

      {/* Guide Section - Bitrix CRM style */}
      <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-5 mb-6">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-4">Best Practices</p>
        <div className="grid gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Target className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[13px] font-medium text-slate-900">Be specific with prices and details</p>
              <p className="text-[12px] text-slate-500 mt-0.5">Include exact prices, availability, and specifications</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[13px] font-medium text-slate-900">Use clear formatting</p>
              <p className="text-[12px] text-slate-500 mt-0.5">Headers, bullet points, and Q&A format help AI understand context</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[13px] font-medium text-slate-900">Keep information current</p>
              <p className="text-[12px] text-slate-500 mt-0.5">Update documents when prices, policies, or products change</p>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="space-y-5">
        {TEMPLATES.map((item) => {
          const Icon = item.icon;
          const isCopied = copiedId === item.id;

          return (
            <Card key={item.id} className="bg-white border-slate-200 shadow-sm overflow-hidden rounded-xl">
              {/* Template Header */}
              <div className="px-6 py-4 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/60 flex items-center justify-center shadow-sm">
                    <Icon className="w-[18px] h-[18px] text-slate-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-slate-800 tracking-tight">{item.title}</h3>
                    <p className="text-[12px] text-slate-500 mt-0.5">{item.description}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-9 px-4 text-[12px] font-medium border-slate-200 shadow-sm transition-all duration-200
                    ${isCopied
                      ? 'text-emerald-600 border-emerald-300 bg-emerald-50 shadow-emerald-100'
                      : 'hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  onClick={() => copyTemplate(item.template, item.id)}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-2" strokeWidth={2.5} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-2" strokeWidth={1.75} />
                      Copy Template
                    </>
                  )}
                </Button>
              </div>
              <div className="h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />

              {/* Template Content - Rendered Markdown */}
              <div className="p-6 bg-gradient-to-b from-slate-50/80 to-white">
                <div className="template-content prose prose-slate max-w-none
                  [&_h1]:text-[17px] [&_h1]:font-semibold [&_h1]:text-slate-800 [&_h1]:tracking-tight
                  [&_h1]:mb-5 [&_h1]:mt-0 [&_h1]:pb-3 [&_h1]:border-b [&_h1]:border-slate-200/80

                  [&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:text-slate-700 [&_h2]:uppercase [&_h2]:tracking-wide
                  [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:pt-4 [&_h2]:border-t [&_h2]:border-slate-100
                  [&_h2:first-of-type]:border-t-0 [&_h2:first-of-type]:pt-0 [&_h2:first-of-type]:mt-4

                  [&_p]:text-[13px] [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:my-2.5

                  [&_strong]:text-slate-800 [&_strong]:font-medium

                  [&_ul]:my-3 [&_ul]:space-y-1.5 [&_ul]:list-none [&_ul]:pl-0
                  [&_ul_li]:text-[13px] [&_ul_li]:text-slate-600 [&_ul_li]:pl-4 [&_ul_li]:relative
                  [&_ul_li]:before:content-[''] [&_ul_li]:before:absolute [&_ul_li]:before:left-0 [&_ul_li]:before:top-[9px]
                  [&_ul_li]:before:w-1.5 [&_ul_li]:before:h-1.5 [&_ul_li]:before:bg-slate-300 [&_ul_li]:before:rounded-full

                  [&_ul_ul]:mt-1.5 [&_ul_ul]:mb-0 [&_ul_ul]:ml-2
                  [&_ul_ul_li]:before:w-1 [&_ul_ul_li]:before:h-1 [&_ul_ul_li]:before:bg-slate-300

                  [&_ol]:my-3 [&_ol]:space-y-1 [&_ol]:list-none [&_ol]:pl-0 [&_ol]:counter-reset-[item]
                  [&_ol_li]:text-[13px] [&_ol_li]:text-slate-600 [&_ol_li]:pl-6 [&_ol_li]:relative [&_ol_li]:counter-increment-[item]
                  [&_ol_li]:before:content-[counter(item)] [&_ol_li]:before:absolute [&_ol_li]:before:left-0
                  [&_ol_li]:before:text-[11px] [&_ol_li]:before:font-semibold [&_ol_li]:before:text-slate-400
                  [&_ol_li]:before:bg-slate-100 [&_ol_li]:before:w-5 [&_ol_li]:before:h-5 [&_ol_li]:before:rounded
                  [&_ol_li]:before:flex [&_ol_li]:before:items-center [&_ol_li]:before:justify-center

                  [&_table]:w-full [&_table]:my-4 [&_table]:text-[12px] [&_table]:border-collapse
                  [&_table]:rounded-lg [&_table]:overflow-hidden [&_table]:border [&_table]:border-slate-200
                  [&_thead]:bg-slate-100
                  [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-slate-700 [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wide
                  [&_td]:px-4 [&_td]:py-2.5 [&_td]:text-slate-600 [&_td]:border-t [&_td]:border-slate-100
                  [&_tr:hover_td]:bg-slate-50/50

                  [&_hr]:my-5 [&_hr]:border-0 [&_hr]:h-px [&_hr]:bg-gradient-to-r [&_hr]:from-slate-200 [&_hr]:via-slate-200 [&_hr]:to-transparent

                  [&_blockquote]:bg-emerald-50/50 [&_blockquote]:border-l-2 [&_blockquote]:border-emerald-400
                  [&_blockquote]:pl-4 [&_blockquote]:pr-4 [&_blockquote]:py-3 [&_blockquote]:my-4 [&_blockquote]:rounded-r-lg
                  [&_blockquote]:text-[12px] [&_blockquote]:text-emerald-800 [&_blockquote]:not-italic

                  [&>p:last-child]:bg-slate-100/80 [&>p:last-child]:rounded-lg [&>p:last-child]:px-4 [&>p:last-child]:py-3
                  [&>p:last-child]:text-[12px] [&>p:last-child]:text-slate-600 [&>p:last-child]:mt-5
                  [&>p:last-child_strong]:text-emerald-700
                ">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {item.template}
                  </ReactMarkdown>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="mt-8 text-center">
        <p className="text-sm text-slate-500 mb-3">Ready to add your documents?</p>
        <Button
          className="bg-slate-900 hover:bg-slate-800 h-10 px-5 text-[13px] font-medium"
          onClick={() => navigate('/app/global-knowledge')}
        >
          Go to Shared Knowledge Base
        </Button>
      </div>
    </div>
  );
};

export default DocumentTemplatesPage;
