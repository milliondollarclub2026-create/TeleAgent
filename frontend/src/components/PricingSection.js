import React from 'react';
import { Check, MessageSquare, Bot, Zap, BarChart3, Database, Headphones } from 'lucide-react';

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

export default function PricingSection({ onGetStarted }) {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        {/* Section Header */}
        <div className="text-center mb-16 scroll-reveal">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 mb-6">
            Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] text-slate-900 mb-6">
            Simple, transparent <span className="text-emerald-600">pricing</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Choose the plan that fits your business. Start selling smarter today.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {pricingTiers.map((tier, index) => (
            <div
              key={tier.name}
              className={`relative bg-white rounded-2xl p-8 scroll-reveal ${
                tier.highlighted
                  ? 'border-2 border-emerald-500 shadow-xl shadow-emerald-100'
                  : 'border border-slate-200 shadow-sm hover:shadow-md'
              } transition-all duration-300`}
              style={{ transitionDelay: `${index * 100}ms` }}
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
                onClick={onGetStarted}
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
        <div className="text-center mt-12 scroll-reveal">
          <p className="text-slate-500 text-sm">
            Setup in under 10 minutes. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
