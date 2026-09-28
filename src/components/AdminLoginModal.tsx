import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export const AdminLoginModal: React.FC = () => {
  const { 
    showLoginModal, 
    setShowLoginModal, 
    loginAsAdmin, 
    isFirebaseConfigured 
  } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!showLoginModal) return null;

  const handleClose = () => {
    setShowLoginModal(false);
    setEmail('');
    setPassword('');
    setError(null);
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFirebaseConfigured) {
      setError('Firebase မချိတ်ရသေးပါ');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Email (သို့) Password မှားနေပါသည်');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await loginAsAdmin(email, password);
    setIsSubmitting(false);

    if (result.success) {
      handleClose();
    } else {
      setError(result.error || 'Email (သို့) Password မှားနေပါသည်');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-login-modal-title"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Lock className="w-4 h-4 text-amber-400" />
            </div>
            <h4 id="admin-login-modal-title" className="text-base font-bold text-slate-900">
              Admin Login
            </h4>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close login modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs">
          {!isFirebaseConfigured && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Firebase မချိတ်ရသေးပါ</span>
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              disabled={!isFirebaseConfigured || isSubmitting}
              placeholder="Email"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-sm font-medium text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              autoFocus
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              disabled={!isFirebaseConfigured || isSubmitting}
              placeholder="Password"
              className="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-sm font-medium text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              disabled={!isFirebaseConfigured || isSubmitting}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-semibold rounded-xl transition-colors cursor-pointer text-xs"
            >
              မလုပ်တော့ပါ
            </button>
            <button
              type="submit"
              disabled={!isFirebaseConfigured || isSubmitting}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-xs text-xs disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'စစ်ဆေးနေသည်...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
