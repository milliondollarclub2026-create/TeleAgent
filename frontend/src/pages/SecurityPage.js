// === SECURITY PAGE ===
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  Lock,
  KeyRound,
  Users,
  Server,
  Activity,
  Bot,
  Globe,
  FileText,
  Mail,
  ExternalLink,
  Check,
} from 'lucide-react';

const securityPractices = [
  {
    icon: Lock,
    title: 'Encryption at Rest',
    description:
      'All sensitive credentials (API keys, bot tokens, webhook secrets) are encrypted using Fernet AES-128-CBC before storage. Database-level AES-256 encryption provided by Supabase.',
  },
  {
    icon: Shield,
    title: 'Encryption in Transit',
    description:
      'TLS 1.2+ enforced on all connections. HSTS headers ensure browsers always use HTTPS. All API communication is encrypted end-to-end.',
  },
  {
    icon: KeyRound,
    title: 'Authentication',
    description:
      'Passwords hashed with bcrypt (adaptive cost factor). JWT tokens with unique IDs for revocation support. Rate-limited auth endpoints prevent brute force attacks.',
  },
  {
    icon: Users,
    title: 'Access Control',
    description:
      'Row-Level Security (RLS) on all database tables ensures strict multi-tenant isolation. CORS and CSRF protections prevent unauthorized cross-origin requests.',
  },
  {
    icon: Server,
    title: 'Infrastructure',
    description:
      'Hosted on Render with managed PostgreSQL by Supabase. No self-managed servers means reduced attack surface. Automatic security patches and updates.',
  },
  {
    icon: Activity,
    title: 'Monitoring & Logging',
    description:
      'Structured logging with automatic PII redaction (emails, IDs, tokens). Webhook signature verification on all inbound integrations. Error messages sanitized to prevent information leakage.',
  },
];

const integrations = [
  {
    name: 'Telegram',
    details: [
      'Bot-specific webhook URLs with cryptographic secret tokens',
      'HMAC-SHA256 signature verification on every incoming update',
      'Bot tokens encrypted at rest with Fernet',
    ],
  },
  {
    name: 'Instagram',
    details: [
      'OAuth 2.0 authorization flow with CSRF-protected state parameter',
      'SHA-256 webhook signature verification on all incoming messages',
      'Access tokens encrypted at rest and automatically refreshed',
    ],
  },
  {
    name: 'Bitrix24 CRM',
    details: [
      'OAuth 2.0 with encrypted refresh tokens',
      'Webhook URLs and API credentials encrypted with Fernet',
      'Tenant-scoped access prevents cross-account data leakage',
    ],
  },
];

const dataPractices = [
  {
    title: 'GDPR Article 17: Right to Erasure',
    description:
      'Users can request complete deletion of their account and all associated data through our API. This includes conversations, leads, documents, and configuration.',
  },
  {
    title: 'GDPR Article 20: Data Portability',
    description:
      'Users can export all their data in machine-readable JSON format at any time through our data export endpoint.',
  },
  {
    title: 'Data Retention',
    description:
      'Conversation data is retained for as long as your account is active. Upon account deletion, all data is permanently removed within 30 days.',
  },
  {
    title: 'Data Minimization',
    description:
      'We only collect and process data necessary for the service to function. No unnecessary personal data is gathered or stored.',
  },
];

const roadmap = [
  { item: 'Bcrypt password hashing', done: true },
  { item: 'Fernet credential encryption', done: true },
  { item: 'Row-Level Security on all tables', done: true },
  { item: 'Webhook signature verification', done: true },
  { item: 'PII log redaction', done: true },
  { item: 'CORS + CSRF protection', done: true },
  { item: 'Security headers (HSTS, X-Frame-Options, etc.)', done: true },
  { item: 'Auth rate limiting', done: true },
  { item: 'Password complexity requirements', done: true },
  { item: 'JWT token revocation (logout)', done: true },
  { item: 'File upload magic byte validation', done: true },
  { item: 'Input length validation', done: true },
  { item: 'GDPR erasure & portability endpoints', done: true },
  { item: 'SOC 2 Type I audit', done: false },
  { item: 'Penetration testing by third party', done: false },
  { item: 'Bug bounty program', done: false },
];

