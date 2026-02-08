import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid confirmation link. Please check your email for the correct link.');
      return;
    }

    const confirmEmail = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/confirm-email?token=${token}`);
        const data = await response.json();
        
        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'Email confirmed successfully!');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.detail || 'Failed to confirm email. The link may have expired.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Network error. Please try again later.');
      }
    };

    confirmEmail();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
        {/* Logo */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-emerald-600 font-['Plus_Jakarta_Sans']">
            TeleAgent
          </h1>
          <p className="text-sm text-slate-500 mt-1">AI Sales Agent Platform</p>
        </div>

        {/* Status Icon */}
        <div className="mb-6">
          {status === 'loading' && (
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
          )}
          {status === 'error' && (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          {status === 'loading' && 'Confirming your email...'}
          {status === 'success' && 'Email Confirmed!'}
          {status === 'error' && 'Confirmation Failed'}
        </h2>

        {/* Message */}
        <p className="text-slate-600 mb-6">
          {message}
        </p>

        {/* Actions */}
        {status === 'success' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Redirecting to login in 3 seconds...
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              data-testid="go-to-login-btn"
            >
              Go to Login Now
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              data-testid="back-to-login-btn"
            >
              Back to Login
            </Button>
            <p className="text-sm text-slate-500">
              Need help?{' '}
              <Link to="/login" className="text-emerald-600 hover:text-emerald-700">
                Contact support
              </Link>
            </p>
          </div>
        )}

        {status === 'loading' && (
          <p className="text-sm text-slate-500">
            Please wait while we verify your email address...
          </p>
        )}
      </div>
    </div>
  );
}
