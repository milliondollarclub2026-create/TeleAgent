import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  HelpCircle,
  ShieldCheck,
  Settings,
  Building2,
  MessageSquare,
  Zap
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';
import { toast } from 'sonner';
import AiOrb from '../components/Orb/AiOrb';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Jasur's orb colors (emerald/teal - sales = growth)
const JASUR_COLORS = ['#10b981', '#059669', '#14b8a6'];

// Prebuilt agent info
const PREBUILT_INFO = {
  sales: {
    name: 'Jasur',
    role: 'the Sales Team Lead',
    colors: ['#10b981', '#059669', '#14b8a6']
  }
};

const STEPS = [
  { id: 1, title: 'Business', icon: Building2 },
  { id: 2, title: 'Channels', icon: MessageSquare },
  { id: 3, title: 'Deployed', icon: Zap },
];

// Telegram icon component
const TelegramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1.01.54-1.45.53-.48-.01-1.39-.27-2.07-.49-.84-.27-1.51-.42-1.45-.89.03-.25.38-.51 1.07-.78 4.18-1.82 6.97-3.02 8.38-3.61 3.99-1.66 4.83-1.95 5.37-1.96.12 0 .38.03.55.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
  </svg>
);

// Instagram icon component
const InstagramIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const AgentOnboarding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [agentId, setAgentId] = useState(null);

  // Get prebuilt type from navigation state (e.g., 'sales' for Jasur)
  const prebuiltType = location.state?.prebuiltType || null;
  const prebuiltInfo = prebuiltType ? PREBUILT_INFO[prebuiltType] : null;

  // Step 1: Business Info
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    description: '',
    products_services: ''
  });

  // Step 2: Channels
  const [botToken, setBotToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [botUsername, setBotUsername] = useState('');
  const [checkingConnection, setCheckingConnection] = useState(false);
  // Instagram
  const [igConnected, setIgConnected] = useState(false);
  const [igUsername, setIgUsername] = useState('');
  const [igConnecting, setIgConnecting] = useState(false);

  // Check for existing connections when component mounts
  useEffect(() => {
    const checkExistingConnection = async () => {
      setCheckingConnection(true);
      try {
        const response = await axios.get(`${API}/integrations/status`);
        if (response.data?.telegram?.connected) {
          setConnected(true);
          setBotUsername(response.data.telegram.bot_username?.replace('@', '') || '');
        }
        if (response.data?.instagram?.connected) {
          setIgConnected(true);
          setIgUsername(response.data.instagram.username || '');
        }
      } catch (error) {
        console.error('Failed to check existing connection:', error);
      } finally {
        setCheckingConnection(false);
      }
    };
    checkExistingConnection();
  }, []);

  // Create agent on step 1 completion
  const saveBusinessInfo = async () => {
    if (!businessInfo.name.trim()) {
      toast.error('Please enter a business name');
      return false;
    }
    if (!businessInfo.description.trim()) {
      toast.error('Please describe your business');
      return false;
    }

    setSaving(true);
    try {
      const configData = {
        business_name: businessInfo.name,
        business_description: businessInfo.description,
        products_services: businessInfo.products_services,
        agent_tone: 'friendly_professional',
        collect_phone: true,
        collect_name: true,
        primary_language: 'en',
        secondary_languages: ['es', 'fr'],
      };

      // If this is a prebuilt agent (e.g., Jasur), store the type
      if (prebuiltType) {
        configData.prebuilt_type = prebuiltType;
      }

      const response = await axios.put(`${API}/config`, configData);

      // Store tenant ID for navigation
      if (response.data?.tenant_id) {
        setAgentId(response.data.tenant_id);
      }

      return true;
    } catch (error) {
      console.error('Failed to save business info:', error);
      toast.error('Failed to save');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const connectTelegram = async () => {
    if (!botToken.trim()) {
      toast.error('Please enter a bot token');
      return;
    }

    setConnecting(true);
    try {
      const response = await axios.post(`${API}/telegram/bot`, {
        bot_token: botToken
      });
      setConnected(true);
      setBotUsername(response.data.bot_username);
      toast.success('Bot connected!');

      // Auto-advance to deployed step after short delay
      setTimeout(() => {
        setCurrentStep(3);
      }, 800);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect bot');
    } finally {
      setConnecting(false);
    }
  };

  const connectInstagram = async () => {
    setIgConnecting(true);
    try {
      const response = await axios.get(`${API}/instagram/oauth/start`);
      const { oauth_url } = response.data;
      if (oauth_url) {
        window.location.href = oauth_url;
      } else {
        toast.error('Failed to start Instagram connection');
        setIgConnecting(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Instagram connection not configured yet');
      setIgConnecting(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const success = await saveBusinessInfo();
      if (!success) return;
    }

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      // On step 1, go back to dashboard
      navigate('/app/agents');
    } else {
      // Otherwise go to previous step
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipChannels = () => {
    setCurrentStep(3);
  };

  const goToAgentSettings = () => {
    // Navigate to the agent's settings/dashboard view
    // This is the detailed agent view with knowledge base, connections, etc.
    if (agentId) {
      navigate(`/app/agents/${agentId}/settings`);
    } else {
      // Fallback: go to agents list where they can click into the agent
      navigate('/app/agents');
    }
  };

  const goToDashboard = () => {
    navigate('/app/agents');
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="min-h-[80vh] flex flex-col" data-testid="agent-onboarding">
        {/* Header */}
        <div className="max-w-xl mx-auto w-full mb-8">
          {/* Back and Title */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handleBack}
              className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition-colors"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" strokeWidth={2} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
                Create AI Employee
              </h1>
              <p className="text-[13px] text-slate-500">Step {currentStep} of {STEPS.length}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            {STEPS.map((step) => {
              const isActive = step.id === currentStep;
              const isComplete = step.id < currentStep;

              return (
                <div key={step.id} className="flex-1 flex flex-col gap-2">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      isComplete || isActive ? 'bg-slate-900' : 'bg-slate-200'
                    }`}
                  />
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] font-semibold ${
                      isActive ? 'text-slate-900' : isComplete ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {step.id}
                    </span>
                    <span className={`text-[11px] font-medium ${
                      isActive ? 'text-slate-900' : isComplete ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-start justify-center">
          <div className="max-w-xl w-full">

            {/* Step 1: Business Info */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-fade-in">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-1">
                    About Your Business
                  </h2>
                  <p className="text-sm text-slate-500">
                    Tell us about your business so your AI agent can represent you accurately
                  </p>
                </div>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-5 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="businessName" className="text-slate-700 text-sm font-medium">
                        Business Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="businessName"
                        placeholder="e.g., Acme Corp"
                        value={businessInfo.name}
                        onChange={(e) => setBusinessInfo(prev => ({ ...prev, name: e.target.value }))}
                        className="h-10 border-slate-200"
                        autoFocus
                        data-testid="business-name-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="businessDesc" className="text-slate-700 text-sm font-medium">
                        What does your business do? <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="businessDesc"
                        placeholder="Describe your business, target customers, and what makes you unique..."
                        value={businessInfo.description}
                        onChange={(e) => setBusinessInfo(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="border-slate-200 resize-none text-sm"
                        data-testid="business-desc-input"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="products" className="text-slate-700 text-sm font-medium">
                        Products or Services <span className="text-slate-400 font-normal">(optional)</span>
                      </Label>
                      <Textarea
                        id="products"
                        placeholder="List your main products/services with prices if applicable..."
                        value={businessInfo.products_services}
                        onChange={(e) => setBusinessInfo(prev => ({ ...prev, products_services: e.target.value }))}
                        rows={3}
                        className="border-slate-200 resize-none text-sm"
                        data-testid="products-input"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Channels Connection */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-fade-in">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-1">
                    Connect Channels
                  </h2>
                  <p className="text-sm text-slate-500">
                    Link messaging channels so your AI agent can receive and reply to messages
                  </p>
                </div>

                {checkingConnection ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 mx-auto text-slate-400 animate-spin mb-3" />
                    <p className="text-[13px] text-slate-500">Checking connections...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {/* Telegram Card */}
                    <Card className="bg-white border-slate-200 shadow-sm">
                      <CardContent className="p-5">
                        {connected ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shadow-sm">
                                <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-900 text-[14px]">Telegram Bot</h3>
                                <p className="text-[12px] text-emerald-600 font-medium">@{botUsername} connected</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-200 text-[12px] h-8"
                              onClick={() => navigate('/app/connections/telegram')}
                            >
                              Manage
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                  <TelegramIcon className="w-5 h-5 text-[#0088cc]" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-slate-900 text-[14px]">Telegram Bot</h3>
                                  <p className="text-[12px] text-slate-500">Receive messages from customers</p>
                                </div>
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors">
                                    <HelpCircle className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[280px] p-3 bg-slate-900 text-white">
                                  <p className="text-[12px] font-semibold mb-2 text-white">How to get your bot token:</p>
                                  <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside">
                                    <li>Open Telegram and search for @BotFather</li>
                                    <li>Send /newbot to create a new bot</li>
                                    <li>Follow the prompts to set a name</li>
                                    <li>Copy the token provided</li>
                                  </ol>
                                </TooltipContent>
                              </Tooltip>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <Label className="text-slate-600 text-[12px] font-medium">Bot Token</Label>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 cursor-help" strokeWidth={2} />
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="bg-slate-900 text-white text-xs px-2 py-1">
                                    Encrypted & secured
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                type="password"
                                placeholder="Paste your bot token from @BotFather"
                                value={botToken}
                                onChange={(e) => setBotToken(e.target.value)}
                                className="h-10 text-[13px] border-slate-200"
                                data-testid="bot-token-input"
                              />
                            </div>

                            <Button
                              className="w-full bg-slate-900 hover:bg-slate-800 h-10 text-[13px] font-medium"
                              onClick={connectTelegram}
                              disabled={connecting}
                              data-testid="connect-telegram-btn"
                            >
                              {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Connect Bot
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Instagram Card */}
                    <Card className="bg-white border-slate-200 shadow-sm">
                      <CardContent className="p-5">
                        {igConnected ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shadow-sm">
                                <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-900 text-[14px]">Instagram DM</h3>
                                <p className="text-[12px] text-emerald-600 font-medium">@{igUsername} connected</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-200 text-[12px] h-8"
                              onClick={() => navigate('/app/connections/instagram')}
                            >
                              Manage
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                <InstagramIcon className="w-5 h-5 text-slate-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-900 text-[14px]">Instagram DM</h3>
                                <p className="text-[12px] text-slate-500">Automate direct messages</p>
                              </div>
                            </div>
                            <Button
                              className="bg-slate-900 hover:bg-slate-800 h-9 px-4 text-[12px] font-medium"
                              onClick={connectInstagram}
                              disabled={igConnecting}
                            >
                              {igConnecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Connect
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Skip Option */}
                {!checkingConnection && !connected && !igConnected && (
                  <p className="text-center text-[13px] text-slate-500">
                    Not ready yet?{' '}
                    <button
                      onClick={handleSkipChannels}
                      className="text-slate-900 font-medium hover:underline"
                    >
                      Skip for now
                    </button>
                  </p>
                )}
              </div>
            )}

            {/* Step 3: Deployed */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center py-8">
                  {/* Pulsing Orb - use prebuilt colors if available */}
                  <div className="relative w-24 h-24 mx-auto mb-6">
                    <AiOrb
                      size={96}
                      colors={prebuiltInfo?.colors || JASUR_COLORS}
                      state="thinking"
                      className="mx-auto"
                    />
                  </div>

                  <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                    {prebuiltInfo?.name || businessInfo.name || 'Your Agent'} is Ready!
                  </h2>
                  <p className="text-[15px] text-slate-500 max-w-sm mx-auto mb-8">
                    {(connected || igConnected)
                      ? `${prebuiltInfo?.name || 'Your AI sales agent'} is live and ready to handle messages.`
                      : `${prebuiltInfo?.name || 'Your agent'} is set up. Connect a channel in settings to start receiving messages.`
                    }
                  </p>

                  {/* Status Cards */}
                  <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                        <span className="text-[12px] font-medium text-slate-500">Business</span>
                      </div>
                      <p className="text-[14px] font-semibold text-slate-900 truncate">
                        {businessInfo.name || 'AI Agent'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <TelegramIcon className="w-4 h-4 text-slate-500" />
                        <span className="text-[12px] font-medium text-slate-500">Telegram</span>
                      </div>
                      <p className={`text-[14px] font-semibold ${connected ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {connected ? 'Connected' : 'Skipped'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <InstagramIcon className="w-4 h-4 text-slate-500" />
                        <span className="text-[12px] font-medium text-slate-500">Instagram</span>
                      </div>
                      <p className={`text-[14px] font-semibold ${igConnected ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {igConnected ? 'Connected' : 'Skipped'}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3">
                    <Button
                      className="w-full bg-slate-900 hover:bg-slate-800 h-11 text-[14px] font-medium"
                      onClick={goToAgentSettings}
                      data-testid="open-settings-btn"
                    >
                      <Settings className="w-4 h-4 mr-2" strokeWidth={2} />
                      Configure Agent Settings
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-slate-200 h-11 text-[14px] font-medium"
                      onClick={goToDashboard}
                      data-testid="finish-btn"
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons (only for steps 1-2) */}
            {currentStep < 3 && (
              <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="h-10 px-5 border-slate-200"
                  data-testid="back-step-btn"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={2} />
                  Back
                </Button>

                {currentStep === 1 ? (
                  <Button
                    className="bg-slate-900 hover:bg-slate-800 h-10 px-5"
                    onClick={handleNext}
                    disabled={saving || !businessInfo.name.trim() || !businessInfo.description.trim()}
                    data-testid="next-step-btn"
                  >
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" strokeWidth={2} />
                  </Button>
                ) : (
                  <Button
                    className="bg-slate-900 hover:bg-slate-800 h-10 px-5"
                    onClick={handleSkipChannels}
                    data-testid="skip-channels-btn"
                  >
                    {(connected || igConnected) ? 'Continue' : 'Skip & Finish'}
                    <ArrowRight className="w-4 h-4 ml-2" strokeWidth={2} />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AgentOnboarding;
