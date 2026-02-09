import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/card';
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
  TrendingUp,
  Users,
  MessageSquare,
  CheckCircle,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Reusable Logo component
const Logo = ({ size = 'default' }) => {
  const sizes = {
    small: { container: 'w-7 h-7', icon: 'w-3.5 h-3.5', text: 'text-xl' },
    default: { container: 'w-9 h-9', icon: 'w-4.5 h-4.5', text: 'text-2xl' },
    large: { container: 'w-10 h-10', icon: 'w-5 h-5', text: 'text-3xl' }
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-2.5">
      <div className={`${s.container} rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm`}>
        <Zap className={`${s.icon} text-white`} strokeWidth={2.5} />
      </div>
      <span className={`${s.text} font-bold font-['Plus_Jakarta_Sans'] tracking-tight`}>
        <span className="text-emerald-600">Lead</span>
        <span className="text-slate-900">Relay</span>
      </span>
    </div>
  );
};

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

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
        navigate('/app/agents');
      } else {
        await register(email, password, name, businessName);
        setShowConfirmationMessage(true);
        toast.success('Account created! Please check your email to confirm.');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'An error occurred. Please try again.';
      setError(errorMsg);

      if (errorMsg.includes('confirm your email')) {
        toast.error('Please confirm your email first. Check your inbox.');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password?email=${encodeURIComponent(email)}`, {
        method: 'POST'
      });

      if (response.ok) {
        setForgotPasswordSent(true);
        toast.success('Password reset link sent! Check your email.');
      } else {
        const data = await response.json();
        toast.info(data.message || 'If this email is registered, a reset link will be sent.');
        setForgotPasswordSent(true);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/resend-confirmation?email=${encodeURIComponent(email)}`, {
        method: 'POST'
      });
      const data = await response.json();
      toast.success(data.message || 'Confirmation email sent!');
    } catch (err) {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: MessageSquare, text: "AI-powered Telegram sales agent" },
    { icon: TrendingUp, text: "Lead scoring & pipeline tracking" },
    { icon: Users, text: "CRM integration with Bitrix24" },
  ];

  // Show confirmation message after registration
  if (showConfirmationMessage) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Fixed Logo */}
        <div className="fixed top-0 left-0 right-0 z-10 px-6 py-5 bg-slate-50/80 backdrop-blur-sm">
          <Logo />
        </div>

        <div className="min-h-screen flex items-center justify-center p-6 pt-20">
          <Card className="w-full max-w-md bg-white border-slate-200 shadow-sm">
            <CardContent className="pt-10 pb-10 px-8 text-center">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Mail className="w-7 h-7 text-emerald-600" strokeWidth={1.75} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-2">Check Your Email</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                We've sent a confirmation link to<br />
                <span className="text-slate-900 font-medium">{email}</span>
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => {
                    setShowConfirmationMessage(false);
                    setIsLogin(true);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-sm font-medium shadow-sm"
                >
                  Back to Sign In
                </Button>
                <button
                  onClick={handleResendConfirmation}
                  disabled={loading}
                  className="text-sm text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  {loading ? 'Sending...' : "Didn't receive it? Resend email"}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show forgot password form
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Fixed Logo */}
        <div className="fixed top-0 left-0 right-0 z-10 px-6 py-5 bg-slate-50/80 backdrop-blur-sm">
          <Logo />
        </div>

        <div className="min-h-screen flex items-center justify-center p-6 pt-20">
          <Card className="w-full max-w-sm bg-white border-slate-200 shadow-sm">
            <CardContent className="pt-8 pb-8 px-6">
              {forgotPasswordSent ? (
                <div className="text-center">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-6 h-6 text-emerald-600" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-2">Check Your Email</h2>
                  <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                    If <span className="text-slate-700 font-medium">{email}</span> is registered, you'll receive a password reset link.
                  </p>
                  <Button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordSent(false);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-10 text-sm font-medium shadow-sm"
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-1">Reset Password</h2>
                    <p className="text-sm text-slate-500">Enter your email to receive a reset link</p>
                  </div>

                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-email" className="text-slate-700 text-sm font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.75} />
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-10 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 h-10 text-sm font-medium shadow-sm"
                      disabled={loading}
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" strokeWidth={2} />}
                      Send Reset Link
                    </Button>

                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Back to Sign In
                    </button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Fixed Logo - visible on all screen sizes */}
      <div className="fixed top-0 left-0 right-0 z-10 px-6 py-5 bg-slate-50/80 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none">
        <Logo />
      </div>

      {/* Left side - Branding (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-white border-r border-slate-200 flex-col justify-center px-16 xl:px-24">
        <div className="max-w-lg">
          <h1 className="text-4xl xl:text-5xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-4 leading-[1.15] tracking-tight">
            Convert Telegram chats{' '}
            <span className="text-emerald-600">into paying customers</span>
          </h1>

          <p className="text-lg text-slate-500 mb-10 leading-relaxed">
            AI sales agent that speaks Uzbek, Russian & English. Qualifies leads, handles objections, and closes deals automatically.
          </p>

          <div className="space-y-4">
            {features.map(({ icon: Icon, text }, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
                </div>
                <span className="text-slate-700">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 pt-24 lg:pt-6">
        <Card className="w-full max-w-sm bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-8 pb-8 px-6">
            {/* Mobile tagline */}
            <p className="lg:hidden text-sm text-slate-500 mb-6 text-center">
              AI-powered sales agent for Telegram
            </p>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-1">
                {isLogin ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-sm text-slate-500">
                {isLogin ? 'Sign in to your dashboard' : 'Start converting leads today'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-slate-700 text-sm font-medium">Your Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.75} />
                      <Input
                        id="name"
                        data-testid="register-name-input"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 h-10 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="business" className="text-slate-700 text-sm font-medium">Business Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.75} />
                      <Input
                        id="business"
                        data-testid="register-business-input"
                        placeholder="My Company LLC"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="pl-10 h-10 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-700 text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.75} />
                  <Input
                    id="email"
                    type="email"
                    data-testid="login-email-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-slate-700 text-sm font-medium">Password</Label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-slate-500 hover:text-emerald-600 transition-colors"
                      data-testid="forgot-password-btn"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.75} />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    data-testid="login-password-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-10 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    data-testid="toggle-password-visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                  {error}
                  {error.includes('confirm your email') && (
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      className="block mt-1.5 text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Resend confirmation email
                    </button>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-sm font-medium shadow-sm"
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

            <div className="mt-6 text-center">
              <span className="text-sm text-slate-500">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
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
