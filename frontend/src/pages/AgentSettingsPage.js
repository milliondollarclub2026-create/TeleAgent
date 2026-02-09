import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
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
  Building2,
  Bot,
  MessageSquare,
  Save,
  Loader2,
  Settings,
  Globe,
  Smile,
  Clock,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
    collect_phone: true,
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl" data-testid="agent-settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">Agent Settings</h1>
          <p className="text-slate-500 text-sm mt-0.5">Configure your AI agent's behavior and personality</p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
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

      <div className="grid gap-5">
        {/* Business Information */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">Business Information</CardTitle>
                <CardDescription className="text-sm text-slate-500">Tell the AI about your business</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-sm">Business Name</Label>
                <Input
                  value={config.business_name || ''}
                  onChange={(e) => handleChange('business_name', e.target.value)}
                  placeholder="Your Company Name"
                  className="h-10 border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-sm">Industry</Label>
                <Select value={config.vertical} onValueChange={(v) => handleChange('vertical', v)}>
                  <SelectTrigger className="h-10">
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
              <Label className="text-slate-700 text-sm">Business Description</Label>
              <Textarea
                value={config.business_description || ''}
                onChange={(e) => handleChange('business_description', e.target.value)}
                placeholder="Describe what your business does..."
                rows={3}
                className="border-slate-200 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700 text-sm">Products / Services</Label>
              <Textarea
                value={config.products_services || ''}
                onChange={(e) => handleChange('products_services', e.target.value)}
                placeholder="List your main products or services with pricing..."
                rows={3}
                className="border-slate-200 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Communication Style */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-600" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">Communication Style</CardTitle>
                <CardDescription className="text-sm text-slate-500">Define how the AI communicates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-sm">Tone</Label>
                <Select value={config.agent_tone} onValueChange={(v) => handleChange('agent_tone', v)}>
                  <SelectTrigger className="h-10">
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
                <Label className="text-slate-700 text-sm">Response Length</Label>
                <Select value={config.response_length} onValueChange={(v) => handleChange('response_length', v)}>
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

              <div className="space-y-1.5">
                <Label className="text-slate-700 text-sm">Emoji Usage</Label>
                <Select value={config.emoji_usage} onValueChange={(v) => handleChange('emoji_usage', v)}>
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

              <div className="space-y-1.5">
                <Label className="text-slate-700 text-sm">Response Delay</Label>
                <Select
                  value={String(config.min_response_delay)}
                  onValueChange={(v) => handleChange('min_response_delay', parseInt(v))}
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Languages */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Globe className="w-5 h-5 text-violet-600" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">Languages</CardTitle>
                <CardDescription className="text-sm text-slate-500">Configure language preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 text-sm">Primary Language</Label>
                <Select
                  value={config.primary_language}
                  onValueChange={(v) => {
                    handleChange('primary_language', v);
                    handleChange('secondary_languages', config.secondary_languages.filter(l => l !== v));
                  }}
                >
                  <SelectTrigger className="h-10">
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
                <Label className="text-slate-700 text-sm">Additional Languages</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {[
                    { code: 'uz', label: 'Uzbek' },
                    { code: 'ru', label: 'Russian' },
                    { code: 'en', label: 'English' }
                  ].filter(lang => lang.code !== config.primary_language).map(lang => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => toggleSecondaryLanguage(lang.code)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        config.secondary_languages.includes(lang.code)
                          ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                          : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:border-slate-300'
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

        {/* Messages */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-amber-600" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">Messages</CardTitle>
                <CardDescription className="text-sm text-slate-500">Customize greeting and closing messages</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-sm">Greeting Message</Label>
              <Textarea
                value={config.greeting_message || ''}
                onChange={(e) => handleChange('greeting_message', e.target.value)}
                placeholder="Hello! How can I help you today?"
                rows={2}
                className="border-slate-200 resize-none"
              />
              <p className="text-xs text-slate-500">Leave empty to auto-generate based on language</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-700 text-sm">Closing Message</Label>
              <Textarea
                value={config.closing_message || ''}
                onChange={(e) => handleChange('closing_message', e.target.value)}
                placeholder="Great! I'll connect you with our team..."
                rows={2}
                className="border-slate-200 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lead Collection */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-rose-600" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">Lead Collection</CardTitle>
                <CardDescription className="text-sm text-slate-500">What information to collect from customers</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <p className="font-medium text-slate-900 text-sm">Collect Phone Number</p>
                <p className="text-xs text-slate-500">Ask customers for their phone number</p>
              </div>
              <Switch
                checked={config.collect_phone}
                onCheckedChange={(checked) => handleChange('collect_phone', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentSettingsPage;
