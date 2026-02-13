import React, { useState, useEffect, useRef } from 'react';
import { Check, ArrowRight, Sparkles } from 'lucide-react';

const AGENT_PRICE = 15;
const BUNDLE_DISCOUNT = 5;
const MESSAGES_PER_AGENT = 500;

const agents = [
  {
    id: 'jasur',
    name: 'Jasur',
    role: 'Sales Agent',
    desc: 'Qualifies leads and collects contacts on Telegram around the clock.',
  },
  {
    id: 'nilufar',
    name: 'Nilufar',
    role: 'Knowledge Specialist',
    desc: 'Answers customer questions from your docs in Uzbek, Russian, or English.',
  },
  {
    id: 'bobur',
    name: 'Bobur',
    role: 'CRM Analyst',
    desc: 'Syncs leads and conversations to your Bitrix24 CRM in real time.',
  },
];

const channelOptions = [
  { id: 'telegram', label: 'Telegram', price: 0, note: 'Included', available: true },
  { id: 'tg_ig', label: 'Telegram + Instagram', price: 25, note: '+$25/mo', available: true },
  { id: 'ig_only', label: 'Instagram Only', price: 10, note: '+$10/mo', available: true },
];

const billingOptions = [
  { id: 'monthly', label: 'Monthly', months: 1, discount: 0 },
  { id: 'semi', label: '6 Months', months: 6, discount: 0.10, badge: 'Save 10%' },
  { id: 'annual', label: '12 Months', months: 12, discount: 0.25, badge: 'Save 25%' },
];

