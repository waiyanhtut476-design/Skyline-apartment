import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  auth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  isFirebaseConfigured,
  type User as FirebaseUser 
} from '../firebase';

interface AdminAuthContextType {
  isAdminLoggedIn: boolean;
  adminUser: FirebaseUser | null;
  isFirebaseConfigured: boolean;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  openLoginModal: () => void;
  loginAsAdmin: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => Promise<void>;
  requireAdmin: (customMessage?: string) => boolean;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Firebase Auth user ကို App တစ်ခုလုံးအတွက် တစ်နေရာတည်းမှာ onAuthStateChanged နဲ့ ကိုင်ပါ
  // isAdmin = user ရှိမှ true
  const [adminUser, setAdminUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => Boolean(auth.currentUser));
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setAdminUser(user);
          setIsAdminLoggedIn(true);
        } else {
          setAdminUser(null);
          setIsAdminLoggedIn(false);
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Auth state change error in AdminAuthProvider:", e);
      setIsAdminLoggedIn(false);
      setAdminUser(null);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3800);
  };

  const openLoginModal = () => {
    setShowLoginModal(true);
  };

  // Firebase Authentication signInWithEmailAndPassword သီးသန့် အသုံးပြုခြင်း
  const loginAsAdmin = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (!isFirebaseConfigured) {
      return { success: false, error: 'Firebase မချိတ်ရသေးပါ' };
    }
    const cleanEmail = email.trim();
    const cleanPass = pass.trim();
    if (!cleanEmail || !cleanPass) {
      return { success: false, error: 'Email (သို့) Password မှားနေပါသည်' };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      if (userCredential && userCredential.user) {
        setAdminUser(userCredential.user);
        setIsAdminLoggedIn(true);
        setShowLoginModal(false);
        showToast('Admin အဖြစ် အောင်မြင်စွာ Login ဝင်ရောက်ပြီးပါပြီ။');
        return { success: true };
      }
      setIsAdminLoggedIn(false);
      return { success: false, error: 'Email (သို့) Password မှားနေပါသည်' };
    } catch (err: any) {
      console.warn('Firebase login failed:', err?.code || err?.message);
      setIsAdminLoggedIn(false);
      return { success: false, error: 'Email (သို့) Password မှားနေပါသည်' };
    }
  };

  const logoutAdmin = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase sign out error:', err);
    }
    setAdminUser(null);
    setIsAdminLoggedIn(false);
    showToast('Admin အကောင့်မှ ထွက်ခွာပြီးပါပြီ (Guest Mode)။');
  };

  /**
   * Action guard for admin-only features
   */
  const requireAdmin = (customMessage?: string): boolean => {
    if (isAdminLoggedIn) {
      return true;
    }
    const message = customMessage || 'ကျေးဇူးပြု၍ အိမ်ရှင် (Admin) အကောင့် အရင်ဝင်ပါ';
    showToast(message);
    openLoginModal();
    return false;
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAdminLoggedIn,
        adminUser,
        isFirebaseConfigured,
        showLoginModal,
        setShowLoginModal,
        openLoginModal,
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
