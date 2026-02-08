import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Bot, 
  Save, 
  Loader2,
  Building2,
  MessageSquare,
  Phone,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SalesAgentPage = () => {
  const [config, setConfig] = useState({
    vertical: 'default',
    business_name: '',
    business_description: '',
    products_services: '',
    faq_objections: '',
    collect_phone: true,
    greeting_message: '',
    agent_tone: 'professional',
    primary_language: 'uz'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${API}/config`);
      if (response.data && Object.keys(response.data).length > 0) {
        setConfig(prev => ({ ...prev, ...response.data }));
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
      toast.success('Configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in" data-testid="sales-agent-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-['Plus_Jakarta_Sans'] text-slate-900">Sales Agent</h1>
          <p className="text-slate-500 text-sm mt-0.5">Configure your AI sales agent behavior and personality</p>
        </div>
        <Button 
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={saveConfig} 
          disabled={saving} 
          data-testid="save-config-btn"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={2} />
          ) : (
            <Save className="w-4 h-4 mr-2" strokeWidth={1.75} />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-4">
        {/* Business Info */}
        <Card className="bg-white border-slate-200 shadow-sm" data-testid="business-info-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold font-['Plus_Jakarta_Sans'] text-slate-900">Business Information</CardTitle>
                <CardDescription className="text-sm text-slate-500">Tell the AI about your business</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="businessName" className="text-slate-700 text-sm">Business Name</Label>
                <Input
                  id="businessName"
                  placeholder="Your Company Name"
                  value={config.business_name || ''}
                  onChange={(e) => handleChange('business_name', e.target.value)}
                  className="h-9 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  data-testid="business-name-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vertical" className="text-slate-700 text-sm">Industry Vertical</Label>
                <Select 
                  value={config.vertical} 
                  onValueChange={(value) => handleChange('vertical', value)}
                >
                  <SelectTrigger className="h-9 border-slate-200" data-testid="vertical-select">
                    <SelectValue placeholder="Select vertical" />
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
              <Label htmlFor="description" className="text-slate-700 text-sm">Business Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what your business does, your unique value proposition, and target customers..."
                value={config.business_description || ''}
                onChange={(e) => handleChange('business_description', e.target.value)}
                rows={3}
                className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 resize-none"
                data-testid="business-description-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="products" className="text-slate-700 text-sm">Products / Services</Label>
              <Textarea
                id="products"
                placeholder="List your main products or services with pricing information..."
                value={config.products_services || ''}
                onChange={(e) => handleChange('products_services', e.target.value)}
                rows={3}
                className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 resize-none"
                data-testid="products-services-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="faq" className="text-slate-700 text-sm">Common Objections / FAQ</Label>
              <Textarea
                id="faq"
                placeholder="List common customer questions and objections with suggested responses..."
                value={config.faq_objections || ''}
                onChange={(e) => handleChange('faq_objections', e.target.value)}
                rows={3}
                className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 resize-none"
                data-testid="faq-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Agent Persona */}
        <Card className="bg-white border-slate-200 shadow-sm" data-testid="agent-persona-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-600" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold font-['Plus_Jakarta_Sans'] text-slate-900">Agent Persona</CardTitle>
                <CardDescription className="text-sm text-slate-500">Define how the AI communicates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tone" className="text-slate-700 text-sm">Communication Tone</Label>
                <Select 
                  value={config.agent_tone} 
                  onValueChange={(value) => handleChange('agent_tone', value)}
                >
                  <SelectTrigger className="h-9 border-slate-200" data-testid="tone-select">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="language" className="text-slate-700 text-sm">Primary Language</Label>
                <Select 
                  value={config.primary_language} 
                  onValueChange={(value) => handleChange('primary_language', value)}
                >
                  <SelectTrigger className="h-9 border-slate-200" data-testid="language-select">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uz">O'zbek (Uzbek)</SelectItem>
                    <SelectItem value="ru">Русский (Russian)</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-slate-500" strokeWidth={1.75} />
                <div>
                  <p className="font-medium text-slate-900 text-sm">Collect Phone Number</p>
                  <p className="text-xs text-slate-500">
                    Ask customers for their phone number during conversation
                  </p>
                </div>
              </div>
              <Switch
                checked={config.collect_phone}
                onCheckedChange={(checked) => handleChange('collect_phone', checked)}
                data-testid="collect-phone-switch"
              />
            </div>
          </CardContent>
        </Card>

        {/* Greeting Message */}
        <Card className="bg-white border-slate-200 shadow-sm" data-testid="greeting-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-violet-600" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold font-['Plus_Jakarta_Sans'] text-slate-900">Greeting Message</CardTitle>
                <CardDescription className="text-sm text-slate-500">First message sent when user starts a chat</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Assalomu alaykum! Men sizga qanday yordam bera olaman? / Здравствуйте! Чем могу помочь? / Hello! How can I help you?"
              value={config.greeting_message || ''}
              onChange={(e) => handleChange('greeting_message', e.target.value)}
              rows={3}
              className="border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 resize-none"
              data-testid="greeting-message-input"
            />
            <p className="text-xs text-slate-500 mt-2">
              Leave empty to use the default trilingual greeting (Uzbek, Russian, English)
            </p>
          </CardContent>
        </Card>

        {/* How RAG Works */}
        <Card className="bg-white border-slate-200 border-dashed shadow-sm" data-testid="rag-info-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-600" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="text-base font-semibold font-['Plus_Jakarta_Sans'] text-slate-900">How the AI Uses Your Knowledge Base</CardTitle>
                <CardDescription className="text-sm text-slate-500">Understanding the RAG system</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>
              When a customer asks a question, the AI searches your uploaded documents for relevant information 
              and uses it to provide accurate, contextual responses.
            </p>
            <div className="space-y-2">
              <p className="font-medium text-slate-900">What to upload:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-slate-500">
                <li>Product catalogs with prices and specifications</li>
                <li>Service descriptions and packages</li>
                <li>Frequently asked questions (FAQ)</li>
                <li>Company policies (returns, shipping, etc.)</li>
                <li>Contact information and working hours</li>
              </ul>
            </div>
            <p className="text-xs italic text-slate-400">
              Currently supports text documents. PDF and file upload coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesAgentPage;
