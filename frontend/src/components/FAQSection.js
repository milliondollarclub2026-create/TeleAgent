import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const faqData = [
  {
    id: 'faq-1',
    question: 'What is LeadRelay?',
    answer:
      'LeadRelay is two products in one platform. Sales Automation deploys AI agents on Telegram and Instagram that qualify leads, answer questions from your knowledge base, score prospects, and sync everything to your CRM in 20+ languages. CRM Intelligence connects to your existing CRM and delivers live dashboards, pipeline analytics, anomaly detection, and conversational data queries powered by a team of six AI specialists. Use either product independently or both together.',
  },
  {
    id: 'faq-2',
    question: 'What languages are supported?',
    answer:
      'The sales agents support 20+ languages including English, Arabic, Russian, Spanish, French, and more. Language is detected automatically from each conversation and the AI responds natively. No configuration needed.',
  },
  {
    id: 'faq-3',
    question: 'How does the CRM integration work?',
    answer:
      'LeadRelay syncs your CRM data incrementally using a dedicated sync engine. It supports Bitrix24, HubSpot, Zoho, and Freshsales. Data is mirrored locally so dashboard queries return in under a second. Syncs run automatically every 15 minutes.',
  },
  {
    id: 'faq-3b',
    question: 'Do I need a CRM to use LeadRelay?',
    answer:
      'No. Sales Automation works independently. Leads are captured and managed inside LeadRelay. If you connect a CRM, leads sync automatically and you unlock the full CRM Intelligence dashboard with analytics, alerts, and insights across your pipeline.',
  },
  {
    id: 'faq-3c',
    question: 'What can I ask the analytics dashboard?',
    answer:
      'Anything about your pipeline in plain English. "Show me deals by stage," "What is my win rate by rep," "Which deals are stalling?" The AI team translates your question into a live query, returns data, and generates charts on the fly. No SQL or spreadsheets.',
  },
  {
    id: 'faq-4',
    question: 'Can I customize the AI sales agents?',
    answer:
      'Yes. Upload product documents, FAQ sheets, and pricing. The AI learns your catalog and responds accurately. You also configure tone, language, and sales approach per agent.',
  },
  {
    id: 'faq-5',
    question: 'How does pricing work?',
    answer:
      'Sales Automation starts at $15/mo per agent. Telegram is included; Instagram is available as an add-on. CRM Intelligence has a free tier, with Pro ($49/mo) and Business ($149/mo) for advanced features. No setup fees, no annual contracts. Cancel anytime.',
  },
  {
    id: 'faq-6',
    question: 'How long does setup take?',
    answer:
      'Under ten minutes. A guided wizard walks you through connecting channels, linking your CRM, uploading product materials, and configuring your agents. No technical skills required.',
  },
  {
    id: 'faq-7',
    question: 'Is my data secure?',
    answer:
      'All data is encrypted at rest and in transit. Multi-tenant isolation with row-level security ensures your data is never accessible to other accounts. We never share your business data or customer conversations with third parties.',
  },
];

export default function FAQSection() {
  return (
    <section className="py-24 bg-white">
      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fade-up 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Column - 40% */}
          <div className="lg:col-span-5">
            {/* Heading */}
            <h2
              className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6 opacity-0 animate-fade-up"
              style={{ animationDelay: '100ms' }}
            >
              Frequently Asked Questions
            </h2>

            {/* Description */}
            <p
              className="text-lg text-slate-600 leading-relaxed mb-8 opacity-0 animate-fade-up"
              style={{ animationDelay: '200ms' }}
            >
              Have questions? We have answers. If you cannot find what you are
              looking for, reach out to our team directly.
            </p>

            {/* CTA Button */}
            <div
              className="opacity-0 animate-fade-up"
              style={{ animationDelay: '300ms' }}
            >
              <a href="mailto:support@leadrelay.net">
                <Button
                  variant="outline"
                  className="border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 group"
                >
                  Contact Support
                  <ArrowRight
                    className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-1"
                    strokeWidth={2}
                  />
                </Button>
              </a>
            </div>
          </div>

          {/* Right Column - 60% */}
          <div className="lg:col-span-7">
            <Accordion type="single" collapsible className="w-full">
              {faqData.map((faq, index) => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="border-b border-slate-200 py-2 opacity-0 animate-fade-up"
                  style={{ animationDelay: `${400 + index * 100}ms` }}
                >
                  <AccordionTrigger className="text-lg font-medium text-slate-900 hover:no-underline py-5 text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600 text-base leading-relaxed pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
