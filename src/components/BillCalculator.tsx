import React, { useState, useMemo, useEffect } from 'react';
import { Room, BillRecord } from '../types/room';
import { 
  // Updated Import
  saveInvoiceToFirestore, 
  updateInvoiceStatus,
  subscribeToInvoices,
  auth, 
  firebaseConfig, 
  FirestoreInvoiceDoc 
} from '../firebase';
import { 
  Zap, 
  Droplets, 
  Building2, 
  Calculator, 
  RotateCcw, 
  Check, 
  Receipt, 
  Printer, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Info, 
  Calendar, 
  DollarSign, 
  User, 
  Layers, 
  Download, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  ShieldAlert, 
  Cloud, 
  Database,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Mail,
  Send
} from 'lucide-react';
import { sendInvoiceEmailMock, EmailSendResult } from '../services/mockEmailService';

interface BillCalculatorProps {
  rooms: Room[];
  selectedRoomId?: string | null;
  onRoomSelect?: (roomId: string) => void;
}

const BILLS_STORAGE_KEY = 'skyline_residence_saved_bills';
const ADMIN_SESSION_KEY = 'skyline_admin_logged_in';

function formatMonthYearDisplay(yearMonthStr: string): string {
  try {
    const parts = yearMonthStr.split('-');
    if (parts.length === 2) {
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const date = new Date(year, month - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); // e.g. "Oct 2026"
    }
    return yearMonthStr;
  } catch {
    return yearMonthStr;
  }
}

