/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { AdminLoginModal } from './components/AdminLoginModal';
import RoomStatus from './components/RoomStatus';
import BillCalculator from './components/BillCalculator';
import { Room } from './types/room';
import { generateInitialRooms, STORAGE_KEY } from './data/initialRooms';
import { 
  Building2, 
  Info, 
  Calculator, 
  Layers, 
  Receipt, 
  Phone, 
  MapPin,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'rooms' | 'billing'>('rooms');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedBillRoomNumber, setSelectedBillRoomNumber] = useState<string>('101');

  // Lifted rooms state shared between RoomStatus and BillCalculator
  const [rooms, setRooms] = useState<Room[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 66) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return generateInitialRooms();
  });

  const handleRoomsChange = (updatedRooms: Room[]) => {
    setRooms(updatedRooms);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRooms));
    } catch (e) {
      console.error('Failed to persist rooms in App', e);
    }
  };

  // Option 1: Guarantee persistence on every room change in App
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
    } catch (e) {
      console.error('Failed to persist rooms state', e);
    }
  }, [rooms]);

  // Option 1: Listen to storage events to sync across browser tabs or windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length === 66) {
            setRooms(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleNavigateToBillCalculator = (roomNumber: string) => {
    setSelectedBillRoomNumber(roomNumber);
    setActiveTab('billing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AdminAuthProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        {/* 
          Top Bar adhering to the Top Bar Contract:
          Zone 1: Brand Wordmark
          Zone 2: Navigation Links (Rooms Status / Bill Calculator tabs)
          Zone 3: Primary action button
        */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Zone 1: Brand */}
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

            {/* Zone 2: Navigation Tabs */}
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

            {/* Zone 3: Primary Action - Removed */}
            <div className="hidden">
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1">
          {activeTab === 'rooms' ? (
            <RoomStatus
              initialRoomsData={rooms}
              onRoomsChange={handleRoomsChange}
              onCalculateBill={handleNavigateToBillCalculator}
            />
          ) : (
            <BillCalculator
              rooms={rooms}
              selectedRoomId={rooms.find(r => r.roomNumber === selectedBillRoomNumber)?.id}
              onRoomSelect={(id) => {
                const r = rooms.find(room => room.id === id);
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
              <span>၆ လွှာ (၆၆ ခန်း) · မီး ၁၀฿/u · ရေ ၂၅฿/u · Common ၁၀၀฿</span>
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
    </AdminAuthProvider>
  );
}
