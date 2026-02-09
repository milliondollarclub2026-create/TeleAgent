import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Zap,
  Check,
  MessageSquare,
  Bot,
  BarChart3,
  Database,
  Headphones,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

export default function PricingPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo(0, 0);

    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);

    // Trigger animations on mount
    const timer = setTimeout(() => setIsVisible(true), 100);

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

  const goToFeatures = () => navigate('/#features');
  const goToHowItWorks = () => navigate('/#how-it-works');

  const pricingTiers = [
    {
      name: 'Starter',
      price: '$50',
      period: '/month',
      description: 'Perfect for small businesses getting started with AI sales',
      features: [
        { text: '250 AI messages/month', icon: MessageSquare },
        { text: '2 AI Agents', icon: Bot },
        { text: 'Telegram integration', icon: Zap },
        { text: 'Basic analytics', icon: BarChart3 },
      ],
      highlighted: false,
    },
    {
      name: 'Professional',
      price: '$100',
      period: '/month',
      description: 'For growing teams that need full CRM integration',
      features: [
        { text: '600 AI messages/month', icon: MessageSquare },
        { text: 'Unlimited AI Agents', icon: Bot },
        { text: 'Telegram + Bitrix24 integration', icon: Database },
        { text: 'CRM Chat feature', icon: MessageSquare },
        { text: 'Advanced analytics', icon: BarChart3 },
        { text: 'Priority support', icon: Headphones },
      ],
      highlighted: true,
      badge: 'POPULAR',
    },
  ];

  const faqs = [
    {
      question: 'What happens if I exceed my message limit?',
      answer: 'Your AI agents will pause until the next billing cycle. You can upgrade to Professional at any time to get more messages, or purchase additional message packs.',
    },
    {
      question: 'Can I switch plans at any time?',
      answer: 'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll get immediate access to new features. When downgrading, changes take effect at your next billing cycle.',
    },
    {
      question: 'What integrations are included?',
      answer: 'Starter includes Telegram Bot integration. Professional adds full Bitrix24 CRM integration with 2-way sync for leads, deals, contacts, and products.',
    },
    {
      question: 'How do I get started?',
      answer: 'Simply choose a plan and sign up. Setup takes less than 10 minutes. Our onboarding wizard will guide you through connecting your Telegram bot and configuring your AI agent.',
    },
    {
      question: 'What languages does the AI support?',
      answer: 'Our AI agents fluently support English, Russian, and Uzbek. The AI auto-detects the customer\'s language and responds naturally in their preferred tongue.',
    },
    {
      question: 'How does CRM Chat work?',
      answer: 'CRM Chat lets you query your Bitrix24 data using natural language. Ask questions like "What are my top leads this week?" or "Show me deals closing this month" and get instant insights.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-sm border-b border-slate-200 shadow-sm'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
                <span className="text-emerald-600">Lead</span>
                <span className="text-slate-900">Relay</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={goToFeatures} className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">Features</button>
              <span className="text-emerald-600 text-sm font-medium">Pricing</span>
              <Link to="/login" className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium">Login</Link>
            </div>

            {/* CTA Button */}
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={handleCTA}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 py-2.5 text-sm font-semibold transition-all"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-slate-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="bg-white border-t border-slate-200 px-6 py-6 space-y-4 shadow-lg">
            <button onClick={goToFeatures} className="block w-full text-left text-slate-600 hover:text-slate-900 py-2 font-medium">Features</button>
            <span className="block text-emerald-600 py-2 font-medium">Pricing</span>
            <Link to="/login" className="block text-slate-600 hover:text-slate-900 py-2 font-medium">Login</Link>
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={handleCTA}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full py-3 font-semibold transition-all"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className={`text-center transform transition-all duration-700 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] text-slate-900 mb-6">
              Simple, transparent <span className="text-emerald-600">pricing</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto">
              Choose the plan that fits your business. Start selling smarter today.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 gap-8">
            {pricingTiers.map((tier, index) => (
              <div
                key={tier.name}
                className={`relative bg-white rounded-2xl p-8 transform transition-all duration-700 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
                } ${tier.highlighted
                  ? 'border-2 border-emerald-500 shadow-xl shadow-emerald-100'
                  : 'border border-slate-200 shadow-sm hover:shadow-md'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {/* Popular Badge */}
                {tier.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                      {tier.badge}
                    </span>
                  </div>
                )}

                {/* Tier Header */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-slate-500 text-sm">{tier.description}</p>
                </div>

                {/* Price */}
                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                      {tier.price}
                    </span>
                    <span className="text-slate-500 text-lg">{tier.period}</span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-4 mb-8">
                  {tier.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        tier.highlighted ? 'bg-emerald-100' : 'bg-slate-100'
                      }`}>
                        <Check className={`w-3 h-3 ${
                          tier.highlighted ? 'text-emerald-600' : 'text-slate-600'
                        }`} strokeWidth={2.5} />
                      </div>
                      <span className="text-slate-700">{feature.text}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={handleCTA}
                  className={`w-full py-4 rounded-full font-semibold transition-all ${
                    tier.highlighted
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-200'
                      : 'border border-slate-300 hover:border-emerald-500 text-slate-700 hover:text-emerald-700'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>

          {/* Setup Time */}
          <div className={`text-center mt-12 transform transition-all duration-700 delay-500 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            <p className="text-slate-500 text-sm">
              Setup in under 10 minutes. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Comparison - Simple */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 md:px-12">
          <div className="text-center mb-12 scroll-reveal">
            <h2 className="text-3xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-4">
              Compare plans
            </h2>
            <p className="text-slate-500">See what's included in each plan</p>
          </div>

          <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 scroll-reveal" style={{ transitionDelay: '100ms' }}>
            {/* Header */}
            <div className="grid grid-cols-3 bg-slate-100 border-b border-slate-200">
              <div className="p-4 font-medium text-slate-900">Feature</div>
              <div className="p-4 font-medium text-slate-900 text-center">Starter</div>
              <div className="p-4 font-medium text-emerald-600 text-center bg-emerald-50">Professional</div>
            </div>

            {/* Rows */}
            {[
              { feature: 'AI Messages', starter: '250/month', professional: '600/month' },
              { feature: 'AI Agents', starter: '2', professional: 'Unlimited' },
              { feature: 'Telegram Integration', starter: true, professional: true },
              { feature: 'Bitrix24 Integration', starter: false, professional: true },
              { feature: 'CRM Chat', starter: false, professional: true },
              { feature: 'Analytics', starter: 'Basic', professional: 'Advanced' },
              { feature: 'Support', starter: 'Email', professional: 'Priority' },
            ].map((row, index) => (
              <div key={index} className={`grid grid-cols-3 ${
                index < 6 ? 'border-b border-slate-200' : ''
              }`}>
                <div className="p-4 text-slate-700">{row.feature}</div>
                <div className="p-4 text-center text-slate-600">
                  {typeof row.starter === 'boolean' ? (
                    row.starter ? (
                      <Check className="w-5 h-5 text-emerald-600 mx-auto" strokeWidth={2} />
                    ) : (
                      <span className="text-slate-300">-</span>
                    )
                  ) : (
                    row.starter
                  )}
                </div>
                <div className="p-4 text-center text-slate-700 bg-emerald-50/50">
                  {typeof row.professional === 'boolean' ? (
                    row.professional ? (
                      <Check className="w-5 h-5 text-emerald-600 mx-auto" strokeWidth={2} />
                    ) : (
                      <span className="text-slate-300">-</span>
                    )
                  ) : (
                    <span className="font-medium">{row.professional}</span>
                  )}
                </div>
              </div>
            ))}
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
                className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-all"
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
      <section className="py-24 bg-gradient-to-b from-emerald-50 to-white">
        <div className={`max-w-4xl mx-auto px-6 md:px-12 text-center transform transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-6">
            Ready to accelerate your sales?
          </h2>
          <p className="text-slate-500 text-lg mb-10 max-w-2xl mx-auto">
            Join hundreds of businesses already using LeadRelay to automate their Telegram sales. Start your free trial today.
          </p>
          <button
            onClick={handleCTA}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-10 py-4 text-lg font-semibold shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-200 transition-all"
          >
            Get Started
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-6">
          {/* Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Column 1 - Brand */}
            <div>
              <Link to="/" className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <span className="text-xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
                  <span className="text-emerald-600">Lead</span>
                  <span className="text-slate-900">Relay</span>
                </span>
              </Link>
              <p className="text-sm text-slate-500 mt-3">
                AI-powered sales for modern businesses
              </p>
            </div>

            {/* Column 2 - Product */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">
                Product
              </h4>
              <ul className="space-y-3">
                <li>
                  <button onClick={goToFeatures} className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                    Features
                  </button>
                </li>
                <li>
                  <Link to="/pricing" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <button onClick={goToHowItWorks} className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                    How It Works
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3 - Company */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">
                Company
              </h4>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-slate-500 hover:text-emerald-600 transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4 - Legal */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">
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

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">
              &copy; 2026 LeadRelay. All rights reserved.
            </p>
            <p className="text-sm text-slate-400">
              Made with care in Tashkent
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
