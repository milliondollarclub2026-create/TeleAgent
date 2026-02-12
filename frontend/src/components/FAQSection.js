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
    question: 'How does the AI sales agent work?',
    answer:
      "Our AI agent connects to your Telegram bot and automatically responds to customer inquiries. It's trained on your product information, pricing, and sales scripts to have natural conversations that convert leads into customers.",
  },
  {
    id: 'faq-2',
    question: 'What languages does LeadRelay support?',
    answer:
      "LeadRelay supports Uzbek, Russian, and English. The AI automatically detects the customer's language and responds naturally in their preferred language.",
  },
  {
    id: 'faq-3',
    question: 'How does the Bitrix24 integration work?',
    answer:
      'LeadRelay syncs in real-time with your Bitrix24 CRM. All leads, conversations, and customer data are automatically logged and updated, keeping your sales pipeline perfectly organized.',
  },
  {
    id: 'faq-4',
    question: 'Can I customize the AI responses?',
    answer:
      'Absolutely! You can upload your own product documents, FAQ sheets, and sales scripts. The AI learns from your materials to give accurate, on-brand responses.',
  },
  {
    id: 'faq-5',
    question: 'Is there a free trial?',
    answer:
      'Yes! We offer a 14-day free trial with full access to all features. No credit card required to get started.',
  },
];

export default function FAQSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Column - 40% */}
          <div className="lg:col-span-5">
            {/* Badge */}
            <div
              className="opacity-0 animate-fade-up"
              style={{ animationDelay: '0ms' }}
            >
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 mb-6">
                FAQ
              </span>
            </div>

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
              Have questions? We've got answers. If you can't find what you're
              looking for, feel free to reach out.
            </p>

            {/* CTA Button */}
            <div
              className="opacity-0 animate-fade-up"
              style={{ animationDelay: '300ms' }}
            >
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
