import React from 'react';
import {
  Bot,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Database,
  TrendingUp
} from 'lucide-react';

/**
 * Premium Hero Section Component
 * A 9/10 quality hero section with:
 * - Story-driven headline with animated gradient text
 * - Sophisticated mesh gradient backgrounds
 * - Interactive chat demo with glassmorphism
 * - Floating cards with premium animations
 * - Staggered reveal animations with cubic-bezier easing
 */
export default function PremiumHero({ heroVisible, handleCTA, scrollToSection, heroRef }) {
  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Premium Mesh Gradient Background */}
      <div className="absolute inset-0 hero-premium-bg">
        {/* Luminous mesh orbs with sophisticated animation */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-emerald-200/50 via-teal-100/30 to-transparent rounded-full blur-3xl hero-orb-drift-1" />
        <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-gradient-to-tl from-slate-200/50 via-emerald-100/20 to-transparent rounded-full blur-3xl hero-orb-drift-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-radial from-emerald-100/40 via-transparent to-transparent rounded-full hero-orb-pulse" />
        <div className="absolute top-1/4 right-1/3 w-[400px] h-[400px] bg-gradient-to-br from-cyan-200/25 to-transparent rounded-full blur-3xl hero-orb-drift-3" />

        {/* Premium grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

        {/* Subtle noise texture for depth */}
        <div className="absolute inset-0 opacity-[0.02] hero-noise-texture" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-28 lg:py-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Premium Content with Staggered Reveals */}
          <div className="space-y-8 lg:space-y-10">
            {/* Animated Badge */}
            <div
              className={`hero-badge inline-flex items-center gap-2.5 bg-white/70 backdrop-blur-md border border-emerald-200/50 rounded-full px-5 py-2.5 shadow-sm shadow-emerald-500/5 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '0ms' }}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm shadow-emerald-500/50" />
              </span>
              <span className="text-slate-600 text-sm font-medium tracking-wide">AI-Powered Sales Automation</span>
            </div>

            {/* Story-Driven Headline with Animated Gradient */}
            <div
              className={`space-y-2 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: '80ms' }}
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-[5.25rem] font-bold leading-[1.02] tracking-tight font-['Plus_Jakarta_Sans']">
                <span className="block text-slate-900">Your AI closes</span>
                <span className="block text-slate-900">deals while</span>
                <span className="block mt-2">
                  <span className="hero-gradient-text bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent bg-[length:200%_auto]">you sleep</span>
                </span>
              </h1>
            </div>

            {/* Refined Subheadline */}
            <p
              className={`text-lg md:text-xl text-slate-500 leading-relaxed max-w-lg font-normal transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: '160ms' }}
            >
              Deploy intelligent sales agents across Telegram and Instagram that qualify leads, answer questions, and convert prospects around the clock. Integrated with your CRM.
            </p>

            {/* Premium CTA Buttons */}
            <div
              className={`flex flex-col sm:flex-row gap-4 pt-2 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: '240ms' }}
            >
              <button
                onClick={handleCTA}
                className="hero-cta-primary group relative bg-slate-900 text-white rounded-full px-8 py-4 text-lg font-semibold flex items-center justify-center gap-3 overflow-hidden shadow-xl shadow-slate-900/20 hover:shadow-2xl hover:shadow-slate-900/30 transition-all duration-500"
                data-testid="hero-cta-btn"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Get Started
                  <ArrowRight className="w-5 h-5 transition-transform duration-500 group-hover:translate-x-1" strokeWidth={2} />
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="group text-slate-700 rounded-full px-8 py-4 text-lg font-medium flex items-center justify-center gap-2 border border-slate-200 hover:border-slate-300 bg-white/50 backdrop-blur-sm transition-all duration-300 hover:bg-white/80 hover:shadow-lg"
              >
                See how it works
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2} />
              </button>
            </div>

            {/* Social Proof with Staggered Avatars */}
            <div
              className={`flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-6 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: '320ms' }}
            >
              <div className="flex -space-x-3">
                {[
                  { gradient: 'from-emerald-400 to-emerald-600', letter: 'A' },
                  { gradient: 'from-blue-400 to-blue-600', letter: 'B' },
                  { gradient: 'from-amber-400 to-orange-500', letter: 'C' },
                  { gradient: 'from-rose-400 to-rose-600', letter: 'D' },
                  { gradient: 'from-violet-400 to-purple-600', letter: 'E' }
                ].map((avatar, i) => (
                  <div
                    key={i}
                    className={`hero-avatar w-11 h-11 rounded-full bg-gradient-to-br ${avatar.gradient} border-[3px] border-white flex items-center justify-center text-xs font-bold text-white shadow-lg hover:scale-110 hover:z-10 transition-all duration-300 cursor-default`}
                    style={{
                      opacity: heroVisible ? 1 : 0,
                      transform: heroVisible ? 'scale(1)' : 'scale(0.8)',
                      transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${400 + i * 50}ms`
                    }}
                  >
                    {avatar.letter}
                  </div>
                ))}
              </div>
              <div className="border-l border-slate-200 pl-6">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">500+</span>
                  <span className="text-emerald-600 text-sm font-medium">businesses</span>
                </div>
                <p className="text-slate-500 text-sm mt-0.5">accelerating their sales with AI</p>
              </div>
            </div>
          </div>

          {/* Right: Premium Interactive Chat Demo */}
          <div
            className={`relative hidden lg:block transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              heroVisible ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-16 scale-95'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            {/* Luminous glow behind chat */}
            <div className="absolute -inset-8 bg-gradient-to-br from-emerald-500/15 via-transparent to-cyan-500/10 rounded-[3rem] blur-2xl hero-chat-glow" />

            {/* Glassmorphic Chat Card */}
            <div className="hero-chat-card relative bg-white/85 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 shadow-2xl shadow-slate-900/10 hover:shadow-3xl transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-emerald-50/20 rounded-3xl pointer-events-none" />

              {/* Chat Header */}
              <div className="relative flex items-center justify-between pb-4 border-b border-slate-100/80">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <Bot className="w-6 h-6 text-white" strokeWidth={1.75} />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-base">LeadRelay AI</p>
                    <p className="text-xs text-emerald-600 font-medium">Online - Responds instantly</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs text-emerald-700 font-medium">AI Agent</span>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="relative space-y-4 py-6 min-h-[320px]">
                {/* AI Message 1 */}
                <div className="flex justify-start hero-msg hero-msg-1">
                  <div className="relative max-w-[85%]">
                    <div className="bg-slate-100/90 rounded-2xl rounded-bl-md px-4 py-3">
                      <p className="text-slate-700 text-sm leading-relaxed">Hi! I noticed you're interested in our premium plan. Can I help answer any questions about features or pricing?</p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 ml-2 block">10:24 AM</span>
                  </div>
                </div>

                {/* User Message 1 */}
                <div className="flex justify-end hero-msg hero-msg-2">
                  <div className="relative max-w-[75%]">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl rounded-br-md px-4 py-3 shadow-lg shadow-emerald-500/25">
                      <p className="text-white text-sm">What makes your AI different from competitors?</p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 mr-2 block text-right">10:24 AM</span>
                  </div>
                </div>

                {/* AI Message 2 with List */}
                <div className="flex justify-start hero-msg hero-msg-3">
                  <div className="relative max-w-[85%]">
                    <div className="bg-slate-100/90 rounded-2xl rounded-bl-md px-4 py-3">
                      <p className="text-slate-700 text-sm leading-relaxed mb-3">Great question! Three key advantages:</p>
                      <div className="space-y-2">
                        {[
                          { num: '1', text: 'Native CRM integration' },
                          { num: '2', text: 'Multi-language (20+ languages)' },
                          { num: '3', text: 'Custom knowledge training' }
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-2 hero-list-item" style={{ animationDelay: `${1200 + i * 100}ms` }}>
                            <span className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">{item.num}</span>
                            <span className="text-slate-600 text-sm">{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 ml-2 block">10:25 AM</span>
                  </div>
                </div>

                {/* User Message 2 */}
                <div className="flex justify-end hero-msg hero-msg-4">
                  <div className="relative max-w-[75%]">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl rounded-br-md px-4 py-3 shadow-lg shadow-emerald-500/25">
                      <p className="text-white text-sm">Perfect! I'd like to get started</p>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 mr-2 block text-right">10:25 AM</span>
                  </div>
                </div>
              </div>

              {/* Typing Indicator */}
              <div className="relative flex items-center gap-3 bg-slate-50/80 rounded-xl px-4 py-3 border border-slate-100">
                <div className="flex gap-1">
                  <span className="hero-typing-dot w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="hero-typing-dot w-2 h-2 bg-emerald-500 rounded-full" style={{ animationDelay: '150ms' }} />
                  <span className="hero-typing-dot w-2 h-2 bg-emerald-500 rounded-full" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-slate-500 text-sm">AI is preparing your onboarding...</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Premium Hero Animations */}
      <style>{`
        /* Premium background */
        .hero-premium-bg {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%);
        }

        /* Orb drift animations */
        @keyframes orb-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -20px) scale(1.05); }
          50% { transform: translate(-15px, 30px) scale(0.95); }
          75% { transform: translate(25px, 15px) scale(1.02); }
        }
        .hero-orb-drift-1 { animation: orb-drift-1 20s ease-in-out infinite; }

        @keyframes orb-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(-25px, 25px) scale(0.98); }
          50% { transform: translate(20px, -15px) scale(1.03); }
          75% { transform: translate(-10px, -20px) scale(1); }
        }
        .hero-orb-drift-2 { animation: orb-drift-2 25s ease-in-out infinite; }

        @keyframes orb-drift-3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 20px); }
        }
        .hero-orb-drift-3 { animation: orb-drift-3 15s ease-in-out infinite; }

        @keyframes orb-pulse {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.6; transform: translate(-50%, -50%) scale(1.05); }
        }
        .hero-orb-pulse { animation: orb-pulse 8s ease-in-out infinite; }

        /* Gradient text animation */
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .hero-gradient-text {
          animation: gradient-shift 4s ease-in-out infinite;
        }

        /* Chat glow animation */
        @keyframes chat-glow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.8; }
        }
        .hero-chat-glow { animation: chat-glow 4s ease-in-out infinite; }

        /* Float animations for cards */
        @keyframes hero-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
        .hero-float-card { animation: hero-float 5s ease-in-out infinite; }
        .hero-float-delayed { animation-delay: 1.5s; }
        .hero-float-slow { animation-delay: 2.5s; animation-duration: 6s; }
        .hero-float-sparkle { animation-delay: 0.5s; animation-duration: 4s; }

        /* Typing dots animation */
        @keyframes typing-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        .hero-typing-dot {
          animation: typing-bounce 1s ease-in-out infinite;
        }

        /* Message animations */
        .hero-msg-1 { animation: msg-slide-in 0.5s ease-out 0.3s both; }
        .hero-msg-2 { animation: msg-slide-in-right 0.5s ease-out 0.7s both; }
        .hero-msg-3 { animation: msg-slide-in 0.5s ease-out 1.1s both; }
        .hero-msg-4 { animation: msg-slide-in-right 0.5s ease-out 1.5s both; }

        @keyframes msg-slide-in {
          0% { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes msg-slide-in-right {
          0% { opacity: 0; transform: translateX(20px); }
          100% { opacity: 1; transform: translateX(0); }
        }

        /* List items animation */
        .hero-list-item {
          opacity: 0;
          animation: list-pop 0.4s ease-out forwards;
        }
        @keyframes list-pop {
          0% { opacity: 0; transform: scale(0.9) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </section>
  );
}
