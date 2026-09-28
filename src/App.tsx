/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { AdminLoginModal } from './components/AdminLoginModal';
import RoomStatus from './components/RoomStatus';
import BillCalculator from './components/BillCalculator';
import { Room } from './types/room';
import { generateInitialRooms } from './data/initialRooms';
import { 
  subscribeToRoomsCollection, 
  subscribeToRoomPrivateCollection, 
  saveRoomToFirestore, 
  seedInitialRoomsIfEmpty,
  PublicRoomDoc,
  RoomPrivateDoc
} from './firebase';
import { 
  Building2, 
  Calculator, 
  Layers, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

function MainApp() {
  const { isAdminLoggedIn } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'rooms' | 'billing'>('rooms');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedBillRoomNumber, setSelectedBillRoomNumber] = useState<string>('101');

  // Real-time Firestore state
  const [rawRooms, setRawRooms] = useState<PublicRoomDoc[]>([]);
  const [privateMap, setPrivateMap] = useState<Record<string, RoomPrivateDoc>>({});
  const [isRoomsLoaded, setIsRoomsLoaded] = useState<boolean>(false);
  const [hasAttemptedSeed, setHasAttemptedSeed] = useState<boolean>(false);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // 1. Subscribe to Firestore 'rooms' collection (doc ID = roomNumber) via onSnapshot in real-time
  useEffect(() => {
    const unsubscribe = subscribeToRoomsCollection(
      (firestoreRooms) => {
        setRawRooms(firestoreRooms);
        setIsRoomsLoaded(true);
      },
      (error) => {
        console.error("Firestore 'rooms' load error:", error);
        showToast(`Firestore Rooms ဒေတာ ဖတ်ယူ၍ မရပါ: ${error.message || 'Error'}`, 'error');
        setIsRoomsLoaded(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Auto-seed 66 rooms (floors 1-4 = 1700฿, floors 5-6 = 1200฿, all Available) if rooms is empty and Admin is logged in
  useEffect(() => {
    if (isRoomsLoaded && rawRooms.length === 0 && isAdminLoggedIn && !hasAttemptedSeed) {
      setHasAttemptedSeed(true);
      seedInitialRoomsIfEmpty(true).then((res) => {
        if (res.seeded) {
          showToast('အခန်း ၆၆ ခန်းကို Firestore ထဲသို့ အောင်မြင်စွာ ထည့်သွင်းပြီးပါပြီ (Initial Seed Done)။', 'success');
        } else if (res.error) {
          showToast(`Firestore Seed မအောင်မြင်ပါ: ${res.error}`, 'error');
        }
      });
    }
  }, [isRoomsLoaded, rawRooms.length, isAdminLoggedIn, hasAttemptedSeed]);

  // 3. Subscribe to Firestore 'roomPrivate' collection ONLY when Admin is logged in
  // Guest cannot read roomPrivate (enforced by security rules and client logic)
  useEffect(() => {
    if (!isAdminLoggedIn) {
      setPrivateMap({});
      return;
    }

    const unsubscribe = subscribeToRoomPrivateCollection(
      (pMap) => {
        setPrivateMap(pMap);
      },
      (error) => {
        console.warn("Firestore roomPrivate error:", error);
        showToast(`Private Notes ဒေတာ ဖတ်ယူ၍ မရပါ: ${error.message || 'Error'}`, 'error');
      }
    );
    return () => unsubscribe();
  }, [isAdminLoggedIn]);

  // 4. Combine public rooms with private data (if Admin)
  const combinedRooms: Room[] = useMemo(() => {
    if (rawRooms.length > 0) {
      return rawRooms.map((r) => {
        const priv = isAdminLoggedIn ? privateMap[r.roomNumber] : undefined;
        return {
          id: r.roomNumber,
          roomNumber: r.roomNumber,
          floor: r.floor,
          roomType: r.roomType,
          monthlyRent: r.monthlyRent,
          status: r.status,
          tenantName: r.tenantName || '',
          // Sensitive data only populated for authenticated Admin
          tenantPhone: priv?.tenantPhone || '',
          privateNotes: priv?.privateNotes || priv?.notes || '',
          notes: priv?.notes || priv?.privateNotes || '',
          moveInDate: priv?.moveInDate || priv?.checkInDate || '',
          contractEndDate: priv?.contractEndDate || '',
          checkInDate: priv?.checkInDate || priv?.moveInDate || '',
          updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
        };
      });
    }

    // Default template while loading from Firestore
    const defaultRooms = generateInitialRooms();
    if (!isAdminLoggedIn) {
      return defaultRooms.map(r => ({
        ...r,
        tenantPhone: '',
        notes: '',
        privateNotes: '',
        moveInDate: undefined,
        contractEndDate: undefined,
      }));
    }
    return defaultRooms;
  }, [rawRooms, privateMap, isAdminLoggedIn]);

  // 5. Handle Save Room to Firestore
  const handleSaveRoom = async (updatedRoom: Room) => {
    if (!isAdminLoggedIn) {
      showToast('ခွင့်ပြုချက်မရှိပါ (Admin သီးသန့် ဖြစ်ပါသည်)', 'error');
      return;
    }

    const result = await saveRoomToFirestore(updatedRoom, true);
    if (result.success) {
      showToast(`အခန်း ${updatedRoom.roomNumber} ၏ အချက်အလက်များကို Firestore တွင် သိမ်းဆည်းပြီးပါပြီ။`, 'success');
    } else {
      showToast(`အခန်းဒေတာ သိမ်းဆည်း၍ မရပါ: ${result.error}`, 'error');
    }
  };

  const handleNavigateToBillCalculator = (roomNumber: string) => {
    setSelectedBillRoomNumber(roomNumber);
    setActiveTab('billing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div 
          className={`fixed bottom-6 right-6 z-50 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200 border ${
            toast.type === 'error'
              ? 'bg-rose-900 border-rose-700 text-rose-100'
              : 'bg-slate-900 border-slate-700 text-slate-100'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('rooms')}
              className="flex items-center gap-2.5 text-left cursor-pointer focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <Building2 className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 block leading-tight hover:text-slate-800">
                  Skyline Residence
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">Apartment Management</span>
              </div>
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-2 sm:gap-3 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'rooms'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>အခန်းအခြေအနေ (Room Status)</span>
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                activeTab === 'billing'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-sky-400" />
              <span>ဘေလ်တွက်စက် (Utility Bill)</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'rooms' ? (
          <RoomStatus
            rooms={combinedRooms}
            onSaveRoom={handleSaveRoom}
            onCalculateBill={handleNavigateToBillCalculator}
            showToast={showToast}
          />
        ) : (
          <BillCalculator
            rooms={combinedRooms}
            selectedRoomId={combinedRooms.find(r => r.roomNumber === selectedBillRoomNumber)?.id}
            onRoomSelect={(id) => {
              const r = combinedRooms.find(room => room.id === id);
              if (r) setSelectedBillRoomNumber(r.roomNumber);
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-700">Skyline Residence Apartment</span>
            <span className="text-slate-300">·</span>
            <span>၆ လွှာ (၆၆ ခန်း) · မီး ၁၀฿/u · ရေ ၂၅฿/u · Common ၁၀၀฿ · Real-time Firestore</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <button 
              onClick={() => setActiveTab('rooms')} 
              className={`hover:underline cursor-pointer ${activeTab === 'rooms' ? 'text-slate-900 font-bold' : ''}`}
            >
              အခန်းစာရင်း
            </button>
            <span>·</span>
            <button 
              onClick={() => setActiveTab('billing')} 
              className={`hover:underline cursor-pointer ${activeTab === 'billing' ? 'text-slate-900 font-bold' : ''}`}
            >
              ဘေလ်တွက်စက်
            </button>
          </div>
        </div>
      </footer>

      {/* Information Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-500" />
                Skyline Residence အဆောက်အဦ အချက်အလက်
              </h3>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                <p className="font-bold text-slate-800">အဆောက်အဦ ဖွဲ့စည်းပုံနှင့် အခန်းခနှုန်းထားများ:</p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li><strong>အလွှာအရေအတွက်:</strong> ၆ လွှာ (၁ လွှာလျှင် ၁၁ ခန်း · စုစုပေါင်း ၆၆ ခန်း)</li>
                  <li><strong>လွှာ ၁ မှ ၄ အထိ:</strong> အခန်းခ ၁,၇၀၀ ဘတ် / လ</li>
                  <li><strong>လွှာ ၅ မှ ၆ အထိ:</strong> အခန်းခ ၁,၂၀၀ ဘတ် / လ</li>
                </ul>
              </div>

              <div className="p-3 bg-amber-50/70 rounded-xl space-y-1.5 border border-amber-200/60 text-amber-900">
                <p className="font-bold text-amber-950">မီတာနှင့် ဝန်ဆောင်မှုစရိတ် နှုန်းထားများ (Utility Rates):</p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li><strong>မီးမီတာနှုန်း:</strong> ၁ ယူနစ် = <strong>၁၀ ဘတ်</strong></li>
                  <li><strong>ရေမီတာနှုန်း:</strong> ၁ ယူနစ် = <strong>၂၅ ဘတ်</strong></li>
                  <li><strong>Common Fee (အထွေထွေစရိတ်):</strong> Default <strong>၁၀၀ ဘတ်</strong> (ပုံမှန် ၂၀၀ ဘတ်)</li>
                </ul>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-xl space-y-1 border border-emerald-100 text-emerald-900">
                <p className="font-bold">အရောင်သင်္ကေတများ (Status Badges):</p>
                <p>🟢 <strong className="text-emerald-700">မီးစိမ်း (Available):</strong> အခန်းလွတ် အသင့်ငှားရမ်းနိုင်ဆဲ</p>
                <p>🔴 <strong className="text-rose-700">မီးနီ (Occupied):</strong> အငှားနေထိုင်သူ ရှိပြီးဖြစ်သည်</p>
                <p>🟡 <strong className="text-amber-700">မီးဝါ (Maintenance):</strong> စစ်ဆေးပြင်ဆင်မှု လုပ်ဆောင်နေသည်</p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                ပိတ်မည် (Close)
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Global Admin Login Modal managed by AdminAuthContext */}
      <AdminLoginModal />
    </div>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <MainApp />
    </AdminAuthProvider>
  );
}
