import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function GyldStyleHero({ onGetStarted, onBookDemo }) {
  const capabilities = [
    '3 AI Employees',
    'Telegram + CRM',
    'UZ / RU / EN',
    'Always On',
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-white">
      {/* Content container */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <div
          className="animate-fadeUp opacity-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 mb-8"
          style={{ animationDelay: '0ms' }}
        >
          <span className="text-sm font-medium text-slate-600">
            Now hiring AI sales agents
          </span>
        </div>

        {/* Headline */}
        <h1
          className="animate-fadeUp opacity-0 delay-100 text-[40px] sm:text-[56px] md:text-[72px] font-bold tracking-[-1.8px] leading-[1] font-['Plus_Jakarta_Sans'] mb-6"
        >
          <span className="text-slate-900 block">Hire an AI that sells</span>
          <span className="text-emerald-600 block">while you sleep</span>
        </h1>

        {/* Subheadline */}
        <p
          className="animate-fadeUp opacity-0 delay-200 text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Your AI sales team qualifies leads, answers product questions, and closes deals on Telegram — in Uzbek, Russian, or English. It works nights, weekends, and holidays.
        </p>

        {/* CTAs */}
        <div
          className="animate-fadeUp opacity-0 delay-300 flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <button
            onClick={onGetStarted}
            className="group bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-200 inline-flex items-center gap-2"
          >
            Hire Your AI Team
            <ArrowRight
              className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1"
              strokeWidth={2}
            />
          </button>
          <button
            onClick={onBookDemo}
            className="text-slate-600 hover:text-slate-900 px-8 py-4 font-semibold text-lg transition-all duration-200"
          >
            Meet the team
          </button>
        </div>

        {/* Capability Pills - text only, no icons */}
        <div
          className="animate-fadeUp opacity-0 delay-400 flex flex-wrap items-center justify-center gap-3"
        >
          {capabilities.map((label) => (
            <div
              key={label}
              className="inline-flex items-center px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-sm font-medium"
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeUp {
          animation: fadeUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .delay-100 {
          animation-delay: 100ms;
        }

        .delay-200 {
          animation-delay: 200ms;
        }

        .delay-300 {
          animation-delay: 300ms;
        }

        .delay-400 {
          animation-delay: 400ms;
        }
      `}</style>
    </section>
  );
}
