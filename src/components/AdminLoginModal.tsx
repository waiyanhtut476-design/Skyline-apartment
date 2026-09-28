import React, { useState } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Lock, ShieldCheck, X, AlertTriangle, KeyRound } from 'lucide-react';

export const AdminLoginModal: React.FC = () => {
  const { showLoginModal, setShowLoginModal, loginAsAdmin } = useAdminAuth();
  const [email, setEmail] = useState('admin@skylineresidence.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);

  if (!showLoginModal) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('ကျေးဇူးပြု၍ Email နှင့် Password ထည့်သွင်းပါ။');
      return;
    }
    const success = loginAsAdmin(email, password);
    if (!success) {
      setError('အကောင့်အချက်အလက် မမှန်ကန်ပါ။');
    } else {
      setError(null);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-login-modal-title"
    >
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 relative">
        <button
          onClick={() => setShowLoginModal(false)}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close login modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <Lock className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
              Authorization Required
            </span>
            <h3 id="admin-login-modal-title" className="text-lg font-extrabold text-slate-900">
              အိမ်ရှင်အကောင့် Login ဝင်ရန်
            </h3>
          </div>
        </div>

        {/* Guest Warning Notice */}
        <div className="mb-4 p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            လက်ရှိတွင် <strong>Guest Read-Only Mode</strong> ဖြစ်နေပါသဖြင့် အချက်အလက်များ ပြင်ဆင်ခြင်း၊ ဘေလ်တွက်ချက်သိမ်းဆည်းခြင်းနှင့် ဖျက်ပစ်ခြင်းများ ဆောင်ရွက်ရန် အိမ်ရှင်အကောင့် အရင်ဝင်ရောက်ပေးရမည် ဖြစ်ပါသည်။
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Admin Email (အိမ်ရှင်အီးမေးလ်):
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900 font-medium"
              placeholder="admin@skylineresidence.com"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Password (စကားဝှက်):
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-slate-900 font-medium"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              {error}
            </p>
          )}

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowLoginModal(false)}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
            >
              ဧည့်သည်အဖြစ်သာ ကြည့်မည် (Cancel)
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-sky-400" />
              <span>Login ဝင်မည်</span>
            </button>
          </div>

          <div className="pt-2 text-center text-[11px] text-slate-400">
            စမ်းသပ်ရန် အဆင်သင့်ဖြည့်ထားပြီးဖြစ်သည် (Default: <code>admin123</code>)
          </div>
        </form>
      </div>
    </div>
  );
};
