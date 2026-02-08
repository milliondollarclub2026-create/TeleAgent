import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Mail, 
  Lock, 
  User, 
  Building2, 
  ArrowRight, 
  Loader2,
  Eye,
  EyeOff,
  Zap,
  TrendingUp,
  Users,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await login(email, password);
        toast.success('Welcome back!');
      } else {
        await register(email, password, name, businessName);
        toast.success('Account created successfully!');
      }
      navigate('/dashboard');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'An error occurred. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: MessageSquare, text: "AI-powered Telegram sales agent" },
    { icon: TrendingUp, text: "Lead scoring & pipeline tracking" },
    { icon: Users, text: "CRM integration with Bitrix24" },
  ];

  return (
    <div className="min-h-screen flex bg-[#F5F7F6]">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-white border-r border-slate-200 flex-col justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <span className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans']">TeleAgent</span>
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-3 leading-tight">
            Convert Telegram chats<br />
            <span className="text-emerald-600">into paying customers</span>
          </h1>
          
          <p className="text-slate-600 mb-8 leading-relaxed">
            AI sales agent that speaks Uzbek, Russian & English. Qualifies leads, handles objections, and closes deals automatically.
          </p>
          
          <div className="space-y-3">
            {features.map(({ icon: Icon, text }, index) => (
              <div key={index} className="flex items-center gap-3 text-slate-700">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
                </div>
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-sm bg-white border-slate-200 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <div className="lg:hidden flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" strokeWidth={2} />
              </div>
              <span className="text-lg font-bold text-slate-900">TeleAgent</span>
            </div>
            <CardTitle className="text-xl font-['Plus_Jakarta_Sans'] text-slate-900">
              {isLogin ? 'Welcome back' : 'Create account'}
            </CardTitle>
            <CardDescription className="text-slate-500 text-sm">
              {isLogin ? 'Sign in to your dashboard' : 'Start converting leads today'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              {!isLogin && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-slate-700 text-sm">Your Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.75} />
                      <Input
                        id="name"
                        data-testid="register-name-input"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9 h-9 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="business" className="text-slate-700 text-sm">Business Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.75} />
                      <Input
                        id="business"
                        data-testid="register-business-input"
                        placeholder="My Company LLC"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="pl-9 h-9 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-700 text-sm">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.75} />
                  <Input
                    id="email"
                    type="email"
                    data-testid="login-email-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-9 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-700 text-sm">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.75} />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    data-testid="login-password-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 h-9 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    data-testid="toggle-password-visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-9 text-sm"
                data-testid="login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" strokeWidth={2} />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" strokeWidth={2} />
                )}
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-slate-500">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-emerald-600 hover:text-emerald-700 font-medium"
                data-testid="toggle-auth-mode-btn"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