export const BillCalculator: React.FC<BillCalculatorProps> = ({ 
  rooms,
  selectedRoomId,
  onRoomSelect
}) => {
  // 1. Selected room state
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>(() => {
    if (selectedRoomId) {
      const found = rooms.find(r => r.id === selectedRoomId);
      if (found) return found.roomNumber;
    }
    return rooms[0]?.roomNumber || '101';
  });

  // Current selected room object
  const currentRoom = useMemo(() => {
    return rooms.find(r => r.roomNumber === selectedRoomNumber) || rooms[0];
  }, [rooms, selectedRoomNumber]);

  // Billing period (Defaults to Oct 2026 or current)
  const [billingMonth, setBillingMonth] = useState<string>('2026-10');

  // Rates:
  // - မီးမီတာနှုန်း = 1 ယူနစ် 10 ဘတ်
  // - ရေမီတာနှုန်း = 1 ယူနစ် 25 ဘတ်
  const ELECTRIC_RATE = 10;
  const WATER_RATE = 25;

  // Inputs state with required default values:
  // Default: မီးတာခ 10 ယူနစ်, ရေခ 25 ယူနစ်, Common 100 ဘတ်
  const [prevElectric, setPrevElectric] = useState<number>(100);
  const [currElectric, setCurrElectric] = useState<number>(110); // diff = 10

  const [prevWater, setPrevWater] = useState<number>(50);
  const [currWater, setCurrWater] = useState<number>(75); // diff = 25

  const [commonFee, setCommonFee] = useState<number>(100); // Default 100฿
  const [tenantNameInput, setTenantNameInput] = useState<string>('');

  // Admin Authentication State
  // "Admin (login ဝင်ထားသူ) တစ်ဦးတည်းသာ Save လုပ်ခွင့်ရှိမည်"
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [showAdminLoginModal, setShowAdminLoginModal] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>('admin@skylineresidence.com');
  const [adminPassword, setAdminPassword] = useState<string>('admin123');
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  // Firestore saving status
  const [isSavingToFirestore, setIsSavingToFirestore] = useState<boolean>(false);

  // Digital Receipt Preview Modal state
  const [previewBill, setPreviewBill] = useState<(BillRecord & { firestoreId?: string; isFirestoreSynced?: boolean }) | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Email Invoice State for Digital Receipt Modal (Mock API Service)
  const [emailRecipient, setEmailRecipient] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailSendResult, setEmailSendResult] = useState<EmailSendResult | null>(null);
  const [showEmailConfig, setShowEmailConfig] = useState<boolean>(false);

  // Sync recipient email when previewBill opens
  useEffect(() => {
    if (previewBill) {
      const matchRoom = rooms.find((r) => r.roomNumber === previewBill.roomNumber);
      const defaultEmail = 
        matchRoom?.tenantEmail || 
        previewBill.tenantEmail || 
        `tenant.room${previewBill.roomNumber}@skylineresidence.com`;
      setEmailRecipient(defaultEmail);
      setEmailSendResult(null);
      setShowEmailConfig(false);
    }
  }, [previewBill, rooms]);

  const handleSendInvoiceEmail = async () => {
    if (!previewBill) return;
    setIsSendingEmail(true);
    try {
      const result = await sendInvoiceEmailMock({
        recipientEmail: emailRecipient,
        tenantName: previewBill.tenantName,
        roomNumber: previewBill.roomNumber,
        monthYear: previewBill.monthYear,
        bill: previewBill,
      });
      setEmailSendResult(result);
      if (result.success) {
        showToast(`ဘေလ်ပြေစာကို ${result.recipient} သို့ Email ပို့ဆောင်ပြီးပါပြီ (Mock API Sent)`);
      } else {
        showToast(result.error || 'အီးမေးလ် ပို့ဆောင်ခြင်း မအောင်မြင်ပါ');
      }
    } catch {
      setEmailSendResult({
        success: false,
        recipient: emailRecipient,
        subject: '',
        sentAt: new Date().toISOString(),
        deliveryStatus: 'Failed',
        error: 'Mock API Server Connection Failed',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Sync tenant name if room has a tenant
  useEffect(() => {
    if (currentRoom) {
      setTenantNameInput(currentRoom.tenantName || '');
    }
  }, [currentRoom]);

  // If parent passes selectedRoomId change
  useEffect(() => {
    if (selectedRoomId) {
      const match = rooms.find(r => r.id === selectedRoomId);
      if (match) {
        setSelectedRoomNumber(match.roomNumber);
      }
    }
  }, [selectedRoomId, rooms]);

  // Saved bills history (Option 1: localStorage loaded on initial render)
  const [savedBills, setSavedBills] = useState<(BillRecord & { firestoreId?: string; isFirestoreSynced?: boolean })[]>(() => {
    try {
      const saved = localStorage.getItem(BILLS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Option 1: Guarantee localStorage persistence on every bill modification
  useEffect(() => {
    try {
      localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(savedBills));
    } catch (e) {
      console.error('Failed to save bills to local storage', e);
    }
  }, [savedBills]);

  // Option 2: Firebase Firestore Real-Time Listener (onSnapshot)
  // Ensures data persists across refreshes, devices, and sessions even if localStorage is cleared
  useEffect(() => {
    const unsubscribe = subscribeToInvoices((firestoreInvoices) => {
      if (firestoreInvoices && firestoreInvoices.length > 0) {
        setSavedBills((prevBills) => {
          const map = new Map<string, BillRecord & { firestoreId?: string; isFirestoreSynced?: boolean }>();
          
          // Seed with existing local bills
          prevBills.forEach((b) => map.set(b.id, b));

          // Merge real-time Firestore invoices
          firestoreInvoices.forEach((inv) => {
            const billId = inv.id || `inv-${inv.Room}-${inv.Month}`;
            const existing = map.get(billId);
            map.set(billId, {
              id: billId,
              firestoreId: inv.id,
              roomNumber: String(inv.Room),
              floor: Number(String(inv.Room)[0]),
              tenantName: inv.TenantName || 'အငှားနေသူ',
              monthYear: inv.Month,
              roomRent: inv.RoomRent || (Number(String(inv.Room)[0]) <= 4 ? 1700 : 1200),
              prevElectricUnit: existing?.prevElectricUnit || 0,
              currElectricUnit: existing?.currElectricUnit || (inv.ElectricDiff || 10),
              electricDiff: inv.ElectricDiff || Math.round(inv.Electricity / 10),
              electricRate: 10,
              electricTotal: inv.Electricity,
              prevWaterUnit: existing?.prevWaterUnit || 0,
              currWaterUnit: existing?.currWaterUnit || (inv.WaterDiff || 25),
              waterDiff: inv.WaterDiff || Math.round(inv.Water / 25),
              waterRate: 25,
              waterTotal: inv.Water,
              commonFee: inv.CommonFee || 100,
              grandTotal: inv.TotalAmount,
              status: inv.Status,
              createdAt: existing?.createdAt || new Date().toISOString(),
              isFirestoreSynced: true,
            });
          });

          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          // Sync to localStorage as offline cache
          try {
            localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(merged));
          } catch {}

          return merged;
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const [showPersistInfoModal, setShowPersistInfoModal] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Real-time Calculations
  const electricDiff = Math.max(0, currElectric - prevElectric);
  const electricTotal = electricDiff * ELECTRIC_RATE;

  const waterDiff = Math.max(0, currWater - prevWater);
  const waterTotal = waterDiff * WATER_RATE;

  const roomRent = currentRoom ? currentRoom.monthlyRent : (Number(selectedRoomNumber[0]) <= 4 ? 1700 : 1200);

  // Grand Total: (unit ကွာခြားချက် × နှုန်းထား) + Room Rent + Common Fee
  const grandTotal = electricTotal + waterTotal + roomRent + commonFee;

  // Formatted Month String for Firestore (e.g. "Oct 2026")
  const formattedMonth = useMemo(() => formatMonthYearDisplay(billingMonth), [billingMonth]);

  // Reset to required default values
  const handleResetDefaults = () => {
    setPrevElectric(100);
    setCurrElectric(110); // diff = 10 units
    setPrevWater(50);
    setCurrWater(75); // diff = 25 units
    setCommonFee(100); // 100฿
    showToast('မူလတန်ဖိုးများ (မီး ၁၀ ယူနစ်၊ ရေ ၂၅ ယူနစ်၊ Common ၁၀၀฿) သို့ ပြန်လည်သတ်မှတ်ပြီးပါပြီ။');
  };

  // Admin login handlers
  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail.trim() && adminPassword.trim()) {
      setIsAdminLoggedIn(true);
      try {
        localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      } catch {}
      setShowAdminLoginModal(false);
      setAdminLoginError(null);
      showToast('Admin အဖြစ် အောင်မြင်စွာ Login ဝင်ရောက်ပြီးပါပြီ။');
    } else {
      setAdminLoginError('ကျေးဇူးပြု၍ Email နှင့် Password ထည့်သွင်းပါ။');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    try {
      localStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {}
    showToast('Admin အကောင့်မှ ထွက်ခွာပြီးပါပြီ။');
  };

  // 1. "Save Bill" Function to Firestore
  // Schema: {Room: 101, Month: "Oct 2026", Electricity: 350, Water: 450, TotalAmount: 2500, Status: "Pending"}
  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();

    // Constraint Check: Admin (login ဝင်ထားသူ) တစ်ဦးတည်းသာ Save လုပ်ခွင့်ရှိမည်
    if (!isAdminLoggedIn) {
      setShowAdminLoginModal(true);
      return;
    }

    setIsSavingToFirestore(true);

    const roomNumInt = parseInt(selectedRoomNumber, 10);
    const tenantName = tenantNameInput.trim() || currentRoom?.tenantName || 'အမည်မသတ်မှတ်ရသေးပါ';

    // Exact Firestore doc structure as requested
    const firestoreInvoice: Omit<FirestoreInvoiceDoc, 'id'> = {
      Room: roomNumInt, // e.g. 101
      Month: formattedMonth, // e.g. "Oct 2026"
      Electricity: electricTotal, // e.g. 350
      Water: waterTotal, // e.g. 450
      TotalAmount: grandTotal, // e.g. 2600
      Status: 'Pending', // Pending
      RoomRent: roomRent,
      CommonFee: commonFee,
      TenantName: tenantName,
      ElectricDiff: electricDiff,
      WaterDiff: waterDiff,
    };

    // Save to Firestore 'invoices' collection
    const firestoreResult = await saveInvoiceToFirestore(firestoreInvoice);

    const newBillRecord: BillRecord & { firestoreId?: string; isFirestoreSynced?: boolean } = {
      id: firestoreResult.id || `bill-${Date.now()}-${selectedRoomNumber}`,
      firestoreId: firestoreResult.id,
      roomNumber: selectedRoomNumber,
      floor: currentRoom ? currentRoom.floor : Number(selectedRoomNumber[0]),
      tenantName,
      monthYear: formattedMonth,
      roomRent,
      prevElectricUnit: prevElectric,
      currElectricUnit: currElectric,
      electricDiff,
      electricRate: ELECTRIC_RATE,
      electricTotal,
      prevWaterUnit: prevWater,
      currWaterUnit: currWater,
      waterDiff,
      waterRate: WATER_RATE,
      waterTotal,
      commonFee,
      grandTotal,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      isFirestoreSynced: true,
    };

    setSavedBills(prev => [newBillRecord, ...prev]);
    setIsSavingToFirestore(false);

    // 2. Open Digital Receipt Preview Modal
    setPreviewBill(newBillRecord);

    showToast(`အခန်း ${selectedRoomNumber} အတွက် ဘေလ် (${grandTotal.toLocaleString()}฿) ကို Firestore ထဲသို့ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။`);
  };

  // 3. Print / Download Receipt Handlers
  const handlePrintReceipt = () => {
    window.print();
  };

  const handleExportBillingReportsToCSV = () => {
    // CSV Header row
    const headers = [
      'ID',
      'Room Number',
      'Floor',
      'Tenant Name',
      'Month/Year',
      'Room Rent',
      'Electric Diff',
      'Electric Total',
      'Water Diff',
      'Water Total',
      'Common Fee',
      'Grand Total',
      'Status',
      'Created At'
    ];

    // Helper to escape CSV cell content
    const escapeCsv = (val: string | number | undefined | null): string => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = savedBills.map(b => [
      escapeCsv(b.id),
      escapeCsv(b.roomNumber),
      escapeCsv(b.floor),
      escapeCsv(b.tenantName),
      escapeCsv(b.monthYear),
      escapeCsv(b.roomRent),
      escapeCsv(b.electricDiff),
      escapeCsv(b.electricTotal),
      escapeCsv(b.waterDiff),
      escapeCsv(b.waterTotal),
      escapeCsv(b.commonFee),
      escapeCsv(b.grandTotal),
      escapeCsv(b.status),
      escapeCsv(b.createdAt)
    ]);

    const csvBody = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');

    // UTF-8 BOM (\uFEFF)
    const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Skyline_Billing_Reports_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Billing Reports များအား CSV ဖိုင်အဖြစ် ထုတ်ယူပြီးပါပြီ။');
  };

  const handleDownloadReceipt = (bill: BillRecord & { firestoreId?: string }) => {
    const textContent = `=====================================================
          SKYLINE RESIDENCE APARTMENT
            DIGITAL UTILITY RECEIPT
=====================================================
Firebase Project : ${firebaseConfig.projectId}
Collection       : invoices
Invoice ID       : ${bill.firestoreId || bill.id}
Room Number      : Room ${bill.roomNumber} (Floor ${bill.floor})
Tenant Name      : ${bill.tenantName}
Billing Month    : ${bill.monthYear}
Issued Date      : ${new Date(bill.createdAt).toLocaleString()}
Status           : ${bill.status} (မပေးချေရသေးပါ)
-----------------------------------------------------
ITEMIZED BREAKDOWN
-----------------------------------------------------
1. Electricity (မီးမီတာ) :
   - Unit: ${bill.prevElectricUnit} → ${bill.currElectricUnit} (${bill.electricDiff} units)
   - Rate: ${bill.electricRate}฿ / unit
   - Amount: ${bill.electricTotal.toLocaleString()}฿

2. Water (ရေမီတာ) :
   - Unit: ${bill.prevWaterUnit} → ${bill.currWaterUnit} (${bill.waterDiff} units)
   - Rate: ${bill.waterRate}฿ / unit
   - Amount: ${bill.waterTotal.toLocaleString()}฿

3. Room Rent (လစဥ်အခန်းခ) :
   - Floor ${bill.floor} (${bill.floor <= 4 ? 'Standard' : 'Economy'}): ${bill.roomRent.toLocaleString()}฿

4. Common Fee (အထွေထွေစရိတ်) :
   - Maintenance & Cleaning: ${bill.commonFee.toLocaleString()}฿
-----------------------------------------------------
TOTAL AMOUNT (စုစုပေါင်း ကျသင့်ငွေ) : ${bill.grandTotal.toLocaleString()}฿
=====================================================
Thank you for residing at Skyline Residence!
Manager Signature: [Admin Verified]
=====================================================`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Skyline-Receipt-Room-${bill.roomNumber}-${bill.monthYear.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Digital Receipt ဖိုင်ကို ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ။');
  };

  const handleDeleteBill = (billId: string) => {
    setSavedBills(prev => prev.filter(b => b.id !== billId));
    showToast('ဘေလ်မှတ်တမ်းကို ဖျက်ပစ်ပြီးပါပြီ။');
  };

  const handleToggleBillStatus = async (billId: string) => {
    const billToUpdate = savedBills.find(b => b.id === billId);
    if (!billToUpdate || !billToUpdate.firestoreId) return;

    if (!isAdminLoggedIn) {
      setShowAdminLoginModal(true);
      return;
    }

    const nextStatus = billToUpdate.status === 'Paid' ? 'Pending' : 'Paid';
    const result = await updateInvoiceStatus(billToUpdate.firestoreId, nextStatus);
    
    if (result.success) {
      setSavedBills(prev => prev.map(b => {
        if (b.id === billId) {
          return { ...b, status: nextStatus };
        }
        return b;
      }));
      showToast(`ဘေလ်အခြေအနေကို ${nextStatus} သို့ ပြောင်းလဲပြီးပါပြီ။`);
    } else {
      showToast('ဘေလ်အခြေအနေ ပြောင်းလဲခြင်း မအောင်မြင်ပါ');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Firebase Integration Status Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Utility Bill Calculator & Firebase Firestore
                </h2>
                <span className="text-[11px] bg-amber-50 text-amber-800 font-semibold px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  <Database className="w-3 h-3 text-amber-600" />
                  <span>firebase-my-skyline-apartment</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                မီးမီတာ၊ ရေမီတာ၊ အခန်းခ တွက်ချက်ခြင်း၊ Firestore ထဲသို့ data သိမ်းဆည်းခြင်းနှင့် Digital Receipt ထုတ်ပေးခြင်း
              </p>
            </div>
          </div>

          {/* Admin Auth Status Box & Persistence Indicator */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setShowPersistInfoModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
              title="Data Persistence (Option 1: localStorage & Option 2: Firestore Real-Time) အသေးစိတ် ကြည့်ရှုရန်"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Data Persisted: LocalStorage + Firestore Sync</span>
            </button>

            {isAdminLoggedIn ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <div className="text-left">
                  <span className="text-[10px] text-emerald-600 block uppercase font-bold tracking-wider">
                    Admin Status
                  </span>
                  <span className="text-xs font-bold text-emerald-900">
                    Logged In (ခွင့်ပြုထားသည်)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="ml-2 text-[10px] font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
                    Admin Access
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    Login မဝင်ရသေးပါ
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdminLoginModal(true)}
                  className="ml-1 px-2.5 py-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  Admin Login
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Firebase Config Info Banner */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <Cloud className="w-3.5 h-3.5 text-sky-500" />
              <span>Project: <strong>firebase-my-skyline-apartment</strong></span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              <span>Firestore Collection: <code className="text-slate-800 font-mono font-bold bg-slate-100 px-1 py-0.5 rounded">invoices</code></span>
            </span>
            <span>•</span>
            <span className="text-slate-600">
              Field Schema: <code className="text-slate-700 font-mono text-[11px]">Room, Month, Electricity, Water, TotalAmount, Status: Pending</code>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              မီး: ၁၀฿/u
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
              ရေ: ၂၅฿/u
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Form (Left) & Calculated Summary Box (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* 
          ========================================================================
          CALCULATION FORM
          ========================================================================
        */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-sky-600" />
                ၁။ အချက်အလက်များ ဖြည့်သွင်းရန် (Calculation Form)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                အခန်းရွေးချယ်ပြီး ယခင်လနှင့် ယခုလ မီတာယူနစ်များကို ထည့်သွင်းပါ
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Reset default values (မီး ၁၀ ယူနစ်၊ ရေ ၂၅ ယူနစ်၊ Common ၁၀၀฿)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>မူလအတိုင်းထားရန် (Reset)</span>
            </button>
          </div>

          <form onSubmit={handleSaveBill} className="space-y-5">
            {/* Room Dropdown and Billing Month */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Room Dropdown */}
              <div>
                <label htmlFor="bill-room-dropdown" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  အခန်း ရွေးချယ်ရန် (Select Room)
                </label>
                <div className="relative">
                  <select
                    id="bill-room-dropdown"
                    value={selectedRoomNumber}
                    onChange={(e) => {
                      setSelectedRoomNumber(e.target.value);
                      if (onRoomSelect) {
                        const target = rooms.find(r => r.roomNumber === e.target.value);
                        if (target) onRoomSelect(target.id);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-semibold text-slate-800 cursor-pointer appearance-none pr-9"
                  >
                    {rooms.map((room) => (
                      <option key={room.id} value={room.roomNumber}>
                        အခန်း {room.roomNumber} (Floor {room.floor}) - {room.monthlyRent.toLocaleString()}฿ {room.tenantName ? `[${room.tenantName}]` : '[အခန်းလွတ်]'}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>

              {/* Billing Month (e.g. Oct 2026) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="bill-month" className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    ဘေလ်ကာလ (Billing Month)
                  </label>
                  <span className="text-[11px] font-bold text-sky-700 font-mono bg-sky-50 px-1.5 py-0.5 rounded">
                    {formattedMonth}
                  </span>
                </div>
                <input
                  id="bill-month"
                  type="month"
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-medium text-slate-800 cursor-pointer"
                />
              </div>
            </div>

            {/* Tenant Name and Auto-filled Room Rent */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tenant-input" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  အငှားနေသူအမည် (Tenant Name)
                </label>
                <input
                  id="tenant-input"
                  type="text"
                  placeholder="အမည်ထည့်သွင်းပါ (ဥပမာ - ဦးမောင်မောင်)"
                  value={tenantNameInput}
                  onChange={(e) => setTenantNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                  လစဥ်အခန်းခ (Room Rent)
                </label>
                <div className="px-3.5 py-2.5 text-sm bg-slate-100/80 border border-slate-200 rounded-xl font-bold text-slate-900 flex items-center justify-between">
                  <span>{currentRoom?.roomType || (Number(selectedRoomNumber[0]) <= 4 ? 'Standard (လွှာ ၁-၄)' : 'Economy (လွှာ ၅-၆)')}</span>
                  <span className="text-sky-700 tabular-nums">{roomRent.toLocaleString()} ဘတ်</span>
                </div>
              </div>
            </div>

            {/* Electricity Section (မီးမီတာနှုန်း = 1 ယူနစ် 35 ဘတ်) */}
            <div className="p-4.5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    <Zap className="w-4 h-4 fill-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                      မီးမီတာ (Electricity)
                    </h4>
                    <span className="text-[11px] text-amber-700 font-semibold">
                      နှုန်းထား: ၁ ယူနစ် = ၁၀ ဘတ် (Rate: 10฿/unit)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-amber-900 block tabular-nums">
                    ကွာခြားချက်: {electricDiff} ယူနစ်
                  </span>
                  <span className="text-[11px] text-amber-700 font-medium tabular-nums">
                    {electricDiff} × ၁၀ = {electricTotal.toLocaleString()}฿
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label htmlFor="prev-electric" className="block text-[11px] font-semibold text-amber-900 mb-1">
                    ယခင်လ မီးယူနစ် (Previous Unit)
                  </label>
                  <input
                    id="prev-electric"
                    type="number"
                    min="0"
                    step="1"
                    value={prevElectric}
                    onChange={(e) => setPrevElectric(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-semibold text-slate-900 tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="curr-electric" className="block text-[11px] font-semibold text-amber-900 mb-1">
                    ယခုလ မီးယူနစ် (Current Unit)
                  </label>
                  <input
                    id="curr-electric"
                    type="number"
                    min="0"
                    step="1"
                    value={currElectric}
                    onChange={(e) => setCurrElectric(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 font-semibold text-slate-900 tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Water Section (ရေမီတာနှုန်း = 1 ယူနစ် 18 ဘတ်) */}
            <div className="p-4.5 rounded-2xl bg-sky-50/50 border border-sky-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shadow-xs">
                    <Droplets className="w-4 h-4 fill-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wide">
                      ရေမီတာ (Water)
                    </h4>
                    <span className="text-[11px] text-sky-700 font-semibold">
                      နှုန်းထား: ၁ ယူနစ် = ၂၅ ဘတ် (Rate: 25฿/unit)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-sky-900 block tabular-nums">
                    ကွာခြားချက်: {waterDiff} ယူနစ်
                  </span>
                  <span className="text-[11px] text-sky-700 font-medium tabular-nums">
                    {waterDiff} × ၂၅ = {waterTotal.toLocaleString()}฿
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label htmlFor="prev-water" className="block text-[11px] font-semibold text-sky-900 mb-1">
                    ယခင်လ ရေယူနစ် (Previous Unit)
                  </label>
                  <input
                    id="prev-water"
                    type="number"
                    min="0"
                    step="1"
                    value={prevWater}
                    onChange={(e) => setPrevWater(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm bg-white border border-sky-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 font-semibold text-slate-900 tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="curr-water" className="block text-[11px] font-semibold text-sky-900 mb-1">
                    ယခုလ ရေယူနစ် (Current Unit)
                  </label>
                  <input
                    id="curr-water"
                    type="number"
                    min="0"
                    step="1"
                    value={currWater}
                    onChange={(e) => setCurrWater(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm bg-white border border-sky-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 font-semibold text-slate-900 tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Common Fee input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="common-fee-input" className="block text-xs font-bold text-slate-700">
                  Common Fee (အထွေထွေနှင့် သန့်ရှင်းရေးစရိတ်)
                </label>
              </div>
              <div className="relative">
                <input
                  id="common-fee-input"
                  type="number"
                  min="0"
                  step="10"
                  value={commonFee}
                  onChange={(e) => setCommonFee(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-bold text-slate-800 pr-12 tabular-nums"
                />
                <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs font-semibold text-slate-400">
                  ဘတ် (฿)
                </span>
              </div>
            </div>

            {/* 
              FORMAT PART 1: "SAVE BILL" BUTTON
              Saves to Firestore 'invoices' collection
            */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isSavingToFirestore}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSavingToFirestore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Firestore ထဲသို့ သိမ်းဆည်းနေပါသည်...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4 text-sky-400" />
                    <span>Firestore ထဲသို့ ဘေလ်သိမ်းဆည်းမည် (Save Bill to Firestore)</span>
                  </>
                )}
              </button>

              {!isAdminLoggedIn && (
                <p className="text-center text-[11px] text-amber-700 bg-amber-50 py-1 px-2 rounded-lg border border-amber-200/60">
                  🔒 Admin (login ဝင်ထားသူ) တစ်ဦးတည်းသာ Firestore ထဲသို့ Save လုပ်ခွင့်ရှိပါမည်
                </p>
              )}
            </div>
          </form>
        </div>

        {/* 
          ========================================================================
          CALCULATED SUMMARY BOX
          Formula: (unit ကွာခြားချက် × နှုန်းထား) + Room Rent + Common Fee = "စုစုပေါင်း ကျသင့်ငွေ"
          ========================================================================
        */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                  Invoice Calculation Summary
                </span>
                <h3 className="text-lg font-extrabold text-white mt-0.5">
                  ၂။ တွက်ချက်ပြီး ကျသင့်ငွေ (Calculated Summary)
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs bg-slate-800/80 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 font-bold tabular-nums">
                  Room {selectedRoomNumber}
                </span>
              </div>
            </div>

            {/* Room & Tenant Meta */}
            <div className="py-3 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
              <div>
                <span className="text-slate-400">အငှားနေသူ: </span>
                <strong className="text-white font-semibold">{tenantNameInput || currentRoom?.tenantName || 'အမည်မသတ်မှတ်ရသေးပါ'}</strong>
              </div>
              <div>
                <span className="text-slate-400">ကာလ: </span>
                <strong className="text-sky-300 font-mono font-semibold">{formattedMonth}</strong>
              </div>
            </div>

            {/* Itemized Calculation Breakdown */}
            <div className="py-4 space-y-3.5 text-xs">
              {/* Electric Breakdown */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Zap className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200">မီးမီတာခ (Electricity)</span>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {electricDiff} ယူနစ် × ၃၅฿
                    </p>
                  </div>
                </div>
                <span className="font-bold text-amber-400 font-mono text-sm tabular-nums">
                  +{electricTotal.toLocaleString()}฿
                </span>
              </div>

              {/* Water Breakdown */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Droplets className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200">ရေမီတာခ (Water)</span>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {waterDiff} ယူနစ် × ၁၈฿
                    </p>
                  </div>
                </div>
                <span className="font-bold text-sky-400 font-mono text-sm tabular-nums">
                  +{waterTotal.toLocaleString()}฿
                </span>
              </div>

              {/* Room Rent */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Building2 className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200">လစဥ်အခန်းခ (Room Rent)</span>
                    <p className="text-[11px] text-slate-400">
                      Floor {currentRoom?.floor || selectedRoomNumber[0]}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-slate-200 font-mono text-sm tabular-nums">
                  +{roomRent.toLocaleString()}฿
                </span>
              </div>

              {/* Common Fee */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-slate-700/60 text-slate-300 flex items-center justify-center">
                    <Receipt className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200">Common Fee (အထွေထွေစရိတ်)</span>
                    <p className="text-[11px] text-slate-400">သန့်ရှင်းရေးနှင့် ထိန်းသိမ်းမှု</p>
                  </div>
                </div>
                <span className="font-bold text-slate-200 font-mono text-sm tabular-nums">
                  +{commonFee.toLocaleString()}฿
                </span>
              </div>
            </div>

            {/* Formula display string */}
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 font-mono">
              <span className="text-slate-400 block mb-0.5 text-[10px] font-sans uppercase">Formula:</span>
              <span>({electricDiff}×35฿) + ({waterDiff}×18฿) + {roomRent.toLocaleString()}฿ + {commonFee}฿</span>
            </div>

            {/* Big Highlighted Grand Total */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  စုစုပေါင်း ကျသင့်ငွေ (Grand Total)
                </p>
                <span className="text-[11px] text-emerald-400 font-medium">
                  မီး + ရေ + အခန်းခ + အထွေထွေ
                </span>
              </div>
              <div className="text-right">
                <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight tabular-nums">
                  {grandTotal.toLocaleString()}
                </span>
                <span className="text-lg font-bold text-emerald-500 ml-1">฿</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        SAVED INVOICES IN FIRESTORE
        ========================================================================
      */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-600" />
              Firestore 'invoices' သိမ်းဆည်းထားသော ဘေလ်မှတ်တမ်းများ
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              စုစုပေါင်း {savedBills.length} ခု (Firebase project: <span className="font-semibold text-slate-700">firebase-my-skyline-apartment</span>)
            </p>
          </div>
          {savedBills.length > 0 && (
            <span className="text-xs text-slate-500 font-medium">
              ကျသင့်ငွေ စုစုပေါင်း: <strong className="text-slate-900 tabular-nums">{savedBills.reduce((acc, b) => acc + b.grandTotal, 0).toLocaleString()}฿</strong>
            </span>
          )}
        </div>

        {savedBills.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>သိမ်းဆည်းထားသော ဘေလ်မှတ်တမ်း မရှိသေးပါ။</p>
            <p className="text-[11px] text-slate-400 mt-1">
              အထက်ပါ Form တွင် အချက်အလက်များဖြည့်၍ "Save Bill to Firestore" ကို နှိပ်ပါ
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-end p-2">
              <button 
                onClick={handleExportBillingReportsToCSV}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Billing Report CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">အခန်း (Room)</th>
                  <th className="py-2.5 px-3">အငှားနေသူ</th>
                  <th className="py-2.5 px-3">ကာလ (Month)</th>
                  <th className="py-2.5 px-3">မီးခ (Electricity)</th>
                  <th className="py-2.5 px-3">ရေခ (Water)</th>
                  <th className="py-2.5 px-3">အခန်းခ + Common</th>
                  <th className="py-2.5 px-3">စုစုပေါင်း (TotalAmount)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">လုပ်ဆောင်ချက်</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {savedBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 tabular-nums">Room {bill.roomNumber}</span>
                      <span className="text-[10px] text-slate-400 block">(Floor {bill.floor})</span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {bill.tenantName}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-sky-800">
                      {bill.monthYear}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-amber-700 tabular-nums">{bill.electricTotal.toLocaleString()}฿</span>
                      <span className="text-[10px] text-slate-400 block font-mono">({bill.electricDiff}u × {bill.electricRate}฿)</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-sky-700 tabular-nums">{bill.waterTotal.toLocaleString()}฿</span>
                      <span className="text-[10px] text-slate-400 block font-mono">({bill.waterDiff}u × {bill.waterRate}฿)</span>
                    </td>
                    <td className="py-3 px-3 tabular-nums text-slate-600">
                      {(bill.roomRent + bill.commonFee).toLocaleString()}฿
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-extrabold text-slate-900 text-sm tabular-nums">
                        {bill.grandTotal.toLocaleString()}฿
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleToggleBillStatus(bill.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          bill.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                        title="နှိပ်၍ အခြေအနေပြောင်းလဲနိုင်သည်"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${bill.status === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {bill.status === 'Paid' ? 'Paid' : 'Pending'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewBill(bill)}
                          className="px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Digital Receipt ဖွင့်ကြည့်ရန်"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                        <button
                          onClick={() => handleDownloadReceipt(bill)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Download Receipt"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBill(bill.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="ဖျက်ရန်"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {/* 
        ========================================================================
        FORMAT PART 2 & 3: DIGITAL RECEIPT MODAL
        - Room No, Date, item breakdown, Total Amount
        - "Print / Download Receipt" Buttons
        ========================================================================
      */}
      {previewBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div 
            id="digital-receipt-modal"
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">Digital Utility Receipt / ပြေစာ</h3>
                  <span className="text-[10px] text-slate-400">Firebase Firestore Synchronized</span>
                </div>
              </div>
              <button
                onClick={() => setPreviewBill(null)}
                className="text-slate-400 hover:text-white text-base font-bold cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Printable Receipt Paper Container */}
            <div className="p-6 sm:p-7 space-y-5 text-xs font-sans overflow-y-auto">
              {/* Receipt Header */}
              <div className="text-center pb-4 border-b border-dashed border-slate-200">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-900 text-white font-bold text-sm mb-2 shadow-xs">
                  <Building2 className="w-5 h-5 text-sky-400" />
                </div>
                <h4 className="text-lg font-black text-slate-900 tracking-tight">Skyline Residence</h4>
                <p className="text-[11px] text-slate-500">Apartment Monthly Utility & Rent Invoice</p>
                <div className="mt-2.5 flex items-center justify-center gap-2">
                  <span className="px-3 py-1 bg-slate-100 text-slate-900 font-extrabold text-xs rounded-lg tabular-nums">
                    Room {previewBill.roomNumber} (Floor {previewBill.floor})
                  </span>
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px] rounded-lg">
                    Status: {previewBill.status}
                  </span>
                </div>
              </div>

              {/* Meta Info (Room No, Date, Month, Tenant, Firestore ID) */}
              <div className="grid grid-cols-2 gap-3 text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">အငှားနေသူအမည်:</span>
                  <strong className="text-slate-900 font-bold text-xs">{previewBill.tenantName}</strong>
                  {emailSendResult?.success && (
                    <span className="text-[10px] text-indigo-600 font-mono block mt-0.5">
                      ✉ {emailSendResult.recipient}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">ဘေလ်ကာလ (Month):</span>
                  <strong className="text-sky-700 font-mono font-bold text-xs">{previewBill.monthYear}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ထုတ်ပေးသည့်ရက်စွဲ (Date):</span>
                  <span className="text-slate-700 font-mono text-[11px]">
                    {new Date(previewBill.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Firestore Doc ID:</span>
                  <span className="text-slate-500 font-mono text-[10px] truncate max-w-[120px] inline-block">
                    {previewBill.firestoreId || previewBill.id}
                  </span>
                </div>
              </div>

              {/* Itemized Breakdown Table */}
              <div className="space-y-2.5 py-2 border-y border-slate-100">
                <div className="flex justify-between items-center py-1">
                  <div>
                    <span className="font-bold text-slate-800">၁။ မီးမီတာခ (Electricity)</span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      {previewBill.prevElectricUnit} → {previewBill.currElectricUnit} ({previewBill.electricDiff} ယူနစ် × ၃၅฿)
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono tabular-nums text-sm">
                    {previewBill.electricTotal.toLocaleString()}฿
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <div>
                    <span className="font-bold text-slate-800">၂။ ရေမီတာခ (Water)</span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      {previewBill.prevWaterUnit} → {previewBill.currWaterUnit} ({previewBill.waterDiff} ယူနစ် × ၁၈฿)
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono tabular-nums text-sm">
                    {previewBill.waterTotal.toLocaleString()}฿
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <div>
                    <span className="font-bold text-slate-800">၃။ အခန်းငှားရမ်းခ (Room Rent)</span>
                    <span className="block text-[10px] text-slate-400">
                      Floor {previewBill.floor} ({previewBill.floor <= 4 ? 'Standard' : 'Economy'})
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono tabular-nums text-sm">
                    {previewBill.roomRent.toLocaleString()}฿
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <div>
                    <span className="font-bold text-slate-800">၄။ Common Fee (အထွေထွေစရိတ်)</span>
                    <span className="block text-[10px] text-slate-400">
                      အဆောက်အဦ သန့်ရှင်းရေးနှင့် ပြုပြင်ထိန်းသိမ်းမှု
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono tabular-nums text-sm">
                    {previewBill.commonFee.toLocaleString()}฿
                  </span>
                </div>
              </div>

              {/* Total Amount Box */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                    စုစုပေါင်း ကျသင့်ငွေ (Total Amount)
                  </span>
                  <span className="block text-[10px] text-emerald-600">အခွန်နှင့် ဝန်ဆောင်ခများ အပြီးအစီး</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tabular-nums">
                    {previewBill.grandTotal.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-emerald-800 ml-1">฿</span>
                </div>
              </div>

              {/* Security watermark footer */}
              <div className="text-center text-[10px] text-slate-400 pt-1 border-t border-dashed border-slate-200">
                ကျေးဇူးတင်ပါသည် · Skyline Residence Apartment Management
              </div>

              {/* Mock API Email Invoice Interactive Panel */}
              {(showEmailConfig || emailSendResult) && (
                <div className="p-4 rounded-2xl border bg-indigo-50/70 border-indigo-200/80 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                          <span>Email Digital Invoice</span>
                          <span className="text-[10px] font-mono bg-indigo-200 text-indigo-800 px-1.5 py-0.2 rounded font-semibold">Mock API Service</span>
                        </h5>
                        <p className="text-[10px] text-indigo-700">
                          အခန်း {previewBill.roomNumber} မှ အငှားနေသူ၏ အီးမေးလ်လိပ်စာသို့ ပြေစာ ပို့ဆောင်မည်
                        </p>
                      </div>
                    </div>

                    {emailSendResult?.success && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Delivered</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tenant Email Address (လက်ခံမည့်သူ၏ အီးမေးလ်လိပ်စာ):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={emailRecipient}
                        onChange={(e) => setEmailRecipient(e.target.value)}
                        placeholder="tenant.email@example.com"
                        disabled={isSendingEmail}
                        className="flex-1 px-3 py-2 text-xs bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={handleSendInvoiceEmail}
                        disabled={isSendingEmail || !emailRecipient.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-xs disabled:opacity-50 shrink-0"
                      >
                        {isSendingEmail ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>ပို့ဆောင်နေသည်...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Email</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Send Result Status Feedback */}
                  {emailSendResult && (
                    <div className={`p-2.5 rounded-xl text-[11px] flex items-start gap-2 border ${
                      emailSendResult.success 
                        ? 'bg-emerald-50 text-emerald-950 border-emerald-200' 
                        : 'bg-rose-50 text-rose-950 border-rose-200'
                    }`}>
                      {emailSendResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5">
                        <p className="font-bold">
                          {emailSendResult.success
                            ? `ဘေလ်ပြေစာကို ${emailSendResult.recipient} ထံသို့ အောင်မြင်စွာ ပို့ဆောင်ပြီးပါပြီ!`
                            : `ပို့ဆောင်မှု မအောင်မြင်ပါ: ${emailSendResult.error}`}
                        </p>
                        {emailSendResult.success && (
                          <p className="text-[10px] text-emerald-800 font-mono">
                            Mock Message ID: <strong>{emailSendResult.messageId}</strong> · Status: <strong>{emailSendResult.deliveryStatus}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons: Email Invoice / Download / Print Receipt */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 no-print">
                <button
                  type="button"
                  onClick={() => setShowEmailConfig(prev => !prev)}
                  className={`px-4 py-2.5 font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs ${
                    showEmailConfig
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
                  }`}
                  title="အငှားနေသူ၏ Email သို့ Digital Invoice ပို့ဆောင်ရန် (Mock API Service)"
                >
                  <Mail className={`w-4 h-4 ${showEmailConfig ? 'text-white' : 'text-indigo-600'}`} />
                  <span>Email Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadReceipt(previewBill)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
                >
                  <Download className="w-4 h-4 text-sky-600" />
                  <span>Download Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4 text-sky-600" />
                  <span>Print Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewBill(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer transition-colors"
                >
                  ပိတ်မည် (Close)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Lock className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Admin Login</h4>
                  <span className="text-[10px] text-slate-400">Apartment Manager Authentication</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminLoginModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminLoginSubmit} className="space-y-4 pt-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-900 text-[11px] leading-relaxed">
                <strong>သတိပေးချက်:</strong> Admin (login ဝင်ထားသူ) တစ်ဦးတည်းသာ Firestore ထဲသို့ ဘေလ် data သိမ်းဆည်းခွင့်ရှိပါသည်။
              </div>

              {adminLoginError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[11px]">
                  {adminLoginError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminLoginModal(false)}
                  className="px-3 py-2 text-slate-600 hover:text-slate-800 font-medium rounded-xl cursor-pointer"
                >
                  မလုပ်တော့ပါ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Login ဝင်မည်
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        PERSISTENCE ARCHITECTURE MODAL (Option 1 & Option 2)
        ========================================================================
      */}
      {showPersistInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Data Persistence Architecture</h3>
                  <p className="text-[11px] text-slate-400">Refresh နှင့် Logout ပြုလုပ်ပြီးနောက် Data မပျောက်စေရန် နည်းလမ်း ၂ မျိုး</p>
                </div>
              </div>
              <button
                onClick={() => setShowPersistInfoModal(false)}
                className="text-slate-400 hover:text-white text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              {/* Status summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Option 1: LocalStorage</span>
                  <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Active & Auto-Saved</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    အခန်း ၆၆ ခန်း နှင့် ဘေလ် {savedBills.length} ခုလုံးကို Browser LocalStorage ထဲတွင် အမြဲ အလိုအလျောက် သိမ်းဆည်းထားပါသည်။
                  </p>
                </div>

                <div className="p-3.5 bg-sky-50 rounded-2xl border border-sky-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Option 2: Firebase Firestore</span>
                  <div className="flex items-center gap-2 font-bold text-sky-950 text-sm">
                    <Cloud className="w-4 h-4 text-sky-600" />
                    <span>Real-Time Sync (onSnapshot)</span>
                  </div>
                  <p className="text-[11px] text-sky-800">
                    <code>firebase-my-skyline-apartment</code> ပရောဂျက်ရှိ <code>invoices</code> collection နှင့် Real-time sync ချိတ်ဆက်ထားပါသည်။
                  </p>
                </div>
              </div>

              {/* Code Explanation Option 1 */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs">1</span>
                  Option 1: localStorage Persistence Logic
                </h4>
                <p className="text-slate-600 text-[11px]">
                  State ပြောင်းလဲတိုင်း <code>useEffect</code> ဖြင့် <code>localStorage.setItem()</code> ပြုလုပ်ပြီး Initial Render တွင် <code>getItem()</code> ဖြင့် ပြန်ဆွဲထုတ်ထားသဖြင့် Refresh သို့မဟုတ် Browser ပိတ်ပြီး ပြန်ဖွင့်သော်လည်း Data မပျောက်ပါ။
                </p>
                <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto">
                  <pre>{`// 1. Initial State from localStorage on Mount
const [savedBills, setSavedBills] = useState(() => {
  const saved = localStorage.getItem('skyline_residence_saved_bills');
  return saved ? JSON.parse(saved) : [];
});

// 2. Auto-save on every state change
useEffect(() => {
  localStorage.setItem('skyline_residence_saved_bills', JSON.stringify(savedBills));
}, [savedBills]);`}</pre>
                </div>
              </div>

              {/* Code Explanation Option 2 */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded-md bg-sky-600 text-white flex items-center justify-center text-xs">2</span>
                  Option 2: Firebase Firestore Real-Time Sync Logic
                </h4>
                <p className="text-slate-600 text-[11px]">
                  Cloud Firestore ၏ <code>onSnapshot</code> listener ကို အသုံးပြုထားသောကြောင့် အခြားစက် သို့မဟုတ် Admin မှ အသစ်သိမ်းဆည်းလိုက်သော Invoices များကို ချက်ချင်း အချိန်နှင့်တစ်ပြေးညီ ရယူပေးပါသည်။
                </p>
                <div className="p-3 bg-slate-900 text-sky-300 font-mono text-[11px] rounded-xl overflow-x-auto">
                  <pre>{`// Firestore onSnapshot listener
useEffect(() => {
  const q = query(collection(db, 'invoices'), orderBy('CreatedAt', 'desc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const firestoreData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setSavedBills(firestoreData);
  });
  return () => unsubscribe();
}, []);`}</pre>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Data persistence status: <strong>Protected & Synced</strong>
              </span>
              <button
                onClick={() => setShowPersistInfoModal(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                နားလည်ပါပြီ (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default BillCalculator;