export default function PricingSection({ onGetStarted }) {
  const [selectedAgents, setSelectedAgents] = useState(['jasur', 'nilufar', 'bobur']);
  const [selectedChannel, setSelectedChannel] = useState('telegram');
  const [selectedBilling, setSelectedBilling] = useState('monthly');
  const [displayPrice, setDisplayPrice] = useState(40);
  const targetPriceRef = useRef(40);

  // Calculations
  const agentCount = selectedAgents.length;
  const isFullTeam = agentCount === 3;
  const rawAgentCost = agentCount * AGENT_PRICE;
  const agentCost = isFullTeam ? rawAgentCost - BUNDLE_DISCOUNT : rawAgentCost;
  const channel = channelOptions.find((c) => c.id === selectedChannel);
  const channelCost = channel?.price || 0;
  const billing = billingOptions.find((b) => b.id === selectedBilling);
  const discount = billing?.discount || 0;
  const subtotal = agentCost + channelCost;
  const monthlyPrice = subtotal * (1 - discount);
  const totalBilled = monthlyPrice * (billing?.months || 1);
  const savedAmount = subtotal * discount * (billing?.months || 1);
  const totalMessages = agentCount * MESSAGES_PER_AGENT;

  // Animate price counter
  useEffect(() => {
    const start = targetPriceRef.current;
    const end = monthlyPrice;
    if (Math.abs(start - end) < 0.01) {
      setDisplayPrice(end);
      return;
    }

    const duration = 350;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPrice(start + (end - start) * eased);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        targetPriceRef.current = end;
      }
    };

    requestAnimationFrame(animate);
  }, [monthlyPrice]);

  // Set initial display price
  useEffect(() => {
    setDisplayPrice(monthlyPrice);
    targetPriceRef.current = monthlyPrice;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAgent = (agentId) => {
    setSelectedAgents((prev) => {
      if (prev.includes(agentId)) {
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== agentId);
      }
      return [...prev, agentId];
    });
  };

  const hireAll = () => setSelectedAgents(agents.map((a) => a.id));

  const formatPrice = (p) => {
    const rounded = Math.round(p * 100) / 100;
    return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2);
  };

  return (
    <section id="pricing" className="py-24 bg-[#F5F7F6]">
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        {/* Section Header */}
        <div className="text-center mb-12 scroll-reveal">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 mb-6">
            Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] text-slate-900 mb-4">
            Build your <span className="text-emerald-600">AI team</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Pick your agents, choose your channels, set your billing. Start with a 7-day free trial.
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-12 scroll-reveal">
          <div className="inline-flex items-center bg-white border border-slate-200 rounded-full p-1.5 gap-1 shadow-sm">
            {billingOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedBilling(option.id)}
                className={`relative px-4 sm:px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                  selectedBilling === option.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>{option.label}</span>
                {option.badge && (
                  <span
                    className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full hidden sm:inline ${
                      selectedBilling === option.id
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {option.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Two-column: Configurator + Summary */}
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* Left: Configuration */}
          <div className="lg:col-span-3 space-y-8">
            {/* Agent Selection */}
            <div className="scroll-reveal">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                Choose your agents
              </h3>
              <div className="space-y-3">
                {agents.map((agent) => {
                  const isSelected = selectedAgents.includes(agent.id);
                  return (
                    <button
                      key={agent.id}
                      onClick={() => toggleAgent(agent.id)}
                      className={`w-full text-left rounded-2xl p-5 transition-all duration-200 ${
                        isSelected
                          ? 'bg-white border-2 border-slate-900 shadow-md shadow-slate-50'
                          : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          {/* Avatar */}
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors duration-200 ${
                              isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {agent.name[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900 font-['Plus_Jakarta_Sans']">
                                {agent.name}
                              </span>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  isSelected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {agent.role}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{agent.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 pt-0.5">
                          <span className="text-sm font-semibold text-slate-900 hidden sm:block">
                            ${AGENT_PRICE}/mo
                          </span>
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                              isSelected ? 'bg-emerald-500' : 'border-2 border-slate-200'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Hire-all banner */}
              {!isFullTeam ? (
                <button
                  onClick={hireAll}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition-colors duration-200"
                >
                  <Sparkles className="w-4 h-4" strokeWidth={2} />
                  Hire all 3 and save ${BUNDLE_DISCOUNT}/month
                </button>
              ) : (
                <div className="mt-3 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium">
                  <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                  Full team hired. ${BUNDLE_DISCOUNT}/month bundle discount applied.
                </div>
              )}
            </div>

            {/* Channel Selection */}
            <div className="scroll-reveal" style={{ transitionDelay: '100ms' }}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                Choose your channel
              </h3>
              <div className="space-y-2">
                {channelOptions.map((ch) => {
                  const isSelected = selectedChannel === ch.id;
                  const isDisabled = !ch.available;

                  return (
                    <button
                      key={ch.id}
                      onClick={() => !isDisabled && setSelectedChannel(ch.id)}
                      disabled={isDisabled}
                      className={`w-full text-left rounded-xl px-5 py-4 flex items-center justify-between transition-all duration-200 ${
                        isDisabled
                          ? 'bg-slate-50 border border-slate-100 opacity-50 cursor-not-allowed'
                          : isSelected
                          ? 'bg-white border-2 border-slate-900 shadow-sm'
                          : 'bg-white border border-slate-200 hover:border-slate-300 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Radio indicator */}
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                            isSelected ? 'border-2 border-emerald-500' : 'border-2 border-slate-200'
                          }`}
                        >
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                        </div>
                        <span className={`font-medium ${isDisabled ? 'text-slate-400' : 'text-slate-900'}`}>
                          {ch.label}
                        </span>
                        {isDisabled && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Coming soon
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          isDisabled
                            ? 'text-slate-300'
                            : ch.price === 0
                            ? 'text-emerald-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {!isDisabled && ch.note}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Summary Card */}
          <div className="lg:col-span-2 scroll-reveal" style={{ transitionDelay: '150ms' }}>
            <div className="bg-white border border-slate-200 rounded-2xl p-7 lg:sticky lg:top-28 shadow-sm">
              {/* Price Display */}
              <div className="text-center mb-6 pb-6 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                  Your plan
                </p>
                <div className="inline-flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] tabular-nums">
                    ${formatPrice(displayPrice)}
                  </span>
                  <span className="text-lg text-slate-400 font-medium">/mo</span>
                </div>
                {discount > 0 && (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="text-sm text-slate-400 line-through">${formatPrice(subtotal)}/mo</span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Save {Math.round(discount * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Breakdown */}
              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between text-slate-600">
                  <span>
                    {agentCount} {agentCount === 1 ? 'agent' : 'agents'} &times; ${AGENT_PRICE}
                  </span>
                  <span className="font-medium text-slate-900">${rawAgentCost}</span>
                </div>
                {isFullTeam && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Bundle discount</span>
                    <span className="font-medium">&minus;${BUNDLE_DISCOUNT}</span>
                  </div>
                )}
                {channelCost > 0 ? (
                  <div className="flex justify-between text-slate-600">
                    <span>{channel?.label}</span>
                    <span className="font-medium text-slate-900">+${channelCost}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-slate-600">
                    <span>Telegram</span>
                    <span className="font-medium text-emerald-600">Included</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>{billing?.label} discount</span>
                    <span className="font-medium">&minus;{Math.round(discount * 100)}%</span>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-3 flex justify-between font-semibold text-slate-900">
                  <span>Monthly total</span>
                  <span>${formatPrice(monthlyPrice)}</span>
                </div>
              </div>

              {/* Billing total (only for multi-month) */}
              {billing?.months > 1 && (
                <div className="bg-slate-50 rounded-xl px-4 py-3 mb-6 text-center">
                  <p className="text-sm text-slate-600">
                    Billed{' '}
                    <span className="font-semibold text-slate-900">${formatPrice(totalBilled)}</span> every{' '}
                    {billing.months} months
                  </p>
                  {savedAmount > 0 && (
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      You save ${formatPrice(savedAmount)}
                    </p>
                  )}
                </div>
              )}

              {/* Messages info */}
              <div className="bg-slate-50 rounded-xl px-4 py-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    <span className="font-semibold text-slate-900">{totalMessages.toLocaleString()}</span> messages/mo
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500">Extra: $5 per 500</span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={onGetStarted}
                className="w-full bg-slate-900 hover:bg-emerald-600 text-white rounded-full py-4 text-base font-semibold transition-all duration-200 flex items-center justify-center gap-2 group shadow-lg shadow-slate-200 hover:shadow-xl hover:shadow-emerald-200"
              >
                Start 7-Day Free Trial
                <ArrowRight
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200"
                  strokeWidth={2}
                />
              </button>
              <p className="text-center text-sm text-slate-400 mt-3">Cancel anytime. No commitment.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
