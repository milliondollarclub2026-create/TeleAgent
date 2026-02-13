import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  MessageSquare,
  Bot,
  BarChart3,
  Database,
  Globe,
  FileText,
  Headphones,
  ChevronDown,
  Menu,
  X,
  Zap,
  Shield
} from 'lucide-react';
import PricingSection from '../components/PricingSection';

export default function PricingPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    const timer = setTimeout(() => setIsVisible(true), 100);

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
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const handleCTA = () => navigate('/login');
  const goToFeatures = () => navigate('/#features');
  const goToHowItWorks = () => navigate('/#how-it-works');

  const featureDetails = [
    { icon: MessageSquare, title: 'Unlimited AI Messages', description: 'No caps on conversations. Your AI agents handle every customer inquiry without limits.' },
    { icon: Bot, title: 'Unlimited AI Agents', description: 'Create as many specialized agents as you need for different products or workflows.' },
    { icon: Database, title: 'Bitrix24 CRM Integration', description: 'Two-way sync for leads, deals, contacts, and products. Keep your pipeline organized automatically.' },
    { icon: FileText, title: 'Knowledge Base Training', description: 'Upload PDFs, documents, and FAQs. Your AI learns your products and gives accurate answers.' },
    { icon: Globe, title: 'Multi-Language Support', description: 'Fluent in Uzbek, Russian, and English. Auto-detects and responds in the customer\'s language.' },
    { icon: Zap, title: 'Google Sheets Export', description: 'Export leads, conversations, and analytics to Google Sheets for custom reporting.' },
    { icon: BarChart3, title: 'Advanced Analytics', description: 'Track conversion rates, response times, and agent performance with detailed dashboards.' },
    { icon: Headphones, title: 'Priority Support', description: 'Get help when you need it. Direct access to our team for setup and troubleshooting.' },
  ];

  const faqs = [
    {
      question: 'How does per-channel pricing work?',
      answer: 'Each messaging channel costs $30/month. You only pay for the channels you activate. All features are included with every channel — no tiers, no upsells.',
    },
    {
      question: 'Can I add more channels later?',
      answer: 'Yes. When new channels like WhatsApp or Instagram become available, you can add them to your account instantly. Each additional channel is $30/month.',
    },
    {
      question: 'What integrations are included?',
      answer: 'Every channel includes full Bitrix24 CRM integration with two-way sync, Google Sheets export, knowledge base training, and advanced analytics. Nothing is locked behind a higher tier.',
    },
    {
      question: 'How do I get started?',
      answer: 'Sign up and our onboarding wizard walks you through connecting your Telegram bot, training your AI agent, and configuring your CRM integration. Most businesses are live in under 10 minutes.',
    },
    {
      question: 'What languages does the AI support?',
      answer: 'Our AI agents fluently support English, Russian, and Uzbek. The AI auto-detects the customer\'s language and responds naturally in their preferred language.',
    },
    {
      question: 'Can I cancel anytime?',
      answer: 'Yes. There are no long-term contracts. Cancel your subscription at any time and your service continues until the end of the billing period.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-sm'
          : 'bg-white/60 backdrop-blur-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-3 group">
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
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={goToFeatures}
                className="relative px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium group"
              >
                Features
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-emerald-600 transition-all duration-300 group-hover:w-6" />
              </button>
              <button
                onClick={goToHowItWorks}
                className="relative px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium group"
              >
                How It Works
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-emerald-600 transition-all duration-300 group-hover:w-6" />
              </button>
              <span className="relative px-4 py-2 text-emerald-600 text-sm font-medium">
                Pricing
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-emerald-600" />
              </span>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={handleCTA}
                className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-100"
              >
                Log in
              </button>
              <button
                onClick={handleCTA}
                className="group relative bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2} />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
              onClick={() => { goToFeatures(); setMobileMenuOpen(false); }}
              className="block w-full text-left text-slate-600 hover:text-slate-900 hover:bg-slate-50 py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => { goToHowItWorks(); setMobileMenuOpen(false); }}
              className="block w-full text-left text-slate-600 hover:text-slate-900 hover:bg-slate-50 py-3 px-4 rounded-lg font-medium transition-colors"
            >
              How It Works
            </button>
            <span className="block text-emerald-600 py-3 px-4 font-medium">Pricing</span>
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
      <section className="pt-36 pb-16 bg-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(100 116 139) 0.5px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          <div className={`text-center transform transition-all duration-700 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 mb-6">
              Pricing
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] text-slate-900 mb-6">
              Simple, per-channel <span className="text-emerald-600">pricing</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto">
              No hidden fees. No tiers. Activate a channel, get your full AI sales team.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section Component */}
      <PricingSection onGetStarted={handleCTA} />

      {/* Everything Included - Feature Details */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16 scroll-reveal">
            <h2 className="text-3xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-4">
              Everything included
            </h2>
            <p className="text-slate-500">No tiers, no upsells. Every feature with every channel.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 scroll-reveal" style={{ transitionDelay: '100ms' }}>
            {featureDetails.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex gap-4 p-5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm mb-1">{feature.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <div className="text-center mb-12 scroll-reveal">
            <h2 className="text-3xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-4">
              Frequently asked questions
            </h2>
            <p className="text-slate-500">Everything you need to know about our pricing</p>
          </div>

          <div className="space-y-4 scroll-reveal" style={{ transitionDelay: '100ms' }}>
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-all hover:border-slate-300"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-medium text-slate-900 pr-4">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                    strokeWidth={1.75}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaq === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-6 pb-5 text-slate-600 leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#0a0f1a]" />
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 40%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 60%, rgba(20, 184, 166, 0.12) 0%, transparent 50%)
          `
        }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:80px_80px]" />

        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center relative z-10 scroll-reveal">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-['Plus_Jakarta_Sans'] mb-6 tracking-tight">
            Ready to put your sales on autopilot?
          </h2>
          <p className="text-slate-300/90 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            Join businesses across Uzbekistan and the CIS already using LeadRelay to qualify leads and close deals on Telegram.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <button
              onClick={handleCTA}
              className="group inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full px-10 py-5 text-lg font-semibold transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/30"
            >
              Hire Your Team
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" strokeWidth={2.5} />
            </button>
          </div>

          <div className="mt-16 pt-8 border-t border-white/5">
            <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
              {[
                { icon: <Zap className="w-4 h-4" strokeWidth={2.5} />, text: '10-minute setup' },
                { icon: <Shield className="w-4 h-4" strokeWidth={2.5} />, text: 'Cancel anytime' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    {item.icon}
                  </div>
                  <span className="text-slate-400 text-sm font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0f1a] border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="py-20">
            <div className="grid grid-cols-2 md:grid-cols-12 gap-12 md:gap-8">
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
                  AI sales agents that qualify leads, close deals, and keep your CRM accurate — 24 hours a day, 7 days a week. Built for businesses across Uzbekistan and the CIS.
                </p>

                <div className="flex items-center gap-4">
                  <a
                    href="https://t.me/leadrelay"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-all duration-300"
                    aria-label="Telegram"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                    </svg>
                  </a>
                </div>
              </div>

              <div className="md:col-span-2">
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-widest mb-6">
                  Product
                </h4>
                <ul className="space-y-4">
                  <li>
                    <button onClick={goToFeatures} className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2">
                      <span className="relative">Features<span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" /></span>
                    </button>
                  </li>
                  <li>
                    <span className="text-sm text-emerald-400 font-medium">Pricing</span>
                  </li>
                  <li>
                    <button onClick={goToHowItWorks} className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2">
                      <span className="relative">How It Works<span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" /></span>
                    </button>
                  </li>
                </ul>
              </div>

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
                </ul>
              </div>
            </div>
          </div>

          <div className="py-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-slate-500 font-light">
              &copy; {new Date().getFullYear()} LeadRelay. All rights reserved.
            </p>
            <span className="text-xs text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </span>
          </div>
        </div>
      </footer>

      {/* Scroll Reveal CSS */}
      <style>{`
        .scroll-reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scroll-reveal.revealed {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
