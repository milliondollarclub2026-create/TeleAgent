import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import AiOrb from '../components/Orb/AiOrb';

const tiers = [
  {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'Get started with basic CRM analytics',
    cta: 'Get Started',
    ctaStyle: 'bg-slate-900 hover:bg-slate-800 text-white',
    badge: null,
    borderClass: 'border-slate-200',
    features: [
      { label: 'CRM connections', value: '1' },
      { label: 'Dashboard widgets', value: '6' },
      { label: 'AI questions/mo', value: '20' },
      { label: 'Data refresh', value: 'Daily' },
      { label: 'Revenue alerts', value: '\u2014' },
      { label: 'Export', value: '\u2014' },
      { label: 'Team members', value: '1' },
      { label: 'Custom KPIs', value: '\u2014' },
    ],
  },
  {
    name: 'Pro',
    monthlyPrice: 49,
    annualPrice: 39,
    description: 'For growing teams that need deeper insights',
    cta: 'Start Free Trial',
    ctaStyle: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200',
    badge: 'Most Popular',
    borderClass: 'border-emerald-300',
    features: [
      { label: 'CRM connections', value: '3' },
      { label: 'Dashboard widgets', value: '20' },
      { label: 'AI questions/mo', value: '300' },
      { label: 'Data refresh', value: 'Hourly' },
      { label: 'Revenue alerts', value: 'Basic' },
      { label: 'Export', value: 'CSV' },
      { label: 'Team members', value: '5' },
      { label: 'Custom KPIs', value: '5' },
    ],
  },
  {
    name: 'Business',
    monthlyPrice: 149,
    annualPrice: 119,
    description: 'Unlimited analytics for scaling organizations',
    cta: 'Contact Sales',
    ctaStyle: 'bg-slate-900 hover:bg-slate-800 text-white',
    badge: null,
    borderClass: 'border-slate-200',
    features: [
      { label: 'CRM connections', value: 'Unlimited' },
      { label: 'Dashboard widgets', value: 'Unlimited' },
      { label: 'AI questions/mo', value: 'Unlimited' },
      { label: 'Data refresh', value: 'Real-time' },
      { label: 'Revenue alerts', value: 'Advanced + custom' },
      { label: 'Export', value: 'CSV + PDF + API' },
      { label: 'Team members', value: 'Unlimited' },
      { label: 'Custom KPIs', value: 'Unlimited' },
    ],
  },
];

const faqs = [
  {
    question: 'What CRMs does the Analytics Team support?',
    answer:
      'Bobur supports Bitrix24, HubSpot, Zoho CRM, and Freshsales. You can connect multiple CRMs simultaneously and get unified analytics across all of them.',
  },
  {
    question: 'How does the AI question limit work?',
    answer:
      'Each plan includes a monthly quota of conversational questions you can ask Bobur. Questions include things like "show me deals by stage" or "what\u2019s my win rate this quarter." The limit resets monthly.',
  },
  {
    question: 'Can I upgrade or downgrade at any time?',
    answer:
      'Yes. Upgrades take effect immediately, and downgrades apply at the end of your current billing cycle. You keep all features until then.',
  },
  {
    question: 'What does real-time data refresh mean?',
    answer:
      'On the Business plan, your CRM data syncs continuously so dashboards and insights always reflect the latest state. Free and Pro plans sync on a daily or hourly schedule.',
  },
  {
    question: 'Is there a free trial for paid plans?',
    answer:
      'Yes. Pro and Business plans come with a 14-day free trial. No credit card required to start.',
  },
];

