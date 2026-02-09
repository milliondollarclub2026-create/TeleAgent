import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
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
  Smile
} from 'lucide-react';
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
    collect_location: false,
    vertical: 'default'
  });

  useEffect(() => {
    fetchConfig();
  }, [agentId]);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      if (response.data) {
        setConfig(prev => ({
          ...prev,
          ...response.data,
          secondary_languages: response.data.secondary_languages || ['ru', 'en']
        }));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Configure your AI agent's behavior and personality</p>
        </div>
        <Button
          className="bg-slate-900 hover:bg-slate-800 h-9 px-4 text-[13px] font-medium shadow-sm"
          onClick={saveConfig}
          disabled={saving}
          data-testid="save-settings-btn"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={2} />
          ) : (
            <Save className="w-4 h-4 mr-2" strokeWidth={1.75} />
          )}
          Save Changes
        </Button>
      </div>

      {/* Main Content - 2 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Business Information */}
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

          {/* Custom Messages */}
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

        {/* Right Column */}
        <div className="space-y-5">
          {/* Personality & Communication */}
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

          {/* Response Timing */}
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

          {/* Data Collection */}
          <Card className="bg-white border-slate-200/80 shadow-sm">
            <CardContent className="p-5">
              <SectionHeader
                icon={User}
                title="Data Collection"
                description="What information to collect from customers"
              />
              <div className="space-y-1">
                {[
                  { key: 'collect_name', label: 'Customer Name', desc: 'Full name' },
                  { key: 'collect_phone', label: 'Phone Number', desc: 'Contact number' },
                  { key: 'collect_product', label: 'Product Interest', desc: 'What they want' },
                  { key: 'collect_budget', label: 'Budget Range', desc: 'Price range' },
                  { key: 'collect_location', label: 'Location', desc: 'Delivery address' },
                ].map(({ key, label, desc }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors -mx-1"
                  >
                    <div>
                      <span className="text-[13px] font-medium text-slate-900">{label}</span>
                      <span className="text-[11px] text-slate-400 ml-2">{desc}</span>
                    </div>
                    <Switch
                      checked={config[key] || false}
                      onCheckedChange={(checked) => handleChange(key, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AgentSettingsPage;
