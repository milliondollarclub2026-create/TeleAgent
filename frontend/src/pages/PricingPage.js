import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  MessageSquare,
  BarChart3,
  Database,
  Globe,
  FileText,
  Headphones,
  ChevronDown,
  Menu,
  X,
  Users,
  Zap,
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
    {
      icon: Users,
      title: '3 Specialized AI Agents',
      description:
        'Jasur handles sales, Nilufar answers questions in three languages, and Bobur keeps your CRM in sync. Each agent is trained on your business.',
    },
    {
      icon: MessageSquare,
      title: '500 Messages per Agent',
      description:
        'Each agent gets 500 AI-powered conversations per month. Need more? Add extra messages at $5 per 500.',
    },
    {
      icon: Database,
      title: 'Bitrix24 CRM Integration',
      description:
        'Two-way sync for leads, deals, contacts, and products. Qualified leads flow into your pipeline automatically.',
    },
    {
      icon: FileText,
      title: 'Knowledge Base Training',
      description:
        'Upload PDFs, documents, and pricing sheets. Your AI team learns your products and gives accurate answers.',
    },
    {
      icon: Globe,
      title: 'Multi-Language Support',
      description:
        "Fluent in Uzbek, Russian, and English. Auto-detects and responds in the customer's language.",
    },
    {
      icon: Zap,
      title: 'Google Sheets Export',
      description:
        'Export leads, conversations, and analytics to Google Sheets for custom reporting and team visibility.',
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description:
        'Track conversion rates, response times, and agent performance with detailed dashboards.',
    },
    {
      icon: Headphones,
      title: 'Priority Support',
      description:
        'Direct access to our team for setup, troubleshooting, and optimization. We help you get results.',
    },
  ];

  const faqs = [
    {
      question: 'How does per-agent pricing work?',
      answer:
        'Each AI agent costs $15/month. You choose which agents to hire based on your needs. Hire all three and you get a $5/month bundle discount, bringing the total to $40/month for your full AI team.',
    },
    {
      question: 'What do I get with each agent?',
      answer:
        'Each agent comes with 500 AI-powered messages per month, knowledge base training, multi-language support, and access to all platform features. There are no hidden tiers or locked features.',
    },
    {
      question: 'What if I need more messages?',
      answer:
        'You can purchase additional message packs at $5 per 500 messages. These are added to your account instantly and apply to all your active agents.',
    },
    {
      question: 'How do the channel add-ons work?',
      answer:
        'Telegram is included with every plan at no extra cost. If you want your AI team to also work on Instagram DMs, add it for $25/month. If you only need Instagram (no Telegram), the add-on is $10/month. WhatsApp support is coming soon.',
    },
    {
      question: 'Do you offer discounts for longer commitments?',
      answer:
        'Yes. The 6-month plan saves you 10% off the monthly rate, and the 12-month plan saves you 25%. You can switch between billing periods at any time.',
    },
    {
      question: 'Is there a free trial?',
      answer:
        'Yes. Every new account starts with a 7-day free trial. You get full access to all agents, channels, and features. Cancel anytime during the trial and you will not be charged.',
    },
    {
      question: 'Can I add or remove agents later?',
      answer:
        'Absolutely. You can adjust your team at any time from your dashboard. Adding an agent takes effect immediately. Removing one takes effect at the end of your current billing cycle.',
    },
  ];

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
              onClick={() => {
                goToFeatures();
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left text-slate-600 hover:text-slate-900 hover:bg-slate-50 py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => {
                goToHowItWorks();
                setMobileMenuOpen(false);
              }}
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

      {/* Pricing Configurator */}
      <div className="pt-20">
        <PricingSection onGetStarted={handleCTA} />
      </div>

      {/* Everything Included */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16 scroll-reveal">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-4">
              Everything included with every agent
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              No hidden tiers, no feature gates. Every hired agent gets full access to the platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 scroll-reveal" style={{ transitionDelay: '100ms' }}>
            {featureDetails.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="flex gap-4 p-6 rounded-2xl bg-slate-50 border border-slate-100 transition-all duration-200 hover:border-slate-200 hover:shadow-sm"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1 font-['Plus_Jakarta_Sans']">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        className="py-24"
        style={{
          background:
            'linear-gradient(160deg, #ecfdf5 0%, #f0fdf4 30%, #f8fafc 55%, #f0fdfa 80%, #ecfdf5 100%)',
        }}
      >
        <div className="max-w-3xl mx-auto px-6 md:px-12">
          <div className="text-center mb-12 scroll-reveal">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-4">
              Frequently asked questions
            </h2>
            <p className="text-slate-500 text-lg">Everything you need to know about pricing</p>
          </div>

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

      {/* CTA Section */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center scroll-reveal">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-6 tracking-tight">
            Ready to hire your <span className="text-emerald-600">AI team</span>?
          </h2>
          <p className="text-slate-500 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Three AI employees. Trained on your business. Working every channel, every hour. Start your
            free trial today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button
              onClick={handleCTA}
              className="group bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-10 py-4 text-lg font-semibold transition-all duration-200 inline-flex items-center gap-2 shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-200"
            >
              Start 7-Day Free Trial
              <ArrowRight
                className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200"
                strokeWidth={2}
              />
            </button>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {['7-day free trial', 'Cancel anytime', 'No credit card required'].map((text) => (
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
                  AI sales agents that qualify leads, close deals, and keep your CRM accurate. 24 hours a
                  day, 7 days a week.
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
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
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
                    <button
                      onClick={goToFeatures}
                      className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2"
                    >
                      <span className="relative">
                        Features
                        <span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" />
                      </span>
                    </button>
                  </li>
                  <li>
                    <span className="text-sm text-emerald-400 font-medium">Pricing</span>
                  </li>
                  <li>
                    <button
                      onClick={goToHowItWorks}
                      className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2"
                    >
                      <span className="relative">
                        How It Works
                        <span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" />
                      </span>
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
                    <a
                      href="mailto:support@leadrelay.net"
                      className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2"
                    >
                      <span className="relative">
                        Contact Us
                        <span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" />
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://t.me/leadrelay"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2"
                    >
                      <span className="relative">
                        Telegram
                        <span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" />
                      </span>
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
                    <Link
                      to="/privacy"
                      className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2"
                    >
                      <span className="relative">
                        Privacy Policy
                        <span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" />
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/terms"
                      className="group text-sm text-slate-400 hover:text-white transition-colors duration-300 inline-flex items-center gap-2"
                    >
                      <span className="relative">
                        Terms of Service
                        <span className="absolute bottom-0 left-0 w-0 h-px bg-emerald-400 group-hover:w-full transition-all duration-300" />
                      </span>
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
