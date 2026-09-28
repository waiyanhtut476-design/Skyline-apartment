import React, { useState, useMemo, useEffect } from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Room, RoomStatusType } from '../types/room';
import { 
  generateInitialRooms, 
  calculateSummaryStats, 
  STORAGE_KEY 
} from '../data/initialRooms';
import { RoomModal } from './RoomModal';
import { OccupantDetailsModal } from './OccupantDetailsModal';
import { 
  Building2, 
  Search, 
  Filter, 
  RotateCcw, 
  Sparkles, 
  Layers, 
  LayoutGrid, 
  CheckCircle2, 
  XCircle, 
  Wrench, 
  User, 
  DollarSign,
  ChevronRight,
  TrendingUp,
  Info,
  Calculator,
  Download,
  FileSpreadsheet,
  Lock
} from 'lucide-react';

interface RoomStatusProps {
  initialRoomsData?: Room[];
  onRoomsChange?: (rooms: Room[]) => void;
  onCalculateBill?: (roomNumber: string) => void;
}

export const RoomStatus: React.FC<RoomStatusProps> = ({ 
  initialRoomsData, 
  onRoomsChange,
  onCalculateBill 
}) => {
  // Global Firebase Auth State
  const { isAdminLoggedIn, adminUser, openLoginModal, logoutAdmin } = useAdminAuth();

  // Initialize rooms from local storage or default initial state (All 66 rooms Available)
  const [rooms, setRooms] = useState<Room[]>(() => {
    if (initialRoomsData && initialRoomsData.length > 0) {
      return initialRoomsData;
    }
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

  // Selected room for modal
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOccupantDetailsOpen, setIsOccupantDetailsOpen] = useState(false);

  // Filters
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<RoomStatusType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'floor' | 'grid'>('floor');

  // Notification / toast feedback
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Sync state if parent initialRoomsData updates
  useEffect(() => {
    if (initialRoomsData && initialRoomsData.length === 66) {
      setRooms(initialRoomsData);
    }
  }, [initialRoomsData]);

  // Sync to localStorage and optional parent callback
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
    } catch (e) {
      console.error('Failed to save rooms to storage', e);
    }
    if (onRoomsChange) {
      onRoomsChange(rooms);
    }
  }, [rooms, onRoomsChange]);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3000);
  };

  // Summary statistics
  const stats = useMemo(() => calculateSummaryStats(rooms), [rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // Floor filter
      if (selectedFloor !== 'all' && room.floor !== selectedFloor) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'all' && room.status !== selectedStatus) {
        return false;
      }
      // Search query (matches room number, tenant name, or room type)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchRoomNum = room.roomNumber.toLowerCase().includes(q);
        const matchTenant = (room.tenantName || '').toLowerCase().includes(q);
        const matchType = room.roomType.toLowerCase().includes(q);
        if (!matchRoomNum && !matchTenant && !matchType) {
          return false;
        }
      }
      return true;
    });
  }, [rooms, selectedFloor, selectedStatus, searchQuery]);

  // Group filtered rooms by floor (1 to 6)
  const roomsByFloor = useMemo(() => {
    const floorsMap: Record<number, Room[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };
    filteredRooms.forEach((room) => {
      if (floorsMap[room.floor]) {
        floorsMap[room.floor].push(room);
      }
    });
    return floorsMap;
  }, [filteredRooms]);

  // Handle room update from modal
  const handleUpdateRoom = (updatedRoom: Room) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r))
    );
    setSelectedRoom(updatedRoom);
    showToast(`အခန်း ${updatedRoom.roomNumber} ၏ အချက်အလက်များကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။`);
  };

  const handleOpenRoomModal = (room: Room) => {
    setSelectedRoom(room);
    if (room.status === 'Occupied') {
      setIsOccupantDetailsOpen(true);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleEditRoomFromOccupantDetails = (roomToEdit: Room) => {
    setIsOccupantDetailsOpen(false);
    setSelectedRoom(roomToEdit);
    setIsModalOpen(true);
  };

  /**
   * Export the full list of rooms (all 66 rooms) and their current statuses to a CSV file for offline reporting.
   * Includes UTF-8 BOM so Myanmar/Burmese and English characters open cleanly in Excel and spreadsheet tools.
   */
  const handleExportToCSV = (exportOnlyFiltered = false) => {
    const targetRooms = exportOnlyFiltered ? filteredRooms : rooms;
    
    // CSV Header row
    const headers = [
      'Room Number',
      'Floor',
      'Room Type',
      'Monthly Rent (THB)',
      'Status',
      'Status (Myanmar)',
      'Tenant Name',
      'Contact Phone',
      'Notes',
      'Report Date'
    ];

    const todayStr = new Date().toISOString().split('T')[0];

    // Helper to escape CSV cell content
    const escapeCsv = (val: string | number | undefined | null): string => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const statusMm: Record<RoomStatusType, string> = {
      Available: 'အားလပ်ဆဲ (မီးစိမ်း)',
      Occupied: 'ငှားရမ်းပြီး (မီးနီ)',
      Maintenance: 'ပြင်ဆင်ဆဲ (မီးဝါ)'
    };

    const rows = targetRooms.map(r => [
      escapeCsv(r.roomNumber),
      escapeCsv(r.floor),
      escapeCsv(r.roomType),
      escapeCsv(r.monthlyRent),
      escapeCsv(r.status),
      escapeCsv(statusMm[r.status] || r.status),
      escapeCsv(r.tenantName || 'None'),
      escapeCsv(r.tenantPhone || '-'),
      escapeCsv(r.notes || '-'),
      escapeCsv(todayStr)
    ]);

    const csvBody = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');

    // UTF-8 BOM (\uFEFF) ensures proper Unicode rendering in Microsoft Excel & Google Sheets
    const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Skyline_Residence_Rooms_Report_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`အခန်း ၆၆ ခန်းလုံး၏ အခြေအနေ အစီရင်ခံစာကို CSV ဖိုင်အဖြစ် ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ။`);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Notification */}
      {feedbackMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Top Banner / Apartment Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Building2 className="w-7 h-7 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Skyline Residence
                </h1>
                <span className="text-xs bg-slate-100 text-slate-700 font-medium px-2.5 py-0.5 rounded-full border border-slate-200">
                  ၆ လွှာ · ၆၆ ခန်း
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                အဆောက်အဦ အခန်းအခြေအနေနှင့် အငှားစီမံခန့်ခွဲမှုစနစ် (Apartment Room Status Dashboard)
              </p>
            </div>
          </div>

          {/* Quick preset buttons & Admin Auth indicator */}
          <div className="flex flex-wrap items-center gap-2">
            {isAdminLoggedIn ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-900">
                  {adminUser?.email ? `Admin: ${adminUser.email}` : 'Admin Logged In'}
                </span>
                <button
                  type="button"
                  onClick={logoutAdmin}
                  className="ml-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openLoginModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Admin Login</span>
              </button>
            )}

            {onCalculateBill && (
              <button
                onClick={() => onCalculateBill('101')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                title="Utility Bill Calculator သို့ သွားရန်"
              >
                <Calculator className="w-3.5 h-3.5 text-sky-400" />
                <span>ဘေလ်တွက်ချက်ရန် (Bill Calculator)</span>
              </button>
            )}
          </div>
        </div>

        {/* Pricing notice bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              <strong className="text-slate-800 font-semibold">လွှာ ၁ မှ ၄ အထိ:</strong> ၁,၇၀၀ ဘတ် / လ (အခန်း ၄၄ ခန်း)
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <strong className="text-slate-800 font-semibold">လွှာ ၅ မှ ၆ အထိ:</strong> ၁,၂၀၀ ဘတ် / လ (အခန်း ၂၂ ခန်း)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">စုစုပေါင်း လစဥ်ဝင်ငွေခန့်မှန်းခြေ:</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {stats.totalMonthlyRentValue.toLocaleString()}฿
            </span>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        FORMAT PART 1: SUMMARY CARDS (၃ ခု)
        1. Total Rooms (စုစုပေါင်းအခန်း)
        2. Occupied (ငှားရမ်းထားသောအခန်း)
        3. Available (အားလပ်နေသောအခန်း)
        ========================================================================
      */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            အခန်းအခြေအနေ အကျဉ်းချုပ် (Summary Cards)
          </h2>
          <span className="text-xs text-slate-500">
            လက်ရှိငှားရမ်းမှုနှုန်း: <strong className="text-slate-900 font-semibold tabular-nums">{stats.occupancyRate}%</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Total Rooms */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden transition-all hover:border-slate-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Rooms (စုစုပေါင်းအခန်း)
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                    {stats.totalRooms}
                  </span>
                  <span className="text-xs font-medium text-slate-500">ခန်း</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>လွှာ ၁-၄ (၄၄ ခန်း) · လွှာ ၅-၆ (၂၂ ခန်း)</span>
              <span className="font-semibold text-slate-700 tabular-nums">၁၀၀%</span>
            </div>
          </div>

          {/* Card 2: Occupied Rooms (မီးနီ) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden transition-all hover:border-rose-300">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-xs"></span>
                  <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                    Occupied (ငှားရမ်းထားသောအခန်း)
                  </p>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-rose-600 tabular-nums">
                    {stats.occupiedRooms}
                  </span>
                  <span className="text-xs font-medium text-rose-700">ခန်း</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>လက်ရှိရရှိလခ:</span>
              <span className="font-semibold text-rose-700 tabular-nums">
                {stats.currentCollectedRent.toLocaleString()}฿ / လ
              </span>
            </div>
          </div>

          {/* Card 3: Available Rooms (မီးစိမ်း) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden transition-all hover:border-emerald-300">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs animate-pulse"></span>
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                    Available (အားလပ်နေသောအခန်း)
                  </p>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-extrabold text-emerald-600 tabular-nums">
                    {stats.availableRooms}
                  </span>
                  <span className="text-xs font-medium text-emerald-700">ခန်း</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>အသင့်ငှားရမ်းနိုင်မှု:</span>
              <span className="font-semibold text-emerald-700 tabular-nums">
                {stats.totalRooms > 0 ? Math.round((stats.availableRooms / stats.totalRooms) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Maintenance notice if any room is under maintenance */}
        {stats.maintenanceRooms > 0 && (
          <div className="mt-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="font-medium">
                ပြင်ဆင်ဆဲ မီးဝါ (Maintenance): <strong className="font-bold tabular-nums">{stats.maintenanceRooms}</strong> ခန်း ရှိနေပါသည်။
              </span>
            </div>
            <button
              onClick={() => setSelectedStatus('Maintenance')}
              className="text-amber-900 underline font-semibold cursor-pointer hover:text-amber-950"
            >
              ကြည့်ရှုရန်
            </button>
          </div>
        )}
      </div>

      {/* 
        ========================================================================
        SEARCH BAR & FILTER DROPDOWN CONTROLS
        - Search by Tenant Name or Room Number
        - Filter Dropdown by Status (Available, Occupied, Maintenance)
        ========================================================================
      */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-sky-600" />
              အခန်းနှင့် အငှားနေသူ ရှာဖွေစစ်ထုတ်မှု (Search & Filter)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              အငှားနေသူအမည် သို့မဟုတ် အခန်းနံပါတ်ဖြင့် ရှာဖွေနိုင်ပြီး အခြေအနေအလိုက် စစ်ထုတ်နိုင်ပါသည်
            </p>
          </div>

          {/* View Mode Switcher - Removed */}
          <div className="hidden">
          </div>
        </div>

        {/* Search Bar & Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-2">
          {/* 1. Search Bar for Tenant Name / Room Number */}
          <div className="lg:col-span-6">
            <label htmlFor="search-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              အငှားနေသူအမည် သို့မဟုတ် အခန်းနံပါတ် ရှာရန် (Search Tenant / Room)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="search-input"
                type="text"
                placeholder="အငှားနေသူအမည် (ဥပမာ - မောင်မောင်၊ Sandar) သို့မဟုတ် အခန်းနံပါတ် (101, 501)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="ရှာဖွေမှုကို ရှင်းလင်းရန်"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Filter Dropdown by Status (Available, Occupied, Maintenance) */}
          <div className="hidden">
            <label htmlFor="status-filter-select" className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              အခြေအနေ စစ်ထုတ်ရန် (Filter by Status)
            </label>
            <div className="relative">
              <select
                id="status-filter-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as RoomStatusType | 'all')}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-slate-800 cursor-pointer appearance-none pr-9"
              >
                <option value="all">အားလုံး (All Statuses) - {rooms.length} ခန်း</option>
                <option value="Available">🟢 မီးစိမ်း Available (အားလပ်ဆဲ) - {stats.availableRooms} ခန်း</option>
                <option value="Occupied">🔴 မီးနီ Occupied (ငှားရမ်းပြီး) - {stats.occupiedRooms} ခန်း</option>
                <option value="Maintenance">🟡 မီးဝါ Maintenance (ပြင်ဆင်ဆဲ) - {stats.maintenanceRooms} ခန်း</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>

          {/* 3. Floor Filter Dropdown */}
          <div className="lg:col-span-3">
            <label htmlFor="floor-filter-select" className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              အလွှာ ရွေးချယ်ရန် (Filter by Floor)
            </label>
            <div className="relative">
              <select
                id="floor-filter-select"
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all font-medium text-slate-800 cursor-pointer appearance-none pr-9"
              >
                <option value="all">အလွှာ အားလုံး (All 6 Floors)</option>
                <option value="1">Floor 1 (၁,၇၀၀฿ / လ - ၁၁ ခန်း)</option>
                <option value="2">Floor 2 (၁,၇၀၀฿ / လ - ၁၁ ခန်း)</option>
                <option value="3">Floor 3 (၁,၇၀၀฿ / လ - ၁၁ ခန်း)</option>
                <option value="4">Floor 4 (၁,၇၀၀฿ / လ - ၁၁ ခန်း)</option>
                <option value="5">Floor 5 (၁,၂၀၀฿ / လ - ၁၁ ခန်း)</option>
                <option value="6">Floor 6 (၁,၂၀၀฿ / လ - ၁၁ ခန်း)</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                <ChevronRight className="w-4 h-4 rotate-90" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Filter Badges & Results Counter Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-500 mr-1">အမြန်ရွေးချယ်ရန်:</span>
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedStatus === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              အားလုံး ({rooms.length})
            </button>
            <button
              onClick={() => setSelectedStatus('Available')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedStatus === 'Available'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${selectedStatus === 'Available' ? 'bg-white' : 'bg-emerald-500'}`}></span>
              မီးစိမ်း Available ({stats.availableRooms})
            </button>
            <button
              onClick={() => setSelectedStatus('Occupied')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedStatus === 'Occupied'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${selectedStatus === 'Occupied' ? 'bg-white' : 'bg-rose-500'}`}></span>
              မီးနီ Occupied ({stats.occupiedRooms})
            </button>
            <button
              onClick={() => setSelectedStatus('Maintenance')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedStatus === 'Maintenance'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${selectedStatus === 'Maintenance' ? 'bg-white' : 'bg-amber-500'}`}></span>
              မီးဝါ Maintenance ({stats.maintenanceRooms})
            </button>
          </div>

          {/* Results count, Export CSV & Clear filters */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleExportToCSV(false)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-lg transition-colors cursor-pointer"
              title="အခန်း ၆၆ ခန်းလုံး၏ စာရင်းကို CSV ဖိုင်အဖြစ် ဒေါင်းလုဒ်ဆွဲရန်"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <span className="text-slate-600 font-medium">
              ရှာဖွေတွေ့ရှိမှု: <strong className="text-slate-900 font-bold tabular-nums">{filteredRooms.length}</strong> / {rooms.length} ခန်း
            </span>
            {(searchQuery || selectedStatus !== 'all' || selectedFloor !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('all');
                  setSelectedFloor('all');
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline underline-offset-2 cursor-pointer"
              >
                အားလုံးပြန်ဖြုတ်ရန် (Reset Filters)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        FORMAT PART 2: ROOM STATUS GRID
        - မီးစိမ်း = Available Badge
        - မီးနီ = Occupied Badge
        - မီးဝါ = Maintenance Badge
        ========================================================================
      */}
      {filteredRooms.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">အခန်းရှာမတွေ့ပါ</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            ရှာဖွေမှုနှင့် ကိုက်ညီသော အခန်းမရှိပါ။ စစ်ထုတ်မှုများကို ပြန်လည်ချိန်ညှိကြည့်ပါ။
          </p>
          <button
            onClick={() => {
              setSelectedFloor('all');
              setSelectedStatus('all');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            စစ်ထုတ်မှုများ ပြန်ဖြုတ်ရန်
          </button>
        </div>
      ) : viewMode === 'floor' ? (
        /* Floor by floor view */
        <div className="space-y-6">
          {[1, 2, 3, 4, 5, 6].map((floorNumber) => {
            const floorRooms = roomsByFloor[floorNumber] || [];
            if (floorRooms.length === 0) return null;

            const floorRent = floorNumber <= 4 ? 1700 : 1200;
            const floorTypeDesc = floorNumber <= 4 ? 'Standard Room (၁,၇၀၀฿)' : 'Economy Room (၁,၂၀၀฿)';
            const floorOccupied = floorRooms.filter((r) => r.status === 'Occupied').length;
            const floorAvailable = floorRooms.filter((r) => r.status === 'Available').length;

            return (
              <div 
                key={floorNumber} 
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Floor Header Bar */}
                <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center tabular-nums">
                      F{floorNumber}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Floor {floorNumber} (အလွှာ {floorNumber})
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {floorTypeDesc} · ၁ လွှာလျှင် ၁၁ ခန်း
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      လွတ်: <strong className="tabular-nums">{floorAvailable}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/50">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      ငှားပြီး: <strong className="tabular-nums">{floorOccupied}</strong>
                    </span>
                  </div>
                </div>

                {/* Rooms Grid for this floor */}
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {floorRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      searchQuery={searchQuery}
                      onClick={() => handleOpenRoomModal(room)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Unified 66-room Grid view */
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              အခန်းများအားလုံး စာရင်း ({filteredRooms.length} ခန်း)
            </h3>
            <span className="text-xs text-slate-500">
              ကတ်တစ်ခုစီကို နှိပ်၍ အငှားနေသူနှင့် အခြေအနေ ပြင်ဆင်နိုင်ပါသည်
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                searchQuery={searchQuery}
                onClick={() => handleOpenRoomModal(room)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Occupant Details Overlay (appears when clicking an Occupied room) */}
      <OccupantDetailsModal
        room={selectedRoom}
        isOpen={isOccupantDetailsOpen}
        onClose={() => setIsOccupantDetailsOpen(false)}
        onEditRoom={handleEditRoomFromOccupantDetails}
        onCalculateBill={onCalculateBill}
        onUpdateRoom={handleUpdateRoom}
      />

      {/* Room Detail & Edit Modal */}
      <RoomModal
        room={selectedRoom}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleUpdateRoom}
        onCalculateBill={onCalculateBill}
      />
    </div>
  );
};

/* Individual Room Card with Status Badges */
interface RoomCardProps {
  room: Room;
  searchQuery?: string;
  onClick: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, searchQuery = '', onClick }) => {
  const isAvailable = room.status === 'Available';
  const isOccupied = room.status === 'Occupied';
  const isMaintenance = room.status === 'Maintenance';

  const cleanQuery = searchQuery.trim().toLowerCase();
  const isTenantMatch = Boolean(
    cleanQuery && room.tenantName && room.tenantName.toLowerCase().includes(cleanQuery)
  );
  const isRoomNumberMatch = Boolean(
    cleanQuery && room.roomNumber.toLowerCase().includes(cleanQuery)
  );

  return (
    <div
      onClick={onClick}
      title={
        isOccupied
          ? `အခန်း ${room.roomNumber} - နှိပ်၍ Occupant Details (အငှားနေထိုင်သူ အသေးစိတ်) ကြည့်ရှုရန်`
          : `အခန်း ${room.roomNumber} - နှိပ်၍ အချက်အလက်ပြင်ဆင်ရန်`
      }
      className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer select-none text-left ${
        isTenantMatch || isRoomNumberMatch
          ? 'ring-2 ring-sky-500 shadow-md bg-sky-50/20'
          : isAvailable
          ? 'bg-white hover:bg-emerald-50/30 border-slate-200 hover:border-emerald-400 hover:shadow-xs'
          : isOccupied
          ? 'bg-white hover:bg-rose-50/30 border-slate-200 hover:border-rose-400 hover:shadow-xs'
          : 'bg-white hover:bg-amber-50/30 border-slate-200 hover:border-amber-400 hover:shadow-xs'
      }`}
    >
      {/* Top Header: Room Number and Floor Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`text-base font-extrabold tabular-nums group-hover:text-slate-950 ${
            isRoomNumberMatch ? 'text-sky-600 bg-sky-100/70 px-1 rounded' : 'text-slate-900'
          }`}>
            {room.roomNumber}
          </span>
          <span className="text-[10px] font-medium text-slate-400">
            (F{room.floor})
          </span>
        </div>

        {/* Rent amount with Baht badge */}
        <span className="text-xs font-bold text-slate-700 tabular-nums">
          {room.monthlyRent.toLocaleString()}฿
        </span>
      </div>

      {/* Room Type */}
      <div className="mt-1 text-[11px] text-slate-500 truncate">
        {room.floor <= 4 ? 'Standard Room' : 'Economy Room'}
      </div>

      {/* 
        Status Badges:
        - မီးစိမ်း = Available Badge
        - မီးနီ = Occupied Badge
        - မီးဝါ = Maintenance Badge
      */}
      <div className="mt-2.5">
        {isAvailable && (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 w-full justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs animate-pulse"></span>
              မီးစိမ်း Available
            </span>
            <span className="text-[10px] text-emerald-600 font-normal">လွတ်</span>
          </div>
        )}

        {isOccupied && (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 w-full justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-xs"></span>
              မီးနီ Occupied
            </span>
            <span className="text-[10px] text-rose-600 font-normal">ငှားပြီး</span>
          </div>
        )}

        {isMaintenance && (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 w-full justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-xs"></span>
              မီးဝါ Maintenance
            </span>
            <span className="text-[10px] text-amber-600 font-normal">ပြင်ဆင်</span>
          </div>
        )}
      </div>

      {/* Tenant Name */}
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
        {isOccupied && room.tenantName ? (
          <div className="flex items-center gap-1 text-slate-800 font-medium truncate">
            <User className={`w-3 h-3 shrink-0 ${isTenantMatch ? 'text-sky-600' : 'text-rose-500'}`} />
            <span className={`truncate ${isTenantMatch ? 'bg-amber-100 text-amber-900 font-bold px-1 rounded' : ''}`}>
              {room.tenantName}
            </span>
          </div>
        ) : isOccupied ? (
          <div className="flex items-center gap-1 text-rose-600 truncate">
            <User className="w-3 h-3 text-rose-400 shrink-0" />
            <span className="truncate italic">ငှားရမ်းထားသည်</span>
          </div>
        ) : isMaintenance ? (
          <div className="flex items-center gap-1 text-amber-600 truncate">
            <Wrench className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="truncate text-[10px]">စစ်ဆေးပြင်ဆင်ဆဲ</span>
          </div>
        ) : (
          <span className="text-slate-400 italic text-[10px]">
            Tenant မရှိသေးပါ
          </span>
        )}

        <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </div>
  );
};

export default RoomStatus;
