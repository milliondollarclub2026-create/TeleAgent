import React, { useState, useEffect } from 'react';
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

// Animated geometric background
const GeometricBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Dot grid pattern */}
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)`,
        backgroundSize: '24px 24px'
      }}
    />

    {/* Floating geometric shapes */}
    <div className="absolute top-[15%] left-[10%] w-64 h-64 login-float-1">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <circle cx="100" cy="100" r="80" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" className="login-rotate" />
        <circle cx="100" cy="100" r="60" fill="none" stroke="#e2e8f0" strokeWidth="1" className="login-rotate-reverse" />
        <circle cx="100" cy="100" r="4" fill="#10b981" className="login-pulse" />
      </svg>
    </div>

    <div className="absolute bottom-[20%] right-[15%] w-48 h-48 login-float-2">
      <svg viewBox="0 0 150 150" className="w-full h-full">
        <rect x="25" y="25" width="100" height="100" fill="none" stroke="#e2e8f0" strokeWidth="1" rx="8" className="login-rotate" style={{ transformOrigin: 'center' }} />
        <rect x="45" y="45" width="60" height="60" fill="none" stroke="#e2e8f0" strokeWidth="1" rx="4" className="login-rotate-reverse" style={{ transformOrigin: 'center' }} />
      </svg>
    </div>

    {/* Floating dots */}
    <div className="absolute top-[40%] left-[25%] w-2 h-2 rounded-full bg-emerald-500/20 login-float-3" />
    <div className="absolute top-[60%] left-[8%] w-3 h-3 rounded-full bg-slate-300/30 login-float-1" />
    <div className="absolute top-[25%] right-[30%] w-2 h-2 rounded-full bg-emerald-500/15 login-float-2" />
    <div className="absolute bottom-[35%] left-[20%] w-1.5 h-1.5 rounded-full bg-slate-400/20 login-float-3" />

    {/* Connecting lines */}
    <svg className="absolute top-[30%] left-[5%] w-[40%] h-[40%] opacity-[0.04]" viewBox="0 0 400 400">
      <path d="M50,200 Q200,100 350,200 Q200,300 50,200" fill="none" stroke="#0f172a" strokeWidth="1" className="login-draw-line" />
    </svg>
  </div>
);

// Feature item with animation
const FeatureItem = ({ icon: Icon, text, index }) => (
  <div
    className="flex items-center gap-4 login-feature-item group"
    style={{ animationDelay: `${300 + index * 150}ms` }}
  >
    {/* Connector dot */}
    <div className="absolute -left-6 w-2 h-2 rounded-full bg-slate-200 group-hover:bg-emerald-500 transition-colors duration-300" />

    <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-all duration-300">
      <Icon className="w-5 h-5 text-slate-500 group-hover:text-emerald-600 transition-colors duration-300" strokeWidth={1.75} />
    </div>
    <span className="text-slate-600 group-hover:text-slate-900 transition-colors duration-300">{text}</span>
  </div>
);

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
  const [mounted, setMounted] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

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
        const result = await register(email, password, name, businessName);

        if (result.requiresEmailVerification) {
          setShowConfirmationMessage(true);
          toast.success(result.message || 'Account created! Please check your email to confirm.');
        } else {
          toast.success('Account created!');
          navigate('/app/agents');
        }
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
      <div className="min-h-screen bg-slate-50 relative overflow-hidden">
        <GeometricBackground />

        <div className="fixed top-0 left-0 right-0 z-10 px-6 py-5 bg-slate-50/80 backdrop-blur-sm">
          <Logo />
        </div>

        <div className="min-h-screen flex items-center justify-center p-6 pt-20 relative z-10">
          <Card className={`w-full max-w-md bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg shadow-slate-200/50 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <CardContent className="pt-10 pb-10 px-8 text-center">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5 login-icon-float">
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
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-sm font-medium shadow-sm login-btn-hover"
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

        <style>{loginStyles}</style>
      </div>
    );
  }

  // Show forgot password form
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-slate-50 relative overflow-hidden">
        <GeometricBackground />

        <div className="fixed top-0 left-0 right-0 z-10 px-6 py-5 bg-slate-50/80 backdrop-blur-sm">
          <Logo />
        </div>

        <div className="min-h-screen flex items-center justify-center p-6 pt-20 relative z-10">
          <Card className={`w-full max-w-sm bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg shadow-slate-200/50 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <CardContent className="pt-8 pb-8 px-6">
              {forgotPasswordSent ? (
                <div className="text-center">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-4 login-icon-float">
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
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-10 text-sm font-medium shadow-sm login-btn-hover"
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
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-emerald-500" strokeWidth={1.75} />
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-10 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200 login-input"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm login-shake">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 h-10 text-sm font-medium shadow-sm login-btn-hover"
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

        <style>{loginStyles}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 relative overflow-hidden">
      {/* Fixed Logo - visible on all screen sizes */}
      <div className="fixed top-0 left-0 right-0 z-20 px-6 py-5 bg-slate-50/80 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none">
        <Logo />
      </div>

      {/* Left side - Branding (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-white border-r border-slate-100 flex-col justify-center px-16 xl:px-24 relative overflow-hidden">
        <GeometricBackground />

        <div className="max-w-lg relative z-10">
          <h1 className={`text-4xl xl:text-5xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-4 leading-[1.15] tracking-tight transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Convert Telegram chats{' '}
            <span className="text-emerald-600">into paying customers</span>
          </h1>

          <p className={`text-lg text-slate-500 mb-12 leading-relaxed transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            AI sales agent that speaks Uzbek, Russian & English. Qualifies leads, handles objections, and closes deals automatically.
          </p>

          {/* Features with connecting line */}
          <div className="relative pl-6">
            {/* Vertical connecting line */}
            <div className="absolute left-0 top-2 bottom-2 w-px bg-slate-200">
              <div className={`absolute inset-0 bg-emerald-500 origin-top transition-transform duration-1000 delay-500 ${mounted ? 'scale-y-100' : 'scale-y-0'}`} />
            </div>

            <div className="space-y-5">
              {features.map(({ icon: Icon, text }, index) => (
                <FeatureItem key={index} icon={Icon} text={text} index={index} />
              ))}
            </div>
          </div>

          {/* Decorative element */}
          <div className={`mt-16 flex items-center gap-3 transition-all duration-700 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-500"
                  style={{ animationDelay: `${800 + i * 100}ms` }}
                >
                  {['A', 'B', 'C', 'D'][i]}
                </div>
              ))}
            </div>
            <span className="text-sm text-slate-400">Join 500+ businesses</span>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 pt-24 lg:pt-6 relative">
        {/* Subtle background for right side on mobile */}
        <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)`,
              backgroundSize: '20px 20px'
            }}
          />
        </div>

        <Card className={`w-full max-w-sm bg-white/95 backdrop-blur-sm border-slate-200 shadow-xl shadow-slate-200/50 relative z-10 login-card transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.98]'}`}>
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
                  <div className="space-y-1.5 login-form-field" style={{ animationDelay: '0ms' }}>
                    <Label htmlFor="name" className="text-slate-700 text-sm font-medium">Your Name</Label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-200 group-focus-within:text-emerald-500" strokeWidth={1.75} />
                      <Input
                        id="name"
                        data-testid="register-name-input"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 h-10 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200 login-input"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 login-form-field" style={{ animationDelay: '50ms' }}>
                    <Label htmlFor="business" className="text-slate-700 text-sm font-medium">Business Name</Label>
                    <div className="relative group">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-200 group-focus-within:text-emerald-500" strokeWidth={1.75} />
                      <Input
                        id="business"
                        data-testid="register-business-input"
                        placeholder="My Company LLC"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="pl-10 h-10 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200 login-input"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1.5 login-form-field" style={{ animationDelay: isLogin ? '0ms' : '100ms' }}>
                <Label htmlFor="email" className="text-slate-700 text-sm font-medium">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-200 group-focus-within:text-emerald-500" strokeWidth={1.75} />
                  <Input
                    id="email"
                    type="email"
                    data-testid="login-email-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200 login-input"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 login-form-field" style={{ animationDelay: isLogin ? '50ms' : '150ms' }}>
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
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-200 group-focus-within:text-emerald-500" strokeWidth={1.75} />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    data-testid="login-password-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-10 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200 login-input"
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
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm login-shake">
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
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-sm font-medium shadow-sm login-btn-hover group"
                data-testid="login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" strokeWidth={2} />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
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

      <style>{loginStyles}</style>
    </div>
  );
};

