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
      "LeadRelay gives you a team of AI employees, each specialized for a different role. Your Sales Agent handles customer conversations and qualifies leads on Telegram. Your Knowledge Specialist answers product questions from your uploaded materials. Your CRM Analyst gives you conversational access to your Bitrix24 data. Each one is trained on your specific business information and speaks Uzbek, Russian, and English.",
  },
  {
    id: 'faq-2',
    question: 'What languages does LeadRelay support?',
    answer:
      "LeadRelay supports Uzbek, Russian, and English. The AI automatically detects the customer's language and responds naturally in their preferred language, switching seamlessly if the conversation changes.",
  },
  {
    id: 'faq-3',
    question: 'How does the Bitrix24 integration work?',
    answer:
      'LeadRelay syncs in real time with your Bitrix24 CRM. All leads, conversations, and customer data are automatically logged and updated, keeping your sales pipeline organized without any manual work.',
  },
  {
    id: 'faq-4',
    question: 'Can I customize the AI responses?',
    answer:
      'Yes. You can upload your own product documents, FAQ sheets, and sales scripts. The AI learns from your materials and gives accurate, on-brand responses to every customer.',
  },
  {
    id: 'faq-5',
    question: 'How does billing work?',
    answer:
      '$30 per month per active channel. You only pay for what you use. No setup fees, no annual contracts. Cancel from your dashboard at any time.',
  },
  {
    id: 'faq-6',
    question: 'How long does setup take?',
    answer:
      'Under ten minutes. The onboarding wizard walks you through every step: connecting Telegram, linking your CRM, uploading product docs, and configuring your agents. No technical skills required.',
  },
  {
    id: 'faq-7',
    question: 'Is my data secure?',
    answer:
      'Your data is encrypted at rest and in transit. We use enterprise-grade infrastructure and never share your business data or customer conversations with third parties.',
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