export default function AnalyticsPricingPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    const timer = setTimeout(() => setIsVisible(true), 100);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    const els = document.querySelectorAll('.scroll-reveal');
    els.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const handleCTA = () => navigate('/login');
  const goToFeatures = () => navigate('/#features');
  const goToHowItWorks = () => navigate('/#how-it-works');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-sm'
            : 'bg-white/60 backdrop-blur-sm'
        }`}
      >
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
              <button onClick={goToFeatures} className="relative px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium group">
                Features
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-emerald-600 transition-all duration-300 group-hover:w-6" />
              </button>
              <button onClick={goToHowItWorks} className="relative px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium group">
                How It Works
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-emerald-600 transition-all duration-300 group-hover:w-6" />
              </button>
              <Link to="/pricing" className="relative px-4 py-2 text-emerald-600 text-sm font-medium">
                Pricing
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-emerald-600" />
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={handleCTA}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 flex items-center gap-2"
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
        <div className={`md:hidden overflow-hidden transition-all duration-500 ease-out ${mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="bg-white/95 backdrop-blur-xl border-t border-slate-200/50 px-6 py-6 space-y-2">
            <button onClick={() => { goToFeatures(); setMobileMenuOpen(false); }} className="block w-full text-left text-slate-600 hover:text-slate-900 hover:bg-slate-50 py-3 px-4 rounded-lg font-medium transition-colors">Features</button>
            <button onClick={() => { goToHowItWorks(); setMobileMenuOpen(false); }} className="block w-full text-left text-slate-600 hover:text-slate-900 hover:bg-slate-50 py-3 px-4 rounded-lg font-medium transition-colors">How It Works</button>
            <Link to="/pricing" className="block w-full text-left text-emerald-600 py-3 px-4 font-medium">Pricing</Link>
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <button onClick={handleCTA} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-full py-3.5 font-semibold transition-all">Login</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-28 pb-8 bg-white">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 font-medium mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            Back to all plans
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <AiOrb size={48} colors={['#f97316', '#ea580c', '#f59e0b']} />
            <div>
              <h1
                className={`text-3xl md:text-4xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] text-slate-900 transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
              >
                Analytics Team Pricing
              </h1>
              <p className="text-slate-500 mt-1">Powered by Bobur — your AI Revenue Analyst</p>
            </div>
          </div>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="pb-4 bg-white">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="flex justify-center">
            <div className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-full p-1 gap-0.5">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  !isAnnual ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 ${
                  isAnnual ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Annual
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${isAnnual ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Tier Cards */}
      <section className="py-12 bg-white">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier, i) => {
              const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
              return (
                <div
                  key={tier.name}
                  className={`relative bg-white border ${tier.borderClass} rounded-2xl p-7 transition-all duration-500 hover:shadow-lg ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  } ${tier.badge ? 'ring-1 ring-emerald-200' : ''}`}
                  style={{ transitionDelay: `${200 + i * 100}ms` }}
                >
                  {tier.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        {tier.badge}
                      </span>
                    </div>
                  )}

                  <h3 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-1">
                    {tier.name}
                  </h3>
                  <p className="text-sm text-slate-500 mb-5">{tier.description}</p>

                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                      ${price}
                    </span>
                    {price > 0 && <span className="text-slate-400 font-medium">/mo</span>}
                    {price === 0 && <span className="text-slate-400 font-medium">forever</span>}
                  </div>

                  {isAnnual && tier.monthlyPrice > 0 && (
                    <p className="text-xs text-slate-400 -mt-4 mb-6">
                      <span className="line-through">${tier.monthlyPrice}/mo</span>
                      {' '}billed annually
                    </p>
                  )}

                  <button
                    onClick={handleCTA}
                    className={`w-full rounded-full py-3 text-sm font-semibold transition-all duration-200 mb-8 ${tier.ctaStyle}`}
                  >
                    {tier.cta}
                  </button>

                  <ul className="space-y-3">
                    {tier.features.map((f) => (
                      <li key={f.label} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{f.label}</span>
                        <span className={`font-medium ${f.value === '\u2014' ? 'text-slate-300' : 'text-slate-900'}`}>
                          {f.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20 bg-[#F5F7F6]">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-10 text-center scroll-reveal">
            Compare all features
          </h2>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden scroll-reveal" style={{ transitionDelay: '100ms' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-4 px-6 font-semibold text-slate-900 w-1/4">Feature</th>
                    {tiers.map((t) => (
                      <th key={t.name} className="text-center py-4 px-4 font-semibold text-slate-900">
                        {t.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tiers[0].features.map((f, fi) => (
                    <tr key={f.label} className={fi % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-3.5 px-6 text-slate-600 font-medium">{f.label}</td>
                      {tiers.map((t) => (
                        <td key={t.name} className="py-3.5 px-4 text-center">
                          {t.features[fi].value === '\u2014' ? (
                            <span className="text-slate-300">\u2014</span>
                          ) : t.features[fi].value === 'Unlimited' ? (
                            <span className="text-emerald-600 font-semibold">{t.features[fi].value}</span>
                          ) : (
                            <span className="text-slate-900 font-medium">{t.features[fi].value}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-10 text-center scroll-reveal">
            Analytics pricing FAQ
          </h2>
          <div className="space-y-3 scroll-reveal" style={{ transitionDelay: '100ms' }}>
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
                  <div className="px-6 pb-5 text-slate-600 leading-relaxed">{faq.answer}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#F5F7F6]">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center scroll-reveal">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-4">
            Ready to unlock your <span className="text-emerald-600">CRM insights</span>?
          </h2>
          <p className="text-slate-500 text-lg mb-8 max-w-xl mx-auto">
            Start with the free plan. Upgrade when you need more power.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleCTA}
              className="group bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-10 py-4 text-lg font-semibold transition-all duration-200 inline-flex items-center gap-2 shadow-lg shadow-emerald-200"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" strokeWidth={2} />
            </button>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-6 mt-6">
            {['No credit card required', '14-day Pro trial', 'Cancel anytime'].map((text) => (
              <div key={text} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="w-3 h-3 text-emerald-600" strokeWidth={2.5} />
                </div>
                <span className="text-sm text-slate-500 font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0f1a] border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="py-12 flex flex-col md:flex-row justify-between items-center gap-6">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <img src="/logo.svg" alt="LeadRelay" className="h-8 w-8" style={{ objectFit: 'contain' }} />
              <span className="text-xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
                <span className="text-emerald-400">Lead</span>
                <span className="text-white">Relay</span>
              </span>
            </Link>
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} LeadRelay. All rights reserved.
            </p>
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