const loginStyles = `
  /* Floating animations */
  @keyframes login-float-1 {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-15px) rotate(3deg); }
  }
  @keyframes login-float-2 {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-10px) rotate(-2deg); }
  }
  @keyframes login-float-3 {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .login-float-1 { animation: login-float-1 8s ease-in-out infinite; }
  .login-float-2 { animation: login-float-2 10s ease-in-out infinite; animation-delay: 1s; }
  .login-float-3 { animation: login-float-3 6s ease-in-out infinite; animation-delay: 2s; }

  /* Rotation animations */
  @keyframes login-rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes login-rotate-reverse {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }

  .login-rotate { animation: login-rotate 60s linear infinite; }
  .login-rotate-reverse { animation: login-rotate-reverse 45s linear infinite; }

  /* Pulse animation */
  @keyframes login-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.2); }
  }
  .login-pulse { animation: login-pulse 3s ease-in-out infinite; }

  /* Icon float */
  @keyframes login-icon-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  .login-icon-float { animation: login-icon-float 3s ease-in-out infinite; }

  /* Draw line animation */
  @keyframes login-draw-line {
    from { stroke-dasharray: 0 1000; }
    to { stroke-dasharray: 1000 0; }
  }
  .login-draw-line {
    stroke-dasharray: 0 1000;
    animation: login-draw-line 3s ease-out forwards;
    animation-delay: 1s;
  }

  /* Feature item animation */
  @keyframes login-feature-in {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  .login-feature-item {
    opacity: 0;
    animation: login-feature-in 0.5s ease-out forwards;
    position: relative;
  }

  /* Card entrance */
  .login-card {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  .login-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
  }

  /* Input focus effect */
  .login-input {
    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  }
  .login-input:focus {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px -2px rgba(16, 185, 129, 0.15);
  }

  /* Button hover */
  .login-btn-hover {
    transition: all 0.2s ease;
  }
  .login-btn-hover:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px -2px rgba(16, 185, 129, 0.3);
  }
  .login-btn-hover:active:not(:disabled) {
    transform: translateY(0);
  }

  /* Error shake */
  @keyframes login-shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-4px); }
    40%, 80% { transform: translateX(4px); }
  }
  .login-shake {
    animation: login-shake 0.4s ease-out;
  }

  /* Form field stagger */
  .login-form-field {
    opacity: 1;
  }
`;

export default LoginPage;
