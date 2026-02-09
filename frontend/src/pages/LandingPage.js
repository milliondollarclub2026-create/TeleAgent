import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Bot,
  MessageSquare,
  Zap,
  Globe,
  BarChart3,
  ArrowRight,
  Check,
  Sparkles,
  Database,
  TrendingUp,
  Menu,
  X,
  Send
} from 'lucide-react';
import PremiumHero from '../components/PremiumHero';

// ============================================================================
// PREMIUM CRM CHAT SECTION COMPONENT
// Interactive demo with typing effects, animated data, and glassmorphism
// ============================================================================

function CRMChatSection() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [countedValue, setCountedValue] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  // Animation phases:
  // 0: Initial - nothing shown
  // 1: First user message appears
  // 2: AI typing indicator
  // 3: AI response with typing effect
  // 4: Data items reveal one by one
  // 5: Second user message
  // 6: AI typing for revenue
  // 7: Revenue response with counting animation
  // 8: Complete - loop ready

  const aiResponseText = "Based on your CRM data:";
  const revenueResponseText = "This week's revenue:";

  const productData = [
    { rank: 1, name: 'Tiramisu Cake', orders: 45, growth: '+12%' },
    { rank: 2, name: 'Napoleon', orders: 32, growth: '+8%' },
    { rank: 3, name: 'Medovik', orders: 28, growth: '+15%' }
  ];

  // Intersection observer for scroll-triggered animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  // Main animation sequence
  useEffect(() => {
    if (!isVisible) return;

    const timings = [
      { phase: 1, delay: 500 },    // User message 1 appears
      { phase: 2, delay: 1200 },   // AI typing indicator
      { phase: 3, delay: 2000 },   // AI starts typing response
      { phase: 4, delay: 3200 },   // Data items start revealing
      { phase: 5, delay: 5500 },   // Second user message
      { phase: 6, delay: 6200 },   // AI typing for revenue
      { phase: 7, delay: 7000 },   // Revenue counting animation
      { phase: 8, delay: 9500 },   // Complete
    ];

    const timeouts = timings.map(({ phase, delay }) =>
      setTimeout(() => setAnimationPhase(phase), delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [isVisible]);

  // Typing effect for AI response
  useEffect(() => {
    if (animationPhase !== 3) return;

    let index = 0;
    const text = aiResponseText;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setTypedText(text.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [animationPhase]);

  // Cursor blinking
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Revenue counting animation
  useEffect(() => {
    if (animationPhase !== 7) return;

    const targetValue = 24500;
    const duration = 1500;
    const steps = 60;
    const increment = targetValue / steps;
    let current = 0;

    const interval = setInterval(() => {
      current += increment;
      if (current >= targetValue) {
        setCountedValue(targetValue);
        clearInterval(interval);
      } else {
        setCountedValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [animationPhase]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <section ref={sectionRef} className="py-24 bg-gradient-to-b from-white via-slate-50/50 to-white overflow-hidden relative">
      {/* Ambient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl crm-ambient-1" />
        <div className="absolute bottom-1/4 -left-32 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl crm-ambient-2" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Side - Content */}
          <div className={`crm-content transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-full px-4 py-2 mb-6 shadow-sm">
              <div className="relative">
                <Sparkles className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
                <div className="absolute inset-0 animate-ping">
                  <Sparkles className="w-4 h-4 text-emerald-400 opacity-75" strokeWidth={1.75} />
                </div>
              </div>
              <span className="text-emerald-700 text-sm font-medium">AI-Powered Insights</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans'] mb-6">
              Chat with your
              <br />
              <span className="relative">
                <span className="text-emerald-600">CRM data</span>
                <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                  <path d="M1 5.5C47 2 153 2 199 5.5" stroke="url(#underline-gradient)" strokeWidth="3" strokeLinecap="round" className="crm-underline-path" />
                  <defs>
                    <linearGradient id="underline-gradient" x1="0" y1="0" x2="200" y2="0">
                      <stop stopColor="#059669" />
                      <stop offset="1" stopColor="#0d9488" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h2>

            <p className="text-slate-500 text-lg leading-relaxed mb-8">
              Ask questions in natural language and get instant insights. "What are my top leads?"
              "Show me this week's sales." Your CRM speaks back.
            </p>

            <ul className="space-y-4">
              {[
                { text: 'Natural language queries', icon: MessageSquare },
                { text: 'Real-time CRM data analysis', icon: BarChart3 },
                { text: 'Supports Uzbek, Russian, English', icon: Globe }
              ].map((item, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-3 text-slate-700 transition-all duration-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                  style={{ transitionDelay: `${300 + i * 100}ms` }}
                >
                  <div className="w-8 h-8 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <item.icon className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
                  </div>
                  <span className="font-medium">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Side - Interactive Chat Demo */}
          <div className={`relative transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            {/* Floating background orbs */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-emerald-200/40 to-teal-200/30 rounded-full blur-2xl crm-orb-1" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-gradient-to-br from-blue-200/40 to-indigo-200/30 rounded-full blur-2xl crm-orb-2" />

            {/* Glassmorphic Chat Card */}
            <div className="relative bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl shadow-slate-200/50 rounded-3xl p-6 crm-chat-card">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-emerald-50/20 rounded-3xl pointer-events-none" />

              {/* Inner glow effect */}
              <div className="absolute inset-[1px] rounded-[23px] bg-gradient-to-br from-white to-slate-50/50 -z-10" />

              {/* Header */}
              <div className="relative flex items-center justify-between pb-4 border-b border-slate-100/80">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <Sparkles className="w-5 h-5 text-white" strokeWidth={1.75} />
                    </div>
                    <div className="absolute -inset-1 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl blur opacity-30 -z-10" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 text-sm block">CRM Chat</span>
                    <span className="text-xs text-slate-400">Powered by AI</span>
                  </div>
                </div>

                {/* Live indicator with glow */}
                <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-100 rounded-full px-3 py-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                  </span>
                  <span className="text-xs text-emerald-700 font-semibold tracking-wide">LIVE</span>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="relative space-y-4 py-6 min-h-[420px]">
                {/* User Message 1 */}
                <div className={`flex justify-end transition-all duration-500 ${animationPhase >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
                  <div className="group relative max-w-[260px]">
                    <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-lg shadow-emerald-500/25 transition-transform duration-300 group-hover:scale-[1.02]">
                      <p className="text-sm font-medium">Show me top selling products</p>
                    </div>
                    <div className="text-[10px] text-slate-400 text-right mt-1 mr-1">Just now</div>
                  </div>
                </div>

                {/* AI Typing Indicator */}
                {animationPhase === 2 && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Response with Data */}
                {animationPhase >= 3 && animationPhase !== 2 && (
                  <div className="flex justify-start transition-all duration-500">
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-4 max-w-[320px] shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-slate-700 text-sm mb-3 font-medium">
                        {typedText}
                        {animationPhase === 3 && showCursor && <span className="inline-block w-0.5 h-4 bg-emerald-500 ml-0.5 animate-pulse" />}
                      </p>

                      {animationPhase >= 4 && (
                        <div className="space-y-2">
                          {productData.map((item, i) => (
                            <div
                              key={item.rank}
                              className={`flex items-center justify-between gap-3 p-2 rounded-lg transition-all duration-300 cursor-default
                                ${hoveredItem === i ? 'bg-emerald-50 scale-[1.02]' : 'bg-slate-50/50 hover:bg-slate-50'}
                                ${animationPhase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                              style={{ transitionDelay: `${i * 150}ms` }}
                              onMouseEnter={() => setHoveredItem(i)}
                              onMouseLeave={() => setHoveredItem(null)}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
                                  item.rank === 1 ? 'bg-amber-100 text-amber-700' :
                                  item.rank === 2 ? 'bg-slate-200 text-slate-600' :
                                  'bg-orange-100 text-orange-700'
                                }`}>
                                  {item.rank}
                                </span>
                                <span className="text-slate-700 text-sm font-medium">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                  {item.orders} orders
                                </span>
                                {hoveredItem === i && (
                                  <span className="text-[10px] font-semibold text-emerald-500 animate-fade-in">
                                    {item.growth}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Second User Message */}
                {animationPhase >= 5 && (
                  <div className={`flex justify-end transition-all duration-500 ${animationPhase >= 5 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
                    <div className="group relative">
                      <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-lg shadow-emerald-500/25 transition-transform duration-300 group-hover:scale-[1.02]">
                        <p className="text-sm font-medium">This week's revenue?</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Second AI Typing */}
                {animationPhase === 6 && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Revenue Response with Counter */}
                {animationPhase >= 7 && (
                  <div className="flex justify-start transition-all duration-500">
                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-slate-600 text-sm mb-2">{revenueResponseText}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] tabular-nums">
                          {formatCurrency(countedValue)}
                        </span>
                        <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" strokeWidth={2} />
                          +18%
                        </span>
                      </div>

                      {/* Mini chart visualization */}
                      <div className="flex items-end gap-1 mt-3 h-8">
                        {[35, 42, 38, 55, 48, 62, 58].map((height, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t transition-all duration-500"
                            style={{
                              height: animationPhase >= 7 ? `${height}%` : '0%',
                              transitionDelay: `${i * 80}ms`
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>Mon</span>
                        <span>Sun</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Premium Input Area */}
              <div className="relative pt-4 border-t border-slate-100/80">
                <div className={`flex items-center gap-3 bg-slate-50/80 rounded-xl px-4 py-3 border-2 transition-all duration-300 ${
                  inputFocused
                    ? 'border-emerald-300 shadow-lg shadow-emerald-100 bg-white'
                    : 'border-transparent hover:border-slate-200'
                }`}>
                  <input
                    type="text"
                    placeholder="Ask anything about your CRM..."
                    className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                  />
                  <button className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    inputFocused
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/25 scale-105'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}>
                    <Send className="w-4 h-4 text-white" strokeWidth={2} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 text-center mt-2">
                  Press Enter to send or click the button
                </p>
              </div>
            </div>

            {/* Floating Stats Cards */}
            <div className="absolute -bottom-6 -right-4 bg-white/90 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-xl shadow-slate-200/50 crm-stats-float-1 hover:scale-105 transition-transform cursor-default">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <TrendingUp className="w-6 h-6 text-white" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900 tabular-nums">{formatCurrency(countedValue || 24500)}</p>
                  <p className="text-xs text-slate-500">Weekly Revenue</p>
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -left-4 bg-white/90 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-3 shadow-xl shadow-slate-200/50 crm-stats-float-2 hover:scale-105 transition-transform cursor-default">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md shadow-amber-500/25">
                  <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">105</p>
                  <p className="text-[10px] text-slate-500">Total Orders</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section-specific animations */}
      <style>{`
        .crm-ambient-1 {
          animation: ambient-drift 20s ease-in-out infinite;
        }
        .crm-ambient-2 {
          animation: ambient-drift 25s ease-in-out infinite reverse;
          animation-delay: -5s;
        }
        @keyframes ambient-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 30px) scale(0.95); }
        }

        .crm-orb-1 {
          animation: orb-float 8s ease-in-out infinite;
        }
        .crm-orb-2 {
          animation: orb-float 10s ease-in-out infinite reverse;
          animation-delay: -3s;
        }
        @keyframes orb-float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-15px, 15px); }
        }

        .crm-chat-card {
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease;
        }
        .crm-chat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
        }

        .crm-stats-float-1 {
          animation: stats-float 6s ease-in-out infinite;
        }
        .crm-stats-float-2 {
          animation: stats-float 7s ease-in-out infinite;
          animation-delay: -2s;
        }
        @keyframes stats-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }

        .crm-underline-path {
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
          animation: draw-underline 1s ease-out 0.5s forwards;
        }
        @keyframes draw-underline {
          to { stroke-dashoffset: 0; }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}

// ============================================================================
// MAIN LANDING PAGE COMPONENT
// ============================================================================

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const heroRef = useRef(null);

  // Handle hash navigation (e.g., /#features from other pages)
  useEffect(() => {
    if (location.hash) {
      const sectionId = location.hash.replace('#', '');
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      // No hash - scroll to top when landing page loads fresh
      window.scrollTo(0, 0);
    }
  }, [location]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    // Trigger hero animations after mount
    const timer = setTimeout(() => setHeroVisible(true), 100);

    // Scroll reveal observer
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe all elements with scroll-reveal class
    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const handleCTA = () => navigate('/login');

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-sm'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
                <span className="text-emerald-600">Lead</span>
                <span className="text-slate-900">Relay</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => scrollToSection('features')}
                className="relative px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium group"
              >
                Features
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-emerald-600 transition-all duration-300 group-hover:w-6" />
              </button>
              <Link
                to="/pricing"
                className="relative px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium group"
              >
                Pricing
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-emerald-600 transition-all duration-300 group-hover:w-6" />
              </Link>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={handleCTA}
                className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-100"
                data-testid="nav-login-btn"
              >
                Log in
              </button>
              <button
                onClick={handleCTA}
                className="group relative bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 overflow-hidden"
                data-testid="nav-cta-btn"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2} />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-500 ease-out ${
          mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="bg-white/95 backdrop-blur-xl border-t border-slate-200/50 px-6 py-6 space-y-2">
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left text-slate-600 hover:text-slate-900 hover:bg-slate-50 py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Features
            </button>
            <Link
              to="/pricing"
              className="block w-full text-left text-slate-600 hover:text-slate-900 hover:bg-slate-50 py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Pricing
            </Link>
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <button
                onClick={handleCTA}
                className="block w-full text-center text-slate-600 hover:text-slate-900 py-3 font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Log in
              </button>
              <button
                onClick={handleCTA}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-full py-3.5 font-semibold transition-all"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Premium Hero Section */}
      <PremiumHero
        heroVisible={heroVisible}
        handleCTA={handleCTA}
        scrollToSection={scrollToSection}
        heroRef={heroRef}
      />


      {/* Features Section - Premium Bento Grid */}
      <section id="features" className="py-32 relative overflow-hidden features-section">
        {/* Layered Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50" />

        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(100 116 139) 0.5px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} />

        {/* Ambient gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-emerald-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-slate-100/50 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-20 scroll-reveal">
            <div className="inline-flex items-center gap-2.5 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-full px-5 py-2.5 mb-8 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-600 text-sm font-medium tracking-wide">Powerful Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] text-slate-900 mb-6">
              Everything you need to
              <br />
              <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">sell smarter</span>
            </h2>
            <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              A complete AI sales toolkit designed for modern businesses.
            </p>
          </div>

          {/* Premium Bento Grid */}
          <div className="grid grid-cols-12 gap-4 md:gap-5 auto-rows-[minmax(200px,auto)] scroll-reveal" style={{ transitionDelay: '100ms' }}>

            {/* Hero Feature - Telegram Native (Large Card) */}
            <div className="col-span-12 md:col-span-7 row-span-2 bento-card bento-card-1">
              <div className="group relative h-full bento-glass rounded-[28px] p-8 md:p-10 overflow-hidden transition-all duration-500 hover:scale-[1.012]">
                {/* Gradient border reveal */}
                <div className="absolute inset-0 rounded-[28px] bento-border-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Hover gradient orb */}
                <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br from-blue-400/8 via-cyan-400/5 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out" />

                {/* Content */}
                <div className="relative z-10">
                  {/* Animated Icon */}
                  <div className="relative mb-8 inline-block">
                    <div className="bento-icon-container w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-xl group-hover:shadow-blue-500/25 transition-all duration-500">
                      <MessageSquare className="w-8 h-8 text-white bento-icon-float" strokeWidth={1.75} />
                    </div>
                    {/* Subtle glow ring */}
                    <div className="absolute inset-0 rounded-2xl bg-blue-400/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10" />
                  </div>

                  <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 font-['Plus_Jakarta_Sans'] tracking-tight">
                    Telegram Native
                  </h3>
                  <p className="text-slate-500 text-base md:text-lg leading-relaxed mb-8 max-w-md">
                    Works directly inside your customers' favorite messaging app. No app downloads, no friction — just seamless conversations that convert.
                  </p>

                  {/* Interactive Pills */}
                  <div className="flex flex-wrap gap-2.5">
                    {['Instant Replies', '24/7 Availability', 'Rich Media'].map((tag, i) => (
                      <span
                        key={tag}
                        className="bento-pill bg-slate-100/80 text-slate-600 px-4 py-2 rounded-full text-sm font-medium border border-slate-200/60 backdrop-blur-sm hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200/80 transition-all duration-300 cursor-default"
                        style={{ transitionDelay: `${i * 50}ms` }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom gradient line */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 ease-out" />
              </div>
            </div>

            {/* Multi-Language - Tall Card */}
            <div className="col-span-12 md:col-span-5 row-span-2 bento-card bento-card-2">
              <div className="group relative h-full bento-glass rounded-[28px] p-8 overflow-hidden transition-all duration-500 hover:scale-[1.012]">
                {/* Gradient border reveal */}
                <div className="absolute inset-0 rounded-[28px] bento-border-gradient-purple opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Hover gradient orb */}
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-gradient-to-tl from-purple-400/10 via-violet-400/6 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out" />

                <div className="relative z-10 h-full flex flex-col">
                  {/* Animated Icon */}
                  <div className="relative mb-8 inline-block">
                    <div className="bento-icon-container w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-xl group-hover:shadow-purple-500/25 transition-all duration-500">
                      <Globe className="w-8 h-8 text-white bento-icon-float" strokeWidth={1.75} />
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-purple-400/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10" />
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-4 font-['Plus_Jakarta_Sans'] tracking-tight">Multi-Language</h3>
                  <p className="text-slate-500 leading-relaxed mb-8 flex-grow text-base">
                    Speaks Uzbek, Russian, and English fluently. Auto-detects customer language and responds naturally.
                  </p>

                  {/* Language Pills with hover effects */}
                  <div className="flex gap-3">
                    {[
                      { code: 'UZ', label: 'Uzbek' },
                      { code: 'RU', label: 'Russian' },
                      { code: 'EN', label: 'English' }
                    ].map((lang, i) => (
                      <div
                        key={lang.code}
                        className="bento-lang-pill flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100/80 border border-slate-200/60 backdrop-blur-sm group-hover:bg-purple-50 group-hover:border-purple-200/60 transition-all duration-300"
                        style={{ transitionDelay: `${i * 75}ms` }}
                      >
                        <span className="text-sm font-semibold text-slate-600 group-hover:text-purple-700 transition-colors duration-300">{lang.code}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom gradient line */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 ease-out" />
              </div>
            </div>

            {/* Bitrix24 Sync - Wide Card */}
            <div className="col-span-12 md:col-span-6 bento-card bento-card-3">
              <div className="group relative h-full bento-glass rounded-[28px] p-7 overflow-hidden transition-all duration-500 hover:scale-[1.015]">
                {/* Gradient border reveal */}
                <div className="absolute inset-0 rounded-[28px] bento-border-gradient-emerald opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Hover gradient orb */}
                <div className="absolute -top-16 -left-16 w-48 h-48 bg-gradient-to-br from-emerald-400/10 via-teal-400/6 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out" />

                <div className="relative z-10 flex items-start gap-5">
                  {/* Animated Icon */}
                  <div className="relative flex-shrink-0">
                    <div className="bento-icon-container w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-xl group-hover:shadow-emerald-500/25 transition-all duration-500">
                      <Database className="w-7 h-7 text-white bento-icon-float" strokeWidth={1.75} />
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-emerald-400/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">Bitrix24 Sync</h3>
                      {/* Live sync indicator */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 bento-pulse-dot" />
                        <span className="text-xs font-medium text-emerald-600">Live</span>
                      </div>
                    </div>
                    <p className="text-slate-500 leading-relaxed text-sm">
                      Real-time 2-way sync. Leads, deals, contacts — always perfectly in sync with your CRM.
                    </p>
                  </div>
                </div>

                {/* Bottom gradient line */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 ease-out" />
              </div>
            </div>

            {/* No-Code Builder - Medium Card */}
            <div className="col-span-12 md:col-span-6 bento-card bento-card-4">
              <div className="group relative h-full bento-glass rounded-[28px] p-7 overflow-hidden transition-all duration-500 hover:scale-[1.015]">
                {/* Gradient border reveal */}
                <div className="absolute inset-0 rounded-[28px] bento-border-gradient-amber opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Hover gradient orb */}
                <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-gradient-to-tl from-amber-400/10 via-orange-400/6 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out" />

                <div className="relative z-10 flex items-start gap-5">
                  {/* Animated Icon */}
                  <div className="relative flex-shrink-0">
                    <div className="bento-icon-container w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-xl group-hover:shadow-amber-500/25 transition-all duration-500">
                      <Sparkles className="w-7 h-7 text-white bento-icon-sparkle" strokeWidth={1.75} />
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-amber-400/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-slate-900 mb-2 font-['Plus_Jakarta_Sans'] tracking-tight">No-Code Builder</h3>
                    <p className="text-slate-500 leading-relaxed text-sm">
                      Configure your AI agent in minutes with our visual builder. No technical skills required.
                    </p>
                  </div>
                </div>

                {/* Bottom gradient line */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 ease-out" />
              </div>
            </div>

            {/* Smart Analytics - Full Width Card with Stats */}
            <div className="col-span-12 bento-card bento-card-5">
              <div className="group relative h-full bento-glass rounded-[28px] p-7 md:p-8 overflow-hidden transition-all duration-500 hover:scale-[1.008]">
                {/* Gradient border reveal */}
                <div className="absolute inset-0 rounded-[28px] bento-border-gradient-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Hover gradient orb */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b from-cyan-400/8 via-sky-400/5 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700 ease-out" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
                  {/* Animated Icon */}
                  <div className="relative flex-shrink-0">
                    <div className="bento-icon-container w-14 h-14 bg-gradient-to-br from-cyan-500 to-sky-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-xl group-hover:shadow-cyan-500/25 transition-all duration-500">
                      <BarChart3 className="w-7 h-7 text-white bento-icon-float" strokeWidth={1.75} />
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-cyan-400/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-slate-900 mb-2 font-['Plus_Jakarta_Sans'] tracking-tight">Smart Analytics</h3>
                    <p className="text-slate-500 leading-relaxed text-sm max-w-lg">
                      Real-time dashboards and insights. Track conversations, conversions, and revenue in one place.
                    </p>
                  </div>

                  {/* Mini stat cards */}
                  <div className="flex gap-4 flex-wrap md:flex-nowrap">
                    {[
                      { value: '2.4k', label: 'Messages', color: 'cyan' },
                      { value: '+34%', label: 'Conversion', color: 'emerald' },
                      { value: '$12k', label: 'Revenue', color: 'violet' }
                    ].map((stat, i) => (
                      <div
                        key={stat.label}
                        className="bento-stat-card flex flex-col items-center px-5 py-3 rounded-xl bg-slate-50/80 border border-slate-100 backdrop-blur-sm group-hover:bg-white group-hover:border-slate-200 transition-all duration-300"
                        style={{ transitionDelay: `${i * 75}ms` }}
                      >
                        <span className={`text-lg font-bold ${stat.color === 'cyan' ? 'text-cyan-600' : stat.color === 'emerald' ? 'text-emerald-600' : 'text-violet-600'}`}>{stat.value}</span>
                        <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom gradient line */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 ease-out" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-28 md:py-36 bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-hidden relative">
        {/* Subtle background texture */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(16 185 129) 1px, transparent 0)`,
          backgroundSize: '48px 48px'
        }} />

        <div className="max-w-6xl mx-auto px-6 md:px-12 relative">
          {/* Section Header */}
          <div className="text-center mb-20 scroll-reveal">
            <div className="inline-flex items-center gap-2.5 bg-white/80 backdrop-blur-sm border border-emerald-100 rounded-full px-5 py-2.5 mb-8 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-700 text-sm font-medium tracking-wide">Simple Setup</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] text-slate-900 mb-6">
              Get started in
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent"> 3 simple steps</span>
            </h2>
            <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              From setup to your first sale in under 10 minutes. No coding required.
            </p>
          </div>

          {/* Steps Container */}
          <div className="relative scroll-reveal" style={{ transitionDelay: '100ms' }}>

            {/* Connection Line with Animated Progress - Desktop Only */}
            <div className="hidden lg:block absolute top-[4.5rem] left-[calc(16.666%+1rem)] right-[calc(16.666%+1rem)] z-0">
              {/* Base line */}
              <div className="h-[2px] bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-full" />
              {/* Animated glow line overlay */}
              <div className="absolute inset-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full animate-line-sweep opacity-60" />
              {/* Connection nodes */}
              <div className="absolute -top-[5px] left-[-20px] w-3 h-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/40 step-node step-node-1" />
              <div className="absolute -top-[5px] left-[calc(50%-5px)] -translate-x-1/2 w-3 h-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/40 step-node step-node-2" />
              <div className="absolute -top-[5px] right-[-20px] w-3 h-3 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/40 step-node step-node-3" />
            </div>

            {/* Steps Grid */}
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {[
                {
                  step: 1,
                  icon: Bot,
                  title: 'Create Your Agent',
                  description: 'Use our setup wizard to configure your AI sales agent. Add your business info, products, and sales guidelines.',
                  delay: '0ms'
                },
                {
                  step: 2,
                  icon: Database,
                  title: 'Connect & Train',
                  description: 'Link your Telegram bot and Bitrix24 CRM. Upload knowledge base documents for smarter responses.',
                  delay: '150ms'
                },
                {
                  step: 3,
                  icon: Zap,
                  title: 'Start Selling',
                  description: 'Go live! Your AI agent handles conversations 24/7, qualifying leads and closing deals automatically.',
                  delay: '300ms'
                }
              ].map((item, i) => (
                <div
                  key={item.step}
                  className="group flex flex-col step-card-wrapper"
                  style={{ animationDelay: item.delay }}
                >
                  {/* Step Number Badge */}
                  <div className="flex justify-center mb-8 relative z-10">
                    <div className="relative">
                      {/* Outer glow ring */}
                      <div className="absolute inset-0 w-[4.5rem] h-[4.5rem] -m-1 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl opacity-20 blur-md group-hover:opacity-40 group-hover:blur-lg transition-all duration-500" />
                      {/* Main badge */}
                      <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-600/25 group-hover:shadow-emerald-500/40 group-hover:scale-110 transition-all duration-400 overflow-hidden">
                        {/* Subtle inner shine */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent" />
                        <span className="relative text-2xl font-bold text-white font-['Plus_Jakarta_Sans']">{item.step}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-emerald-200/60 transition-all duration-400 flex flex-col group-hover:-translate-y-1 relative overflow-hidden">
                    {/* Subtle hover gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/0 via-transparent to-teal-50/0 group-hover:from-emerald-50/50 group-hover:to-teal-50/30 transition-all duration-500 pointer-events-none" />

                    <div className="relative">
                      {/* Icon Container */}
                      <div className="w-14 h-14 bg-slate-100/80 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-100/80 transition-all duration-400 step-icon-container">
                        <item.icon className="w-7 h-7 text-slate-500 group-hover:text-emerald-600 transition-all duration-400 step-icon" strokeWidth={1.75} />
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-slate-900 mb-3 font-['Plus_Jakarta_Sans'] group-hover:text-slate-800 transition-colors">
                        {item.title}
                      </h3>

                      {/* Description */}
                      <p className="text-slate-500 leading-relaxed flex-1 group-hover:text-slate-600 transition-colors">
                        {item.description}
                      </p>
                    </div>

                    {/* Bottom accent line */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-b-2xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CRM Chat Feature Section - Premium Interactive Demo */}
      <CRMChatSection />

      {/* Final CTA Section - Premium 2026 Design */}
      <section className="py-40 relative overflow-hidden">
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0 bg-[#0a0f1a]" />

        {/* Mesh gradient layers */}
        <div className="absolute inset-0 cta-mesh-gradient opacity-80" />

        {/* Floating orbs with complex motion */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="cta-orb cta-orb-1" />
          <div className="cta-orb cta-orb-2" />
          <div className="cta-orb cta-orb-3" />
          <div className="cta-orb cta-orb-4" />
        </div>

        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg==')]" />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:80px_80px]" />

        <div className="max-w-5xl mx-auto px-6 md:px-12 text-center relative z-10 scroll-reveal">
          {/* Animated badge */}
          <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 backdrop-blur-xl border border-emerald-400/20 rounded-full px-5 py-2.5 mb-10 cta-badge-glow">
            <div className="relative">
              <Sparkles className="w-4 h-4 text-emerald-400" strokeWidth={2} />
              <div className="absolute inset-0 animate-ping">
                <Sparkles className="w-4 h-4 text-emerald-400 opacity-50" strokeWidth={2} />
              </div>
            </div>
            <span className="text-emerald-300 text-sm font-medium tracking-wide">Start Converting Leads Today</span>
          </div>

          {/* Bold headline with gradient text */}
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] mb-8 leading-[1.1]">
            <span className="text-white">Stop Losing Sales</span>
            <br />
            <span className="cta-gradient-text">Start Closing Deals</span>
          </h2>

          <p className="text-slate-300/90 text-lg md:text-xl mb-14 max-w-2xl mx-auto leading-relaxed font-light">
            Join 500+ businesses already using LeadRelay to automate Telegram sales
            and close deals around the clock—no coding required.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            {/* Primary glowing CTA button */}
            <button
              onClick={handleCTA}
              className="group relative cta-glow-button"
              data-testid="final-cta-btn"
            >
              <span className="relative z-10 inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full px-10 py-5 text-lg font-semibold transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-emerald-500/30">
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" strokeWidth={2.5} />
              </span>
              {/* Glow effect layers */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-300" />
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-20 blur-2xl transition-opacity duration-500" />
            </button>

            {/* Secondary link with hover animation */}
            <Link
              to="/pricing"
              className="group text-slate-300 hover:text-white transition-all duration-300 text-lg font-medium flex items-center gap-2 py-5 px-6"
            >
              <span className="relative">
                View Pricing
                <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-emerald-400 to-teal-400 group-hover:w-full transition-all duration-300" />
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" strokeWidth={2} />
            </Link>
          </div>

          {/* Premium trust indicators */}
          <div className="mt-20 pt-10 border-t border-white/5">
            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
              {[
                { icon: <Check className="w-4 h-4" strokeWidth={2.5} />, text: 'No credit card required' },
                { icon: <Zap className="w-4 h-4" strokeWidth={2.5} />, text: '10-minute setup' },
                { icon: <Sparkles className="w-4 h-4" strokeWidth={2.5} />, text: 'Cancel anytime' }
              ].map((item, i) => (
                <div key={i} className="group flex items-center gap-3 cursor-default">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-all duration-300">
                    {item.icon}
                  </div>
                  <span className="text-slate-400 text-sm font-medium group-hover:text-slate-300 transition-colors duration-300">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Premium Dark Footer */}
      <footer className="bg-[#0a0f1a] border-t border-white/5 relative overflow-hidden">
        {/* Subtle gradient glow at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          {/* Main Footer Content */}
          <div className="py-20">
            <div className="grid grid-cols-2 md:grid-cols-12 gap-12 md:gap-8">
              {/* Brand Column - Larger */}
              <div className="col-span-2 md:col-span-4">
                <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
                  <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-shadow duration-300">
                    <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-2xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
                    <span className="text-emerald-400">Lead</span>
                    <span className="text-white">Relay</span>
                  </span>
                </Link>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-8">
                  AI-powered sales automation for Telegram. Close more deals around the clock with intelligent conversation handling.
                </p>

                {/* Social icons with premium hover */}
                <div className="flex items-center gap-4">
                  <a
                    href="https://t.me/leadrelay"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-all duration-300"
                    aria-label="Telegram"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                    </svg>
                  </a>
                  <a
                    href="https://twitter.com/leadrelay"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-all duration-300"
                    aria-label="Twitter"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <a
                    href="https://linkedin.com/company/leadrelay"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-all duration-300"
                    aria-label="LinkedIn"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                </div>
              </div>

              {/* Product Column */}
              <div className="md:col-span-2">
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest mb-6">
                  Product
                </h4>
                <ul className="space-y-4">
                  {['Features', 'Pricing', 'Integrations', 'API'].map((item, i) => (
                    <li key={i}>
                      <a
                        href={item === 'Features' ? '#features' : item === 'Pricing' ? '/pricing' : '#'}
                        className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2"
                      >
                        <span className="relative">
                          {item}
                          <span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company Column */}
              <div className="md:col-span-2">
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest mb-6">
                  Company
                </h4>
                <ul className="space-y-4">
                  {['About', 'Blog', 'Careers', 'Contact'].map((item, i) => (
                    <li key={i}>
                      <a
                        href={item === 'Contact' ? 'mailto:support@leadrelay.com' : '#'}
                        className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2"
                      >
                        <span className="relative">
                          {item}
                          <span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources Column */}
              <div className="md:col-span-2">
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest mb-6">
                  Resources
                </h4>
                <ul className="space-y-4">
                  {['Documentation', 'Help Center', 'Status', 'Changelog'].map((item, i) => (
                    <li key={i}>
                      <a
                        href="#"
                        className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2"
                      >
                        <span className="relative">
                          {item}
                          <span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal Column */}
              <div className="md:col-span-2">
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest mb-6">
                  Legal
                </h4>
                <ul className="space-y-4">
                  {[
                    { name: 'Privacy Policy', to: '/privacy' },
                    { name: 'Terms of Service', to: '/terms' },
                    { name: 'Cookie Policy', to: '#' },
                    { name: 'GDPR', to: '#' }
                  ].map((item, i) => (
                    <li key={i}>
                      <Link
                        to={item.to}
                        className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2"
                      >
                        <span className="relative">
                          {item.name}
                          <span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar - Refined */}
          <div className="py-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-slate-500 font-light">
              &copy; 2026 LeadRelay. All rights reserved.
            </p>

            <div className="flex items-center gap-8">
              <span className="text-xs text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All systems operational
              </span>
              <div className="h-4 w-px bg-white/10" />
              <a href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors duration-300">
                System Status
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom Animations */}
      <style>{`
        /* Scroll Reveal Animation */
        .scroll-reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scroll-reveal.revealed {
          opacity: 1;
          transform: translateY(0);
        }

        /* Hero gradient background */
        .hero-gradient {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%);
        }

        /* Floating animations */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 4s ease-in-out infinite;
          animation-delay: 2s;
        }
        .animate-float-slow {
          animation: float 5s ease-in-out infinite;
          animation-delay: 1s;
        }

        /* Drift animations for background orbs */
        @keyframes drift {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(20px, -15px); }
          50% { transform: translate(-10px, 20px); }
          75% { transform: translate(15px, 10px); }
        }
        .animate-drift {
          animation: drift 15s ease-in-out infinite;
        }
        .animate-drift-slow {
          animation: drift 20s ease-in-out infinite reverse;
        }

        /* Scroll indicator */
        @keyframes scroll-indicator {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(8px); opacity: 0.3; }
        }
        .animate-scroll-indicator {
          animation: scroll-indicator 2s ease-in-out infinite;
        }

        /* Fade in up animation */
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }

        /* Line pulse for step connections */
        @keyframes line-pulse {
          0%, 100% {
            opacity: 0;
            transform: translateX(-100%);
          }
          50% {
            opacity: 0.6;
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-line-pulse {
          animation: line-pulse 3s ease-in-out infinite;
        }

        /* Slow ping for step indicators */
        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        /* Slow pulse for CTA background */
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        /* Hero Chat message animations */
        .chat-message-1 { animation: fade-in-up 0.5s ease-out 0.5s both; }
        .chat-message-2 { animation: fade-in-up 0.5s ease-out 0.8s both; }
        .chat-message-3 { animation: fade-in-up 0.5s ease-out 1.1s both; }
        .chat-message-4 { animation: fade-in-up 0.5s ease-out 1.4s both; }

        /* CRM Chat Section Animations */
        @keyframes crm-slide-in {
          0% { opacity: 0; transform: translateX(20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes crm-slide-in-left {
          0% { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes crm-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        @keyframes crm-result-pop {
          0% { opacity: 0; transform: scale(0.9) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        .crm-message-1 { animation: crm-slide-in 0.5s ease-out 0.2s both; }
        .crm-message-2 { animation: crm-slide-in-left 0.5s ease-out 0.6s both; }
        .crm-message-3 { animation: crm-slide-in 0.5s ease-out 1.8s both; }
        .crm-message-4 { animation: crm-slide-in-left 0.4s ease-out 2.4s both; }

        .crm-result-item { animation: crm-result-pop 0.4s ease-out both; }

        .crm-float-1 { animation: crm-float 6s ease-in-out infinite; }
        .crm-float-2 { animation: crm-float 8s ease-in-out infinite reverse; animation-delay: 1s; }

        .crm-stats-card { animation: crm-float 5s ease-in-out infinite; animation-delay: 0.5s; }

        .crm-feature-item {
          opacity: 0;
          animation: fade-in-up 0.5s ease-out forwards;
        }

        /* Feature card subtle transforms */
        .feature-card-3d {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .feature-card-3d:hover {
          transform: translateY(-2px);
        }

        /* Feature card staggered reveal */
        .feature-card {
          opacity: 0;
          animation: feature-reveal 0.6s ease-out forwards;
        }
        @keyframes feature-reveal {
          0% {
            opacity: 0;
            transform: translateY(30px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .feature-card:nth-child(1) { animation-delay: 0.1s; }
        .feature-card:nth-child(2) { animation-delay: 0.2s; }
        .feature-card:nth-child(3) { animation-delay: 0.3s; }
        .feature-card:nth-child(4) { animation-delay: 0.4s; }
        .feature-card:nth-child(5) { animation-delay: 0.5s; }

        /* Icon float animation for features */
        @keyframes icon-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        .icon-float {
          animation: icon-float 3s ease-in-out infinite;
        }

        /* Icon sparkle animation */
        @keyframes icon-sparkle {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.05) rotate(5deg);
            filter: brightness(1.1);
          }
        }
        .icon-sparkle {
          animation: icon-sparkle 2s ease-in-out infinite;
        }

        /* ===== PREMIUM BENTO GRID STYLES ===== */

        /* Glassmorphic card base */
        .bento-glass {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.06);
        }
        .bento-glass:hover {
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 12px 40px -8px rgba(0, 0, 0, 0.1);
          border-color: rgba(203, 213, 225, 0.9);
        }

        /* Bento card staggered reveal */
        .bento-card {
          opacity: 0;
          animation: bento-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes bento-reveal {
          0% {
            opacity: 0;
            transform: translateY(40px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .bento-card-1 { animation-delay: 0.1s; }
        .bento-card-2 { animation-delay: 0.2s; }
        .bento-card-3 { animation-delay: 0.35s; }
        .bento-card-4 { animation-delay: 0.45s; }
        .bento-card-5 { animation-delay: 0.55s; }

        /* Gradient border reveal effects */
        .bento-border-gradient {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(6, 182, 212, 0.2) 50%, rgba(59, 130, 246, 0.3) 100%);
          padding: 1px;
        }
        .bento-border-gradient::before {
          content: '';
          position: absolute;
          inset: 1px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 27px;
        }

        .bento-border-gradient-purple {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(168, 85, 247, 0.2) 50%, rgba(139, 92, 246, 0.3) 100%);
          padding: 1px;
        }
        .bento-border-gradient-purple::before {
          content: '';
          position: absolute;
          inset: 1px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 27px;
        }

        .bento-border-gradient-emerald {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(20, 184, 166, 0.2) 50%, rgba(16, 185, 129, 0.3) 100%);
          padding: 1px;
        }
        .bento-border-gradient-emerald::before {
          content: '';
          position: absolute;
          inset: 1px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 27px;
        }

        .bento-border-gradient-amber {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(249, 115, 22, 0.2) 50%, rgba(245, 158, 11, 0.3) 100%);
          padding: 1px;
        }
        .bento-border-gradient-amber::before {
          content: '';
          position: absolute;
          inset: 1px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 27px;
        }

        .bento-border-gradient-cyan {
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(14, 165, 233, 0.2) 50%, rgba(6, 182, 212, 0.3) 100%);
          padding: 1px;
        }
        .bento-border-gradient-cyan::before {
          content: '';
          position: absolute;
          inset: 1px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 27px;
        }

        /* Bento icon floating animation */
        @keyframes bento-icon-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .bento-icon-float {
          animation: bento-icon-float 4s ease-in-out infinite;
        }

        /* Bento icon sparkle animation */
        @keyframes bento-icon-sparkle {
          0%, 100% {
            transform: scale(1) rotate(0deg);
          }
          25% {
            transform: scale(1.03) rotate(2deg);
          }
          75% {
            transform: scale(1.03) rotate(-2deg);
          }
        }
        .bento-icon-sparkle {
          animation: bento-icon-sparkle 3s ease-in-out infinite;
        }

        /* Bento pulse dot */
        @keyframes bento-pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.3);
          }
        }
        .bento-pulse-dot {
          animation: bento-pulse 2s ease-in-out infinite;
        }

        /* Bento pill hover effect */
        .bento-pill {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .bento-pill:hover {
          transform: translateY(-2px);
        }

        /* Bento stat card hover effect */
        .bento-stat-card {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .group:hover .bento-stat-card {
          transform: translateY(-2px);
        }

        /* Bento lang pill staggered effect */
        .bento-lang-pill {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .group:hover .bento-lang-pill {
          transform: translateY(-2px);
        }

        /* ===== HOW IT WORKS SECTION ANIMATIONS ===== */

        /* Line sweep animation for connection line */
        @keyframes line-sweep {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          20% {
            opacity: 0.6;
          }
          80% {
            opacity: 0.6;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        .animate-line-sweep {
          animation: line-sweep 4s ease-in-out infinite;
        }

        /* Step card staggered reveal */
        .step-card-wrapper {
          opacity: 0;
          transform: translateY(40px);
          animation: step-reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes step-reveal {
          0% {
            opacity: 0;
            transform: translateY(40px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Step node pulse animation */
        .step-node {
          animation: node-pulse 3s ease-in-out infinite;
        }
        .step-node-1 { animation-delay: 0s; }
        .step-node-2 { animation-delay: 1s; }
        .step-node-3 { animation-delay: 2s; }

        @keyframes node-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
          }
          50% {
            transform: scale(1.2);
            box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
          }
        }

        /* Step icon hover float */
        .step-icon-container:hover .step-icon {
          animation: step-icon-float 0.6s ease-in-out;
        }
        @keyframes step-icon-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        /* Enhanced group hover icon animation */
        .group:hover .step-icon {
          animation: step-icon-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes step-icon-pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }

        /* ===== PREMIUM CTA SECTION ANIMATIONS ===== */

        /* Animated mesh gradient background */
        .cta-mesh-gradient {
          background:
            radial-gradient(ellipse 80% 50% at 20% 40%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 60%, rgba(20, 184, 166, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse 40% 30% at 40% 80%, rgba(5, 150, 105, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse 50% 35% at 60% 20%, rgba(6, 182, 212, 0.08) 0%, transparent 50%);
          animation: mesh-shift 20s ease-in-out infinite;
        }

        @keyframes mesh-shift {
          0%, 100% {
            background-position: 0% 0%, 100% 100%, 0% 100%, 100% 0%;
          }
          25% {
            background-position: 25% 25%, 75% 75%, 25% 75%, 75% 25%;
          }
          50% {
            background-position: 50% 0%, 50% 100%, 0% 50%, 100% 50%;
          }
          75% {
            background-position: 75% 25%, 25% 75%, 75% 75%, 25% 25%;
          }
        }

        /* Floating orbs with complex motion paths */
        .cta-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.4;
        }

        .cta-orb-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, transparent 70%);
          top: -150px;
          left: 10%;
          animation: orb-float-1 25s ease-in-out infinite;
        }

        .cta-orb-2 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(20, 184, 166, 0.35) 0%, transparent 70%);
          bottom: -100px;
          right: 15%;
          animation: orb-float-2 30s ease-in-out infinite;
        }

        .cta-orb-3 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%);
          top: 50%;
          left: 60%;
          animation: orb-float-3 22s ease-in-out infinite;
        }

        .cta-orb-4 {
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(5, 150, 105, 0.25) 0%, transparent 70%);
          top: 30%;
          right: 10%;
          animation: orb-float-4 28s ease-in-out infinite;
        }

        @keyframes orb-float-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(50px, 30px) scale(1.1); }
          50% { transform: translate(-30px, 60px) scale(0.95); }
          75% { transform: translate(40px, -20px) scale(1.05); }
        }

        @keyframes orb-float-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(-40px, -30px) scale(1.05); }
          50% { transform: translate(60px, -50px) scale(0.9); }
          75% { transform: translate(-30px, 40px) scale(1.1); }
        }

        @keyframes orb-float-3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-60px, 40px) rotate(120deg); }
          66% { transform: translate(40px, -30px) rotate(240deg); }
        }

        @keyframes orb-float-4 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; }
          50% { transform: translate(-50px, 50px) scale(1.2); opacity: 0.4; }
        }

        /* CTA gradient text */
        .cta-gradient-text {
          background: linear-gradient(135deg, #10b981 0%, #14b8a6 30%, #06b6d4 60%, #10b981 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 5s ease-in-out infinite;
        }

        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        /* Badge glow effect */
        .cta-badge-glow {
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.1);
          animation: badge-glow 3s ease-in-out infinite;
        }

        @keyframes badge-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.1); }
          50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.2); }
        }

        /* Glowing CTA button */
        .cta-glow-button {
          position: relative;
        }

        .cta-glow-button::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: linear-gradient(135deg, #10b981, #14b8a6, #06b6d4, #10b981);
          background-size: 400% 400%;
          border-radius: 9999px;
          opacity: 0;
          animation: button-glow-rotate 4s linear infinite;
          transition: opacity 0.3s;
          z-index: 0;
        }

        .cta-glow-button:hover::before {
          opacity: 0.6;
        }

        @keyframes button-glow-rotate {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
