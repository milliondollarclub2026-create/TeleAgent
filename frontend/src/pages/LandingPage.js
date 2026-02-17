import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  MessageSquare,
  Globe,
  BarChart3,
  ArrowRight,
  ArrowUp,
  Check,
  TrendingUp,
  Menu,
  X,
  Shield,
  Lock,
  Users,
  Fingerprint,
  Database,
  Zap,
  Activity,
  Clock,
} from 'lucide-react';
import GyldStyleHero from '../components/GyldStyleHero';
import FAQSection from '../components/FAQSection';
import PricingSection from '../components/PricingSection';
import AiOrb from '../components/Orb/AiOrb';

// ============================================================================
// CRM ANALYTICS SECTION - Dashboard mockup with animated data
// ============================================================================

function CRMAnalyticsSection() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) setIsVisible(true);
      },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [isVisible]);

  const kpis = [
    { label: 'Total Leads', value: '2,847', change: '+12%' },
    { label: 'Pipeline', value: '$184K', change: '+8%' },
    { label: 'Win Rate', value: '34%', change: '+3%' },
    { label: 'Active Deals', value: '156', change: '+21%' },
  ];

  const bars = [
    { label: 'Qualification', pct: 100, amount: '$82K' },
    { label: 'Proposal', pct: 66, amount: '$54K' },
    { label: 'Negotiation', pct: 46, amount: '$38K' },
    { label: 'Closed Won', pct: 29, amount: '$24K' },
  ];

  const dataTeam = [
    { name: 'Bobur', role: 'Routes', colors: ['#f97316', '#ea580c', '#f59e0b'] },
    { name: 'Farid', role: 'Schema', colors: ['#3b82f6', '#2563eb', '#60a5fa'] },
    { name: 'Dima', role: 'Charts', colors: ['#8b5cf6', '#7c3aed', '#a78bfa'] },
    { name: 'Anvar', role: 'Data', colors: ['#10b981', '#059669', '#34d399'] },
    { name: 'Nilufar', role: 'Insights', colors: ['#ec4899', '#db2777', '#f472b6'] },
  ];

  return (
    <section ref={sectionRef} className="py-28 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 25%, #f8fafc 50%, #ecfdf5 75%, #f0fdfa 100%)' }}>
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-200/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-200/25 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 mb-6">
              <Database className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">CRM Analytics</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight font-['Plus_Jakarta_Sans'] mb-6">
              Your CRM data,
              <br />
              <span className="text-emerald-600">decoded instantly</span>
            </h2>

            <p className="text-slate-500 text-lg leading-relaxed mb-8">
              Connect any CRM and let six AI agents analyze your schema, build visualizations, query data, and surface insights. No SQL. No spreadsheets. Just ask.
            </p>

            {/* Speed comparison */}
            <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4 mb-8 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-4 h-4" strokeWidth={2} />
                <span className="text-sm font-medium line-through decoration-slate-300">33 min</span>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-500" strokeWidth={2} />
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" strokeWidth={2} />
                <span className="text-sm font-bold text-emerald-600">&lt; 0.5 seconds</span>
              </div>
              <span className="text-[10px] text-slate-400 ml-auto hidden sm:block font-medium">Sync engine</span>
            </div>

            <ul className="space-y-4">
              {[
                'Bitrix24, HubSpot, Zoho, and Freshsales supported',
                'AI-powered anomaly detection and trend analysis',
                'Interactive dashboard with live KPI widgets',
              ].map((text, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-3 text-slate-700 transition-all duration-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                  style={{ transitionDelay: `${600 + i * 100}ms` }}
                >
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" strokeWidth={2} />
                  <span className="font-medium">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Dashboard Mockup */}
          <div className={`relative transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <AiOrb size={28} colors={['#f97316', '#ea580c', '#f59e0b']} />
                  <span className="text-sm font-semibold text-slate-900">Bobur</span>
                  <span className="text-xs text-slate-400">Analytics Team</span>
                </div>
                <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                  <span className="text-[11px] font-medium text-white bg-slate-900 rounded-md px-3 py-1">Dashboard</span>
                  <span className="text-[11px] font-medium text-slate-500 px-3 py-1">Chat</span>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {kpis.map((kpi, i) => (
                    <div
                      key={kpi.label}
                      className={`bg-slate-50 rounded-xl px-3.5 py-3 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                      style={{ transitionDelay: `${400 + i * 100}ms` }}
                    >
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">{kpi.label}</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">{kpi.value}</span>
                        <span className="text-[10px] font-semibold text-emerald-600 flex items-center">
                          <TrendingUp className="w-2.5 h-2.5 mr-0.5" strokeWidth={2.5} />
                          {kpi.change}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bar Chart */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-700">Revenue by Stage</span>
                    <span className="text-[10px] text-slate-400">Last 30 days</span>
                  </div>
                  <div className="space-y-2">
                    {bars.map((bar, i) => (
                      <div key={bar.label} className="flex items-center gap-2.5">
                        <span className="text-[10px] text-slate-500 w-[72px] text-right shrink-0">{bar.label}</span>
                        <div className="flex-1 h-4 bg-slate-200/60 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: isVisible ? `${bar.pct}%` : '0%', transitionDelay: `${800 + i * 150}ms` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 w-8">{bar.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Insight */}
                <div
                  className={`flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  style={{ transitionDelay: '1200ms' }}
                >
                  <Activity className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <div>
                    <p className="text-[11px] font-semibold text-amber-800">Nilufar's Insight</p>
                    <p className="text-[11px] text-amber-700 leading-relaxed">Win rate up 12% this month. Deals from HubSpot close 2x faster than Bitrix24.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Pipeline Strip */}
            <div
              className={`mt-5 flex items-center justify-center gap-1.5 sm:gap-2.5 flex-wrap transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: '1400ms' }}
            >
              {dataTeam.map((agent, i) => (
                <React.Fragment key={agent.name}>
                  <div className="flex items-center gap-1.5">
                    <AiOrb size={22} colors={agent.colors} />
                    <div>
                      <span className="text-[11px] font-semibold text-slate-700 block leading-tight">{agent.name}</span>
                      <span className="text-[9px] text-slate-400">{agent.role}</span>
                    </div>
                  </div>
                  {i < dataTeam.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-slate-300 flex-shrink-0" strokeWidth={2} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
// ============================================================================
// MAIN LANDING PAGE
// ============================================================================

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef(null);

  const handleLogoClick = (e) => {
    e.preventDefault();
    if (user) {
      navigate('/app/agents');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (location.hash) {
      const sectionId = location.hash.replace('#', '');
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
        // Clear hash so page reload doesn't re-scroll
        window.history.replaceState(null, '', window.location.pathname);
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

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

    const revealElements = document.querySelectorAll('.scroll-reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
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
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-sm'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-20">
            <button onClick={handleLogoClick} className="flex items-center gap-3 group">
              <img
                src="/logo.svg"
                alt="LeadRelay"
                className="h-10 w-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                style={{ objectFit: 'contain' }}
              />
              <span className="text-2xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
                <span className="text-emerald-600">Lead</span>
                <span className="text-slate-900">Relay</span>
              </span>
            </button>

            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => scrollToSection('features')}
                className="relative px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium group"
              >
                Features
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-emerald-600 transition-all duration-300 group-hover:w-6" />
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="relative px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium group"
              >
                How It Works
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

            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={handleCTA}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 flex items-center gap-2"
                data-testid="nav-cta-btn"
              >
                Login
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

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
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left text-slate-600 hover:text-slate-900 hover:bg-slate-50 py-3 px-4 rounded-lg font-medium transition-colors"
            >
              How It Works
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
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-full py-3.5 font-semibold transition-all"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative" ref={heroRef}>
        <GyldStyleHero
          onGetStarted={handleCTA}
          onBookDemo={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
        />
      </div>

      {/* ================================================================ */}
      {/* FEATURES SECTION - Agent Grid + Feature Grid                     */}
      {/* ================================================================ */}
      <section id="features" className="py-32 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #ecfdf5 0%, #f0fdf4 30%, #f8fafc 55%, #f0fdfa 80%, #ecfdf5 100%)' }}>
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-200/30 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-teal-200/25 rounded-full blur-[100px] pointer-events-none" />
        {/* Floating decorative orbs */}
        <div className="absolute top-1/3 left-[10%] w-[300px] h-[300px] bg-emerald-400/10 rounded-full blur-[80px] pointer-events-none" style={{ animation: 'float-slow 10s ease-in-out infinite' }} />
        <div className="absolute bottom-1/3 right-[15%] w-[250px] h-[250px] bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" style={{ animation: 'float-slow 12s ease-in-out infinite 2s' }} />
        <div className="absolute top-2/3 left-[50%] w-[200px] h-[200px] bg-teal-400/15 rounded-full blur-[80px] pointer-events-none" style={{ animation: 'float-slow 8s ease-in-out infinite 4s' }} />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-20 scroll-reveal">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] text-slate-900 mb-6">
              Meet your
              <br />
              <span className="text-emerald-600">AI sales team</span>
            </h2>
            <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Three team leads, each backed by specialist agents. Trained on your business. Always on.
            </p>
          </div>

          {/* Agent Cards - 3 equal columns */}
          <div className="grid md:grid-cols-3 gap-5 mb-5 scroll-reveal" style={{ transitionDelay: '100ms' }}>
            {[
              {
                name: 'Jasur',
                role: 'Sales Team Lead',
                roleColor: 'text-emerald-600',
                orbColors: ['#10b981', '#059669', '#14b8a6'],
                desc: 'Leads your sales team across Telegram and Instagram. Qualifies leads, collects contact information, and never lets a sales opportunity slip. Fluent in 20+ languages.',
                tags: ['Telegram', 'Instagram', 'Lead Gen', 'Multilingual'],
              },
              {
                name: 'Nilufar',
                role: 'Onboarding Team Lead',
                roleColor: 'text-indigo-600',
                orbColors: ['#6366f1', '#8b5cf6', '#3b82f6'],
                desc: 'Leads your onboarding team by creating detailed application forms with personality assessments and screening tests. Finds the best candidates for your sales department automatically.',
                tags: ['Telegram', 'HR Forms', 'Screening'],
              },
              {
                name: 'Bobur',
                role: 'Analytics Team Lead',
                roleColor: 'text-orange-600',
                orbColors: ['#f97316', '#ea580c', '#f59e0b'],
                desc: 'Leads a 6-agent analytics team that syncs your CRM data, builds live dashboards, and surfaces AI-powered insights. Supports Bitrix24, HubSpot, Zoho, and Freshsales.',
                tags: ['Multi-CRM', 'Dashboard', 'AI Insights', 'ETL Sync'],
              },
            ].map((agent) => (
              <div
                key={agent.name}
                className="group h-full flex flex-col bg-white border border-slate-200 rounded-2xl p-8 transition-all duration-300 hover:shadow-md hover:border-slate-300/80 relative overflow-hidden"
              >
                {/* Color-coded hover overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 15% 15%, ${agent.orbColors[0]}25 0%, ${agent.orbColors[0]}10 40%, transparent 70%)`
                  }}
                />
                <div className="relative z-[1] flex flex-col flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <AiOrb size={44} colors={agent.orbColors} />
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] tracking-tight">{agent.name}</h3>
                      <span className={`text-xs font-semibold ${agent.roleColor} uppercase tracking-wider`}>{agent.role}</span>
                    </div>
                  </div>
                  <p className="text-slate-500 leading-relaxed mb-6 flex-1">
                    {agent.desc}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {agent.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-sm font-medium border border-slate-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Feature Cards - 2 equal columns */}
          <div className="grid md:grid-cols-2 gap-5 scroll-reveal" style={{ transitionDelay: '200ms' }}>
            {/* Trained on your business */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8 transition-all duration-300 hover:shadow-md hover:border-slate-300 hover:-translate-y-1">
              <h3 className="text-xl font-bold text-slate-900 mb-3 font-['Plus_Jakarta_Sans'] tracking-tight">
                Trained on your business
              </h3>
              <p className="text-slate-500 leading-relaxed">
                Upload product catalogs, pricing sheets, or FAQ documents. Your AI team studies your materials and answers customer questions with the accuracy of your best salesperson.
              </p>
            </div>

            {/* See what's working */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8 transition-all duration-300 hover:shadow-md hover:border-slate-300 hover:-translate-y-1">
              <h3 className="text-xl font-bold text-slate-900 mb-3 font-['Plus_Jakarta_Sans'] tracking-tight">
                See what's working
              </h3>
              <p className="text-slate-500 leading-relaxed">
                Your CRM Dashboard shows live KPIs, conversion funnels, and revenue trends across all connected CRMs. AI-powered insights detect anomalies and surface opportunities automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* HOW IT WORKS                                                     */}
      {/* ================================================================ */}
      <section id="how-it-works" className="py-28 md:py-36 bg-white overflow-hidden relative">
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative">
          <div className="text-center mb-20 scroll-reveal">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] text-slate-900 mb-6">
              Hire in
              <br className="hidden sm:block" />
              <span className="text-emerald-600"> three steps</span>
            </h2>
            <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              From signup to your first qualified lead in under ten minutes. No code. No consultants.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 scroll-reveal" style={{ transitionDelay: '100ms' }}>
            {[
              {
                step: 1,
                title: 'Define your business',
                description: 'Tell us about your products, pricing, and how you sell. The setup wizard configures your AI team\'s tone, language, and sales approach.',
              },
              {
                step: 2,
                title: 'Connect your tools',
                description: 'Connect your Telegram bot, link your CRM, and upload your product docs. Your AI team reads everything and starts learning your business.',
              },
              {
                step: 3,
                title: 'Start selling',
                description: 'Flip the switch. Your AI team handles conversations, qualifies leads, collects contacts, and logs every deal to your CRM. You focus on closing.',
              }
            ].map((item) => (
              <div key={item.step} className={`group flex flex-col cursor-default step-glow step-glow-${item.step}`}>
                {/* Large emerald step number with pulsing glow */}
                <div className="mb-6">
                  <span className="step-number text-5xl font-bold text-slate-900 transition-all duration-300 font-['Plus_Jakarta_Sans']">
                    {item.step}
                  </span>
                </div>

                <div className="step-card flex-1 bg-white border border-slate-200 rounded-2xl p-8 transition-all duration-300 group-hover:shadow-md group-hover:border-slate-300 group-hover:-translate-y-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-3 font-['Plus_Jakarta_Sans']">
                    {item.title}
                  </h3>
                  <p className="text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* INLINE CTA                                                       */}
      {/* ================================================================ */}
      <section className="py-16 bg-emerald-600 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 md:px-12 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 scroll-reveal">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-white font-['Plus_Jakarta_Sans'] mb-2">
                Your next sales hire costs $15/month
              </h3>
              <p className="text-emerald-100/80 text-lg">
                Live in 10 minutes. Cancel anytime.
              </p>
            </div>
            <button
              onClick={handleCTA}
              className="group flex-shrink-0 bg-slate-900 text-white rounded-full px-8 py-4 text-base font-semibold transition-all duration-300 flex items-center gap-2 hover:shadow-[0_0_25px_rgba(255,255,255,0.3)]"
            >
              Start Hiring
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </section>

      {/* CRM Analytics Section */}
      <CRMAnalyticsSection />

      {/* Pricing */}
      <PricingSection onGetStarted={handleCTA} />

      {/* FAQ */}
      <FAQSection />

      {/* ================================================================ */}
      {/* FINAL CTA                                                        */}
      {/* ================================================================ */}
      <section className="py-40 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #ecfdf5 0%, #f0fdf4 40%, #f8fafc 100%)' }}>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-200/25 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 md:px-12 text-center relative z-10 scroll-reveal">
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] mb-8 leading-[1.1]">
            <span className="text-slate-900">Your AI sales team</span>
            <br />
            <span className="text-emerald-600">starts tonight.</span>
          </h2>

          <p className="text-slate-500 text-lg md:text-xl mb-14 max-w-2xl mx-auto leading-relaxed">
            Three AI employees. Trained on your business. Working every channel. Hire your team in ten minutes.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <button
              onClick={handleCTA}
              className="group inline-flex items-center gap-3 bg-slate-900 hover:bg-emerald-600 text-white rounded-full px-10 py-5 text-lg font-semibold transition-all duration-300"
              data-testid="final-cta-btn"
            >
              Hire Your Team
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" strokeWidth={2.5} />
            </button>

            <button
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="group text-slate-600 hover:text-slate-900 transition-all duration-300 text-lg font-medium flex items-center gap-2 py-5 px-6"
            >
              View Pricing
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" strokeWidth={2} />
            </button>
          </div>

        </div>
      </section>

      {/* ================================================================ */}
      {/* TRUST & SECURITY SECTION                                         */}
      {/* ================================================================ */}
      <section className="bg-white py-20 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-3">
              Enterprise-Grade Security
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-3">
              Your data, protected at every layer
            </h2>
            <p className="text-slate-500 text-sm max-w-lg mx-auto">
              Built with security-first architecture so you can focus on selling, not worrying.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
            {[
              { icon: Lock, title: 'Encrypted at Rest', desc: 'AES encryption for all stored credentials and data' },
              { icon: Shield, title: 'GDPR Ready', desc: 'Data erasure and portability endpoints built in' },
              { icon: Users, title: 'Multi-Tenant Isolation', desc: 'Row-Level Security ensures enterprise-grade data isolation' },
              { icon: Fingerprint, title: 'Webhook Verified', desc: 'Cryptographic signature checks on all inbound hooks' },
            ].map((badge) => (
              <div key={badge.title} className="group bg-[#F5F7F6] border border-slate-200 rounded-xl p-5 text-center hover:border-slate-300 hover:shadow-sm transition-all duration-300">
                <badge.icon className="w-5 h-5 text-slate-900 mx-auto mb-3 group-hover:text-emerald-600 transition-colors duration-300" strokeWidth={1.75} />
                <h3 className="text-sm font-semibold text-slate-900 mb-1">{badge.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{badge.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              to="/security"
              className="group inline-flex items-center gap-2 text-sm font-medium text-slate-900 hover:text-emerald-600 transition-colors duration-300"
            >
              Learn more about our security practices
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" strokeWidth={1.75} />
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FOOTER                                                           */}
      {/* ================================================================ */}
      <footer className="bg-[#0a0f1a] border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="py-20">
            <div className="grid grid-cols-2 md:grid-cols-12 gap-12 md:gap-8">
              {/* Brand */}
              <div className="col-span-2 md:col-span-4">
                <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
                  <img
                    src="/logo.svg"
                    alt="LeadRelay"
                    className="h-10 w-10 transition-transform duration-300 group-hover:scale-110"
                    style={{ objectFit: 'contain' }}
                  />
                  <span className="text-2xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
                    <span className="text-emerald-400">Lead</span>
                    <span className="text-white">Relay</span>
                  </span>
                </Link>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-8">
                  AI sales agents that qualify leads, close deals, and keep your CRM accurate. 24 hours a day, 7 days a week. Built for businesses worldwide.
                </p>

                {/* Social */}
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
                </div>
              </div>

              {/* Product */}
              <div className="md:col-span-2">
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest mb-6">
                  Product
                </h4>
                <ul className="space-y-4">
                  <li>
                    <a href="#features" className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2">
                      <span className="relative">Features<span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" /></span>
                    </a>
                  </li>
                  <li>
                    <Link to="/pricing" className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2">
                      <span className="relative">Pricing<span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" /></span>
                    </Link>
                  </li>
                  <li>
                    <a href="#how-it-works" className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2">
                      <span className="relative">How It Works<span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" /></span>
                    </a>
                  </li>
                </ul>
              </div>

              {/* Support */}
              <div className="md:col-span-2">
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest mb-6">
                  Support
                </h4>
                <ul className="space-y-4">
                  <li>
                    <a href="mailto:support@leadrelay.net" className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2">
                      <span className="relative">Contact Us<span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" /></span>
                    </a>
                  </li>
                  <li>
                    <a href="https://t.me/leadrelay" target="_blank" rel="noopener noreferrer" className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2">
                      <span className="relative">Telegram<span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" /></span>
                    </a>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div className="md:col-span-2">
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest mb-6">
                  Legal
                </h4>
                <ul className="space-y-4">
                  <li>
                    <Link to="/privacy" className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2">
                      <span className="relative">Privacy Policy<span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" /></span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/terms" className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2">
                      <span className="relative">Terms of Service<span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" /></span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/security" className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2">
                      <span className="relative">Security<span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" /></span>
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="py-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-slate-500 font-light">
              &copy; {new Date().getFullYear()} LeadRelay. All rights reserved.
            </p>
            <span className="text-xs text-slate-500">
              Enterprise-grade reliability
            </span>
          </div>
        </div>
      </footer>

      {/* ================================================================ */}
      {/* MINIMAL CSS                                                      */}
      {/* ================================================================ */}
      <style>{`
        /* Scroll Reveal */
        .scroll-reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scroll-reveal.revealed {
          opacity: 1;
          transform: translateY(0);
        }

        /* Floating orb animation */
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        /* Sequential emerald glow on step cards — 9s total, 3s per step, no overlap */
        @keyframes step-glow-sweep {
          0%, 5% {
            box-shadow: 0 0 0 0 rgba(5, 150, 105, 0), 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            border-color: rgb(226, 232, 240);
          }
          15% {
            box-shadow: 0 0 30px -5px rgba(5, 150, 105, 0.25), 0 20px 40px -10px rgba(5, 150, 105, 0.15);
            border-color: rgb(167, 243, 208);
          }
          30%, 100% {
            box-shadow: 0 0 0 0 rgba(5, 150, 105, 0), 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            border-color: rgb(226, 232, 240);
          }
        }

        @keyframes step-number-glow {
          0%, 5% {
            color: rgb(15, 23, 42);
            text-shadow: none;
          }
          15% {
            color: rgb(5, 150, 105);
            text-shadow: 0 0 20px rgba(5, 150, 105, 0.4);
          }
          30%, 100% {
            color: rgb(15, 23, 42);
            text-shadow: none;
          }
        }

        .step-glow-1 .step-card {
          animation: step-glow-sweep 9s ease-in-out infinite;
        }
        .step-glow-1 .step-number {
          animation: step-number-glow 9s ease-in-out infinite;
        }
        .step-glow-2 .step-card {
          animation: step-glow-sweep 9s ease-in-out 3s infinite;
        }
        .step-glow-2 .step-number {
          animation: step-number-glow 9s ease-in-out 3s infinite;
        }
        .step-glow-3 .step-card {
          animation: step-glow-sweep 9s ease-in-out 6s infinite;
        }
        .step-glow-3 .step-number {
          animation: step-number-glow 9s ease-in-out 6s infinite;
        }

        .step-glow:hover .step-card,
        .step-glow:hover .step-number {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
