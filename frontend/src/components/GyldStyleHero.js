import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';

function AnimatedCounter({ end, duration = 1800, suffix = '', delay = 0 }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    const steps = 60;
    const increment = end / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [started, end, duration]);

  return (
    <span className="tabular-nums">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export default function GyldStyleHero({ onGetStarted, onBookDemo }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-white">
      {/* Content container */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
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
          Your AI sales team qualifies leads, answers product questions, and closes deals across Telegram and Instagram, in any language. It works nights, weekends, and holidays.
        </p>

        {/* CTAs */}
        <div
          className="animate-fadeUp opacity-0 delay-300 flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
        >
          <button
            onClick={onGetStarted}
            className="group bg-slate-900 hover:bg-emerald-600 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-200 inline-flex items-center gap-2"
          >
            Hire Your AI Team
            <ArrowRight
              className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1"
              strokeWidth={2}
            />
          </button>
          <button
            onClick={onBookDemo}
            className="meet-team-btn flex items-center gap-2 text-slate-600 px-8 py-4 font-semibold text-lg rounded-full border border-transparent"
          >
            Meet the team
            <ChevronDown className="meet-team-icon w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Live Stats Ticker — replaces pills */}
        <div className="animate-fadeUp opacity-0 delay-400">
          <div className="inline-flex items-center gap-6 sm:gap-10">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                <AnimatedCounter end={3} duration={800} delay={500} />
              </div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium mt-1">AI Employees</div>
            </div>

            <div className="w-px h-10 bg-slate-200" />

            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                <AnimatedCounter end={20} duration={1000} delay={700} suffix="+" />
              </div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium mt-1">Languages</div>
            </div>

            <div className="w-px h-10 bg-slate-200" />

            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                <AnimatedCounter end={10} duration={1200} delay={900} suffix=" min" />
              </div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium mt-1">Setup Time</div>
            </div>

            <div className="w-px h-10 bg-slate-200" />

            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 font-['Plus_Jakarta_Sans']">
                24/7
              </div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium mt-1">Always On</div>
            </div>
          </div>
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

        /* Meet the team hover */
        .meet-team-btn {
          transition: all 0.3s ease;
        }
        .meet-team-btn:hover {
          color: #047857;
          background-color: #ecfdf5;
          border-color: #a7f3d0;
        }
        .meet-team-icon {
          transition: transform 0.3s ease, opacity 0.3s ease;
          opacity: 0.5;
        }
        .meet-team-btn:hover .meet-team-icon {
          opacity: 1;
          transform: translateY(3px);
        }
      `}</style>
    </section>
  );
}
