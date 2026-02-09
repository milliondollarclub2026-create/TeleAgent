import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  X
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const heroRef = useRef(null);

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

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 hero-gradient">
          {/* Mesh Gradient Orbs */}
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl animate-drift" />
          <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl animate-drift-slow" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-emerald-100/40 via-transparent to-slate-100/40 rounded-full blur-3xl" />

          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 py-24 md:py-32 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <div className="space-y-8">
              {/* Badge */}
              <div
                className={`inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-emerald-200/60 rounded-full px-4 py-2 shadow-sm transition-all duration-700 ${
                  heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-slate-700 text-sm font-medium">AI-Powered Sales Automation</span>
              </div>

              {/* Headline */}
              <h1
                className={`text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight font-['Plus_Jakarta_Sans'] transition-all duration-700 delay-100 ${
                  heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
              >
                <span className="block text-slate-900">Automate Sales</span>
                <span className="block text-slate-900">on Telegram</span>
                <span className="block mt-2 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">with AI</span>
              </h1>

              {/* Subheadline */}
              <p
                className={`text-lg md:text-xl text-slate-500 leading-relaxed max-w-xl transition-all duration-700 delay-200 ${
                  heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
              >
                Deploy intelligent AI agents that connect to your Bitrix24 CRM and close deals 24/7. Your customers chat, your AI converts.
              </p>

              {/* CTAs */}
              <div
                className={`flex flex-col sm:flex-row gap-4 pt-2 transition-all duration-700 delay-300 ${
                  heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
              >
                <button
                  onClick={handleCTA}
                  className="group relative bg-slate-900 hover:bg-slate-800 text-white rounded-full px-8 py-4 text-lg font-semibold transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20"
                  data-testid="hero-cta-btn"
                >
                  <span className="relative z-10">Get Started</span>
                  <ArrowRight className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
              </div>

              {/* Social Proof */}
              <div
                className={`flex items-center gap-6 pt-8 transition-all duration-700 delay-400 ${
                  heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
              >
                <div className="flex -space-x-3">
                  {[
                    'bg-gradient-to-br from-emerald-400 to-emerald-600',
                    'bg-gradient-to-br from-blue-400 to-blue-600',
                    'bg-gradient-to-br from-amber-400 to-amber-600',
                    'bg-gradient-to-br from-rose-400 to-rose-600',
                    'bg-gradient-to-br from-violet-400 to-violet-600'
                  ].map((color, i) => (
                    <div
                      key={i}
                      className={`w-10 h-10 rounded-full ${color} border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-md transition-transform duration-300 hover:scale-110 hover:z-10`}
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <div className="border-l border-slate-200 pl-6">
                  <p className="text-slate-900 font-semibold text-lg">500+</p>
                  <p className="text-slate-500 text-sm">businesses accelerating sales</p>
                </div>
              </div>
            </div>

            {/* Right: Chat Mockup */}
            <div
              className={`relative hidden lg:block transition-all duration-1000 delay-300 ${
                heroVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
              }`}
            >
              {/* Main Chat Card */}
              <div className="relative bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-3xl p-6 shadow-2xl shadow-slate-200/50 hover:shadow-3xl transition-shadow duration-500">
                {/* Chat Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Bot className="w-5 h-5 text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">LeadRelay AI</p>
                    <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      Active now
                    </p>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="space-y-4 py-6">
                  <div className="flex justify-start chat-message-1">
                    <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[280px]">
                      <p className="text-slate-700 text-sm">Hi! I noticed you're interested in our premium plan. Can I help you with any questions?</p>
                    </div>
                  </div>
                  <div className="flex justify-end chat-message-2">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl rounded-br-md px-4 py-3 max-w-[280px] shadow-lg shadow-emerald-500/20">
                      <p className="text-white text-sm">Yes, what features are included?</p>
                    </div>
                  </div>
                  <div className="flex justify-start chat-message-3">
                    <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[280px]">
                      <p className="text-slate-700 text-sm">Great question! You get unlimited AI agents, Bitrix24 sync, and priority support. Ready to get started?</p>
                    </div>
                  </div>
                  <div className="flex justify-end chat-message-4">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl rounded-br-md px-4 py-3 shadow-lg shadow-emerald-500/20">
                      <p className="text-white text-sm">Yes, sign me up!</p>
                    </div>
                  </div>
                </div>

                {/* Typing Indicator */}
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>AI is processing...</span>
                </div>
              </div>

              {/* Floating Card - Conversion Metrics */}
              <div className="absolute -top-6 -right-6 bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-2xl p-4 shadow-xl animate-float hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">+147%</p>
                    <p className="text-xs text-slate-500">Conversion Rate</p>
                  </div>
                </div>
              </div>

              {/* Floating Card - CRM Sync */}
              <div className="absolute -bottom-4 -left-6 bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-2xl p-4 shadow-xl animate-float-delayed hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
                    <Database className="w-5 h-5 text-blue-600" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Bitrix24</p>
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" strokeWidth={3} />
                      Synced
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating Card - Messages Count */}
              <div className="absolute top-1/2 -right-12 bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-xl p-3 shadow-lg animate-float-slow hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
                  <span className="text-sm font-semibold text-slate-900">2.4k</span>
                  <span className="text-xs text-slate-500">today</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-700 delay-700 ${
          heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="w-6 h-10 border-2 border-slate-300 rounded-full flex justify-center">
            <div className="w-1.5 h-3 bg-slate-400 rounded-full mt-2 animate-scroll-indicator" />
          </div>
        </div>
      </section>


      {/* Features Section */}
      <section id="features" className="py-32 bg-gradient-to-b from-white via-slate-50/50 to-white relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(16 185 129) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          {/* Section Header */}
          <div className="text-center mb-20 scroll-reveal">
            <div className="inline-flex items-center gap-2 bg-emerald-50/80 backdrop-blur-sm border border-emerald-100 rounded-full px-5 py-2.5 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-700 text-sm font-medium">Powerful Features</span>
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

          {/* Premium Bento Grid - Refined Hover States */}
          <div className="grid grid-cols-12 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)] scroll-reveal" style={{ transitionDelay: '100ms' }}>

            {/* Hero Feature - Telegram Native */}
            <div className="col-span-12 md:col-span-8 row-span-2 feature-card">
              <div className="group relative h-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-8 md:p-10 overflow-hidden transition-all duration-400 hover:shadow-lg hover:shadow-slate-200/60 hover:border-slate-300">
                {/* Subtle decorative gradient orb */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Icon */}
                <div className="relative mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                    <MessageSquare className="w-7 h-7 text-white" strokeWidth={1.75} />
                  </div>
                </div>

                <div className="relative">
                  <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4 font-['Plus_Jakarta_Sans']">
                    Telegram Native
                  </h3>
                  <p className="text-slate-500 text-lg leading-relaxed mb-8 max-w-lg">
                    Works directly inside your customers' favorite messaging app. No app downloads, no friction — just seamless conversations that convert.
                  </p>

                  {/* Interactive Tags */}
                  <div className="flex flex-wrap gap-3">
                    {['Instant Replies', '24/7 Availability', 'Rich Media'].map((tag) => (
                      <span
                        key={tag}
                        className="bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm font-medium border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors duration-200 cursor-default"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Subtle hover line accent */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-left rounded-b-3xl" />
              </div>
            </div>

            {/* Multi-Language - Tall Card */}
            <div className="col-span-12 md:col-span-4 row-span-2 feature-card">
              <div className="group relative h-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-8 overflow-hidden transition-all duration-400 hover:shadow-lg hover:shadow-slate-200/60 hover:border-slate-300">
                {/* Subtle decorative gradient orb */}
                <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-gradient-to-br from-purple-400/10 to-violet-400/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative h-full flex flex-col">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 mb-6">
                    <Globe className="w-7 h-7 text-white" strokeWidth={1.75} />
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-4 font-['Plus_Jakarta_Sans']">Multi-Language</h3>
                  <p className="text-slate-500 leading-relaxed mb-6 flex-grow">
                    Speaks Uzbek, Russian, and English fluently. Auto-detects and responds naturally.
                  </p>

                  {/* Language Pills */}
                  <div className="flex flex-wrap gap-2">
                    {['UZ', 'RU', 'EN'].map((lang, i) => (
                      <span
                        key={lang}
                        className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-200 group-hover:bg-purple-50 group-hover:text-purple-600 group-hover:border-purple-200 transition-colors duration-200"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-violet-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-left rounded-b-3xl" />
              </div>
            </div>

            {/* Bitrix24 Sync - Wide Card */}
            <div className="col-span-12 md:col-span-5 feature-card">
              <div className="group relative h-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-8 overflow-hidden transition-all duration-400 hover:shadow-lg hover:shadow-slate-200/60 hover:border-slate-300">
                <div className="absolute -top-12 -left-12 w-40 h-40 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative flex items-start gap-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 flex-shrink-0">
                    <Database className="w-7 h-7 text-white" strokeWidth={1.75} />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 font-['Plus_Jakarta_Sans']">Bitrix24 Sync</h3>
                    <p className="text-slate-500 leading-relaxed text-sm">
                      Real-time 2-way sync. Leads, deals, contacts — always up to date.
                    </p>
                  </div>
                </div>

                {/* Subtle sync indicator */}
                <div className="absolute top-6 right-6 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-left rounded-b-3xl" />
              </div>
            </div>

            {/* No-Code Builder - Medium Card */}
            <div className="col-span-12 md:col-span-4 feature-card">
              <div className="group relative h-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-8 overflow-hidden transition-all duration-400 hover:shadow-lg hover:shadow-slate-200/60 hover:border-slate-300">
                <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative flex items-start gap-5">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 flex-shrink-0">
                    <Sparkles className="w-7 h-7 text-white" strokeWidth={1.75} />
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 font-['Plus_Jakarta_Sans']">No-Code Builder</h3>
                    <p className="text-slate-500 leading-relaxed text-sm">
                      Configure in minutes. No technical skills required.
                    </p>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-left rounded-b-3xl" />
              </div>
            </div>

            {/* Smart Analytics - Small Card */}
            <div className="col-span-12 md:col-span-3 feature-card">
              <div className="group relative h-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-3xl p-6 overflow-hidden transition-all duration-400 hover:shadow-lg hover:shadow-slate-200/60 hover:border-slate-300">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-cyan-400/10 to-sky-400/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-sky-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 mb-4">
                    <BarChart3 className="w-6 h-6 text-white" strokeWidth={1.75} />
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2 font-['Plus_Jakarta_Sans']">Analytics</h3>
                  <p className="text-slate-500 leading-relaxed text-sm">
                    Real-time dashboards
                  </p>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-sky-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-left rounded-b-3xl" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-slate-50 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16 scroll-reveal">
            <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 mb-6 shadow-sm">
              <span className="text-slate-600 text-sm font-medium">Simple Setup</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] text-slate-900 mb-4">
              Get started in <span className="text-emerald-600">3 simple steps</span>
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              From setup to your first sale in under 10 minutes. No coding required.
            </p>
          </div>

          {/* Steps Container with Equal Height Cards */}
          <div className="relative scroll-reveal" style={{ transitionDelay: '100ms' }}>
            {/* Connecting Line - Desktop Only */}
            <div className="hidden md:block absolute top-8 left-[calc(16.666%+2rem)] right-[calc(16.666%+2rem)] h-px bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-200" />

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: 1,
                  icon: Bot,
                  title: 'Create Your Agent',
                  description: 'Use our setup wizard to configure your AI sales agent. Add your business info, products, and sales guidelines.'
                },
                {
                  step: 2,
                  icon: Database,
                  title: 'Connect & Train',
                  description: 'Link your Telegram bot and Bitrix24 CRM. Upload knowledge base documents for smarter responses.'
                },
                {
                  step: 3,
                  icon: Zap,
                  title: 'Start Selling',
                  description: 'Go live! Your AI agent handles conversations 24/7, qualifying leads and closing deals automatically.'
                }
              ].map((item, i) => (
                <div key={item.step} className="group flex flex-col">
                  {/* Step Number */}
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20 group-hover:scale-105 transition-transform duration-300 relative z-10">
                      <span className="text-2xl font-bold text-white">{item.step}</span>
                    </div>
                  </div>

                  {/* Card - Using flex-1 for equal heights */}
                  <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-emerald-50 transition-colors duration-300">
                      <item.icon className="w-6 h-6 text-slate-600 group-hover:text-emerald-600 transition-colors duration-300" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3 font-['Plus_Jakarta_Sans']">{item.title}</h3>
                    <p className="text-slate-500 leading-relaxed flex-1">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CRM Chat Feature Section - Interactive */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Content */}
            <div className="crm-content scroll-reveal">
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2 mb-6">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" strokeWidth={1.75} />
                <span className="text-emerald-700 text-sm font-medium">New Feature</span>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans'] mb-6">
                Chat with your
                <br />
                <span className="text-emerald-600">CRM data</span>
              </h2>

              <p className="text-slate-500 text-lg leading-relaxed mb-8">
                Ask questions in natural language and get instant insights. "What are my top leads?"
                "Show me this week's sales." Your CRM speaks back.
              </p>

              <ul className="space-y-4">
                {[
                  'Natural language queries',
                  'Real-time CRM data analysis',
                  'Supports Uzbek, Russian, English'
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-slate-700 crm-feature-item"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <Check className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Side - Interactive Chat Mockup */}
            <div className="relative scroll-reveal" style={{ transitionDelay: '150ms' }}>
              {/* Floating background elements */}
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl crm-float-1" />
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-blue-100/50 rounded-full blur-2xl crm-float-2" />

              {/* Main Chat Card */}
              <div className="relative bg-white border border-slate-200 shadow-xl rounded-3xl p-6 hover:shadow-2xl transition-shadow duration-500">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" strokeWidth={1.75} />
                    </div>
                    <span className="font-semibold text-slate-900 text-sm">CRM Chat</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs text-emerald-600 font-medium">Live</span>
                  </div>
                </div>

                {/* Chat Messages with Staggered Animation */}
                <div className="space-y-4 py-6 min-h-[280px]">
                  {/* User Message 1 */}
                  <div className="flex justify-end crm-message-1">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-[260px] shadow-lg shadow-emerald-500/20">
                      <p className="text-sm">Show me top selling products</p>
                    </div>
                  </div>

                  {/* AI Response with Typing Effect */}
                  <div className="flex justify-start crm-message-2">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[300px]">
                      <p className="text-slate-700 text-sm mb-3 font-medium">Based on your CRM data:</p>
                      <div className="space-y-2.5">
                        {[
                          { rank: 1, name: 'Tiramisu Cake', orders: 45 },
                          { rank: 2, name: 'Napoleon', orders: 32 },
                          { rank: 3, name: 'Medovik', orders: 28 }
                        ].map((item, i) => (
                          <div
                            key={item.rank}
                            className="flex items-center justify-between gap-3 crm-result-item group cursor-default"
                            style={{ animationDelay: `${800 + i * 150}ms` }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold group-hover:bg-emerald-200 transition-colors">
                                {item.rank}
                              </span>
                              <span className="text-slate-700 text-sm">{item.name}</span>
                            </div>
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                              {item.orders} orders
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Second Query */}
                  <div className="flex justify-end crm-message-3">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-lg shadow-emerald-500/20">
                      <p className="text-sm">This week's revenue?</p>
                    </div>
                  </div>

                  {/* Typing Indicator */}
                  <div className="flex justify-start crm-message-4">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 group hover:border-emerald-300 transition-colors">
                    <input
                      type="text"
                      placeholder="Ask anything about your CRM..."
                      className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
                      disabled
                    />
                    <button className="w-8 h-8 bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center justify-center transition-colors">
                      <ArrowRight className="w-4 h-4 text-white" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Floating Stats Card */}
              <div className="absolute -bottom-4 -right-4 bg-white border border-slate-200 rounded-xl p-3 shadow-lg crm-stats-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">$24.5k</p>
                    <p className="text-xs text-slate-500">This week</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center relative z-10 scroll-reveal">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8">
            <Sparkles className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
            <span className="text-emerald-300 text-sm font-medium">Transform Your Sales Today</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight font-['Plus_Jakarta_Sans'] mb-6">
            Ready to transform
            <br />
            <span className="text-emerald-400">your sales?</span>
          </h2>

          <p className="text-slate-300 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
            Join 500+ businesses already using LeadRelay to automate Telegram sales and close deals around the clock.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleCTA}
              className="group bg-emerald-500 hover:bg-emerald-400 text-white rounded-full px-10 py-5 text-lg font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30 transition-all inline-flex items-center gap-3"
              data-testid="final-cta-btn"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
            </button>
            <Link
              to="/pricing"
              className="text-slate-300 hover:text-white transition-colors text-lg font-medium flex items-center gap-2"
            >
              View Pricing
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 pt-8 border-t border-white/10 flex flex-wrap justify-center items-center gap-8 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" strokeWidth={2} />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" strokeWidth={2} />
              <span>Setup in 10 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" strokeWidth={2} />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Main Footer Content */}
          <div className="py-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              {/* Column 1 - Brand */}
              <div className="col-span-2 md:col-span-1">
                <Link to="/" className="flex items-center gap-2.5 mb-4">
                  <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
                    <span className="text-emerald-600">Lead</span>
                    <span className="text-slate-900">Relay</span>
                  </span>
                </Link>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                  AI-powered sales automation for Telegram. Close more deals, 24/7.
                </p>
              </div>

              {/* Column 2 - Product */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-4">
                  Product
                </h4>
                <ul className="space-y-3">
                  <li>
                    <a href="#features" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                      Features
                    </a>
                  </li>
                  <li>
                    <Link to="/pricing" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                      Pricing
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 3 - Company */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-4">
                  Company
                </h4>
                <ul className="space-y-3">
                  <li>
                    <a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                      About
                    </a>
                  </li>
                  <li>
                    <a href="mailto:support@leadrelay.com" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                      Contact
                    </a>
                  </li>
                </ul>
              </div>

              {/* Column 4 - Legal */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-4">
                  Legal
                </h4>
                <ul className="space-y-3">
                  <li>
                    <Link to="/privacy" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link to="/terms" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="py-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">
              &copy; 2026 LeadRelay. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="https://t.me/leadrelay" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-600 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
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
      `}</style>
    </div>
  );
}
