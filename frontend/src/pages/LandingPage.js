import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, 
  MessageSquare, 
  Zap, 
  Globe, 
  BarChart3, 
  Shield,
  ArrowRight,
  Check,
  Sparkles,
  Database,
  Users,
  TrendingUp,
  Play,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCTA = () => navigate('/login');

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden">
      {/* Noise texture overlay */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none z-50" 
           style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }} />
      
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled ? 'backdrop-blur-xl bg-slate-950/80 border-b border-white/5' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">TeleAgent</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Features</a>
              <a href="#how-it-works" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">How it Works</a>
              <a href="#pricing" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Pricing</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={handleCTA}
                className="text-slate-300 hover:text-white transition-colors text-sm font-medium"
                data-testid="nav-login-btn"
              >
                Log in
              </button>
              <button 
                onClick={handleCTA}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-6 py-2.5 text-sm font-semibold shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all hover:scale-105"
                data-testid="nav-cta-btn"
              >
                Start Free
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden text-slate-400"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-white/5 px-6 py-6 space-y-4">
            <a href="#features" className="block text-slate-300 hover:text-white py-2">Features</a>
            <a href="#how-it-works" className="block text-slate-300 hover:text-white py-2">How it Works</a>
            <a href="#pricing" className="block text-slate-300 hover:text-white py-2">Pricing</a>
            <button 
              onClick={handleCTA}
              className="w-full bg-emerald-500 text-white rounded-full py-3 font-semibold mt-4"
            >
              Start Free
            </button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-24 md:py-32 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">AI-Powered Sales Acceleration</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight font-['Plus_Jakarta_Sans']">
                <span className="text-white">Automate Sales on</span>
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">Telegram with AI</span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-xl">
                Connect your Bitrix24 CRM, deploy intelligent AI agents, and close deals 24/7. 
                Your customers chat, your AI converts.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button 
                  onClick={handleCTA}
                  className="group bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-8 py-4 text-lg font-semibold shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all hover:scale-105 flex items-center justify-center gap-2"
                  data-testid="hero-cta-btn"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="group border border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-white rounded-full px-8 py-4 text-lg font-medium transition-all flex items-center justify-center gap-2">
                  <Play className="w-5 h-5 text-emerald-400" />
                  Watch Demo
                </button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-6 pt-8 border-t border-slate-800/50">
                <div className="flex -space-x-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-slate-400">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-white font-semibold">500+ businesses</p>
                  <p className="text-slate-500 text-sm">already accelerating sales</p>
                </div>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="relative hidden lg:block">
              {/* Main Card */}
              <div className="relative bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl">
                {/* Chat Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">TeleAgent AI</p>
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      Active now
                    </p>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="space-y-4 py-6">
                  <div className="flex justify-start">
                    <div className="bg-slate-800/80 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[280px]">
                      <p className="text-slate-300 text-sm">Salom! Tiramisu tortiga buyurtma berishni xohlaysizmi? 🍰</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-emerald-600/90 rounded-2xl rounded-br-sm px-4 py-3 max-w-[280px]">
                      <p className="text-white text-sm">Ha, narxi qancha?</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-slate-800/80 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[280px]">
                      <p className="text-slate-300 text-sm">20,000 so'm. Bugun buyurtma bersangiz, yetkazib berish bepul! 🚀</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-emerald-600/90 rounded-2xl rounded-br-sm px-4 py-3">
                      <p className="text-white text-sm">Zo'r! Buyurtma beraman</p>
                    </div>
                  </div>
                </div>

                {/* Typing Indicator */}
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>AI is processing...</span>
                </div>
              </div>

              {/* Floating Card - Metrics */}
              <div className="absolute -top-8 -right-8 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">+147%</p>
                    <p className="text-xs text-slate-500">Conversion Rate</p>
                  </div>
                </div>
              </div>

              {/* Floating Card - CRM */}
              <div className="absolute -bottom-4 -left-8 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl animate-float-delayed">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <Database className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Bitrix24</p>
                    <p className="text-xs text-emerald-400">Synced ✓</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="py-16 border-y border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <p className="text-center text-slate-600 text-sm font-medium mb-8">TRUSTED BY LEADING BUSINESSES</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60">
            {['Bitrix24', 'Telegram', 'OpenAI', 'Supabase'].map(brand => (
              <div key={brand} className="text-slate-500 font-semibold text-lg">{brand}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section id="features" className="py-24 md:py-32 relative">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] mb-4">
              Everything you need to
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent"> sell smarter</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              A complete AI sales toolkit designed for modern businesses
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Large Feature - Telegram */}
            <div className="md:col-span-2 group bg-slate-900/50 backdrop-blur-sm border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-8 transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <MessageSquare className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 font-['Plus_Jakarta_Sans']">Telegram Native</h3>
                <p className="text-slate-400 text-lg leading-relaxed mb-6">
                  Works directly inside your customers' favorite messaging app. No app downloads, no friction — just seamless conversations that convert.
                </p>
                <div className="flex flex-wrap gap-3">
                  {['Instant Replies', '24/7 Availability', 'Rich Media'].map(tag => (
                    <span key={tag} className="bg-slate-800/80 text-slate-300 px-4 py-2 rounded-full text-sm">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Small Feature - Multi-language */}
            <div className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-8 transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <Globe className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold mb-3 font-['Plus_Jakarta_Sans']">Multi-Language</h3>
                <p className="text-slate-400 leading-relaxed">
                  Speaks Uzbek, Russian, and English fluently. Auto-detects language.
                </p>
              </div>
            </div>

            {/* Medium Feature - CRM */}
            <div className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-8 transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <Database className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-3 font-['Plus_Jakarta_Sans']">Bitrix24 Sync</h3>
                <p className="text-slate-400 leading-relaxed">
                  Real-time 2-way sync with your CRM. Leads, deals, and products — all connected.
                </p>
              </div>
            </div>

            {/* Medium Feature - No Code */}
            <div className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-8 transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <Sparkles className="w-7 h-7 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold mb-3 font-['Plus_Jakarta_Sans']">No-Code Builder</h3>
                <p className="text-slate-400 leading-relaxed">
                  Configure your AI agent in minutes. No technical skills required.
                </p>
              </div>
            </div>

            {/* Medium Feature - Analytics */}
            <div className="group bg-slate-900/50 backdrop-blur-sm border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-8 transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <BarChart3 className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold mb-3 font-['Plus_Jakarta_Sans']">Smart Analytics</h3>
                <p className="text-slate-400 leading-relaxed">
                  Track conversions, lead quality, and agent performance in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 md:py-32 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] mb-4">
              Get started in
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent"> 3 simple steps</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Your Agent', desc: 'Use our wizard to set up your AI sales agent. Add your business info, products, and pricing.', icon: Bot },
              { step: '02', title: 'Connect & Train', desc: 'Link your Telegram bot and Bitrix24 CRM. Upload your knowledge base for smarter responses.', icon: Database },
              { step: '03', title: 'Start Selling', desc: 'Go live! Your AI agent handles conversations 24/7, qualifying leads and closing deals.', icon: Zap }
            ].map((item, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-emerald-500/50 to-transparent" />
                )}
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 relative">
                  <div className="text-6xl font-black text-slate-800 absolute top-4 right-6">{item.step}</div>
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6">
                    <item.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 font-['Plus_Jakarta_Sans']">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CRM Chat Feature Highlight */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 mb-6">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">New Feature</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] mb-6">
                Chat with your CRM data
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-8">
                Ask questions in natural language and get instant insights. "What are my top leads?" "Show me this week's sales." Your CRM speaks back.
              </p>
              <ul className="space-y-4">
                {[
                  'Natural language queries',
                  'Real-time CRM data analysis',
                  'Supports Uzbek, Russian, English'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300">
                    <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-500 text-sm pb-4 border-b border-slate-800">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  CRM Chat
                </div>
                <div className="bg-emerald-600/20 text-emerald-300 rounded-2xl rounded-br-sm px-4 py-3 ml-auto max-w-[280px]">
                  Show me top selling products
                </div>
                <div className="bg-slate-800/80 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[320px]">
                  <p className="text-slate-300 text-sm mb-2">Based on your CRM data:</p>
                  <ol className="text-slate-400 text-sm space-y-1">
                    <li>1. Tiramisu Cake - 45 orders</li>
                    <li>2. Napoleon - 32 orders</li>
                    <li>3. Medovik - 28 orders</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 md:py-32 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-slate-400 text-lg">Start free, scale as you grow</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
              <h3 className="text-xl font-bold mb-2 font-['Plus_Jakarta_Sans']">Starter</h3>
              <p className="text-slate-500 mb-6">For trying out</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">Free</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['1 AI Agent', '100 messages/month', 'Basic analytics'].map(f => (
                  <li key={f} className="flex items-center gap-3 text-slate-400 text-sm">
                    <Check className="w-4 h-4 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={handleCTA}
                className="w-full border border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-white rounded-full py-3 font-semibold transition-all"
              >
                Get Started
              </button>
            </div>

            {/* Pro - Highlighted */}
            <div className="bg-gradient-to-b from-emerald-500/10 to-slate-900/50 border border-emerald-500/30 rounded-3xl p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                POPULAR
              </div>
              <h3 className="text-xl font-bold mb-2 font-['Plus_Jakarta_Sans']">Professional</h3>
              <p className="text-slate-500 mb-6">For growing businesses</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">$49</span>
                <span className="text-slate-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['5 AI Agents', 'Unlimited messages', 'Bitrix24 integration', 'CRM Chat', 'Priority support'].map(f => (
                  <li key={f} className="flex items-center gap-3 text-slate-300 text-sm">
                    <Check className="w-4 h-4 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={handleCTA}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-full py-3 font-semibold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105"
                data-testid="pricing-cta-btn"
              >
                Start Free Trial
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
              <h3 className="text-xl font-bold mb-2 font-['Plus_Jakarta_Sans']">Enterprise</h3>
              <p className="text-slate-500 mb-6">For large teams</p>
              <div className="mb-8">
                <span className="text-4xl font-bold">Custom</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Unlimited agents', 'Custom integrations', 'Dedicated support', 'SLA guarantee', 'On-premise option'].map(f => (
                  <li key={f} className="flex items-center gap-3 text-slate-400 text-sm">
                    <Check className="w-4 h-4 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <button className="w-full border border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-white rounded-full py-3 font-semibold transition-all">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] mb-6">
            Ready to multiply your sales team?
          </h2>
          <p className="text-slate-400 text-xl mb-10 max-w-2xl mx-auto">
            Join 500+ businesses already using TeleAgent to automate their Telegram sales.
          </p>
          <button 
            onClick={handleCTA}
            className="group bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-10 py-5 text-xl font-semibold shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] transition-all hover:scale-105 inline-flex items-center gap-3"
            data-testid="final-cta-btn"
          >
            Start Your Free Trial
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">TeleAgent</span>
            </div>
            <p className="text-slate-500 text-sm">
              © 2026 TeleAgent. AI-powered sales for modern businesses.
            </p>
          </div>
        </div>
      </footer>

      {/* Custom Animations */}
      <style>{`
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
      `}</style>
    </div>
  );
}