export default function SecurityPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F7F6]">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/logo.svg"
                alt="LeadRelay"
                className="h-9 w-9 transition-transform duration-300 group-hover:scale-110"
                style={{ objectFit: 'contain' }}
              />
              <span className="text-xl font-bold tracking-tight font-['Plus_Jakarta_Sans']">
                <span className="text-emerald-600">Lead</span>
                <span className="text-slate-900">Relay</span>
              </span>
            </Link>

            <div className="flex items-center gap-6">
              <Link
                to="/privacy"
                className="hidden sm:inline text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/"
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-gray-600" strokeWidth={1.75} />
          </div>
          <p className="text-sm font-medium text-emerald-600 tracking-wide uppercase">
            Security
          </p>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-4 leading-tight">
          Security at LeadRelay
        </h1>
        <p className="text-lg text-slate-500 leading-relaxed max-w-2xl">
          Your business data and your customers' information deserve the highest level of
          protection. Here's how we safeguard it at every layer of our platform.
        </p>
      </section>

      {/* Security Practices Grid */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-semibold text-slate-900 font-['Plus_Jakarta_Sans'] mb-6">
          Security Practices
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {securityPractices.map((practice) => {
            const Icon = practice.icon;
            return (
              <div
                key={practice.title}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <Icon
                    className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5"
                    strokeWidth={1.75}
                  />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1.5">
                      {practice.title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {practice.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* AI & Data Handling */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-semibold text-slate-900 font-['Plus_Jakarta_Sans'] mb-4">
          AI & Data Handling
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <Bot
              className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5"
              strokeWidth={1.75}
            />
            <div className="space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed">
                LeadRelay uses OpenAI's GPT-4o to power sales conversations. Here's how we
                handle your data in the AI pipeline:
              </p>
              <ul className="space-y-2">
                {[
                  'Messages are processed in real-time through the OpenAI API and are not used to train AI models.',
                  'Only the current conversation context and relevant business documents (RAG) are sent to the AI. No cross-tenant data mixing.',
                  'AI responses are generated per-request. No conversation data is cached on OpenAI\'s side beyond their standard API processing.',
                  'Your uploaded documents are chunked and embedded locally. Only relevant text snippets are included in AI context windows.',
                ].map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Check
                      className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"
                      strokeWidth={2}
                    />
                    <span className="text-sm text-slate-600">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Security */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-semibold text-slate-900 font-['Plus_Jakarta_Sans'] mb-6">
          Integration Security
        </h2>
        <div className="space-y-4">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="bg-white rounded-xl border border-slate-200 p-6"
            >
              <div className="flex items-start gap-4">
                <Globe
                  className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5"
                  strokeWidth={1.75}
                />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    {integration.name}
                  </h3>
                  <ul className="space-y-1.5">
                    {integration.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <Check
                          className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"
                          strokeWidth={2}
                        />
                        <span className="text-sm text-slate-500">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Data Practices */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-semibold text-slate-900 font-['Plus_Jakarta_Sans'] mb-6">
          Data Practices
        </h2>
        <div className="space-y-4">
          {dataPractices.map((practice) => (
            <div
              key={practice.title}
              className="bg-white rounded-xl border border-slate-200 p-6"
            >
              <div className="flex items-start gap-4">
                <FileText
                  className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5"
                  strokeWidth={1.75}
                />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1.5">
                    {practice.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {practice.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance Roadmap */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-semibold text-slate-900 font-['Plus_Jakarta_Sans'] mb-2">
          Compliance Roadmap
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Transparency matters. Here's what we've implemented and what's coming next.
        </p>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {roadmap.map((entry, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1">
                {entry.done ? (
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" strokeWidth={2} />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    entry.done ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {entry.item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vulnerability Disclosure */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-semibold text-slate-900 font-['Plus_Jakarta_Sans'] mb-4">
          Vulnerability Disclosure
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <Mail
              className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5"
              strokeWidth={1.75}
            />
            <div>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                We take security vulnerabilities seriously. If you discover a security issue,
                please report it responsibly. We ask that you give us reasonable time to
                address the issue before public disclosure.
              </p>
              <a
                href="mailto:security@leadrelay.net"
                className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                security@leadrelay.net
                <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} LeadRelay. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              to="/privacy"
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Terms
            </Link>
            <Link
              to="/"
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
