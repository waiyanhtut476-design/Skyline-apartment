import React, { useState, useEffect } from 'react';
import { Room, RoomStatusType } from '../types/room';
import { useAdminAuth } from '../context/AdminAuthContext';
import { X, Check, User, Phone, FileText, BedDouble, AlertTriangle, CheckCircle2, Clock, Calculator, Lock } from 'lucide-react';

interface RoomModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedRoom: Room) => void;
  onCalculateBill?: (roomNumber: string) => void;
}

export const RoomModal: React.FC<RoomModalProps> = ({ room, isOpen, onClose, onSave, onCalculateBill }) => {
  if (!isOpen || !room) return null;

  const { isAdminLoggedIn, requireAdmin } = useAdminAuth();

  const [status, setStatus] = useState<RoomStatusType>(room.status);
  const [tenantName, setTenantName] = useState(room.tenantName || '');
  const [tenantPhone, setTenantPhone] = useState(room.tenantPhone || '');
  const [moveInDate, setMoveInDate] = useState(room.moveInDate || room.checkInDate || '');
  const [contractEndDate, setContractEndDate] = useState(room.contractEndDate || '');
  const [notes, setNotes] = useState(room.notes || '');

  useEffect(() => {
    if (room) {
      setStatus(room.status);
      setTenantName(room.tenantName || '');
      setTenantPhone(room.tenantPhone || '');
      setMoveInDate(room.moveInDate || room.checkInDate || '');
      setContractEndDate(room.contractEndDate || '');
      setNotes(room.notes || '');
    }
  }, [room]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAdmin('ကျေးဇူးပြု၍ အိမ်ရှင်အကောင့် အရင်ဝင်ပါ')) {
      return;
    }

    onSave({
      ...room,
      status,
      tenantName: status === 'Occupied' ? tenantName : (status === 'Available' ? '' : tenantName),
      tenantPhone: status === 'Occupied' ? tenantPhone : '',
      moveInDate: status === 'Occupied' ? moveInDate : undefined,
      contractEndDate: status === 'Occupied' ? contractEndDate : undefined,
      checkInDate: status === 'Occupied' ? moveInDate : undefined,
      notes,
      privateNotes: status === 'Occupied' ? (room.privateNotes || notes) : undefined,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  const handleQuickCheckIn = () => {
    if (!requireAdmin('ကျေးဇူးပြု၍ အိမ်ရှင်အကောင့် အရင်ဝင်ပါ')) return;
    setStatus('Occupied');
  };

  const handleQuickCheckOut = () => {
    if (!requireAdmin('ကျေးဇူးပြု၍ အိမ်ရှင်အကောင့် အရင်ဝင်ပါ')) return;
    setStatus('Available');
    setTenantName('');
    setTenantPhone('');
  };

  const handleSetMaintenance = () => {
    if (!requireAdmin('ကျေးဇူးပြု၍ အိမ်ရှင်အကောင့် အရင်ဝင်ပါ')) return;
    setStatus('Maintenance');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-room-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg tabular-nums">
              {room.roomNumber}
            </div>
            <div>
              <h3 id="modal-room-title" className="text-base font-bold text-slate-900">
                အခန်း {room.roomNumber} (Floor {room.floor})
              </h3>
              <p className="text-xs text-slate-500">
                {room.roomType} · လခ {room.monthlyRent.toLocaleString()}฿
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
            aria-label="ပိတ်ရန် / Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Guest Read-Only Warning Banner */}
          {!isAdminLoggedIn && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Guest Read-Only Mode:</strong> အချက်အလက်များ ပြင်ဆင်သိမ်းဆည်းရန် အိမ်ရှင်အကောင့် အရင်ဝင်ရောက်ပေးပါ (Viewing only)
              </span>
            </div>
          )}

          {/* Quick status selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              အခန်းအခြေအနေ / Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Available button */}
              <button
                type="button"
                onClick={() => setStatus('Available')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  status === 'Available'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs animate-pulse"></span>
                  မီးစိမ်း (Available)
                </div>
                <span className="text-[11px] text-slate-500 mt-1">အားလပ်ဆဲ</span>
              </button>

              {/* Occupied button */}
              <button
                type="button"
                onClick={() => setStatus('Occupied')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  status === 'Occupied'
                    ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-rose-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-xs"></span>
                  မီးနီ (Occupied)
                </div>
                <span className="text-[11px] text-slate-500 mt-1">ငှားရမ်းပြီး</span>
              </button>

              {/* Maintenance button */}
              <button
                type="button"
                onClick={() => setStatus('Maintenance')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  status === 'Maintenance'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-xs"></span>
                  မီးဝါ (Maintenance)
                </div>
                <span className="text-[11px] text-slate-500 mt-1">ပြင်ဆင်ဆဲ</span>
              </button>
            </div>
          </div>

          {/* Tenant Info (Conditional based on status) */}
          <div className="space-y-4 pt-1">
            <div>
              <label htmlFor="tenantName" className="block text-xs font-semibold text-slate-700 mb-1">
                အငှားနေထိုင်သူအမည် (Tenant Name)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="tenantName"
                  type="text"
                  placeholder={status === 'Occupied' ? 'ဥပမာ - ဦးမောင်မောင်' : 'Tenant မရှိသေးပါ'}
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
              </div>
            </div>

            {/* Sensitive Room Private Info (Admin Only: Phone, Contract Dates, Notes) */}
            {isAdminLoggedIn ? (
              <>
                <div>
                  <label htmlFor="tenantPhone" className="block text-xs font-semibold text-slate-700 mb-1">
                    ဖုန်းနံပါတ် (Contact Phone)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="tenantPhone"
                      type="tel"
                      placeholder="081-xxx-xxxx"
                      value={tenantPhone}
                      onChange={(e) => setTenantPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                    />
                  </div>
                </div>

                {status === 'Occupied' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                    <div>
                      <label htmlFor="moveInDate" className="block text-xs font-semibold text-rose-950 mb-1">
                        စတင်နေထိုင်သည့်ရက် (Move-in Date)
                      </label>
                      <input
                        id="moveInDate"
                        type="date"
                        value={moveInDate}
                        onChange={(e) => setMoveInDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 font-medium"
                      />
                    </div>
                    <div>
                      <label htmlFor="contractEndDate" className="block text-xs font-semibold text-rose-950 mb-1">
                        စာချုပ်ကုန်ဆုံးရက် (Contract End Date)
                      </label>
                      <input
                        id="contractEndDate"
                        type="date"
                        value={contractEndDate}
                        onChange={(e) => setContractEndDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 font-medium"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="roomNotes" className="block text-xs font-semibold text-slate-700 mb-1">
                    သီးသန့်မှတ်ချက် / အထူးအချက်အလက် (Private Notes)
                  </label>
                  <textarea
                    id="roomNotes"
                    rows={2}
                    placeholder="မှတ်ချက်များ (ဥပမာ - စာချုပ်သက်တမ်း၊ ပစ္စည်းစစ်ဆေးမှု စသည်...)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 resize-none"
                  />
                </div>
              </>
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>ဖုန်းနံပါတ်၊ စာချုပ်ရက်စွဲနှင့် Private Notes များကို အိမ်ရှင် (Admin) သာ ဖတ်/ရေးခွင့် ရှိပါသည်။</span>
              </div>
            )}
          </div>

          {/* Quick preset action helpers */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">အမြန်ပြောင်းရန် / Quick Actions:</span>
            <div className="flex gap-2">
              {status !== 'Occupied' && (
                <button
                  type="button"
                  onClick={handleQuickCheckIn}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium underline underline-offset-2"
                >
                  ငှားရမ်းထားဟုသတ်မှတ်
                </button>
              )}
              {status !== 'Available' && (
                <button
                  type="button"
                  onClick={handleQuickCheckOut}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2"
                >
                  အခန်းလွတ်ဟုသတ်မှတ်
                </button>
              )}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            {onCalculateBill ? (
              <button
                type="button"
                onClick={() => {
                  if (!requireAdmin('ကျေးဇူးပြု၍ အိမ်ရှင်အကောင့် အရင်ဝင်ပါ')) return;
                  onClose();
                  onCalculateBill(room.roomNumber);
                }}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  isAdminLoggedIn
                    ? 'text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200'
                    : 'text-slate-400 bg-slate-50 border border-slate-200 hover:bg-slate-100'
                }`}
                title={isAdminLoggedIn ? "ဤအခန်းအတွက် မီတာခနှင့် ဘေလ်တွက်ရန်" : "အိမ်ရှင်အကောင့်သာ ဘေလ်တွက်ချက်နိုင်သည်"}
              >
                {isAdminLoggedIn ? <Calculator className="w-3.5 h-3.5 text-sky-600" /> : <Lock className="w-3.5 h-3.5 text-amber-600" />}
                <span>ဘေလ်တွက်ချက်ရန် (Calculate Bill)</span>
              </button>
            ) : <div />}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                မလုပ်တော့ပါ (Cancel)
              </button>
              {isAdminLoggedIn ? (
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>သိမ်းဆည်းမည် (Save Changes)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => requireAdmin('ကျေးဇူးပြု၍ အိမ်ရှင်အကောင့် အရင်ဝင်ပါ')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Guest Mode တွင် သိမ်းဆည်းခွင့်မရှိပါ"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>ကျေးဇူးပြု၍ အိမ်ရှင်အကောင့် အရင်ဝင်ပါ</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
