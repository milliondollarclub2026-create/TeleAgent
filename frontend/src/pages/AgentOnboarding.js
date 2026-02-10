import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Progress } from '../components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Building2,
  FileText,
  Settings,
  MessageSquare,
  Plug,
  Upload,
  Trash2,
  Loader2,
  Check,
  Bot,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Link2,
  Eye,
  EyeOff,
  HelpCircle,
  MessageCircle,
  Globe,
  Smile,
  Clock,
  Shield,
  User,
  CreditCard,
  ShieldCheck
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STEPS = [
  { id: 1, title: 'Business', icon: Building2 },
  { id: 2, title: 'Knowledge', icon: FileText },
  { id: 3, title: 'Settings', icon: Settings },
  { id: 4, title: 'Test', icon: MessageSquare },
  { id: 5, title: 'Connect', icon: Plug },
];

const AgentOnboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [agentId, setAgentId] = useState(null);
  
  // Step 1: Business Info
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    description: '',
    products_services: ''
  });
  
  // Step 2: Documents
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const chatMessagesRef = useRef(null);

  // Step 3: Settings
  const [settings, setSettings] = useState({
    tone: 'friendly_professional',
    primary_language: 'uz',
    secondary_languages: ['ru', 'en'],
    emoji_usage: 'moderate',
    response_length: 'balanced',
    greeting_message: '',
    closing_message: '',
    min_response_delay: 2,
    max_messages_per_minute: 10,
    collect_name: true,
    collect_phone: true,
    collect_product: true,
    collect_budget: false,
    collect_location: false
  });
  
  // Step 4: Test Chat
  const [testMessages, setTestMessages] = useState([]);
  const [testInput, setTestInput] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(true);
  const [debugInfo, setDebugInfo] = useState(null);
  
  // Step 5: Connect - Telegram
  const [botToken, setBotToken] = useState('');
  const [showBotToken, setShowBotToken] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [botUsername, setBotUsername] = useState('');

  // Step 5: Connect - Bitrix24
  const [bitrixWebhookUrl, setBitrixWebhookUrl] = useState('');
  const [showBitrixUrl, setShowBitrixUrl] = useState(false);
  const [connectingBitrix, setConnectingBitrix] = useState(false);
  const [bitrixConnected, setBitrixConnected] = useState(false);

  // Step 5: Connect - Payme
  const [paymeMerchantId, setPaymeMerchantId] = useState('');
  const [paymeSecretKey, setPaymeSecretKey] = useState('');
  const [showPaymeSecret, setShowPaymeSecret] = useState(false);
  const [connectingPayme, setConnectingPayme] = useState(false);
  const [paymeConnected, setPaymeConnected] = useState(false);

  // Step 5: Connect - Click
  const [clickServiceId, setClickServiceId] = useState('');
  const [clickSecretKey, setClickSecretKey] = useState('');
  const [showClickSecret, setShowClickSecret] = useState(false);
  const [connectingClick, setConnectingClick] = useState(false);
  const [clickConnected, setClickConnected] = useState(false);

  const progress = (currentStep / STEPS.length) * 100;

  // Auto-scroll chat messages
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [testMessages, testLoading]);

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 10MB.`);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post(`${API}/documents/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        setDocuments(prev => [...prev, {
          id: response.data.id,
          title: response.data.title,
          file_type: response.data.file_type,
          file_size: response.data.file_size,
          chunk_count: response.data.chunk_count
        }]);
        
        toast.success(`${file.name} uploaded`);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteDocument = async (docId) => {
    try {
      await axios.delete(`${API}/documents/${docId}`);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      toast.success('Document deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const saveBusinessInfo = async () => {
    if (!businessInfo.name.trim() || !businessInfo.description.trim()) {
      toast.error('Please fill in required fields');
      return false;
    }

    setSaving(true);
    try {
      await axios.put(`${API}/config`, {
        business_name: businessInfo.name,
        business_description: businessInfo.description,
        products_services: businessInfo.products_services
      });
      return true;
    } catch (error) {
      toast.error('Failed to save');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/config`, {
        agent_tone: settings.tone,
        primary_language: settings.primary_language,
        secondary_languages: settings.secondary_languages,
        emoji_usage: settings.emoji_usage,
        response_length: settings.response_length,
        greeting_message: settings.greeting_message,
        closing_message: settings.closing_message,
        collect_phone: settings.collect_phone,
        min_response_delay: settings.min_response_delay,
        max_messages_per_minute: settings.max_messages_per_minute
      });
      return true;
    } catch (error) {
      toast.error('Failed to save settings');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const success = await saveBusinessInfo();
      if (!success) return;
    }
    if (currentStep === 3) {
      const success = await saveSettings();
      if (!success) return;
    }
    
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      
      // Initialize test chat on step 4
      if (currentStep === 3) {
        const defaultGreeting = `Hello! Welcome to ${businessInfo.name || 'our store'}. I'm here to help you find what you're looking for. How can I assist you today?`;
        setTestMessages([{
          role: 'assistant',
          text: settings.greeting_message || defaultGreeting
        }]);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const sendTestMessage = async () => {
    if (!testInput.trim()) return;

    const userMessage = testInput;
    setTestInput('');
    setTestMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setTestLoading(true);

    try {
      const response = await axios.post(`${API}/chat/test`, {
        message: userMessage,
        conversation_history: testMessages.map(m => ({
          role: m.role === 'assistant' ? 'agent' : 'user',
          text: m.text
        }))
      });

      setTestMessages(prev => [...prev, { 
        role: 'assistant', 
        text: response.data.reply 
      }]);
      
      setDebugInfo({
        stage: response.data.sales_stage,
        hotness: response.data.hotness,
        score: response.data.score,
        fields_collected: response.data.fields_collected,
        rag_used: response.data.rag_context_used
      });
    } catch (error) {
      toast.error('Failed to get response');
      setTestMessages(prev => [...prev, { 
        role: 'assistant', 
        text: 'Sorry, there was an error. Please try again.' 
      }]);
    } finally {
      setTestLoading(false);
    }
  };

  const resetTestChat = () => {
    const defaultGreeting = `Hello! Welcome to ${businessInfo.name || 'our store'}. I'm here to help you find what you're looking for. How can I assist you today?`;
    setTestMessages([{
      role: 'assistant',
      text: settings.greeting_message || defaultGreeting
    }]);
    setDebugInfo(null);
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
      toast.success('Bot connected successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect bot');
    } finally {
      setConnecting(false);
    }
  };

  const connectBitrix = async () => {
    if (!bitrixWebhookUrl.trim()) {
      toast.error('Please enter your Bitrix24 webhook URL');
      return;
    }

    setConnectingBitrix(true);
    try {
      const response = await axios.post(`${API}/bitrix-crm/connect`, {
        webhook_url: bitrixWebhookUrl
      });
      setBitrixConnected(true);
      toast.success(response.data.message || 'Bitrix24 connected successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect Bitrix24');
    } finally {
      setConnectingBitrix(false);
    }
  };

  const connectPayme = async () => {
    if (!paymeMerchantId.trim() || !paymeSecretKey.trim()) {
      toast.error('Please enter both Merchant ID and Secret Key');
      return;
    }

    setConnectingPayme(true);
    try {
      const response = await axios.post(`${API}/payme/connect`, {
        merchant_id: paymeMerchantId,
        secret_key: paymeSecretKey
      });
      setPaymeConnected(true);
      toast.success(response.data.message || 'Payme connected successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect Payme');
    } finally {
      setConnectingPayme(false);
    }
  };

  const connectClick = async () => {
    if (!clickServiceId.trim() || !clickSecretKey.trim()) {
      toast.error('Please enter both Service ID and Secret Key');
      return;
    }

    setConnectingClick(true);
    try {
      const response = await axios.post(`${API}/click/connect`, {
        service_id: clickServiceId,
        secret_key: clickSecretKey
      });
      setClickConnected(true);
      toast.success(response.data.message || 'Click connected successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect Click');
    } finally {
      setConnectingClick(false);
    }
  };

  const finishOnboarding = () => {
    toast.success('Agent created successfully!');
    navigate('/app/agents');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="pb-8" data-testid="agent-onboarding">
      {/* Progress Header */}
      <div className="max-w-4xl mx-auto mb-8">
        {/* Top Row - Back button and title */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/app/agents')}
            className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition-colors"
            data-testid="back-to-agents-btn"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" strokeWidth={2} />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
              Create New Agent
            </h1>
            <p className="text-[13px] text-slate-500">Step {currentStep} of {STEPS.length}</p>
          </div>
        </div>

        {/* Step Indicator - Horizontal bar style */}
        <div className="flex items-center gap-2">
          {STEPS.map((step, index) => {
            const isActive = step.id === currentStep;
            const isComplete = step.id < currentStep;

            return (
              <div key={step.id} className="flex-1 flex flex-col gap-2">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isComplete ? 'bg-emerald-500' : isActive ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-semibold ${
                    isActive ? 'text-emerald-600' : isComplete ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {step.id}
                  </span>
                  <span className={`text-[11px] font-medium hidden sm:block ${
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
      <div className={`max-w-4xl mx-auto`}>
        <div className={`mx-auto ${currentStep === 4 ? 'max-w-3xl' : 'max-w-xl'}`}>

        {/* Step 1: Business Info */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold font-['Plus_Jakarta_Sans'] text-slate-900 mb-1">
                About Your Business
              </h2>
              <p className="text-sm text-slate-500">
                Tell us about your business so your AI agent can represent you accurately
              </p>
            </div>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="businessName" className="text-slate-700 text-sm">
                    Business Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="businessName"
                    placeholder="e.g., TechStore Uzbekistan"
                    value={businessInfo.name}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, name: e.target.value }))}
                    className="h-10 border-slate-200 focus:border-emerald-500"
                    data-testid="business-name-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="businessDesc" className="text-slate-700 text-sm">
                    What does your business do? <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="businessDesc"
                    placeholder="Describe your business, target customers, and what makes you unique..."
                    value={businessInfo.description}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="border-slate-200 focus:border-emerald-500 resize-none text-sm"
                    data-testid="business-desc-input"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="products" className="text-slate-700 text-sm">
                    Products or Services <span className="text-slate-400 font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="products"
                    placeholder="List your main products/services with prices if applicable..."
                    value={businessInfo.products_services}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, products_services: e.target.value }))}
                    rows={3}
                    className="border-slate-200 focus:border-emerald-500 resize-none text-sm"
                    data-testid="products-input"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Knowledge Base */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold font-['Plus_Jakarta_Sans'] text-slate-900 mb-1">
                Upload Your Knowledge
              </h2>
              <p className="text-sm text-slate-500">
                Add documents to help your AI agent answer questions accurately
              </p>
            </div>

            {/* Upload Area */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-150 ${
                    uploading ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-400 hover:bg-slate-50/50'
                  } cursor-pointer`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <div className="space-y-2">
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-600" strokeWidth={2} />
                      <p className="font-medium text-slate-900 text-sm">Processing files...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" strokeWidth={1.5} />
                      <p className="font-medium text-slate-900 text-sm">Drop files here or click to browse</p>
                      <p className="text-xs text-slate-500 mt-1">
                        PDF, Word, Excel, Images, or Text (max 10MB)
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg"
                    data-testid="file-upload-input"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Uploaded Documents */}
            {documents.length > 0 && (
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-slate-900 text-sm">
                      Uploaded Documents ({documents.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 group"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{doc.title}</p>
                            <p className="text-xs text-slate-500">
                              {formatFileSize(doc.file_size)} • {doc.chunk_count} chunks
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600"
                          onClick={() => deleteDocument(doc.id)}
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <p className="text-center text-sm text-slate-500">
              You can skip this step and add documents later
            </p>
          </div>
        )}

        {/* Step 3: Agent Settings */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-1">
                Configure Your Agent
              </h2>
              <p className="text-[13px] text-slate-500">
                Customize how your AI agent communicates
              </p>
            </div>

            {/* Personality & Language - Combined Card */}
            <Card className="bg-white border-slate-200/60 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {/* Tone & Response Style */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                      <Smile className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-[13px] font-semibold text-slate-900">Personality</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-slate-600 text-[12px] font-medium">Tone</Label>
                      <Select
                        value={settings.tone}
                        onValueChange={(v) => setSettings(prev => ({ ...prev, tone: v }))}
                      >
                        <SelectTrigger className="h-9 text-[13px] border-slate-200" data-testid="tone-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly_professional">Friendly Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="luxury">Luxury/Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-600 text-[12px] font-medium">Response Style</Label>
                      <Select
                        value={settings.response_length}
                        onValueChange={(v) => setSettings(prev => ({ ...prev, response_length: v }))}
                      >
                        <SelectTrigger className="h-9 text-[13px] border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="concise">Concise</SelectItem>
                          <SelectItem value="balanced">Balanced</SelectItem>
                          <SelectItem value="detailed">Detailed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-slate-600 text-[12px] font-medium">Emoji Usage</Label>
                      <div className="flex gap-2">
                        {['never', 'minimal', 'moderate', 'frequent'].map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setSettings(prev => ({ ...prev, emoji_usage: level }))}
                            className={`flex-1 py-2 px-3 rounded-md text-[12px] font-medium transition-all ${
                              settings.emoji_usage === level
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Languages */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                      <Globe className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-[13px] font-semibold text-slate-900">Languages</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-slate-600 text-[12px] font-medium">Primary Language</Label>
                      <Select
                        value={settings.primary_language}
                        onValueChange={(v) => {
                          const newSecondary = settings.secondary_languages.filter(l => l !== v);
                          setSettings(prev => ({ ...prev, primary_language: v, secondary_languages: newSecondary }));
                        }}
                      >
                        <SelectTrigger className="h-9 text-[13px] border-slate-200" data-testid="language-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uz">🇺🇿 Uzbek</SelectItem>
                          <SelectItem value="ru">🇷🇺 Russian</SelectItem>
                          <SelectItem value="en">🇬🇧 English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-600 text-[12px] font-medium">Also respond in</Label>
                      <div className="flex gap-2">
                        {[
                          { code: 'uz', label: '🇺🇿 Uzbek' },
                          { code: 'ru', label: '🇷🇺 Russian' },
                          { code: 'en', label: '🇬🇧 English' }
                        ].filter(lang => lang.code !== settings.primary_language).map(lang => (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => {
                              const isSelected = settings.secondary_languages.includes(lang.code);
                              setSettings(prev => ({
                                ...prev,
                                secondary_languages: isSelected
                                  ? prev.secondary_languages.filter(l => l !== lang.code)
                                  : [...prev.secondary_languages, lang.code]
                              }));
                            }}
                            className={`flex-1 py-2 px-3 rounded-md text-[12px] font-medium transition-all ${
                              settings.secondary_languages.includes(lang.code)
                                ? 'bg-white text-slate-900 ring-1 ring-slate-900'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {lang.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Messages */}
            <Card className="bg-white border-slate-200/60 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-[13px] font-semibold text-slate-900">Custom Messages</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-600 text-[12px] font-medium">Greeting</Label>
                    <Textarea
                      placeholder="Hello! Welcome to our store. How can I help you today?"
                      value={settings.greeting_message}
                      onChange={(e) => setSettings(prev => ({ ...prev, greeting_message: e.target.value }))}
                      rows={2}
                      className="border-slate-200 focus:border-slate-300 resize-none text-[13px]"
                      data-testid="greeting-input"
                    />
                    <p className="text-[11px] text-slate-400">Leave empty to auto-generate</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-600 text-[12px] font-medium">Closing (when ready to buy)</Label>
                    <Textarea
                      placeholder="Great! I'll connect you with our team to finalize your order..."
                      value={settings.closing_message}
                      onChange={(e) => setSettings(prev => ({ ...prev, closing_message: e.target.value }))}
                      rows={2}
                      className="border-slate-200 focus:border-slate-300 resize-none text-[13px]"
                      data-testid="closing-input"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Behavior & Data Collection - Combined */}
            <Card className="bg-white border-slate-200/60 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {/* Rate Limiting */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-[13px] font-semibold text-slate-900">Response Timing</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-slate-600 text-[12px] font-medium">Delay</Label>
                      <Select
                        value={String(settings.min_response_delay)}
                        onValueChange={(v) => setSettings(prev => ({ ...prev, min_response_delay: parseInt(v) }))}
                      >
                        <SelectTrigger className="h-9 text-[13px] border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Instant</SelectItem>
                          <SelectItem value="1">1 second</SelectItem>
                          <SelectItem value="2">2 seconds</SelectItem>
                          <SelectItem value="3">3 seconds</SelectItem>
                          <SelectItem value="5">5 seconds</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-600 text-[12px] font-medium">Rate Limit</Label>
                      <Select
                        value={String(settings.max_messages_per_minute)}
                        onValueChange={(v) => setSettings(prev => ({ ...prev, max_messages_per_minute: parseInt(v) }))}
                      >
                        <SelectTrigger className="h-9 text-[13px] border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5/min</SelectItem>
                          <SelectItem value="10">10/min</SelectItem>
                          <SelectItem value="20">20/min</SelectItem>
                          <SelectItem value="0">Unlimited</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Lead Collection */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-[13px] font-semibold text-slate-900">Data Collection</h3>
                  </div>
                  <div className="space-y-1">
                    {[
                      { key: 'collect_name', label: 'Customer Name', desc: 'Full name' },
                      { key: 'collect_phone', label: 'Phone Number', desc: 'Contact number' },
                      { key: 'collect_product', label: 'Product Interest', desc: 'What they want' },
                      { key: 'collect_budget', label: 'Budget Range', desc: 'Price range' },
                      { key: 'collect_location', label: 'Location', desc: 'Delivery address' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between py-2.5 px-3 rounded-md hover:bg-slate-50 transition-colors">
                        <div>
                          <span className="text-[13px] font-medium text-slate-900">{label}</span>
                          <span className="text-[11px] text-slate-400 ml-2">{desc}</span>
                        </div>
                        <Switch
                          checked={settings[key]}
                          onCheckedChange={(checked) => setSettings(prev => ({ ...prev, [key]: checked }))}
                          data-testid={`switch-${key}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Test Chat */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-4">
              <h2 className="text-xl font-semibold text-slate-900 mb-1">
                Test Your Agent
              </h2>
              <p className="text-[13px] text-slate-500">
                Have a conversation to see how your agent responds
              </p>
            </div>

            <Card className="bg-white border-slate-200/60 shadow-sm overflow-hidden">
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
                    <MessageCircle className="w-4.5 h-4.5 text-white" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-[13px]">{businessInfo.name || 'Your Agent'}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Online
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-slate-600 h-8 w-8 p-0"
                  onClick={resetTestChat}
                  title="Reset conversation"
                >
                  <RefreshCw className="w-4 h-4" strokeWidth={1.75} />
                </Button>
              </div>

              {/* Chat Messages */}
              <div ref={chatMessagesRef} className="h-72 overflow-y-auto p-4 space-y-3 bg-white">
                {testMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2.5'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-md bg-slate-100 flex-shrink-0 flex items-center justify-center mt-0.5">
                        <MessageCircle className="w-3 h-3 text-slate-500" strokeWidth={2} />
                      </div>
                    )}
                    <div className={`max-w-[75%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white rounded-2xl rounded-br-md'
                        : 'bg-slate-50 text-slate-700 rounded-2xl rounded-bl-md'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {testLoading && (
                  <div className="flex justify-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-slate-100 flex-shrink-0 flex items-center justify-center mt-0.5">
                      <MessageCircle className="w-3 h-3 text-slate-500" strokeWidth={2} />
                    </div>
                    <div className="bg-slate-50 px-4 py-3 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="px-4 py-3 border-t border-slate-100 bg-white">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendTestMessage()}
                    className="flex-1 h-9 border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-300 focus-visible:ring-0 text-[13px] rounded-lg"
                    data-testid="test-chat-input"
                  />
                  <Button
                    size="sm"
                    className="bg-slate-900 hover:bg-slate-800 h-9 w-9 p-0 rounded-full"
                    onClick={sendTestMessage}
                    disabled={testLoading}
                    data-testid="send-test-btn"
                  >
                    <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                  </Button>
                </div>
              </div>

              {/* Insights Drawer */}
              <div className="border-t border-slate-100">
                <button
                  className="w-full px-4 py-2 text-[11px] font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  {showDebug ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showDebug ? 'Hide' : 'View'} Insights
                </button>

                {showDebug && (
                  <div className="px-4 py-4 bg-slate-50 border-t border-slate-100">
                    {debugInfo ? (
                      <div className="flex items-center justify-around">
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 font-medium mb-1">Sales Stage</p>
                          <p className="text-[12px] font-semibold text-slate-800 capitalize">{debugInfo.stage?.replace('_', ' ') || 'Awareness'}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 font-medium mb-1">Lead Temp</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                            debugInfo.hotness === 'hot' ? 'bg-orange-100 text-orange-700' :
                            debugInfo.hotness === 'warm' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-200 text-slate-600'
                          }`}>
                            {debugInfo.hotness || 'Cold'}
                          </span>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 font-medium mb-1">Score</p>
                          <p className="text-[12px] font-semibold text-slate-800 font-mono">{debugInfo.score || 0}/100</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 font-medium mb-1">Knowledge</p>
                          <span className={`inline-block w-2 h-2 rounded-full ${debugInfo.rag_used ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 text-center">Send a message to see conversation insights</p>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <p className="text-center text-[11px] text-slate-400">
              Try asking about products, prices, or delivery options
            </p>
          </div>
        )}

        {/* Step 5: Connect */}
        {currentStep === 5 && (
          <TooltipProvider delayDuration={100}>
            <div className="space-y-4 animate-fade-in">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-1">
                  Connect Your Channels
                </h2>
                <p className="text-[13px] text-slate-500">
                  Link your agent to start receiving messages
                </p>
              </div>

              {/* Telegram Connection */}
              <Card className="bg-white border-slate-200/60 shadow-sm">
                <CardContent className="p-5">
                  {connected ? (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                        <Check className="w-6 h-6 text-emerald-600" strokeWidth={2} />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-0.5">Connected!</h3>
                      <p className="text-slate-500 text-[13px] mb-3">
                        Your bot @{botUsername} is now active
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-[13px]"
                        onClick={() => window.open(`https://t.me/${botUsername}`, '_blank')}
                      >
                        Open in Telegram
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#0088cc]/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#0088cc]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1.01.54-1.45.53-.48-.01-1.39-.27-2.07-.49-.84-.27-1.51-.42-1.45-.89.03-.25.38-.51 1.07-.78 4.18-1.82 6.97-3.02 8.38-3.61 3.99-1.66 4.83-1.95 5.37-1.96.12 0 .38.03.55.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 text-[13px]">Telegram Bot</h3>
                            <p className="text-[11px] text-slate-500">Connect your Telegram bot</p>
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
                          className="h-9 text-[13px] border-slate-200"
                          data-testid="bot-token-input"
                        />
                      </div>

                      <Button
                        className="w-full bg-slate-900 hover:bg-slate-800 h-9 text-[13px]"
                        onClick={connectTelegram}
                        disabled={connecting}
                        data-testid="connect-telegram-btn"
                      >
                        {connecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Connect Telegram
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bitrix24 CRM Connection */}
              <Card className="bg-white border-slate-200/60 shadow-sm">
                <CardContent className="p-5">
                  {bitrixConnected ? (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                        <Check className="w-6 h-6 text-emerald-600" strokeWidth={2} />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-0.5">Bitrix24 Connected!</h3>
                      <p className="text-slate-500 text-[13px]">
                        Leads will automatically sync to your CRM
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Link2 className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 text-[13px]">Bitrix24 CRM</h3>
                              <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200 px-1.5 py-0">Optional</Badge>
                            </div>
                            <p className="text-[11px] text-slate-500">Sync leads to your CRM</p>
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors">
                              <HelpCircle className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[300px] p-3 bg-slate-900 text-white">
                            <p className="text-[12px] font-semibold mb-2 text-white">How to get your webhook URL:</p>
                            <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside">
                              <li>Go to Developer Resources → Other → Inbound webhooks</li>
                              <li>Click "Add webhook"</li>
                              <li>Enable permissions: CRM, Lists (products)</li>
                              <li>Copy the webhook URL</li>
                            </ol>
                            <p className="text-[10px] text-slate-400 mt-2">
                              Format: https://your-portal.bitrix24.kz/rest/1/abc123/
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-slate-600 text-[12px] font-medium">Webhook URL</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 cursor-help" strokeWidth={2} />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-slate-900 text-white text-xs px-2 py-1">
                              Encrypted & secured
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="relative">
                          <Input
                            type={showBitrixUrl ? "text" : "password"}
                            placeholder="https://your-portal.bitrix24.kz/rest/1/abc123/"
                            value={bitrixWebhookUrl}
                            onChange={(e) => setBitrixWebhookUrl(e.target.value)}
                            className="h-9 text-[13px] border-slate-200 pr-10"
                            data-testid="bitrix-webhook-input"
                          />
                          <button
                            type="button"
                            onClick={() => setShowBitrixUrl(!showBitrixUrl)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showBitrixUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        className="w-full bg-slate-900 hover:bg-slate-800 h-9 text-[13px]"
                        onClick={connectBitrix}
                        disabled={connectingBitrix}
                        data-testid="connect-bitrix-btn"
                      >
                        {connectingBitrix && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Connect Bitrix24
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Gateways Section */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Payment Gateways</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
              </div>

              {/* Payme Connection */}
              <Card className="bg-white border-slate-200/60 shadow-sm">
                <CardContent className="p-5">
                  {paymeConnected ? (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                        <Check className="w-6 h-6 text-emerald-600" strokeWidth={2} />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-0.5">Payme Connected!</h3>
                      <p className="text-slate-500 text-[13px]">
                        AI can generate payment links for customers
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#00CCCC]/10 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-[#00CCCC]" strokeWidth={1.75} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 text-[13px]">Payme</h3>
                              <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200 px-1.5 py-0">Optional</Badge>
                            </div>
                            <p className="text-[11px] text-slate-500">Accept payments via UzCard, Humo</p>
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors">
                              <HelpCircle className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[280px] p-3 bg-slate-900 text-white">
                            <p className="text-[12px] font-semibold mb-2 text-white">How to get your credentials:</p>
                            <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside">
                              <li>Register at business.payme.uz</li>
                              <li>Complete merchant verification</li>
                              <li>Go to merchant.payme.uz → Developer Tools</li>
                              <li>Copy Merchant ID and Secret Key</li>
                            </ol>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-slate-600 text-[12px] font-medium">Merchant ID</Label>
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
                            type="text"
                            placeholder="5e730e8e0b852a417aa49ceb"
                            value={paymeMerchantId}
                            onChange={(e) => setPaymeMerchantId(e.target.value)}
                            className="h-9 text-[13px] border-slate-200"
                            data-testid="payme-merchant-input"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-slate-600 text-[12px] font-medium">Secret Key</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 cursor-help" strokeWidth={2} />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="bg-slate-900 text-white text-xs px-2 py-1">
                                Encrypted & secured
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="relative">
                            <Input
                              type={showPaymeSecret ? "text" : "password"}
                              placeholder="Your Payme secret key"
                              value={paymeSecretKey}
                              onChange={(e) => setPaymeSecretKey(e.target.value)}
                              className="h-9 text-[13px] border-slate-200 pr-10"
                              data-testid="payme-secret-input"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPaymeSecret(!showPaymeSecret)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showPaymeSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <Button
                        className="w-full bg-slate-900 hover:bg-slate-800 h-9 text-[13px]"
                        onClick={connectPayme}
                        disabled={connectingPayme}
                        data-testid="connect-payme-btn"
                      >
                        {connectingPayme && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Connect Payme
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Click Connection */}
              <Card className="bg-white border-slate-200/60 shadow-sm">
                <CardContent className="p-5">
                  {clickConnected ? (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                        <Check className="w-6 h-6 text-emerald-600" strokeWidth={2} />
                      </div>
                      <h3 className="font-semibold text-slate-900 mb-0.5">Click Connected!</h3>
                      <p className="text-slate-500 text-[13px]">
                        AI can generate payment links for customers
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#00B2FF]/10 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-[#00B2FF]" strokeWidth={1.75} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 text-[13px]">Click</h3>
                              <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200 px-1.5 py-0">Optional</Badge>
                            </div>
                            <p className="text-[11px] text-slate-500">Accept payments via Click wallet</p>
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors">
                              <HelpCircle className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[280px] p-3 bg-slate-900 text-white">
                            <p className="text-[12px] font-semibold mb-2 text-white">How to get your credentials:</p>
                            <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside">
                              <li>Register at my.click.uz</li>
                              <li>Create a merchant account</li>
                              <li>Go to Settings → API</li>
                              <li>Copy Service ID and Secret Key</li>
                            </ol>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-slate-600 text-[12px] font-medium">Service ID</Label>
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
                            type="text"
                            placeholder="12345"
                            value={clickServiceId}
                            onChange={(e) => setClickServiceId(e.target.value)}
                            className="h-9 text-[13px] border-slate-200"
                            data-testid="click-service-input"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-slate-600 text-[12px] font-medium">Secret Key</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 cursor-help" strokeWidth={2} />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="bg-slate-900 text-white text-xs px-2 py-1">
                                Encrypted & secured
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="relative">
                            <Input
                              type={showClickSecret ? "text" : "password"}
                              placeholder="Your Click secret key"
                              value={clickSecretKey}
                              onChange={(e) => setClickSecretKey(e.target.value)}
                              className="h-9 text-[13px] border-slate-200 pr-10"
                              data-testid="click-secret-input"
                            />
                            <button
                              type="button"
                              onClick={() => setShowClickSecret(!showClickSecret)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showClickSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <Button
                        className="w-full bg-slate-900 hover:bg-slate-800 h-9 text-[13px]"
                        onClick={connectClick}
                        disabled={connectingClick}
                        data-testid="connect-click-btn"
                      >
                        {connectingClick && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Connect Click
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <p className="text-center text-[11px] text-slate-400">
                You can skip this step and connect channels later
              </p>
            </div>
          </TooltipProvider>
        )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="h-10 px-5 border-slate-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={2} />
              Back
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 h-10 px-5"
                onClick={handleNext}
                disabled={saving}
                data-testid="next-step-btn"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Continue
                <ArrowRight className="w-4 h-4 ml-2" strokeWidth={2} />
              </Button>
            ) : (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 h-10 px-5"
                onClick={finishOnboarding}
                data-testid="finish-btn"
              >
                <Check className="w-4 h-4 mr-2" strokeWidth={2} />
                Finish Setup
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentOnboarding;
