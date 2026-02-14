// === PRIVACY PAGE ===
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
                to="/terms"
                className="hidden sm:inline text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                Terms of Service
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

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-2">
          Privacy Policy
        </h1>
        <p className="text-slate-500 mb-8">Last updated: February 14, 2026</p>

        <div className="prose prose-slate max-w-none">
          {/* Introduction */}
          <section>
            <p className="text-slate-600 leading-relaxed mb-4">
              LeadRelay ("Company," "we," "us," or "our") is committed to protecting your privacy
              and the privacy of your customers. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our AI-powered sales agent
              platform and related services (the "Service").
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              Please read this Privacy Policy carefully. By accessing or using the Service, you
              acknowledge that you have read, understood, and agree to be bound by this Privacy
              Policy. If you do not agree with our policies and practices, please do not use our Service.
            </p>
            <p className="text-slate-600 leading-relaxed">
              This Privacy Policy applies to information we collect through the Service and in
              email, text, and other electronic messages between you and the Service. It does not
              apply to information collected by any third party, including through any application
              or content that may link to or be accessible from the Service.
            </p>
          </section>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              1. Information We Collect
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We collect several types of information from and about users of our Service:
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>1.1 Account Information</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              When you create an account, we collect:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Name and email address</li>
              <li>Password (stored in encrypted form)</li>
              <li>Company name and business information</li>
              <li>Billing address and payment information</li>
              <li>Phone number (if provided)</li>
              <li>Profile preferences and settings</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>1.2 Business Data</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              To provide our AI sales agent services, we collect and process:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Product catalogs, pricing information, and inventory data</li>
              <li>Knowledge base documents (PDFs, text files, FAQs)</li>
              <li>Business policies and procedures you upload</li>
              <li>AI agent configurations, personas, and training data</li>
              <li>CRM data synchronized from Bitrix24 (leads, contacts, deals)</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>1.3 Conversation Data</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              We collect and store:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>All messages exchanged between your AI agents and your customers via Telegram,
                WhatsApp Business, and Instagram Direct</li>
              <li>Customer contact information collected during conversations (names, phone numbers, email addresses)</li>
              <li>Conversation metadata (timestamps, message IDs, delivery status)</li>
              <li>AI-generated responses and recommendations</li>
              <li>Lead qualification data and conversation outcomes</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>1.4 Usage Data</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              We automatically collect:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>IP address and geolocation data</li>
              <li>Browser type, version, and language</li>
              <li>Device type, operating system, and unique device identifiers</li>
              <li>Pages visited, features used, and actions taken within the Service</li>
              <li>Referral URLs and exit pages</li>
              <li>Date and time of access, session duration</li>
              <li>API call logs and error reports</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>1.5 Integration Data</strong>
            </p>
            <p className="text-slate-600 leading-relaxed">
              When you connect third-party services, we collect:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2">
              <li>Telegram Bot API tokens and webhook configurations</li>
              <li>Bitrix24 OAuth tokens and webhook URLs</li>
              <li>Google OAuth2 refresh tokens (for Google Sheets export functionality)</li>
              <li>Google Sheets spreadsheet IDs and sheet metadata (headers, sheet names)</li>
              <li>WhatsApp Business API access tokens and phone number IDs</li>
              <li>Instagram Professional Account tokens and page connections</li>
              <li>Meta Platform API tokens for WhatsApp and Instagram integrations</li>
              <li>Integration status and synchronization logs</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              2. How We Use Your Information
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We use the information we collect for the following purposes:
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>2.1 Service Delivery</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Provide, operate, and maintain the Service</li>
              <li>Process AI conversations and generate responses</li>
              <li>Synchronize data with your CRM and communication platforms</li>
              <li>Create and manage your AI sales agents</li>
              <li>Process your knowledge base for AI training</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>2.2 Account Management</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Create and manage your account</li>
              <li>Process payments and manage subscriptions</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Send transactional emails (receipts, notifications, alerts)</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>2.3 Service Improvement</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Analyze usage patterns to improve features and user experience</li>
              <li>Debug errors and resolve technical issues</li>
              <li>Develop new features and services</li>
              <li>Conduct research and analytics</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>2.4 Communications</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Send service updates, security alerts, and important notices</li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Send marketing communications (with your consent)</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>2.5 Legal and Security</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2">
              <li>Comply with legal obligations and law enforcement requests</li>
              <li>Enforce our Terms of Service and other agreements</li>
              <li>Protect against fraud, abuse, and security threats</li>
              <li>Protect the rights, property, and safety of LeadRelay and our users</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              3. AI and Machine Learning Disclosure
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>3.1 AI Processing.</strong> LeadRelay uses artificial intelligence and machine learning
              technologies to provide our core services. This includes:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li><strong>OpenAI GPT-4:</strong> We use OpenAI's GPT-4o model to generate conversational
                responses for your AI sales agents. Your conversation data and knowledge base content
                is transmitted to OpenAI's servers for processing.</li>
              <li><strong>Text Embeddings:</strong> We use OpenAI's text-embedding-3-small model to create
                vector embeddings of your knowledge base documents for semantic search and retrieval.</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>3.2 Data Sent to AI Providers.</strong> When your AI agent processes a conversation,
              the following data may be sent to OpenAI:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>The customer's message and conversation history</li>
              <li>Relevant excerpts from your knowledge base</li>
              <li>Your AI agent's persona and configuration</li>
              <li>Product information and pricing relevant to the query</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>3.3 OpenAI Data Usage.</strong> According to OpenAI's current policies (which may change),
              data sent through their API is:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Not used to train or improve their models</li>
              <li>Retained for up to 30 days for abuse and misuse monitoring</li>
              <li>Subject to OpenAI's privacy policy and data processing terms</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>3.4 Our AI Training.</strong> We may use aggregated, anonymized conversation data
              to improve our service quality and AI performance. We will NOT use your specific
              business data, customer conversations, or knowledge base content to train AI models
              without your explicit written consent.
            </p>

            <p className="text-slate-600 leading-relaxed">
              <strong>3.5 AI Limitations.</strong> AI-generated content may be inaccurate, incomplete,
              or inappropriate. You are responsible for monitoring your AI agents' performance and
              reviewing generated content. We do not guarantee the accuracy, reliability, or
              appropriateness of AI-generated responses.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              4. Data Sharing with Third Parties
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We share your information with the following categories of third parties:
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>4.1 Service Providers</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li><strong>Telegram:</strong> Your bot token and message data are transmitted to Telegram
                to enable messaging functionality. Telegram processes this data according to their
                Privacy Policy.</li>
              <li><strong>Bitrix24:</strong> When enabled, we synchronize lead, contact, deal, and product
                data with your Bitrix24 account. Bitrix24 processes this data according to their
                Privacy Policy.</li>
              <li><strong>OpenAI:</strong> Conversation content and knowledge base data are processed by
                OpenAI to generate AI responses. See Section 3 for details.</li>
              <li><strong>Supabase:</strong> Our database infrastructure provider that stores your data.
                Supabase maintains SOC 2 Type II compliance and implements industry-standard security.</li>
              <li><strong>Google (Google Sheets API):</strong> When you enable Google Sheets export, we
                transmit lead data (names, contact details, lead scores, conversation summaries) to
                your designated Google Sheets spreadsheet. Google processes this data according to the{' '}
                <a href="https://policies.google.com/privacy" className="text-emerald-600 hover:text-emerald-700 underline"
                  target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>.</li>
              <li><strong>Meta Platforms (WhatsApp Business API):</strong> When you enable WhatsApp
                messaging, customer messages, contact details, and conversation metadata are transmitted
                through Meta's WhatsApp Business API. Meta processes this data according to the{' '}
                <a href="https://www.whatsapp.com/legal/privacy-policy" className="text-emerald-600 hover:text-emerald-700 underline"
                  target="_blank" rel="noopener noreferrer">WhatsApp Privacy Policy</a>.</li>
              <li><strong>Meta Platforms (Instagram Messaging API):</strong> When you enable Instagram
                messaging, customer messages and profile information are transmitted through Meta's
                Instagram API. Meta processes this data according to the{' '}
                <a href="https://privacycenter.instagram.com/policy" className="text-emerald-600 hover:text-emerald-700 underline"
                  target="_blank" rel="noopener noreferrer">Instagram Privacy Policy</a>.</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>4.2 Payment Processors</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              We use third-party payment processors to process subscription payments. We do not
              store complete credit card numbers or CVV codes. Payment processors receive only
              the information necessary to process transactions and are bound by PCI-DSS compliance.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>4.3 Analytics Providers</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              We may use analytics services to help us understand usage patterns. These services
              may collect information about your use of the Service, including IP address, browser
              type, and pages visited.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>4.4 Legal Requirements</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              We may disclose your information if required to do so by law or in response to valid
              requests by public authorities (e.g., a court or government agency), including to:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Comply with a legal obligation</li>
              <li>Protect and defend our rights or property</li>
              <li>Prevent or investigate possible wrongdoing in connection with the Service</li>
              <li>Protect the personal safety of users or the public</li>
              <li>Protect against legal liability</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>4.5 Business Transfers</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              If we are involved in a merger, acquisition, or sale of all or a portion of our assets,
              your information may be transferred as part of that transaction. We will notify you
              via email and/or prominent notice on our Service of any change in ownership or uses
              of your information.
            </p>

            <p className="text-slate-600 leading-relaxed">
              <strong>4.6 With Your Consent</strong>
            </p>
            <p className="text-slate-600 leading-relaxed">
              We may share your information with third parties when you have given us your consent to do so.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              5. Data Retention
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We retain your information for as long as necessary to fulfill the purposes outlined
              in this Privacy Policy, unless a longer retention period is required or permitted by law.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>5.1 Retention Periods</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li><strong>Account Data:</strong> Retained while your account is active and for 30 days
                after account deletion to allow for recovery</li>
              <li><strong>Conversation Data:</strong> Retained for 12 months from the date of the conversation,
                unless you request earlier deletion</li>
              <li><strong>Knowledge Base Documents:</strong> Retained while your account is active and
                deleted within 30 days of account termination</li>
              <li><strong>Usage Logs:</strong> Retained for 90 days for debugging and analytics purposes</li>
              <li><strong>Billing Records:</strong> Retained for 7 years as required by tax and accounting regulations</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>5.2 Backup Retention</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              Our backup systems retain data for up to 30 days for disaster recovery purposes.
              Deleted data may persist in backups during this period.
            </p>

            <p className="text-slate-600 leading-relaxed">
              <strong>5.3 Anonymized Data</strong>
            </p>
            <p className="text-slate-600 leading-relaxed">
              We may retain anonymized or aggregated data indefinitely for analytics and service
              improvement purposes. This data cannot be used to identify you.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              6. Data Security
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We implement appropriate technical and organizational measures to protect your
              personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>6.1 Encryption</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li><strong>In Transit:</strong> All data transmitted between your browser and our servers
                is encrypted using TLS 1.3 (HTTPS)</li>
              <li><strong>At Rest:</strong> Sensitive credentials (integration tokens, API keys, webhook URLs)
                are encrypted using Fernet symmetric encryption (AES-128-CBC with HMAC authentication)
                before storage in our database</li>
              <li><strong>Passwords:</strong> User passwords are hashed using bcrypt with per-password salt,
                a purpose-built algorithm designed to resist brute-force attacks</li>
              <li><strong>Database:</strong> Our database provider (Supabase) encrypts all data at rest
                using AES-256 at the infrastructure level</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>6.2 Access Controls</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Row Level Security (RLS) is enabled on all database tables to enforce tenant
                isolation at the database level, preventing cross-account data access</li>
              <li>JWT-based authentication with mandatory secret key configuration</li>
              <li>CORS (Cross-Origin Resource Sharing) is restricted to our production domains only</li>
              <li>Telegram webhook requests are verified using cryptographic secret tokens to
                prevent unauthorized message injection</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>6.3 Infrastructure Security</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Our infrastructure is hosted on SOC 2 Type II compliant providers
                (Supabase for database, Render for application hosting)</li>
              <li>No third-party debug or tracking scripts are loaded in the application
                beyond our analytics provider (PostHog)</li>
              <li>Personally identifiable information (PII) is redacted from application logs,
                including email addresses, usernames, and message content</li>
              <li>Regular data backups with encrypted storage</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>6.4 Incident Response</strong>
            </p>
            <p className="text-slate-600 leading-relaxed">
              In the event of a data breach that affects your personal information, we will notify
              you within 72 hours of becoming aware of the breach, as required by applicable law.
              We will provide information about the nature of the breach, the data affected, and
              steps we are taking to address it.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              7. Your Privacy Rights
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Depending on your location, you may have certain rights regarding your personal information.
              We honor these rights regardless of your location to the extent practicable.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>7.1 Right to Access</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              You have the right to request a copy of the personal information we hold about you.
              We will provide this information in a commonly used, machine-readable format within
              30 days of your request.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>7.2 Right to Correction</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              You have the right to request that we correct any inaccurate or incomplete personal
              information we hold about you. You can update most information directly through your
              account settings.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>7.3 Right to Deletion (Right to Erasure)</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              You have the right to request that we delete your personal information, subject to
              certain exceptions (such as data we need to retain for legal compliance). Our platform
              provides built-in data erasure functionality: you can erase individual lead records
              including all associated conversations and personally identifiable information directly
              from your dashboard. Upon full account deletion, we will delete or anonymize all your
              data within 30 days, except for backups which are purged within an additional 30 days.
              All erasure actions are logged for audit purposes.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>7.4 Right to Data Portability</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              You have the right to receive your personal information in a structured, commonly
              used, machine-readable format. Our platform provides built-in data export functionality:
              you can export individual lead records including all associated customer data,
              conversations, and messages as JSON. You may transmit this data to another service
              provider at any time.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>7.5 Right to Object</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              You have the right to object to processing of your personal information for direct
              marketing purposes. You can opt out of marketing communications at any time by
              clicking "unsubscribe" in any marketing email or by contacting us.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>7.6 Right to Restrict Processing</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              You have the right to request that we restrict processing of your personal information
              in certain circumstances, such as when you contest the accuracy of the data.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>7.7 Exercising Your Rights</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              To exercise any of these rights, please contact us at privacy@leadrelay.net. We will
              respond to your request within 30 days. We may need to verify your identity before
              processing your request.
            </p>

            <p className="text-slate-600 leading-relaxed">
              <strong>7.8 No Retaliation</strong>
            </p>
            <p className="text-slate-600 leading-relaxed">
              We will not discriminate against you for exercising any of your privacy rights.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              8. Cookies and Tracking Technologies
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We use cookies and similar tracking technologies to collect and track information
              about your use of the Service.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>8.1 Types of Cookies We Use</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li><strong>Essential Cookies:</strong> Required for the Service to function (authentication,
                security, preferences). These cannot be disabled.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how you use the Service and
                improve user experience. These can be disabled.</li>
              <li><strong>Functional Cookies:</strong> Remember your preferences and settings. These can
                be disabled.</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>8.2 Cookie Management</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              Most web browsers allow you to control cookies through their settings. However,
              disabling certain cookies may impact your ability to use some features of the Service.
            </p>

            <p className="text-slate-600 leading-relaxed">
              <strong>8.3 Do Not Track</strong>
            </p>
            <p className="text-slate-600 leading-relaxed">
              We do not currently respond to "Do Not Track" signals from web browsers. However,
              you can manage your cookie preferences as described above.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              9. International Data Transfers
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Your information may be transferred to, and maintained on, computers located outside
              of your state, province, country, or other governmental jurisdiction where the data
              protection laws may differ from those of your jurisdiction.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>9.1 Data Location</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              Our primary infrastructure is located in the United States. If you are located outside
              the United States and choose to use our Service, you understand that your data will
              be transferred to the United States for processing.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>9.2 Transfer Mechanisms</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              For users in the European Economic Area (EEA), United Kingdom, or Switzerland, we
              ensure that international data transfers are protected by appropriate safeguards,
              including:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Standard Contractual Clauses approved by the European Commission</li>
              <li>Transfer to countries with adequate data protection as determined by the European Commission</li>
              <li>Binding Corporate Rules where applicable</li>
            </ul>

            <p className="text-slate-600 leading-relaxed">
              <strong>9.3 Third-Party Transfers</strong>
            </p>
            <p className="text-slate-600 leading-relaxed">
              Our third-party service providers (OpenAI, Supabase, etc.) may also transfer data
              internationally. We require that all service providers implement appropriate safeguards
              for international data transfers.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              10. Children's Privacy
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              The Service is not intended for use by children under the age of 18. We do not
              knowingly collect personal information from children under 18. If you are a parent
              or guardian and believe that your child has provided us with personal information,
              please contact us at privacy@leadrelay.net.
            </p>
            <p className="text-slate-600 leading-relaxed">
              If we become aware that we have collected personal information from a child under
              18 without verification of parental consent, we will take steps to delete that
              information promptly.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              11. Your Customers' Privacy
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              When you use our Service to communicate with your customers, you are the "data
              controller" for your customers' personal information, and we act as your "data
              processor."
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>11.1 Your Responsibilities</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Ensure you have a lawful basis to collect and process your customers' data</li>
              <li>Provide appropriate privacy notices to your customers</li>
              <li>Respond to your customers' privacy rights requests</li>
              <li>Comply with all applicable privacy laws in your jurisdiction</li>
            </ul>

            <p className="text-slate-600 leading-relaxed">
              <strong>11.2 Data Processing Agreement</strong>
            </p>
            <p className="text-slate-600 leading-relaxed">
              If you need a formal Data Processing Agreement (DPA) for compliance purposes, please
              contact us at legal@leadrelay.net.
            </p>
          </section>

          {/* Section 12 - Google API Services */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              12. Google API Services User Data Policy
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              LeadRelay's use and transfer to any other app of information received from Google APIs
              will adhere to the{' '}
              <a href="https://developers.google.com/terms/api-services-user-data-policy"
                className="text-emerald-600 hover:text-emerald-700 underline"
                target="_blank" rel="noopener noreferrer">
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>12.1 Data We Access from Google</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              When you connect your Google account to LeadRelay for Google Sheets export, we request
              access to the following scopes:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li><strong>Google Sheets API (spreadsheets scope):</strong> To read spreadsheet structure
                (headers, sheet names) and write lead data to your designated spreadsheet(s)</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mb-4">
              We do not request access to your Gmail, Google Drive files (beyond the specific
              spreadsheet), Google Calendar, Google Contacts, or any other Google service.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>12.2 How We Use Google Data</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Write lead and customer data to the Google Sheets spreadsheet(s) you designate</li>
              <li>Read spreadsheet headers and structure to ensure correct data mapping</li>
              <li>Maintain your Google Sheets connection using a securely stored OAuth2 refresh token</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>12.3 Limited Use Disclosure</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              In compliance with Google's Limited Use requirements:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>We only use Google data to provide and improve the Google Sheets export feature
                that you explicitly enabled</li>
              <li>We do not use Google data for serving advertisements or for any advertising purpose</li>
              <li>We do not allow humans to read your Google data unless: (a) we have your affirmative
                agreement for specific messages, (b) it is necessary for security purposes such as
                investigating abuse, (c) it is necessary to comply with applicable law, or (d) our
                use is limited to internal operations and the data has been aggregated and anonymized</li>
              <li>We do not transfer Google data to third parties except as necessary to provide
                the Service, to comply with applicable laws, or as part of a merger, acquisition,
                or asset sale with adequate data protection commitments</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>12.4 Revoking Google Access</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              You may revoke LeadRelay's access to your Google data at any time by:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Disconnecting the Google Sheets integration from your LeadRelay account settings</li>
              <li>Removing LeadRelay from your Google account's third-party app access at{' '}
                <a href="https://myaccount.google.com/permissions"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                  target="_blank" rel="noopener noreferrer">
                  myaccount.google.com/permissions
                </a>
              </li>
            </ul>
            <p className="text-slate-600 leading-relaxed">
              Upon revocation, we will delete your Google OAuth tokens from our systems within 24 hours.
              Data previously exported to your Google Sheets will remain in your spreadsheet as it is
              under your control.
            </p>
          </section>

          {/* Section 13 - Meta Platform Data */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              13. Meta Platform Data (WhatsApp and Instagram)
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              LeadRelay integrates with Meta Platform APIs to provide WhatsApp Business and Instagram
              Direct messaging capabilities. Our handling of Meta Platform data complies with the{' '}
              <a href="https://developers.facebook.com/terms/"
                className="text-emerald-600 hover:text-emerald-700 underline"
                target="_blank" rel="noopener noreferrer">
                Meta Platform Terms
              </a>
              {' '}and{' '}
              <a href="https://developers.facebook.com/devpolicy/"
                className="text-emerald-600 hover:text-emerald-700 underline"
                target="_blank" rel="noopener noreferrer">
                Meta Developer Policies
              </a>.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>13.1 Data We Collect from Meta Platforms</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              When you connect WhatsApp Business or Instagram to LeadRelay, we may collect:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Customer messages sent to your WhatsApp Business number or Instagram Professional Account</li>
              <li>Customer profile information (name, profile picture URL) as provided by the platform</li>
              <li>Message metadata (timestamps, message IDs, delivery and read receipts)</li>
              <li>WhatsApp phone numbers of customers who initiate conversations with your business</li>
              <li>Instagram usernames and account IDs of customers who message your business</li>
              <li>Media files (images, documents) shared by customers during conversations</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>13.2 How We Use Meta Platform Data</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Process customer messages through our AI system to generate contextual responses</li>
              <li>Store conversation history for your review and lead management</li>
              <li>Qualify leads and extract relevant business information from conversations</li>
              <li>Synchronize lead data with your connected CRM (Bitrix24) and spreadsheets (Google Sheets)</li>
              <li>Generate analytics and performance reports for your AI agents</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>13.3 Meta Data Restrictions</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              In compliance with Meta's policies, we commit to the following:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>We do not sell, license, or purchase data obtained from Meta Platform APIs</li>
              <li>We do not use Meta Platform data for advertising targeting, profiling, or behavioral analysis
                unrelated to the Service</li>
              <li>We do not transfer Meta Platform data to any data broker, advertising network,
                ad exchange, or data reseller</li>
              <li>We do not use Meta Platform data to discriminate against any individual or group</li>
              <li>We do not combine Meta Platform data with data from other sources for purposes
                beyond providing the Service</li>
              <li>We retain Meta Platform data only for as long as necessary to provide the Service
                and in compliance with our data retention policies (see Section 5)</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>13.4 Data Deletion and Account Disconnection</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              You may disconnect your WhatsApp Business or Instagram account from LeadRelay at any
              time through your account settings. Upon disconnection:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>We will stop receiving new messages from the disconnected platform</li>
              <li>Your API tokens for the disconnected platform will be deleted within 24 hours</li>
              <li>Previously collected conversation data will be retained according to our standard
                retention policy (Section 5) unless you request deletion</li>
              <li>You may request complete deletion of all platform-specific data by contacting
                privacy@leadrelay.net</li>
            </ul>

            <p className="text-slate-600 leading-relaxed">
              <strong>13.5 Meta Data Deletion Callbacks</strong>
            </p>
            <p className="text-slate-600 leading-relaxed">
              LeadRelay implements Meta's required data deletion callback URL. When a user removes
              our app from their Facebook/Instagram settings, we receive a callback and will delete
              all data associated with that user within 30 days. You can verify the status of a
              data deletion request by contacting privacy@leadrelay.net with your confirmation code.
            </p>
          </section>

          {/* Section 14 - Changes to This Privacy Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              14. Changes to This Privacy Policy
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any
              changes by:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Posting the new Privacy Policy on this page</li>
              <li>Updating the "Last updated" date at the top of this policy</li>
              <li>Sending an email notification for material changes</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mb-4">
              Material changes will take effect 30 days after notice is provided. Your continued
              use of the Service after changes become effective constitutes your acceptance of
              the revised Privacy Policy.
            </p>
            <p className="text-slate-600 leading-relaxed">
              We encourage you to review this Privacy Policy periodically to stay informed about
              how we are protecting your information.
            </p>
          </section>

          {/* Section 15 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              15. Contact Information
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or
              our data practices, please contact us:
            </p>
            <div className="text-slate-600 leading-relaxed space-y-2 mb-4">
              <p>
                <strong>Privacy Inquiries:</strong>{' '}
                <a
                  href="mailto:privacy@leadrelay.net"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                >
                  privacy@leadrelay.net
                </a>
              </p>
              <p>
                <strong>General Support:</strong>{' '}
                <a
                  href="mailto:support@leadrelay.net"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                >
                  support@leadrelay.net
                </a>
              </p>
              <p>
                <strong>Legal Department:</strong>{' '}
                <a
                  href="mailto:legal@leadrelay.net"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                >
                  legal@leadrelay.net
                </a>
              </p>
              <p>
                <strong>Data Protection Officer:</strong>{' '}
                <a
                  href="mailto:dpo@leadrelay.net"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                >
                  dpo@leadrelay.net
                </a>
              </p>
            </div>
            <p className="text-slate-600 leading-relaxed">
              We aim to respond to all privacy-related inquiries within 30 days.
            </p>
          </section>

          {/* Section 16 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              16. Jurisdiction-Specific Disclosures
            </h2>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>16.1 California Residents (CCPA/CPRA)</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              If you are a California resident, you have additional rights under the California
              Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA), including:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Right to know what personal information we collect, use, and disclose</li>
              <li>Right to delete your personal information</li>
              <li>Right to opt-out of the sale or sharing of personal information</li>
              <li>Right to non-discrimination for exercising your rights</li>
              <li>Right to correct inaccurate personal information</li>
              <li>Right to limit use of sensitive personal information</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mb-4">
              We do not sell your personal information as defined by the CCPA/CPRA.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>16.2 European Economic Area, UK, and Switzerland (GDPR)</strong>
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              If you are in the EEA, UK, or Switzerland, you have additional rights under the
              General Data Protection Regulation (GDPR) and equivalent local laws. Our legal
              bases for processing your data include:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li><strong>Contract:</strong> Processing necessary to perform our contract with you</li>
              <li><strong>Legitimate Interests:</strong> Processing for our legitimate business interests</li>
              <li><strong>Consent:</strong> Where you have given explicit consent</li>
              <li><strong>Legal Obligation:</strong> Processing required by law</li>
            </ul>
            <p className="text-slate-600 leading-relaxed">
              You have the right to lodge a complaint with your local data protection authority
              if you believe we have violated your privacy rights.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">
              &copy; {new Date().getFullYear()} LeadRelay. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/terms" className="text-sm text-slate-400 hover:text-emerald-600 transition-colors">
                Terms of Service
              </Link>
              <a href="mailto:support@leadrelay.net" className="text-sm text-slate-400 hover:text-emerald-600 transition-colors">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
