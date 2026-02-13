// === TERMS PAGE ===
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
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

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-2">
          Terms of Service
        </h1>
        <p className="text-slate-500 mb-8">Last updated: February 13, 2026</p>

        <div className="prose prose-slate max-w-none">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              1. Acceptance of Terms
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              These Terms of Service ("Terms") constitute a legally binding agreement between you
              ("User," "you," or "your") and LeadRelay ("Company," "we," "us," or "our") governing
              your access to and use of the LeadRelay platform, including our website, applications,
              APIs, and all related services (collectively, the "Service").
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              By creating an account, accessing, or using any part of the Service, you acknowledge
              that you have read, understood, and agree to be bound by these Terms. If you are
              entering into these Terms on behalf of a company or other legal entity, you represent
              that you have the authority to bind such entity to these Terms, in which case "you"
              shall refer to such entity.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>IF YOU DO NOT AGREE TO THESE TERMS, YOU MAY NOT ACCESS OR USE THE SERVICE.</strong>
            </p>
            <p className="text-slate-600 leading-relaxed">
              These Terms are effective as of the date you first access or use the Service and
              will remain in effect until terminated in accordance with Section 12.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              2. Service Description
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              LeadRelay is an AI-powered sales agent platform designed to automate and enhance
              customer communications for businesses. The Service includes, but is not limited to:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li><strong>AI Sales Agents:</strong> Creation and management of artificial intelligence-powered
                chatbots that conduct sales conversations on your behalf</li>
              <li><strong>Telegram Integration:</strong> Connection to Telegram Bot API for automated
                customer messaging and communication</li>
              <li><strong>Bitrix24 CRM Integration:</strong> Synchronization with Bitrix24 for lead capture,
                contact management, deal tracking, and product catalog synchronization</li>
              <li><strong>Knowledge Base Management:</strong> Document upload and processing for AI training,
                including product information, FAQs, and business policies</li>
              <li><strong>Conversation Analytics:</strong> Tracking, reporting, and analysis of customer
                interactions and AI performance metrics</li>
              <li><strong>Multi-Language Support:</strong> AI conversations in Uzbek, Russian, and English languages</li>
              <li><strong>Lead Qualification:</strong> Automated assessment and scoring of potential customers</li>
              <li><strong>Google Sheets Export:</strong> Automatic export of lead and customer data to
                Google Sheets spreadsheets you designate</li>
              <li><strong>Multi-Channel Messaging:</strong> Support for customer communications across
                Telegram, WhatsApp Business, and Instagram Direct (channel availability varies by plan)</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mb-4">
              The Service utilizes third-party artificial intelligence services, including OpenAI's
              GPT-4 technology, to generate conversational responses. While we strive for accuracy,
              AI-generated content may occasionally contain errors or inaccuracies. You acknowledge
              that AI responses are generated algorithmically and should be reviewed for accuracy
              in critical business contexts.
            </p>
            <p className="text-slate-600 leading-relaxed">
              We reserve the right to modify, suspend, or discontinue any aspect of the Service
              at any time, with or without notice. We will make reasonable efforts to notify you
              of material changes that may affect your use of the Service.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              3. User Account Responsibilities
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>3.1 Account Registration.</strong> To access the Service, you must create an account
              by providing accurate, current, and complete information. You agree to update your
              account information promptly to keep it accurate and complete.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>3.2 Account Security.</strong> You are solely responsible for:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Maintaining the confidentiality of your account credentials, including passwords,
                API keys, and integration tokens</li>
              <li>All activities that occur under your account, whether authorized by you or not</li>
              <li>Immediately notifying us at security@leadrelay.net of any unauthorized access
                to or use of your account</li>
              <li>Ensuring that all persons who access the Service through your account comply
                with these Terms</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>3.3 Age Requirement.</strong> You must be at least 18 years old to create an account
              and use the Service. By creating an account, you represent and warrant that you meet
              this age requirement.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>3.4 Business Use.</strong> The Service is intended for business use only. You represent
              that you are using the Service in connection with a legitimate business purpose and
              not for personal, family, or household purposes.
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>3.5 Account Sharing.</strong> Account credentials may not be shared with individuals
              outside your organization. Each user requiring access to the Service must have their
              own account or be authorized under your organization's account structure.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              4. Payment Terms and Billing
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>4.1 Subscription Plans.</strong> LeadRelay offers the following subscription plans:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li><strong>Starter Plan:</strong> $50 per month - includes 250 AI messages per month and up to 2 sales agents</li>
              <li><strong>Professional Plan:</strong> $100 per month - includes 600 AI messages per month and unlimited sales agents</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>4.2 Billing Cycle.</strong> Subscriptions are billed monthly in advance on the anniversary
              of your subscription start date. All fees are non-refundable except as expressly stated
              in these Terms or required by applicable law.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>4.3 Payment Methods.</strong> You must provide a valid payment method to subscribe
              to the Service. By providing a payment method, you authorize us to charge all fees
              incurred to that payment method. You are responsible for keeping your payment information
              current.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>4.4 Message Overage.</strong> If you exceed your plan's monthly message allocation,
              additional messages will be charged at $0.25 per message. We will notify you when you
              reach 80% and 100% of your allocation.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>4.5 Taxes.</strong> All fees are exclusive of taxes, levies, or duties imposed by
              taxing authorities. You are responsible for all taxes associated with your use of
              the Service, excluding taxes based on our net income.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>4.6 Price Changes.</strong> We may change our prices at any time. Price changes will
              be communicated at least 30 days in advance and will take effect at the start of your
              next billing cycle following the notice.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>4.7 Failed Payments.</strong> If payment fails, we will attempt to charge your payment
              method up to three times over 10 days. If payment remains unsuccessful, your access
              to the Service may be suspended until payment is received.
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>4.8 Refunds.</strong> No refunds will be issued for partial months of service, downgrade
              refunds, or unused message allocations. Refund requests for extenuating circumstances
              may be submitted to billing@leadrelay.net and will be reviewed on a case-by-case basis.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              5. Acceptable Use Policy
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              You agree to use the Service only for lawful purposes and in accordance with these Terms.
              You agree NOT to use the Service to:
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>5.1 Prohibited Communications:</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Send spam, unsolicited messages, or bulk commercial communications without recipients' consent</li>
              <li>Engage in any form of harassment, bullying, threats, or intimidation</li>
              <li>Transmit content that is defamatory, obscene, pornographic, or promotes violence</li>
              <li>Impersonate any person or entity, or falsely claim affiliation with any person or entity</li>
              <li>Phish for personal information or engage in social engineering attacks</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>5.2 Prohibited Activities:</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Violate any applicable local, state, national, or international law or regulation</li>
              <li>Infringe upon the intellectual property rights of any third party</li>
              <li>Collect, harvest, or store personal data about other users without their consent</li>
              <li>Use the Service for any illegal, fraudulent, or deceptive purposes</li>
              <li>Promote or facilitate illegal activities, including but not limited to drug trafficking,
                money laundering, or terrorism</li>
              <li>Distribute malware, viruses, or any other harmful code</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>5.3 Technical Restrictions:</strong>
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Attempt to gain unauthorized access to any portion of the Service, other accounts,
                computer systems, or networks</li>
              <li>Interfere with or disrupt the integrity, security, or performance of the Service</li>
              <li>Circumvent, disable, or otherwise interfere with security-related features</li>
              <li>Reverse engineer, decompile, disassemble, or attempt to derive the source code of the Service</li>
              <li>Use automated scripts, bots, or other means to access the Service in a manner that
                exceeds reasonable use or circumvents rate limits</li>
              <li>Resell, sublicense, or provide access to the Service to third parties without authorization</li>
            </ul>
            <p className="text-slate-600 leading-relaxed">
              <strong>5.4 Enforcement.</strong> Violation of this Acceptable Use Policy may result in immediate
              suspension or termination of your account, at our sole discretion. We reserve the right
              to report illegal activities to appropriate law enforcement authorities.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              6. Intellectual Property Rights
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>6.1 LeadRelay Property.</strong> The Service, including all content, features, and
              functionality (including but not limited to software, code, designs, text, graphics,
              logos, icons, images, audio clips, and data compilations), is owned by LeadRelay or
              its licensors and is protected by United States and international copyright, trademark,
              patent, trade secret, and other intellectual property or proprietary rights laws.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>6.2 License Grant to You.</strong> Subject to your compliance with these Terms, we
              grant you a limited, non-exclusive, non-transferable, non-sublicensable license to
              access and use the Service solely for your internal business purposes during the
              subscription term.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>6.3 Your Content.</strong> You retain all ownership rights to content you upload,
              submit, or transmit through the Service ("Your Content"), including knowledge base
              documents, product information, conversation data, and business materials. By uploading
              Your Content, you grant us a worldwide, royalty-free, non-exclusive license to use,
              reproduce, modify, process, and display Your Content solely to the extent necessary
              to provide and improve the Service.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>6.4 Feedback.</strong> If you provide any feedback, suggestions, or ideas about the
              Service ("Feedback"), you grant us an irrevocable, perpetual, royalty-free license
              to use such Feedback for any purpose without compensation or attribution to you.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>6.5 Restrictions.</strong> You may not:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2">
              <li>Copy, modify, or create derivative works of the Service or any part thereof</li>
              <li>Rent, lease, lend, sell, sublicense, or transfer the Service</li>
              <li>Remove, alter, or obscure any proprietary notices on the Service</li>
              <li>Use our trademarks, logos, or brand elements without prior written consent</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              7. API Usage and Rate Limits
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>7.1 Message Quotas.</strong> Your subscription plan includes a monthly allocation of
              AI-processed messages. A "message" is defined as a single conversational exchange
              processed by our AI system, including both incoming customer messages and AI-generated
              responses.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>7.2 Rate Limits.</strong> To ensure service quality for all users, the following rate
              limits apply:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Maximum 100 concurrent conversations per agent</li>
              <li>Maximum 10 API requests per second per account</li>
              <li>Maximum file upload size of 10MB per document</li>
              <li>Maximum 100 documents per knowledge base</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>7.3 Fair Use.</strong> We reserve the right to throttle or suspend accounts that
              engage in usage patterns that negatively impact service performance for other users
              or that we determine, in our sole discretion, to be abusive or excessive.
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>7.4 Quota Reset.</strong> Message quotas reset at the beginning of each billing cycle.
              Unused messages do not roll over to subsequent months.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              8. Data Processing and AI Usage
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>8.1 AI Processing.</strong> The Service uses artificial intelligence, including
              OpenAI's GPT-4 technology, to generate conversational responses. By using the Service,
              you acknowledge and consent to your data being processed by AI systems.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>8.2 Data Transmission.</strong> Conversation data, knowledge base content, and related
              information may be transmitted to and processed by third-party AI providers to generate
              responses. While we implement appropriate safeguards, you acknowledge that this data
              transmission is necessary for the Service to function.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>8.3 AI Limitations.</strong> You acknowledge that:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>AI-generated responses may contain errors, inaccuracies, or inappropriate content</li>
              <li>AI responses should not be relied upon for medical, legal, financial, or other
                professional advice</li>
              <li>You are responsible for reviewing and approving AI configurations and training data</li>
              <li>We do not guarantee any specific outcomes from AI-generated conversations</li>
            </ul>
            <p className="text-slate-600 leading-relaxed">
              <strong>8.4 Model Training.</strong> We may use aggregated, anonymized data to improve our
              AI models and Service. Your specific business data and customer conversations will
              not be used to train AI models without your explicit consent.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              9. Third-Party Integrations
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>9.1 Integration Services.</strong> The Service integrates with third-party platforms
              including:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li><strong>Telegram:</strong> For bot creation and messaging functionality, subject to
                Telegram's Terms of Service and Bot API Terms</li>
              <li><strong>Bitrix24:</strong> For CRM integration, lead management, and deal synchronization,
                subject to Bitrix24's Terms of Service</li>
              <li><strong>Google (Google Sheets API):</strong> For exporting lead data to Google Sheets
                spreadsheets you designate. Subject to Google's Terms of Service and the Google API
                Services User Data Policy, including the Limited Use requirements</li>
              <li><strong>Meta Platforms (WhatsApp Business API):</strong> For automated customer
                messaging via WhatsApp Business. Subject to the WhatsApp Business Terms of Service,
                Meta Platform Terms, and Meta's Data Policy</li>
              <li><strong>Meta Platforms (Instagram Messaging API):</strong> For automated customer
                messaging via Instagram Direct. Subject to the Instagram Platform Policy, Meta Platform
                Terms, and Meta's Data Policy</li>
              <li><strong>OpenAI:</strong> For AI processing and natural language generation, subject to
                OpenAI's Usage Policies and Terms of Use</li>
              <li><strong>Supabase:</strong> For data storage and authentication services</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>9.2 Third-Party Terms.</strong> Your use of third-party integrations is subject to
              the terms and conditions of those third-party services. You are responsible for
              reviewing and complying with all applicable third-party terms.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>9.3 Integration Credentials.</strong> You are solely responsible for any API keys,
              tokens, or credentials you provide for third-party integrations. We are not responsible
              for any issues arising from incorrect, invalid, or compromised third-party credentials.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>9.4 No Endorsement.</strong> Our integration with third-party services does not
              constitute an endorsement of those services. We are not responsible for the availability,
              accuracy, or quality of third-party services.
            </p>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>9.5 Google API Services Compliance.</strong> LeadRelay's use and transfer of
              information received from Google APIs adheres to the{' '}
              <a href="https://developers.google.com/terms/api-services-user-data-policy"
                className="text-emerald-600 hover:text-emerald-700 underline"
                target="_blank" rel="noopener noreferrer">
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. Specifically:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>We only access Google user data that is necessary to provide and improve the
                features you have explicitly enabled (such as Google Sheets lead export)</li>
              <li>We do not use Google user data for serving advertisements</li>
              <li>We do not allow humans to read your Google user data unless: (a) we have your
                affirmative consent, (b) it is necessary for security purposes, (c) it is necessary
                to comply with applicable law, or (d) our use is limited to internal operations
                and the data has been aggregated and anonymized</li>
              <li>We do not transfer Google user data to third parties except as necessary to
                provide or improve the Service, to comply with applicable law, or as part of a
                merger or acquisition with adequate data protection</li>
              <li>You may revoke our access to your Google data at any time through your Google
                account security settings or by disconnecting the integration in your LeadRelay
                account settings</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>9.6 Google Sheets Integration.</strong> When you connect your Google Sheets
              account, LeadRelay will:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Request access only to the specific spreadsheet(s) you designate for lead data export</li>
              <li>Write lead and customer data (names, contact information, conversation summaries,
                lead scores) to your designated spreadsheet(s)</li>
              <li>Read spreadsheet structure (headers, sheet names) solely to ensure correct data mapping</li>
              <li>Not access, read, or modify any other files in your Google Drive or Google account</li>
              <li>Store your Google OAuth refresh token securely with AES-256 encryption, used only
                to maintain the Sheets connection</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>9.7 Meta Platform Compliance.</strong> LeadRelay's use of Meta Platform APIs
              (including WhatsApp Business API and Instagram Messaging API) complies with the{' '}
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
              </a>
              . Specifically:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>We only collect and process data that users have consented to share through
                their interactions with your business on WhatsApp or Instagram</li>
              <li>We do not sell, license, or purchase any data obtained from Meta Platform APIs</li>
              <li>We do not use Meta Platform data to build or augment user profiles for advertising
                or to contact users outside the context of their initiated conversations</li>
              <li>We do not transfer Meta Platform data to any data broker, advertising network,
                or data reseller</li>
              <li>All data received from Meta Platform APIs is stored securely with encryption
                at rest and in transit</li>
              <li>We comply with all applicable message template approval processes and messaging
                window requirements set by Meta</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>9.8 WhatsApp Business Compliance.</strong> When using the WhatsApp Business
              integration, you agree to:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Comply with the{' '}
                <a href="https://www.whatsapp.com/legal/business-policy/"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                  target="_blank" rel="noopener noreferrer">
                  WhatsApp Business Policy
                </a>
                {' '}and{' '}
                <a href="https://www.whatsapp.com/legal/commerce-policy/"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                  target="_blank" rel="noopener noreferrer">
                  WhatsApp Commerce Policy
                </a>
              </li>
              <li>Only send messages to users who have opted in to receive communications from your business</li>
              <li>Respond to customer-initiated messages within the 24-hour messaging window defined by WhatsApp</li>
              <li>Use only approved message templates for business-initiated conversations</li>
              <li>Not use the integration for spam, bulk messaging, or unsolicited communications</li>
              <li>Maintain a valid WhatsApp Business Account and comply with WhatsApp's verification requirements</li>
            </ul>

            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>9.9 Instagram Messaging Compliance.</strong> When using the Instagram Direct
              messaging integration, you agree to:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2">
              <li>Comply with the{' '}
                <a href="https://developers.facebook.com/docs/instagram-api/overview"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                  target="_blank" rel="noopener noreferrer">
                  Instagram Platform Policy
                </a>
                {' '}and Meta's Community Guidelines</li>
              <li>Only respond to user-initiated conversations through Instagram Direct</li>
              <li>Not use automated messaging for spam, unsolicited promotions, or abusive content</li>
              <li>Comply with all applicable message frequency and content restrictions</li>
              <li>Maintain a valid Instagram Professional Account connected to a Facebook Business Page</li>
              <li>Respect the 24-hour standard messaging window for automated responses</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              10. Limitation of Liability
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>10.1 Disclaimer of Warranties.</strong> THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE"
              WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
              IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND
              NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
              SECURE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>10.2 Limitation of Damages.</strong> TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW,
              IN NO EVENT SHALL LEADRELAY, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS,
              SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
              PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS,
              GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, REGARDLESS OF WHETHER WE HAVE BEEN
              ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>10.3 Cap on Liability.</strong> OUR TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING
              TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF: (A) THE AMOUNTS YOU HAVE
              PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM; OR (B) ONE HUNDRED DOLLARS ($100).
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>10.4 Basis of the Bargain.</strong> THE LIMITATIONS OF LIABILITY SET FORTH IN THIS
              SECTION ARE FUNDAMENTAL ELEMENTS OF THE BASIS OF THE BARGAIN BETWEEN YOU AND LEADRELAY
              AND SHALL APPLY EVEN IF ANY REMEDY FAILS OF ITS ESSENTIAL PURPOSE.
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>10.5 Exceptions.</strong> Some jurisdictions do not allow the exclusion of certain
              warranties or limitation of liability for certain types of damages. In such jurisdictions,
              our liability shall be limited to the maximum extent permitted by law.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              11. Indemnification
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>11.1 Your Indemnification Obligations.</strong> You agree to indemnify, defend, and
              hold harmless LeadRelay and its affiliates, officers, directors, employees, agents,
              suppliers, and licensors from and against any and all claims, damages, losses, liabilities,
              costs, and expenses (including reasonable attorneys' fees) arising out of or relating to:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Your use or misuse of the Service</li>
              <li>Your Content or any content you transmit through the Service</li>
              <li>Your violation of these Terms or any applicable law or regulation</li>
              <li>Your infringement of any third-party rights, including intellectual property rights</li>
              <li>Any claims arising from your customers' or end users' interactions with your AI agents</li>
              <li>Your use of third-party integrations in connection with the Service</li>
            </ul>
            <p className="text-slate-600 leading-relaxed">
              <strong>11.2 Indemnification Procedure.</strong> We will promptly notify you of any claim
              subject to indemnification and provide reasonable cooperation in the defense of such claim.
              You may not settle any claim without our prior written consent if such settlement would
              require us to admit liability or take any action.
            </p>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              12. Termination
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>12.1 Termination by You.</strong> You may terminate your account at any time by
              canceling your subscription through your account settings or by contacting us at
              support@leadrelay.net. Termination will be effective at the end of your current
              billing period. No refunds will be provided for the remaining portion of your
              subscription term.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>12.2 Termination by Us.</strong> We may suspend or terminate your access to the
              Service immediately, without prior notice or liability, for any reason, including but
              not limited to:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Breach of these Terms, including the Acceptable Use Policy</li>
              <li>Non-payment of fees</li>
              <li>Requests by law enforcement or government agencies</li>
              <li>Discontinuation of the Service or any part thereof</li>
              <li>Unexpected technical or security issues</li>
              <li>Extended periods of inactivity</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>12.3 Effect of Termination.</strong> Upon termination:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Your right to access and use the Service will immediately cease</li>
              <li>All licenses granted to you under these Terms will terminate</li>
              <li>We may delete Your Content and account data after a 30-day grace period</li>
              <li>Any outstanding fees will become immediately due and payable</li>
            </ul>
            <p className="text-slate-600 leading-relaxed">
              <strong>12.4 Survival.</strong> Sections 5 (Acceptable Use), 6 (Intellectual Property),
              10 (Limitation of Liability), 11 (Indemnification), 13 (Dispute Resolution), and 14
              (Governing Law) shall survive termination of these Terms.
            </p>
          </section>

          {/* Section 13 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              13. Dispute Resolution
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>13.1 Informal Resolution.</strong> Before initiating any formal dispute resolution
              proceeding, you agree to first contact us at legal@leadrelay.net and attempt to resolve
              the dispute informally. We will attempt to resolve the dispute by contacting you via
              email. If a dispute is not resolved within 30 days of submission, either party may
              proceed to formal dispute resolution.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>13.2 Binding Arbitration.</strong> Any dispute arising out of or relating to these
              Terms or the Service that cannot be resolved informally shall be finally resolved by
              binding arbitration administered by the American Arbitration Association ("AAA") in
              accordance with its Commercial Arbitration Rules. The arbitration shall be conducted
              in English by a single arbitrator. The arbitrator's decision shall be final and binding
              and may be entered as a judgment in any court of competent jurisdiction.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>13.3 Class Action Waiver.</strong> YOU AND LEADRELAY AGREE THAT EACH MAY BRING CLAIMS
              AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR
              CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING. The arbitrator may
              not consolidate more than one person's claims and may not preside over any form of
              representative or class proceeding.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>13.4 Exceptions.</strong> Notwithstanding the foregoing, either party may seek
              injunctive or other equitable relief in any court of competent jurisdiction to protect
              its intellectual property rights or to prevent irreparable harm.
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>13.5 Opt-Out.</strong> You may opt out of this arbitration agreement by sending
              written notice to legal@leadrelay.net within 30 days of creating your account.
            </p>
          </section>

          {/* Section 14 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              14. Governing Law
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              These Terms shall be governed by and construed in accordance with the laws of the
              State of Delaware, United States, without regard to its conflict of law provisions.
              Any legal action or proceeding not subject to arbitration shall be brought exclusively
              in the state or federal courts located in Wilmington, Delaware, and you consent to
              the personal jurisdiction of such courts.
            </p>
            <p className="text-slate-600 leading-relaxed">
              If you are accessing the Service from outside the United States, you are responsible
              for compliance with all applicable local laws. You agree that the United Nations
              Convention on Contracts for the International Sale of Goods does not apply to these Terms.
            </p>
          </section>

          {/* Section 15 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              15. Changes to Terms
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>15.1 Modifications.</strong> We reserve the right to modify these Terms at any time.
              If we make material changes, we will provide notice by:
            </p>
            <ul className="list-disc list-inside text-slate-600 leading-relaxed space-y-2 mb-4">
              <li>Posting the updated Terms on our website with a new "Last Updated" date</li>
              <li>Sending an email to the address associated with your account</li>
              <li>Displaying a prominent notice within the Service</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>15.2 Effective Date.</strong> Material changes will take effect 30 days after notice
              is provided. Non-material changes will take effect immediately upon posting. Your
              continued use of the Service after changes become effective constitutes your acceptance
              of the revised Terms.
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>15.3 Objection.</strong> If you do not agree to the modified Terms, you must stop
              using the Service and cancel your account before the changes take effect. Your
              continued use of the Service after the effective date indicates your acceptance of
              the modified Terms.
            </p>
          </section>

          {/* Section 16 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              16. General Provisions
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>16.1 Entire Agreement.</strong> These Terms, together with our Privacy Policy and any
              other agreements expressly incorporated by reference, constitute the entire agreement
              between you and LeadRelay concerning the Service.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>16.2 Severability.</strong> If any provision of these Terms is found to be unenforceable
              or invalid, that provision shall be limited or eliminated to the minimum extent necessary,
              and the remaining provisions shall remain in full force and effect.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>16.3 Waiver.</strong> Our failure to enforce any right or provision of these Terms
              shall not be deemed a waiver of such right or provision.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>16.4 Assignment.</strong> You may not assign or transfer these Terms or your rights
              hereunder without our prior written consent. We may assign our rights and obligations
              under these Terms without restriction.
            </p>
            <p className="text-slate-600 leading-relaxed mb-4">
              <strong>16.5 Force Majeure.</strong> We shall not be liable for any failure or delay in
              performance due to circumstances beyond our reasonable control, including but not limited
              to acts of God, natural disasters, war, terrorism, riots, embargoes, acts of civil or
              military authorities, fire, floods, accidents, strikes, or shortages of transportation,
              facilities, fuel, energy, labor, or materials.
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>16.6 Notices.</strong> All notices to LeadRelay must be sent to legal@leadrelay.net.
              Notices to you will be sent to the email address associated with your account.
            </p>
          </section>

          {/* Section 17 */}
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4 font-['Plus_Jakarta_Sans']">
              17. Contact Information
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="text-slate-600 leading-relaxed space-y-2">
              <p>
                <strong>General Inquiries:</strong>{' '}
                <a
                  href="mailto:support@leadrelay.net"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                >
                  support@leadrelay.net
                </a>
              </p>
              <p>
                <strong>Billing Questions:</strong>{' '}
                <a
                  href="mailto:billing@leadrelay.net"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                >
                  billing@leadrelay.net
                </a>
              </p>
              <p>
                <strong>Legal Matters:</strong>{' '}
                <a
                  href="mailto:legal@leadrelay.net"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                >
                  legal@leadrelay.net
                </a>
              </p>
              <p>
                <strong>Security Issues:</strong>{' '}
                <a
                  href="mailto:security@leadrelay.net"
                  className="text-emerald-600 hover:text-emerald-700 underline"
                >
                  security@leadrelay.net
                </a>
              </p>
            </div>
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
              <Link to="/privacy" className="text-sm text-slate-400 hover:text-emerald-600 transition-colors">
                Privacy Policy
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
