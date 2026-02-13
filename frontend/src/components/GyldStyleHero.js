import React from 'react';
import { ArrowRight, Users, MessageSquare, Globe, Clock } from 'lucide-react';

export default function GyldStyleHero({ onGetStarted, onBookDemo }) {
  const capabilities = [
    { icon: Users, label: '3 AI Employees' },
    { icon: MessageSquare, label: 'Telegram + CRM' },
    { icon: Globe, label: 'UZ / RU / EN' },
    { icon: Clock, label: 'Always On' },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      {/* Dark gradient background - gyld.ai style */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '64px 64px'
        }}
      />

      {/* Gradient orbs for depth */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px]" />

      {/* Content container */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <div
          className="animate-fadeUp opacity-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8"
          style={{ animationDelay: '0ms' }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-medium text-slate-300">
            Now hiring AI sales agents
          </span>
        </div>

        {/* Headline */}
        <h1
          className="animate-fadeUp opacity-0 delay-100 text-[40px] sm:text-[56px] md:text-[72px] font-bold tracking-[-1.8px] leading-[1] font-['Plus_Jakarta_Sans'] mb-6"
        >
          <span className="text-white block">Hire an AI that sells</span>
          <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 bg-clip-text text-transparent block">while you sleep</span>
        </h1>

        {/* Subheadline */}
        <p
          className="animate-fadeUp opacity-0 delay-200 text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Your AI sales team qualifies leads, answers product questions, and closes deals on Telegram — in Uzbek, Russian, or English. It works nights, weekends, and holidays.
        </p>

        {/* CTAs */}
        <div
          className="animate-fadeUp opacity-0 delay-300 flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <button
            onClick={onGetStarted}
            className="group bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-8 py-4 rounded-full font-semibold text-lg transition-all duration-200 inline-flex items-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30"
          >
            Hire Your AI Team
            <ArrowRight
              className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1"
              strokeWidth={2}
            />
          </button>
          <button
            onClick={onBookDemo}
            className="border border-white/20 hover:border-white/40 hover:bg-white/5 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-200"
          >
            Meet the team
          </button>
        </div>

        {/* Capability Pills */}
        <div
          className="animate-fadeUp opacity-0 delay-400 flex flex-wrap items-center justify-center gap-3"
        >
          {capabilities.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-400 text-sm font-medium hover:bg-white/10 hover:text-slate-300 transition-all duration-200"
            >
              <Icon className="w-4 h-4" strokeWidth={1.75} />
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
