import React, { useState, useRef } from 'react';
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
  Send,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
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
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  
  // Step 5: Connect
  const [botToken, setBotToken] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [botUsername, setBotUsername] = useState('');

  const progress = (currentStep / STEPS.length) * 100;

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
        setTestMessages([{
          role: 'assistant',
          text: settings.greeting_message || `Hello! 👋 Welcome to ${businessInfo.name}. How can I help you today?`
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
    setTestMessages([{
      role: 'assistant',
      text: settings.greeting_message || `Hello! 👋 Welcome to ${businessInfo.name}. How can I help you today?`
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

  const finishOnboarding = () => {
    toast.success('Agent created successfully!');
    navigate('/agents');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-[calc(100vh-2rem)]" data-testid="agent-onboarding">
      {/* Progress Header */}
      <div className="bg-white border-b border-slate-200 rounded-t-lg -mx-4 lg:-mx-6 -mt-4 lg:-mt-6 mb-6">
        <div className="max-w-4xl mx-auto px-6 py-5">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/agents')}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                data-testid="back-to-agents-btn"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" strokeWidth={2} />
              </button>
              <div>
                <h1 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">
                  Create New Agent
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">Set up your AI sales assistant in minutes</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-slate-500 hover:text-slate-700 border-slate-200"
              onClick={() => navigate('/agents')}
              data-testid="cancel-onboarding-btn"
            >
              Cancel
            </Button>
          </div>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = step.id === currentStep;
              const isComplete = step.id < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-2 ${
                    isActive ? 'text-emerald-600' : isComplete ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-emerald-600 text-white' 
                        : isComplete 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isComplete ? <Check className="w-4 h-4" strokeWidth={2.5} /> : step.id}
                    </div>
                    <span className={`text-sm font-medium hidden sm:block ${
                      isActive ? 'text-slate-900' : isComplete ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-8 sm:w-16 h-0.5 mx-2 ${
                      isComplete ? 'bg-emerald-300' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          
          <Progress value={progress} className="h-1" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        
        {/* Step 1: Business Info */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900 mb-2">
                About Your Business
              </h2>
              <p className="text-slate-500">
                Tell us about your business so your AI agent can represent you accurately
              </p>
            </div>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-slate-700">
                    Business Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="businessName"
                    placeholder="e.g., TechStore Uzbekistan"
                    value={businessInfo.name}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, name: e.target.value }))}
                    className="h-11 border-slate-200 focus:border-emerald-500"
                    data-testid="business-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessDesc" className="text-slate-700">
                    What does your business do? <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="businessDesc"
                    placeholder="Describe your business, target customers, and what makes you unique..."
                    value={businessInfo.description}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="border-slate-200 focus:border-emerald-500 resize-none"
                    data-testid="business-desc-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="products" className="text-slate-700">
                    Products or Services (optional)
                  </Label>
                  <Textarea
                    id="products"
                    placeholder="List your main products/services with prices if applicable..."
                    value={businessInfo.products_services}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, products_services: e.target.value }))}
                    rows={3}
                    className="border-slate-200 focus:border-emerald-500 resize-none"
                    data-testid="products-input"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Knowledge Base */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900 mb-2">
                Upload Your Knowledge
              </h2>
              <p className="text-slate-500">
                Add documents to help your AI agent answer customer questions accurately
              </p>
            </div>

            {/* Upload Area */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    uploading ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                  } cursor-pointer relative`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <div className="space-y-3">
                      <Loader2 className="w-10 h-10 mx-auto animate-spin text-emerald-600" strokeWidth={1.5} />
                      <p className="font-medium text-slate-900">Processing files...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto text-slate-400 mb-3" strokeWidth={1.5} />
                      <p className="font-medium text-slate-900">Drop files here or click to browse</p>
                      <p className="text-sm text-slate-500 mt-1">
                        PDF, Word, Excel, Images, or Text files (max 10MB each)
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
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900 mb-2">
                Configure Your Agent
              </h2>
              <p className="text-slate-500">
                Customize how your AI agent communicates with customers
              </p>
            </div>

            {/* Communication Style */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-6 space-y-5">
                <h3 className="font-semibold text-slate-900">Communication Style</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 text-sm">Tone</Label>
                    <Select 
                      value={settings.tone} 
                      onValueChange={(v) => setSettings(prev => ({ ...prev, tone: v }))}
                    >
                      <SelectTrigger className="h-10" data-testid="tone-select">
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
                  
                  <div className="space-y-2">
                    <Label className="text-slate-700 text-sm">Primary Language</Label>
                    <Select 
                      value={settings.primary_language} 
                      onValueChange={(v) => setSettings(prev => ({ ...prev, primary_language: v }))}
                    >
                      <SelectTrigger className="h-10" data-testid="language-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uz">🇺🇿 Uzbek</SelectItem>
                        <SelectItem value="ru">🇷🇺 Russian</SelectItem>
                        <SelectItem value="en">🇬🇧 English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-slate-700 text-sm">Response Length</Label>
                    <Select 
                      value={settings.response_length} 
                      onValueChange={(v) => setSettings(prev => ({ ...prev, response_length: v }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concise">Concise</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-slate-700 text-sm">Emoji Usage</Label>
                    <Select 
                      value={settings.emoji_usage} 
                      onValueChange={(v) => setSettings(prev => ({ ...prev, emoji_usage: v }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="frequent">Frequent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Messages */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-6 space-y-5">
                <h3 className="font-semibold text-slate-900">Messages</h3>
                
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm">Greeting Message</Label>
                  <Textarea
                    placeholder="Hello! 👋 Welcome to our store. How can I help you today?"
                    value={settings.greeting_message}
                    onChange={(e) => setSettings(prev => ({ ...prev, greeting_message: e.target.value }))}
                    rows={2}
                    className="border-slate-200 focus:border-emerald-500 resize-none"
                    data-testid="greeting-input"
                  />
                  <p className="text-xs text-slate-500">Leave empty to auto-generate based on language</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-700 text-sm">Closing Message (when ready to buy)</Label>
                  <Textarea
                    placeholder="Great! I'll connect you with our team to finalize your order..."
                    value={settings.closing_message}
                    onChange={(e) => setSettings(prev => ({ ...prev, closing_message: e.target.value }))}
                    rows={2}
                    className="border-slate-200 focus:border-emerald-500 resize-none"
                    data-testid="closing-input"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Rate Limiting */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-6 space-y-5">
                <h3 className="font-semibold text-slate-900">Rate Limiting</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 text-sm">Response Delay (seconds)</Label>
                    <Select 
                      value={String(settings.min_response_delay)} 
                      onValueChange={(v) => setSettings(prev => ({ ...prev, min_response_delay: parseInt(v) }))}
                    >
                      <SelectTrigger className="h-10">
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
                    <p className="text-xs text-slate-500">Feels more human</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-slate-700 text-sm">Max Messages/Minute</Label>
                    <Select 
                      value={String(settings.max_messages_per_minute)} 
                      onValueChange={(v) => setSettings(prev => ({ ...prev, max_messages_per_minute: parseInt(v) }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 messages</SelectItem>
                        <SelectItem value="10">10 messages</SelectItem>
                        <SelectItem value="20">20 messages</SelectItem>
                        <SelectItem value="0">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">Prevents spam</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lead Collection */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-semibold text-slate-900">Lead Collection</h3>
                <p className="text-sm text-slate-500">What information should your agent collect?</p>
                
                <div className="space-y-3">
                  {[
                    { key: 'collect_name', label: 'Customer Name' },
                    { key: 'collect_phone', label: 'Phone Number' },
                    { key: 'collect_product', label: 'Product Interest' },
                    { key: 'collect_budget', label: 'Budget Range' },
                    { key: 'collect_location', label: 'Delivery Location' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50">
                      <span className="text-sm text-slate-700">{label}</span>
                      <Switch
                        checked={settings[key]}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, [key]: checked }))}
                        data-testid={`switch-${key}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Test Chat */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900 mb-2">
                Test Your Agent
              </h2>
              <p className="text-slate-500">
                Have a conversation to make sure everything works as expected
              </p>
            </div>

            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
              {/* Chat Header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{businessInfo.name || 'Your Agent'}</p>
                    <p className="text-xs text-emerald-600">● Online</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-slate-500" onClick={resetTestChat}>
                  <RefreshCw className="w-4 h-4 mr-1" strokeWidth={1.75} />
                  Reset
                </Button>
              </div>

              {/* Chat Messages */}
              <div className="h-80 overflow-y-auto p-4 space-y-3">
                {testMessages.map((msg, idx) => (
                  <div 
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-md'
                        : 'bg-slate-100 text-slate-800 rounded-bl-md'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {testLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-md">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="px-4 py-3 border-t border-slate-200">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendTestMessage()}
                    className="h-10 border-slate-200"
                    data-testid="test-chat-input"
                  />
                  <Button 
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 h-10 px-4"
                    onClick={sendTestMessage}
                    disabled={testLoading}
                    data-testid="send-test-btn"
                  >
                    <Send className="w-4 h-4" strokeWidth={2} />
                  </Button>
                </div>
              </div>

              {/* Debug Panel */}
              <div className="border-t border-slate-200">
                <button
                  className="w-full px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-1"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  {showDebug ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showDebug ? 'Hide' : 'Show'} Debug Info
                </button>
                
                {showDebug && debugInfo && (
                  <div className="px-4 py-3 bg-slate-50 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Stage:</span>
                      <Badge variant="outline" className="text-xs">{debugInfo.stage}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hotness:</span>
                      <Badge variant="outline" className="text-xs">{debugInfo.hotness}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Score:</span>
                      <span className="font-mono">{debugInfo.score}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">RAG Used:</span>
                      <span>{debugInfo.rag_used ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <p className="text-center text-sm text-slate-500">
              Try asking about your products, prices, or delivery
            </p>
          </div>
        )}

        {/* Step 5: Connect */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900 mb-2">
                Connect Your Channels
              </h2>
              <p className="text-slate-500">
                Link your agent to Telegram to start receiving messages
              </p>
            </div>

            {/* Telegram Connection */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-6">
                {connected ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                      <Check className="w-8 h-8 text-emerald-600" strokeWidth={2} />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Connected!</h3>
                    <p className="text-slate-500 text-sm mb-4">
                      Your bot @{botUsername} is now active
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://t.me/${botUsername}`, '_blank')}
                    >
                      Open in Telegram
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1.01.54-1.45.53-.48-.01-1.39-.27-2.07-.49-.84-.27-1.51-.42-1.45-.89.03-.25.38-.51 1.07-.78 4.18-1.82 6.97-3.02 8.38-3.61 3.99-1.66 4.83-1.95 5.37-1.96.12 0 .38.03.55.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900">Telegram Bot</h3>
                        <p className="text-sm text-slate-500">Connect your Telegram bot</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 text-sm">Bot Token</Label>
                      <Input
                        type="password"
                        placeholder="Paste your bot token from @BotFather"
                        value={botToken}
                        onChange={(e) => setBotToken(e.target.value)}
                        className="h-10 border-slate-200"
                        data-testid="bot-token-input"
                      />
                      <p className="text-xs text-slate-500">
                        Get your token from{' '}
                        <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                          @BotFather
                        </a>
                      </p>
                    </div>

                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 h-10"
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

            {/* Other Channels (Coming Soon) */}
            <Card className="bg-white border-slate-200 shadow-sm opacity-60">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Plug className="w-5 h-5 text-indigo-600" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">Bitrix24 CRM</h3>
                      <p className="text-sm text-slate-500">Sync leads to your CRM</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-slate-500">Coming Soon</Badge>
                </div>
              </CardContent>
            </Card>

            <p className="text-center text-sm text-slate-500">
              You can skip this step and connect channels later
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="h-10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={2} />
            Back
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 h-10"
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
              className="bg-emerald-600 hover:bg-emerald-700 h-10"
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
  );
};

export default AgentOnboarding;
