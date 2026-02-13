import React, { useState, useEffect, useRef } from 'react';
import { Check, MessageSquare, Bot, Database, Globe, BarChart3, Headphones, FileText, Zap } from 'lucide-react';

const CHANNEL_PRICE = 30;

const channels = [
  {
    id: 'telegram',
    name: 'Telegram',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
      </svg>
    ),
    available: true,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    available: false,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
    available: false,
  },
];

const includedFeatures = [
  { icon: MessageSquare, title: 'Unlimited AI messages' },
  { icon: Bot, title: 'Unlimited AI agents' },
  { icon: Database, title: 'Bitrix24 CRM integration' },
  { icon: FileText, title: 'Knowledge base training' },
  { icon: Globe, title: 'Multi-language (UZ/RU/EN)' },
  { icon: Zap, title: 'Google Sheets export' },
  { icon: BarChart3, title: 'Advanced analytics' },
  { icon: Headphones, title: 'Priority support' },
];

export default function PricingSection({ onGetStarted }) {
  const [selectedChannels, setSelectedChannels] = useState(['telegram']);
  const [displayPrice, setDisplayPrice] = useState(CHANNEL_PRICE);
  const priceRef = useRef(null);

  const totalPrice = selectedChannels.length * CHANNEL_PRICE;

  useEffect(() => {
    // Animate price change
    const start = displayPrice;
    const end = totalPrice;
    if (start === end) return;

    const duration = 300;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPrice(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPrice]);

  const toggleChannel = (channelId) => {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel?.available) return;

    setSelectedChannels((prev) => {
      if (prev.includes(channelId)) {
        // Don't allow deselecting the last channel
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== channelId);
      }
      return [...prev, channelId];
    });
  };

  return (
    <section id="pricing" className="py-24 bg-[#F5F7F6]">
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        {/* Section Header */}
        <div className="text-center mb-12 scroll-reveal">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700 mb-6">
            Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] text-slate-900 mb-4">
            Simple, per-channel <span className="text-emerald-600">pricing</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Activate a channel. Your entire AI team works across it. Everything included.
          </p>
        </div>

        {/* Price Display */}
        <div className="text-center mb-10 scroll-reveal">
          <div className="inline-flex items-baseline gap-1">
            <span className="text-6xl md:text-7xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] tabular-nums" ref={priceRef}>
              ${displayPrice}
            </span>
            <span className="text-xl text-slate-400 font-medium">/month</span>
          </div>
          {selectedChannels.length > 0 && (
            <p className="text-sm text-slate-500 mt-2">
              {selectedChannels.length} {selectedChannels.length === 1 ? 'channel' : 'channels'} &times; ${CHANNEL_PRICE}/mo
            </p>
          )}
        </div>

        {/* Channel Selector Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 scroll-reveal">
          {channels.map((channel) => {
            const isSelected = selectedChannels.includes(channel.id);
            const isComingSoon = !channel.available;

            return (
              <button
                key={channel.id}
                onClick={() => toggleChannel(channel.id)}
                disabled={isComingSoon}
                className={`relative rounded-2xl p-6 text-left transition-all duration-200 ${
                  isComingSoon
                    ? 'bg-white border border-slate-100 opacity-60 cursor-not-allowed'
                    : isSelected
                    ? 'bg-white border-2 border-emerald-500 shadow-md cursor-pointer'
                    : 'bg-white border border-slate-200 hover:border-slate-300 cursor-pointer'
                }`}
              >
                {/* Selected check */}
                {isSelected && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </div>
                )}

                {/* Coming Soon badge */}
                {isComingSoon && (
                  <span className="absolute top-4 right-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    Coming Soon
                  </span>
                )}

                <div className={`mb-3 ${isComingSoon ? 'text-slate-300' : isSelected ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {channel.icon}
                </div>
                <h3 className={`text-lg font-semibold font-['Plus_Jakarta_Sans'] ${isComingSoon ? 'text-slate-400' : 'text-slate-900'}`}>
                  {channel.name}
                </h3>
                <p className={`text-sm mt-1 ${isComingSoon ? 'text-slate-300' : 'text-slate-500'}`}>
                  ${CHANNEL_PRICE}/month
                </p>
              </button>
            );
          })}
        </div>

        {/* Included Features */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 mb-10 scroll-reveal">
          <h3 className="text-lg font-semibold text-slate-900 font-['Plus_Jakarta_Sans'] mb-6">
            Everything included
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {includedFeatures.map((feature) => (
              <div key={feature.title} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-emerald-600" strokeWidth={2.5} />
                </div>
                <span className="text-slate-700 text-sm">{feature.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center scroll-reveal">
          <button
            onClick={onGetStarted}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-10 py-4 text-lg font-semibold transition-all duration-200 shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-200"
          >
            Hire Your Team
          </button>
          <p className="text-slate-400 text-sm mt-4">
            10-minute setup &middot; Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
