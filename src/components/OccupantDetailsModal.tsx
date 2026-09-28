import React, { useState, useEffect } from 'react';
import { Room } from '../types/room';
import { useAdminAuth } from '../context/AdminAuthContext';
import { 
  X, 
  User, 
  Calendar, 
  Phone, 
  FileText, 
  Building2, 
  Clock, 
  Calculator, 
  Edit3, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Printer,
  Save,
  Wrench,
  Check,
  Tag,
  Sparkles,
  History,
  Lock,
  Eye
} from 'lucide-react';

interface OccupantDetailsModalProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
  onEditRoom: (room: Room) => void;
  onCalculateBill?: (roomNumber: string) => void;
  onUpdateRoom?: (updatedRoom: Room) => void;
}

function formatDateDisplay(dateStr?: string): { formatted: string; isValid: boolean } {
  if (!dateStr) return { formatted: 'ရက်စွဲသတ်မှတ်မထားပါ', isValid: false };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { formatted: dateStr, isValid: false };
    return {
      formatted: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
      isValid: true,
    };
  } catch {
    return { formatted: dateStr, isValid: false };
  }
}

export const OccupantDetailsModal: React.FC<OccupantDetailsModalProps> = ({
  room,
  isOpen,
  onClose,
  onEditRoom,
  onCalculateBill,
  onUpdateRoom,
}) => {
  if (!isOpen || !room || room.status !== 'Occupied') return null;

  const { isAdminLoggedIn, requireAdmin } = useAdminAuth();

  // Move-in and contract dates
  const moveInRaw = room.moveInDate || room.checkInDate || '2026-01-15';
  const contractEndRaw = room.contractEndDate || '2027-01-14';

  const moveIn = formatDateDisplay(moveInRaw);
  const contractEnd = formatDateDisplay(contractEndRaw);

  // Private notes / Maintenance history state
  const [notesInput, setNotesInput] = useState<string>(() => {
    return room.privateNotes ?? room.notes ?? '';
  });
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState<boolean>(false);

  // Sync state whenever the selected room changes
  useEffect(() => {
    if (room) {
      setNotesInput(room.privateNotes ?? room.notes ?? '');
      setShowSavedFeedback(false);
    }
  }, [room?.id, room?.privateNotes, room?.notes]);

  // Calculate days remaining in contract
  let daysRemaining: number | null = null;
  let isContractExpired = false;
  try {
    const end = new Date(contractEndRaw);
    const today = new Date('2026-09-27');
    if (!isNaN(end.getTime())) {
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysRemaining = diffDays;
      if (diffDays < 0) {
        isContractExpired = true;
      }
    }
  } catch {}

  // Handle saving private notes or maintenance history
  const handleSaveNotes = () => {
    // Constraint: Non-admin / Logout ဖြစ်နေချိန်တွင် ပြင်ဆင်မရနိုင်အောင် ကန့်သတ်ခြင်း
    if (!requireAdmin('ကျေးဇူးပြု၍ အိမ်ရှင်အကောင့် အရင်ဝင်ပါ')) {
      return;
    }

    setIsSavingNotes(true);
    const updatedRoom: Room = {
      ...room,
      privateNotes: notesInput,
      notes: notesInput, // Keep synchronized for reporting and room modal
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateRoom) {
      onUpdateRoom(updatedRoom);
    }

    setTimeout(() => {
      setIsSavingNotes(false);
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 3000);
    }, 200);
  };

  // Quick insertion helpers for common maintenance records
  const handleInsertQuickTag = (tagText: string) => {
    if (!requireAdmin('ကျေးဇူးပြု၍ အိမ်ရှင်အကောင့် အရင်ဝင်ပါ')) {
      return;
    }
    const dateStamp = new Date().toISOString().split('T')[0];
    const snippet = `• [${dateStamp}] ${tagText}\n`;
    setNotesInput(prev => prev ? `${prev.trim()}\n${snippet}` : snippet);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="occupant-details-title"
    >
      <div 
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="relative px-6 pt-5 pb-4 bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-b border-rose-100 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-rose-600/20 tabular-nums">
              {room.roomNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                  Occupied (ငှားရမ်းထားသည်)
                </span>
                <span className="text-xs text-slate-500 font-medium">Floor {room.floor}</span>
                {!isAdminLoggedIn && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 shadow-2xs">
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span>Read-Only Mode</span>
                  </span>
                )}
              </div>
              <h3 id="occupant-details-title" className="text-xl font-extrabold text-slate-900 mt-0.5">
                Occupant Details
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Main Tenant Profile Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-base border-2 border-white shadow-xs">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Tenant Name (အငှားနေသူအမည်)
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900">
                    {room.tenantName || 'အမည်မသတ်မှတ်ရသေးပါ'}
                  </h4>
                </div>
              </div>
            </div>

            {/* Phone (Admin Only) */}
            {isAdminLoggedIn && room.tenantPhone && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>ဖုန်းနံပါတ် (Phone Number):</span>
                </span>
                <a 
                  href={`tel:${room.tenantPhone}`}
                  className="text-xs font-bold text-rose-700 hover:underline flex items-center gap-1"
                >
                  <span>{room.tenantPhone}</span>
                </a>
              </div>
            )}

            {/* Move-in Date & Contract End Date Highlight Grid (Admin Only) */}
            {isAdminLoggedIn && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/70">
                {/* Move-in Date */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    <span className="text-[11px] font-semibold">Move-in Date</span>
                  </div>
                  <div className="font-extrabold text-slate-900 text-sm">
                    {moveIn.formatted}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                    (စတင်နေထိုင်သည့် ရက်စွဲ)
                  </span>
                </div>

                {/* Contract End Date */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/70 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                    <span className="text-[11px] font-semibold">Contract End Date</span>
                  </div>
                  <div className="font-extrabold text-slate-900 text-sm">
                    {contractEnd.formatted}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                    (စာချုပ်သက်တမ်းကုန်ဆုံးရက်)
                  </span>
                </div>
              </div>
            )}

            {/* Contract Status Banner (Admin Only) */}
            {isAdminLoggedIn && (
              <div className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between border ${
                isContractExpired 
                  ? 'bg-rose-50 text-rose-800 border-rose-200' 
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                <div className="flex items-center gap-2">
                  {isContractExpired ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span className="font-semibold">
                    {isContractExpired ? 'စာချုပ်သက်တမ်း ကုန်ဆုံးသွားပါပြီ' : 'တရားဝင် စာချုပ်သက်တမ်းအတွင်း (Active Contract)'}
                  </span>
                </div>
                {daysRemaining !== null && !isContractExpired && (
                  <span className="font-bold tabular-nums bg-white/80 px-2 py-0.5 rounded-md border border-emerald-300 text-[11px]">
                    {daysRemaining} ရက်ကျန်
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Room Details & Rent Summary */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">အခန်းအမျိုးအစား</span>
              <p className="font-bold text-slate-800">{room.roomType}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">လစဥ်အခန်းခ (Monthly Rent)</span>
              <p className="font-bold text-slate-900 tabular-nums text-sm text-sky-700">
                {room.monthlyRent.toLocaleString()} ဘတ် / လ
              </p>
            </div>
          </div>

          {/* 
            ========================================================================
            PRIVATE NOTES & MAINTENANCE HISTORY TEXTAREA SECTION (Admin Only)
            ========================================================================
          */}
          {isAdminLoggedIn ? (
            <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-700 flex items-center justify-center">
                    <Wrench className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                      <span>Private Notes & Maintenance History</span>
                    </h4>
                    <span className="text-[11px] text-amber-800 font-medium">
                      အငှားနေသူ သီးသန့်မှတ်ချက်နှင့် ပြုပြင်ထိန်းသိမ်းမှု မှတ်တမ်းများ
                    </span>
                  </div>
                </div>

                {showSavedFeedback && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 animate-in fade-in">
                    <Check className="w-3.5 h-3.5" />
                    <span>သိမ်းဆည်းပြီးပါပြီ (Saved)</span>
                  </span>
                )}
              </div>

              {/* Quick Insertion Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-amber-800/80 font-semibold mr-1">အမြန်ထည့်ရန်:</span>
                <button
                  type="button"
                  onClick={() => handleInsertQuickTag('Air Conditioner Serviced & Filter Cleaned')}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md transition-colors cursor-pointer"
                >
                  + အဲယားကွန်းဆေးပြီး
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertQuickTag('Plumbing & Water Pressure Inspected')}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md transition-colors cursor-pointer"
                >
                  + ရေပိုက်လိုင်းစစ်ပြီး
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertQuickTag('Extra Access Key Card Provided')}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md transition-colors cursor-pointer"
                >
                  + သော့ကတ်ထုတ်ပေးပြီး
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertQuickTag('Room Inspection - Good Condition')}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md transition-colors cursor-pointer"
                >
                  + အခန်းအခြေအနေစစ်ပြီး
                </button>
              </div>

              {/* Text Area */}
              <div className="relative">
                <textarea
                  rows={4}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="ဥပမာ - 2026-08-10 တွင် လေအေးပေးစက် (Aircon) ဆေးကြောပြီး။ အပိုသော့ကတ် ၁ ခု တောင်းခံထားသည်။ အငှားနေသူ၏ သီးသန့်တောင်းဆိုချက် သို့မဟုတ် ပြုပြင်ထိန်းသိမ်းမှု မှတ်တမ်းများကို ဤနေရာတွင် သိမ်းဆည်းပါ..."
                  className="w-full p-3 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-slate-800 placeholder:text-slate-400 font-medium leading-relaxed resize-y"
                />
              </div>

              {/* Textarea Bottom Action Bar */}
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <span className="text-slate-400 font-mono">
                  {notesInput.length} စာလုံး
                </span>

                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-500 active:scale-95 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingNotes ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-amber-950/30 border-t-amber-950 rounded-full animate-spin"></div>
                      <span>သိမ်းနေပါသည်...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>မှတ်တမ်းသိမ်းမည် (Save Notes)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Guest Read-Only:</strong> ဖုန်းနံပါတ်၊ စာချုပ်ရက်စွဲနှင့် သီးသန့်မှတ်ချက် (Private Notes) များကို အိမ်ရှင် (Admin) သာ ဖတ်/ရေးခွင့် ရှိပါသည်။
              </span>
            </div>
          )}

          {/* Bottom Actions Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (!requireAdmin('ကျေးဇူးပြု၍ အိမ်ရှင်အကောင့် အရင်ဝင်ပါ')) return;
                onClose();
                onEditRoom(room);
              }}
              className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                isAdminLoggedIn
                  ? 'text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                  : 'text-slate-400 bg-slate-50 border border-slate-200 hover:bg-slate-100'
              }`}
              title={isAdminLoggedIn ? 'အချက်အလက်ပြင်ရန်' : 'အိမ်ရှင်အကောင့်သာ ပြင်ဆင်ခွင့်ရှိသည်'}
            >
              {isAdminLoggedIn ? <Edit3 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-600" />}
              <span>အချက်အလက်ပြင်ရန် / အခန်းအပ်ရန် (Edit)</span>
            </button>

            {onCalculateBill && (
              <button
                type="button"
                onClick={() => {
                  if (!requireAdmin('ကျေးဇူးပြု၍ အိမ်ရှင်အကောင့် အရင်ဝင်ပါ')) return;
                  onClose();
                  onCalculateBill(room.roomNumber);
                }}
                className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                  isAdminLoggedIn
                    ? 'text-white bg-slate-900 hover:bg-slate-800'
                    : 'text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {isAdminLoggedIn ? <Calculator className="w-3.5 h-3.5 text-sky-400" /> : <Lock className="w-3.5 h-3.5 text-amber-600" />}
                <span>ဘေလ်တွက်ချက်မည် (Calculate Bill)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OccupantDetailsModal;
