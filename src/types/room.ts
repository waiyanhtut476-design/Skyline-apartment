export type RoomStatusType = 'Available' | 'Occupied' | 'Maintenance';

export interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  roomType: string;
  monthlyRent: number;
  status: RoomStatusType;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  checkInDate?: string;
  moveInDate?: string;
  contractEndDate?: string;
  notes?: string;
  privateNotes?: string;
  updatedAt?: string;
}

export interface RoomFilterOptions {
  floor: number | 'all';
  status: RoomStatusType | 'all';
  searchQuery: string;
}

export interface SummaryStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  occupancyRate: number;
  totalMonthlyRentValue: number;
  currentCollectedRent: number;
}

export interface BillRecord {
  id: string;
  roomNumber: string;
  floor: number;
  tenantName: string;
  tenantEmail?: string;
  monthYear: string;
  roomRent: number;
  prevElectricUnit: number;
  currElectricUnit: number;
  electricDiff: number;
  electricRate: number;
  electricTotal: number;
  prevWaterUnit: number;
  currWaterUnit: number;
  waterDiff: number;
  waterRate: number;
  waterTotal: number;
  commonFee: number;
  grandTotal: number;
  status: 'Pending' | 'Paid';
  createdAt: string;
}
