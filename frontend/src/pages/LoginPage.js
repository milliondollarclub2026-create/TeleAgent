import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import AiOrb from '../components/Orb/AiOrb';

const API_URL = process.env.REACT_APP_BACKEND_URL;

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

  // Story-driven left panel — "Meet Your AI Team"
  const GradientPanel = () => (
    <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-white border-r border-slate-100">
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-slate-50/80 via-slate-50/30 to-transparent pointer-events-none z-[1]" />

      {/* Ultra-subtle ambient color hints behind orb positions */}
      <div className="absolute top-[28%] left-[22%] w-[280px] h-[280px] bg-emerald-50/40 rounded-full blur-[100px]" />
      <div className="absolute top-[40%] left-[45%] w-[220px] h-[220px] bg-indigo-50/30 rounded-full blur-[90px]" />
      <div className="absolute top-[28%] right-[8%] w-[240px] h-[240px] bg-amber-50/30 rounded-full blur-[90px]" />

      {/* Logo — pinned top-left */}
      <div className="absolute top-0 left-0 z-20 px-8 py-6">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.svg"
            alt="LeadRelay"
            className="h-9 w-9"
            style={{ objectFit: 'contain' }}
          />
          <span className="text-2xl font-bold font-['Plus_Jakarta_Sans'] tracking-tight">
            <span className="text-emerald-600">Lead</span><span className="text-slate-900">Relay</span>
          </span>
        </div>
      </div>

      {/* Centered story content */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 xl:px-16">
        {/* Headline */}
        <div className={`text-center mb-16 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-3xl xl:text-[40px] font-bold font-['Plus_Jakarta_Sans'] mb-3 leading-[1.15] tracking-tight">
            <span className="text-slate-900">Your </span>
            <span className="text-emerald-600">AI sales team.</span>
            <br />
            <span className="text-slate-900">Always closing.</span>
          </h1>
          <p className="text-slate-400 text-[15px] leading-relaxed max-w-sm mx-auto">
            Three agents. <span className="text-slate-600 font-medium">Qualifying, answering, closing.</span><br />Every hour. Every language.
          </p>
        </div>

        {/* AI Team */}
        <div className="flex items-start justify-center gap-16 xl:gap-20">
          {/* Sales Agent */}
          <div className={`flex flex-col items-center transition-all duration-700 delay-[400ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="login-agent-float-1">
              <AiOrb size={88} colors={['#10b981', '#059669', '#14b8a6']} />
            </div>
            <span className="mt-4 text-xs font-semibold text-slate-700 tracking-wide">Sales</span>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1 h-1 rounded-full bg-emerald-500 login-active-dot" />
              <span className="text-[10px] text-slate-400">Active</span>
            </div>
          </div>

          {/* Support Agent */}
          <div className={`flex flex-col items-center transition-all duration-700 delay-[600ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="login-agent-float-2">
              <AiOrb size={88} colors={['#6366f1', '#8b5cf6', '#3b82f6']} />
            </div>
            <span className="mt-4 text-xs font-semibold text-slate-700 tracking-wide">Support</span>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1 h-1 rounded-full bg-indigo-500 login-active-dot" />
              <span className="text-[10px] text-slate-400">Active</span>
            </div>
          </div>

          {/* Analytics Agent */}
          <div className={`flex flex-col items-center transition-all duration-700 delay-[800ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="login-agent-float-3">
              <AiOrb size={88} colors={['#f97316', '#ea580c', '#f59e0b']} />
            </div>
            <span className="mt-4 text-xs font-semibold text-slate-700 tracking-wide">Analytics</span>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1 h-1 rounded-full bg-amber-500 login-active-dot" />
              <span className="text-[10px] text-slate-400">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Show confirmation message after registration
  if (showConfirmationMessage) {
    return (
      <div className="min-h-screen flex bg-white relative overflow-hidden">
        <GradientPanel />

        <div className="flex-1 flex items-center justify-center p-6 relative">
          <div className={`w-full max-w-sm transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="text-center">
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
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-sm font-medium rounded-xl"
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
            </div>
          </div>
        </div>

        <style>{loginStyles}</style>
      </div>
    );
  }

  // Show forgot password form
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex bg-white relative overflow-hidden">
        <GradientPanel />

        <div className="flex-1 flex items-center justify-center p-6 relative">
          <div className={`w-full max-w-sm transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
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
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-10 text-sm font-medium rounded-xl"
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 font-['Plus_Jakarta_Sans'] mb-1">Reset Password</h2>
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
                        className="pl-10 h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-sm font-medium rounded-xl"
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
          </div>
        </div>

        <style>{loginStyles}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white relative overflow-hidden">
      {/* Left side - Gradient brand panel */}
      <GradientPanel />

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-slate-50/60 via-slate-50/20 to-transparent pointer-events-none z-0" />

        {/* Mobile logo */}
        <div className="lg:hidden absolute top-0 left-0 right-0 px-6 py-5">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="LeadRelay" className="h-9 w-9" style={{ objectFit: 'contain' }} />
            <span className="text-2xl font-bold font-['Plus_Jakarta_Sans'] tracking-tight">
              <span className="text-emerald-600">Lead</span>
              <span className="text-slate-900">Relay</span>
            </span>
          </div>
        </div>

        <div className={`w-full max-w-sm transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.98]'}`}>
          {/* Mobile tagline */}
          <p className="lg:hidden text-sm text-slate-500 mb-6 text-center">
            Your AI sales team, ready to work
          </p>

          <div className="mb-8">
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
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-200 group-focus-within:text-emerald-500" strokeWidth={1.75} />
                    <Input
                      id="name"
                      data-testid="register-name-input"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
                      required={!isLogin}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="business" className="text-slate-700 text-sm font-medium">Business Name</Label>
                  <div className="relative group">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-200 group-focus-within:text-emerald-500" strokeWidth={1.75} />
                    <Input
                      id="business"
                      data-testid="register-business-input"
                      placeholder="My Company LLC"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="pl-10 h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
                      required={!isLogin}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
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
                  className="pl-10 h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
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
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors duration-200 group-focus-within:text-emerald-500" strokeWidth={1.75} />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  data-testid="login-password-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-xl"
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
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
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
              className="w-full bg-slate-900 hover:bg-emerald-600 h-11 text-sm font-medium rounded-xl group transition-colors duration-200"
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

          <div className="mt-8 text-center">
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
        </div>
      </div>

      <style>{loginStyles}</style>
    </div>
  );
};

const loginStyles = `
  /* Agent gentle breathing — subtle vertical float to feel alive */
  .login-agent-float-1 {
    animation: agent-breathe-1 6s ease-in-out 1.5s infinite;
  }

  .login-agent-float-2 {
    animation: agent-breathe-2 7s ease-in-out 2s infinite;
  }

  .login-agent-float-3 {
    animation: agent-breathe-3 8s ease-in-out 1.8s infinite;
  }

  @keyframes agent-breathe-1 {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  @keyframes agent-breathe-2 {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  @keyframes agent-breathe-3 {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
  }

  /* Active status dot pulse */
  .login-active-dot {
    animation: active-pulse 2s ease-in-out infinite;
  }

  @keyframes active-pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
`;

export default LoginPage;
