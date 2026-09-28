import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export const ADMIN_SESSION_KEY = 'skyline_admin_logged_in';

interface AdminAuthContextType {
  isAdminLoggedIn: boolean;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  loginAsAdmin: (email?: string, pass?: string) => boolean;
  logoutAdmin: () => void;
  requireAdmin: (customMessage?: string) => boolean;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync admin state across tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_SESSION_KEY) {
        setIsAdminLoggedIn(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3800);
  };

  const loginAsAdmin = (email = 'admin@skylineresidence.com', pass = 'admin123') => {
    if (email.trim() && pass.trim()) {
      setIsAdminLoggedIn(true);
      try {
        localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      } catch {}
      setShowLoginModal(false);
      showToast('အိမ်ရှင် (Admin) အကောင့်ဖြင့် အောင်မြင်စွာ ဝင်ရောက်ပြီးပါပြီ။');
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminLoggedIn(false);
    try {
      localStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {}
    showToast('အိမ်ရှင်အကောင့်မှ ထွက်ခွာပြီးပါပြီ (Guest Read-Only Mode သို့ ပြောင်းလဲထားပါသည်)။');
  };

  /**
   * Guards an action:
   * Returns true if user is Admin.
   * If user is Guest (not logged in), displays toast: "ကျေးဇူးပြု၍ အိမ်ရှင်အကောင့် အရင်ဝင်ပါ",
   * opens the Login modal, and returns false.
   */
  const requireAdmin = (customMessage?: string): boolean => {
    if (isAdminLoggedIn) {
      return true;
    }
    const message = customMessage || 'ကျေးဇူးပြု၍ အိမ်ရှင်အကောင့် အရင်ဝင်ပါ';
    showToast(message);
    setShowLoginModal(true);
    return false;
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAdminLoggedIn,
        showLoginModal,
        setShowLoginModal,
        loginAsAdmin,
        logoutAdmin,
        requireAdmin,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export function useAdminAuth(): AdminAuthContextType {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
