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
  Globe
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in" data-testid="sales-agent-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-['Manrope'] tracking-tight">Sales Agent</h1>
          <p className="text-muted-foreground mt-1">
            Configure your AI sales agent behavior and personality
          </p>
        </div>
        <Button onClick={saveConfig} disabled={saving} data-testid="save-config-btn">
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Business Info */}
        <Card className="card-hover" data-testid="business-info-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-['Manrope']">Business Information</CardTitle>
                <CardDescription>Tell the AI about your business</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  placeholder="Your Company Name"
                  value={config.business_name || ''}
                  onChange={(e) => handleChange('business_name', e.target.value)}
                  data-testid="business-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vertical">Industry Vertical</Label>
                <Select 
                  value={config.vertical} 
                  onValueChange={(value) => handleChange('vertical', value)}
                >
                  <SelectTrigger data-testid="vertical-select">
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

            <div className="space-y-2">
              <Label htmlFor="description">Business Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what your business does, your unique value proposition, and target customers..."
                value={config.business_description || ''}
                onChange={(e) => handleChange('business_description', e.target.value)}
                rows={3}
                data-testid="business-description-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="products">Products / Services</Label>
              <Textarea
                id="products"
                placeholder="List your main products or services with pricing information..."
                value={config.products_services || ''}
                onChange={(e) => handleChange('products_services', e.target.value)}
                rows={3}
                data-testid="products-services-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faq">Common Objections / FAQ</Label>
              <Textarea
                id="faq"
                placeholder="List common customer questions and objections with suggested responses..."
                value={config.faq_objections || ''}
                onChange={(e) => handleChange('faq_objections', e.target.value)}
                rows={3}
                data-testid="faq-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Agent Persona */}
        <Card className="card-hover" data-testid="agent-persona-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-lg font-['Manrope']">Agent Persona</CardTitle>
                <CardDescription>Define how the AI communicates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tone">Communication Tone</Label>
                <Select 
                  value={config.agent_tone} 
                  onValueChange={(value) => handleChange('agent_tone', value)}
                >
                  <SelectTrigger data-testid="tone-select">
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
              <div className="space-y-2">
                <Label htmlFor="language">Primary Language</Label>
                <Select 
                  value={config.primary_language} 
                  onValueChange={(value) => handleChange('primary_language', value)}
                >
                  <SelectTrigger data-testid="language-select">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uz">O'zbek (Uzbek)</SelectItem>
                    <SelectItem value="ru">Русский (Russian)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Collect Phone Number</p>
                  <p className="text-sm text-muted-foreground">
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
        <Card className="card-hover" data-testid="greeting-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <CardTitle className="text-lg font-['Manrope']">Greeting Message</CardTitle>
                <CardDescription>First message sent when user starts a chat</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Assalomu alaykum! Men sizga qanday yordam bera olaman? / Здравствуйте! Чем могу помочь?"
              value={config.greeting_message || ''}
              onChange={(e) => handleChange('greeting_message', e.target.value)}
              rows={3}
              data-testid="greeting-message-input"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Leave empty to use the default bilingual greeting
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesAgentPage;
