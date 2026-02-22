import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Menu, X } from 'lucide-react';
import AiOrb from '../components/Orb/AiOrb';

export default function PricingHubPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, []);

  const handleCTA = () => navigate('/login');
  const goToFeatures = () => navigate('/#features');
  const goToHowItWorks = () => navigate('/#how-it-works');

  const teams = [
    {
      name: 'Sales Team',
      agent: 'Jasur',
      orbColors: ['#10b981', '#059669', '#14b8a6'],
      description: 'AI-powered sales agents for Telegram & Instagram. Qualify leads, answer questions, and close deals around the clock.',
      price: 'From $15/mo per agent',
      href: '/pricing/sales',
      cta: 'View Sales Plans',
    },
    {
      name: 'Analytics Team',
      agent: 'Bobur',
      orbColors: ['#f97316', '#ea580c', '#f59e0b'],
      description: 'CRM dashboards, AI insights & revenue monitoring. Connect your CRM and get answers in plain English.',
      price: 'Free plan available',
      href: '/pricing/analytics',
      cta: 'View Analytics Plans',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
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
        <div
          className={`md:hidden overflow-hidden transition-all duration-500 ease-out ${
            mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
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
                className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-full py-3.5 font-semibold transition-all"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <h1
            className={`text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] text-slate-900 mb-6 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            Choose your <span className="text-emerald-600">AI team</span>
          </h1>
          <p
            className={`text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-100 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            Two specialized teams, each with their own pricing. Pick what fits your business.
          </p>
        </div>
      </section>

      {/* Team Cards */}
      <section className="pb-32 bg-white">
        <div className="max-w-4xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 gap-6">
            {teams.map((team, i) => (
              <Link
                key={team.name}
                to={team.href}
                className={`group bg-white border border-slate-200 rounded-2xl p-8 transition-all duration-500 hover:shadow-lg hover:border-slate-300 hover:-translate-y-1 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: `${200 + i * 100}ms` }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <AiOrb size={48} colors={team.orbColors} />
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                      {team.name}
                    </h2>
                    <span className="text-sm text-slate-400 font-medium">Powered by {team.agent}</span>
                  </div>
                </div>

                <p className="text-slate-500 leading-relaxed mb-6">{team.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">{team.price}</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold text-sm group-hover:gap-2.5 transition-all duration-300">
                    {team.cta}
                    <ArrowRight className="w-4 h-4" strokeWidth={2} />
                  </span>
                </div>
              </Link>
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
    </div>
  );
}
