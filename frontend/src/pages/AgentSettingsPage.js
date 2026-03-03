import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { UNSAFE_NavigationContext as NavigationContext } from 'react-router';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Save,
  Loader2,
  Building2,
  MessageSquare,
  Globe,
  Clock,
  User,
  Smile,
  Phone,
  Mail,
  ShoppingBag,
  DollarSign,
  Calendar,
  Package,
  Briefcase,
  UserCheck,
  MapPin,
  ClockIcon,
  AlertCircle,
  Users,
  Hash,
  FileText,
  X,
  Plus,
  Sparkles,
  Cpu,
  Type,
  Image as ImageIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Section Header Component - Clean, no colored backgrounds
const SectionHeader = ({ icon: Icon, title, description }) => (
  <div className="flex items-start gap-3 mb-5">
    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
    </div>
    <div>
      <h3 className="text-[14px] font-semibold text-slate-900">{title}</h3>
      {description && <p className="text-[12px] text-slate-500 mt-0.5">{description}</p>}
    </div>
  </div>
);

const AgentSettingsPage = () => {
  const { agentId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savedConfigRef = useRef(null);
  const [pendingNav, setPendingNav] = useState(null);
  const { navigator } = useContext(NavigationContext);

  // Data collection field definitions - grouped by category
  const DATA_COLLECTION_FIELDS = [
    // Essential - Contact Info
    { key: 'collect_name', label: 'Customer Name', desc: 'Full name', icon: User, category: 'essential' },
    { key: 'collect_phone', label: 'Phone Number', desc: 'Contact number', icon: Phone, category: 'essential' },
    { key: 'collect_email', label: 'Email Address', desc: 'Email contact', icon: Mail, category: 'essential' },

    // Purchase Intent
    { key: 'collect_product', label: 'Product Interest', desc: 'What they want', icon: ShoppingBag, category: 'purchase' },
    { key: 'collect_budget', label: 'Budget Range', desc: 'Price range', icon: DollarSign, category: 'purchase' },
    { key: 'collect_timeline', label: 'Timeline', desc: 'When they need it', icon: Calendar, category: 'purchase' },
    { key: 'collect_quantity', label: 'Quantity', desc: 'How many units', icon: Package, category: 'purchase' },

    // Qualification - B2B
    { key: 'collect_company', label: 'Company Name', desc: 'Organization', icon: Briefcase, category: 'qualification' },
    { key: 'collect_job_title', label: 'Job Title', desc: 'Their role', icon: UserCheck, category: 'qualification' },
    { key: 'collect_team_size', label: 'Team Size', desc: 'Number of users', icon: Users, category: 'qualification' },

    // Logistics
    { key: 'collect_location', label: 'Location', desc: 'City or address', icon: MapPin, category: 'logistics' },
    { key: 'collect_preferred_time', label: 'Preferred Contact Time', desc: 'Best time to call', icon: ClockIcon, category: 'logistics' },
    { key: 'collect_urgency', label: 'Urgency Level', desc: 'How urgent', icon: AlertCircle, category: 'logistics' },
    { key: 'collect_reference', label: 'Reference/Order ID', desc: 'Existing reference', icon: Hash, category: 'logistics' },
    { key: 'collect_notes', label: 'Additional Notes', desc: 'Special requests', icon: FileText, category: 'logistics' },
  ];

  const CATEGORY_LABELS = {
    essential: 'Essential',
    purchase: 'Purchase Intent',
    qualification: 'Qualification',
    logistics: 'Logistics'
  };

  const MAX_ACTIVE_FIELDS = 5;

  // Available AI models grouped by provider — must match backend VALID_SALES_MODELS
  // Prices: cents per 1,000 tokens (matching token_logger.py PRICING)
  const AI_MODELS = [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', inputCost: '0.25', outputCost: '1.0', badge: 'Recommended', capabilities: ['text', 'vision'] },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', inputCost: '0.015', outputCost: '0.06', badge: 'Affordable', capabilities: ['text', 'vision'] },
    { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI', inputCost: '0.2', outputCost: '0.8', badge: 'Multilingual', capabilities: ['text', 'vision'] },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'OpenAI', inputCost: '0.04', outputCost: '0.16', badge: null, capabilities: ['text', 'vision'] },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'Anthropic', inputCost: '0.3', outputCost: '1.5', badge: null, capabilities: ['text', 'vision'] },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'Anthropic', inputCost: '0.08', outputCost: '0.4', badge: 'Fast', capabilities: ['text', 'vision'] },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', inputCost: '0.3', outputCost: '1.5', badge: 'Multilingual', capabilities: ['text', 'vision'] },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'Anthropic', inputCost: '0.08', outputCost: '0.4', badge: null, capabilities: ['text'] },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', inputCost: '0.01', outputCost: '0.04', badge: 'Ultra-fast', capabilities: ['text'] },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', inputCost: '0.125', outputCost: '1.0', badge: null, capabilities: ['text', 'vision'] },
  ];

  const MODEL_PROVIDERS = [...new Set(AI_MODELS.map(m => m.provider))];

  const [config, setConfig] = useState({
    business_name: '',
    business_description: '',
    products_services: '',
    agent_tone: 'friendly_professional',
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
    collect_email: false,
    collect_timeline: false,
    collect_quantity: false,
    collect_company: false,
    collect_job_title: false,
    collect_team_size: false,
    collect_location: false,
    collect_preferred_time: false,
    collect_urgency: false,
    collect_reference: false,
    collect_notes: false,
    vertical: 'default',
    // Sales Constraints (Anti-Hallucination)
    payment_plans_enabled: false,
    // LLM Model
    sales_model: 'gpt-4o',
  });

  // Model selection — derived from config.sales_model
  const selectedModel = config.sales_model || 'gpt-4o';
  const selectedModelData = AI_MODELS.find(m => m.id === selectedModel);

  // Count active collection fields
  const activeFieldCount = DATA_COLLECTION_FIELDS.filter(f => config[f.key]).length;
  const isAtLimit = activeFieldCount >= MAX_ACTIVE_FIELDS;

  // Dirty state detection (must be after config state declaration)
  const hasChanges = savedConfigRef.current !== null &&
    JSON.stringify(config) !== JSON.stringify(savedConfigRef.current);
  const hasChangesRef = useRef(false);
  hasChangesRef.current = hasChanges;

  // Intercept in-app navigation (sidebar links, navigate() calls)
  useEffect(() => {
    const origPush = navigator.push;
    const origReplace = navigator.replace;

    navigator.push = (...args) => {
      if (hasChangesRef.current) {
        setPendingNav({ fn: () => origPush.call(navigator, ...args) });
      } else {
        origPush.call(navigator, ...args);
      }
    };

    navigator.replace = (...args) => {
      if (hasChangesRef.current) {
        setPendingNav({ fn: () => origReplace.call(navigator, ...args) });
      } else {
        origReplace.call(navigator, ...args);
      }
    };

    return () => {
      navigator.push = origPush;
      navigator.replace = origReplace;
    };
  }, [navigator]);

  // Block browser tab close / refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChangesRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [agentId]);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      if (response.data) {
        setConfig(prev => {
          // Filter out null/undefined so useState defaults survive
          const cleaned = Object.fromEntries(
            Object.entries(response.data).filter(([_, v]) => v !== null && v !== undefined)
          );
          const merged = {
            ...prev,
            ...cleaned,
            secondary_languages: cleaned.secondary_languages || prev.secondary_languages,
            payment_plans_enabled: cleaned.payment_plans_enabled ?? prev.payment_plans_enabled,
          };
          savedConfigRef.current = merged;
          return merged;
        });
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/config`, config);
      savedConfigRef.current = { ...config };
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const toggleSecondaryLanguage = (lang) => {
    const isSelected = config.secondary_languages.includes(lang);
    handleChange(
      'secondary_languages',
      isSelected
        ? config.secondary_languages.filter(l => l !== lang)
        : [...config.secondary_languages, lang]
    );
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white" strokeWidth={2} />
        </div>
        <p className="text-[13px] text-slate-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="agent-settings-page">
      {/* Header */}
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Configure your AI agent's behavior and personality</p>
        </div>
        <Button
          className={`h-9 px-4 text-[13px] font-medium shadow-sm transition-all duration-200 ${
            hasChanges
              ? 'bg-slate-900 hover:bg-slate-800 opacity-100'
              : 'bg-slate-900 hover:bg-slate-800 opacity-40 cursor-default'
          }`}
          onClick={saveConfig}
          disabled={saving || !hasChanges}
          data-testid="save-settings-btn"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={2} />
          ) : (
            <Save className="w-4 h-4 mr-2" strokeWidth={1.75} />
          )}
          {hasChanges ? 'Save Changes' : 'Saved'}
        </Button>
      </div>

      {/* Main Content - Tabbed Layout */}
      <Tabs defaultValue="business" className="w-full max-w-2xl mx-auto">
        <TabsList className="w-full max-w-xl mx-auto flex justify-center bg-slate-100/70 p-1 rounded-full h-auto border border-slate-200 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
          <TabsTrigger value="business" className="flex-1 text-[13px] font-medium py-2 px-4 rounded-full text-slate-500 transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:shadow-slate-200/80 hover:text-slate-700">
            Business
          </TabsTrigger>
          <TabsTrigger value="personality" className="flex-1 text-[13px] font-medium py-2 px-4 rounded-full text-slate-500 transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:shadow-slate-200/80 hover:text-slate-700">
            Personality
          </TabsTrigger>
          <TabsTrigger value="data" className="flex-1 text-[13px] font-medium py-2 px-4 rounded-full text-slate-500 transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:shadow-slate-200/80 hover:text-slate-700">
            Data
          </TabsTrigger>
          <TabsTrigger value="controls" className="flex-1 text-[13px] font-medium py-2 px-4 rounded-full text-slate-500 transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:shadow-slate-200/80 hover:text-slate-700">
            Controls
          </TabsTrigger>
          <TabsTrigger value="model" className="flex-1 text-[13px] font-medium py-2 px-4 rounded-full text-slate-500 transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:shadow-slate-200/80 hover:text-slate-700">
            Model
          </TabsTrigger>
        </TabsList>

        {/* ===== BUSINESS TAB ===== */}
        <TabsContent value="business" className="mt-5">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white border-slate-200/80 shadow-sm">
              <CardContent className="p-5">
                <SectionHeader
                  icon={Building2}
                  title="Business Information"
                  description="Tell the AI about your business"
                />
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-[12px] font-medium">Business Name</Label>
                      <Input
                        value={config.business_name || ''}
                        onChange={(e) => handleChange('business_name', e.target.value)}
                        placeholder="Your Company Name"
                        className="h-9 text-[13px] border-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-[12px] font-medium">Industry</Label>
                      <Select value={config.vertical} onValueChange={(v) => handleChange('vertical', v)}>
                        <SelectTrigger className="h-9 text-[13px] border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">General Business</SelectItem>
                          <SelectItem value="clinic">Medical / Clinic</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="retail">Retail / E-commerce</SelectItem>
                          <SelectItem value="services">Professional Services</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-[12px] font-medium">Business Description</Label>
                    <Textarea
                      value={config.business_description || ''}
                      onChange={(e) => handleChange('business_description', e.target.value)}
                      placeholder="Describe what your business does..."
                      rows={3}
                      className="border-slate-200 resize-none text-[13px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-[12px] font-medium">Products / Services</Label>
                    <Textarea
                      value={config.products_services || ''}
                      onChange={(e) => handleChange('products_services', e.target.value)}
                      placeholder="List your main products or services with pricing..."
                      rows={3}
                      className="border-slate-200 resize-none text-[13px]"
                    />
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== PERSONALITY TAB ===== */}
        <TabsContent value="personality" className="mt-5">
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Languages */}
            <Card className="bg-white border-slate-200/80 shadow-sm">
              <CardContent className="p-5">
                <SectionHeader
                  icon={Globe}
                  title="Languages"
                  description="Configure language preferences"
                />
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-[12px] font-medium">Primary Language</Label>
                    <Select
                      value={config.primary_language}
                      onValueChange={(v) => {
                        handleChange('primary_language', v);
                        handleChange('secondary_languages', config.secondary_languages.filter(l => l !== v));
                      }}
                    >
                      <SelectTrigger className="h-9 text-[13px] border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uz">Uzbek</SelectItem>
                        <SelectItem value="ru">Russian</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-[12px] font-medium">Also Respond In</Label>
                    <div className="flex gap-2">
                      {[
                        { code: 'uz', label: 'Uzbek' },
                        { code: 'ru', label: 'Russian' },
                        { code: 'en', label: 'English' }
                      ].filter(lang => lang.code !== config.primary_language).map(lang => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => toggleSecondaryLanguage(lang.code)}
                          className={`flex-1 py-2 px-3 rounded-lg text-[12px] font-medium transition-all ${
                            config.secondary_languages.includes(lang.code)
                              ? 'bg-white text-slate-900 ring-1 ring-slate-900 shadow-sm'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personality */}
            <Card className="bg-white border-slate-200/80 shadow-sm">
              <CardContent className="p-5">
                <SectionHeader
                  icon={Smile}
                  title="Personality"
                  description="Define how the AI communicates"
                />
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-[12px] font-medium">Tone</Label>
                      <Select value={config.agent_tone} onValueChange={(v) => handleChange('agent_tone', v)}>
                        <SelectTrigger className="h-9 text-[13px] border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly_professional">Friendly Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="luxury">Luxury / Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-[12px] font-medium">Response Length</Label>
                      <Select value={config.response_length} onValueChange={(v) => handleChange('response_length', v)}>
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
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-[12px] font-medium">Emoji Usage</Label>
                    <div className="flex gap-2">
                      {['never', 'minimal', 'moderate', 'frequent'].map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => handleChange('emoji_usage', level)}
                          className={`flex-1 py-2 px-3 rounded-lg text-[12px] font-medium transition-all ${
                            config.emoji_usage === level
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== DATA COLLECTION TAB ===== */}
        <TabsContent value="data" className="mt-5">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white border-slate-200/80 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-slate-600" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-slate-900">Data Collection</h3>
                      <p className="text-[12px] text-slate-500 mt-0.5">Fields the AI will collect from customers</p>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    isAtLimit
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {activeFieldCount}/{MAX_ACTIVE_FIELDS} selected
                  </div>
                </div>

                {/* Active Fields as Chips */}
                <div className="flex flex-wrap gap-2 mb-4 min-h-[36px]">
                  {DATA_COLLECTION_FIELDS.filter(f => config[f.key]).map(({ key, label, icon: FieldIcon }) => (
                    <div
                      key={key}
                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 group hover:border-slate-300 transition-colors"
                    >
                      <FieldIcon className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                      <span className="text-[12px] font-medium text-slate-700">{label}</span>
                      <button
                        type="button"
                        onClick={() => handleChange(key, false)}
                        className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors ml-0.5"
                        aria-label={`Remove ${label}`}
                      >
                        <X className="w-3 h-3" strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                  {activeFieldCount === 0 && (
                    <p className="text-[12px] text-slate-400 italic py-1.5">No fields selected. Add fields below.</p>
                  )}
                </div>

                {/* Add Field Dropdown */}
                <div className="relative">
                  <Select
                    value=""
                    onValueChange={(key) => {
                      if (key && !isAtLimit) {
                        handleChange(key, true);
                      }
                    }}
                    disabled={isAtLimit}
                  >
                    <SelectTrigger
                      className={`h-10 text-[13px] border-slate-200 ${
                        isAtLimit
                          ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                          : 'bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4" strokeWidth={1.75} />
                        <span>{isAtLimit ? 'Maximum fields selected' : 'Add a field to collect...'}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      {Object.entries(CATEGORY_LABELS).map(([category, categoryLabel]) => {
                        const availableFields = DATA_COLLECTION_FIELDS.filter(
                          f => f.category === category && !config[f.key]
                        );
                        if (availableFields.length === 0) return null;
                        return (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              {categoryLabel}
                            </div>
                            {availableFields.map(({ key, label, desc, icon: FieldIcon }) => (
                              <SelectItem
                                key={key}
                                value={key}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <FieldIcon className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
                                  <span className="text-[13px]">{label}</span>
                                  <span className="text-[11px] text-slate-400">- {desc}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </div>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Helper text */}
                <p className="text-[11px] text-slate-400 mt-2">
                  Select up to {MAX_ACTIVE_FIELDS} fields. The AI will naturally collect this information during conversations.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== CONTROLS TAB ===== */}
        <TabsContent value="controls" className="mt-5">
          <div className="max-w-2xl mx-auto space-y-5">
            <Card className="bg-white border-slate-200/80 shadow-sm">
              <CardContent className="p-5">
                <SectionHeader
                  icon={Clock}
                  title="Response Timing"
                  description="Control response behavior"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-[12px] font-medium">Response Delay</Label>
                    <Select
                      value={String(config.min_response_delay)}
                      onValueChange={(v) => handleChange('min_response_delay', parseInt(v))}
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
                    <Label className="text-slate-700 text-[12px] font-medium">Rate Limit</Label>
                    <Select
                      value={String(config.max_messages_per_minute)}
                      onValueChange={(v) => handleChange('max_messages_per_minute', parseInt(v))}
                    >
                      <SelectTrigger className="h-9 text-[13px] border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 per minute</SelectItem>
                        <SelectItem value="10">10 per minute</SelectItem>
                        <SelectItem value="20">20 per minute</SelectItem>
                        <SelectItem value="0">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200/80 shadow-sm">
              <CardContent className="p-5">
                <SectionHeader
                  icon={MessageSquare}
                  title="Custom Messages"
                  description="Customize greeting and closing messages"
                />
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-[12px] font-medium">Greeting Message</Label>
                    <Textarea
                      value={config.greeting_message || ''}
                      onChange={(e) => handleChange('greeting_message', e.target.value)}
                      placeholder="Hello! How can I help you today?"
                      rows={2}
                      className="border-slate-200 resize-none text-[13px]"
                    />
                    <p className="text-[11px] text-slate-400">Leave empty to auto-generate based on language</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-[12px] font-medium">Closing Message</Label>
                    <Textarea
                      value={config.closing_message || ''}
                      onChange={(e) => handleChange('closing_message', e.target.value)}
                      placeholder="Great! I'll connect you with our team..."
                      rows={2}
                      className="border-slate-200 resize-none text-[13px]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== MODEL SELECTION TAB ===== */}
        <TabsContent value="model" className="mt-5">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white border-slate-200/80 shadow-sm">
              <CardContent className="p-5">
                <SectionHeader
                  icon={Cpu}
                  title="Model Selection"
                  description="Choose the AI model that powers your agent"
                />

                {/* Model Dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-[12px] font-medium">Active Model</Label>
                  <Select value={selectedModel} onValueChange={(v) => handleChange('sales_model', v)}>
                    <SelectTrigger className="h-10 text-[13px] border-slate-200 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[320px]">
                      {MODEL_PROVIDERS.map((provider) => (
                        <div key={provider}>
                          <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            {provider}
                          </div>
                          {AI_MODELS.filter(m => m.provider === provider).map((model) => (
                            <SelectItem key={model.id} value={model.id} className="cursor-pointer">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px]">{model.name}</span>
                                {model.badge && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{model.badge}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Model Info Panel */}
                {selectedModelData && (
                  <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-[14px] font-semibold text-slate-900">{selectedModelData.name}</h4>
                        <p className="text-[12px] text-slate-500 mt-0.5">{selectedModelData.provider}</p>
                      </div>
                      {selectedModelData.badge && (
                        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600">{selectedModelData.badge}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 p-3 rounded-lg bg-white border border-slate-100">
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Input</p>
                        <p className="text-[15px] font-semibold text-slate-900 tabular-nums">{selectedModelData.inputCost}&#162; <span className="text-[11px] font-normal text-slate-400">/ 1K tokens</span></p>
                      </div>
                      <div className="flex-1 p-3 rounded-lg bg-white border border-slate-100">
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Output</p>
                        <p className="text-[15px] font-semibold text-slate-900 tabular-nums">{selectedModelData.outputCost}&#162; <span className="text-[11px] font-normal text-slate-400">/ 1K tokens</span></p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">Capabilities</p>
                      <div className="flex items-center gap-1.5">
                        {selectedModelData.capabilities.map((cap) => (
                          <span key={cap} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-600">
                            {cap === 'text' && <Type className="w-3.5 h-3.5" strokeWidth={1.75} />}
                            {cap === 'vision' && <ImageIcon className="w-3.5 h-3.5" strokeWidth={1.75} />}
                            {cap === 'text' ? 'Text' : 'Vision'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Info Notice */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 mt-4">
                  <Sparkles className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    Model changes apply immediately to all new messages. Hit Save to persist your choice. Usage costs will be tracked per-model in your usage logs.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Unsaved Changes Navigation Blocker */}
      <Dialog open={!!pendingNav} onOpenChange={() => setPendingNav(null)}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-slate-200 gap-0">
          <DialogTitle className="sr-only">Unsaved Changes</DialogTitle>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-slate-900">
                  Unsaved Changes
                </h3>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  Your changes haven't been saved yet
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 mb-4">
              <p className="text-[13px] text-slate-600 leading-relaxed">
                You have unsaved changes that will be lost if you leave this page. Would you like to save before leaving?
              </p>
            </div>

            <div className="flex gap-2.5">
              <Button
                variant="outline"
                className="flex-1 h-10 border-slate-200 text-[13px] font-medium"
                onClick={() => {
                  const nav = pendingNav;
                  setPendingNav(null);
                  nav?.fn();
                }}
              >
                Discard
              </Button>
              <Button
                className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-medium"
                onClick={async () => {
                  await saveConfig();
                  const nav = pendingNav;
                  setPendingNav(null);
                  nav?.fn();
                }}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={2} />
                ) : (
                  <Save className="w-4 h-4 mr-2" strokeWidth={1.75} />
                )}
                Save & Leave
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentSettingsPage;
