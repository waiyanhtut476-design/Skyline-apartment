import { Room, SummaryStats } from '../types/room';

export const STORAGE_KEY = 'skyline_residence_rooms_data';

/**
 * Generate 66 rooms according to Skyline Residence specifications:
 * - 6 floors, 11 rooms per floor
 * - Floors 1-4: 1,700฿
 * - Floors 5-6: 1,200฿
 * - Initially: All status = Available, tenantName = ""
 */
export function generateInitialRooms(): Room[] {
  const rooms: Room[] = [];

  for (let floor = 1; floor <= 6; floor++) {
    const rent = floor <= 4 ? 1700 : 1200;
    const roomType = floor <= 4 ? 'Standard Room (လွှာ ၁-၄)' : 'Economy Room (လွှာ ၅-၆)';

    for (let r = 1; r <= 11; r++) {
      // Room number formatted as 101-111, 201-211, etc.
      const roomNumStr = r < 10 ? `0${r}` : `${r}`;
      const roomNumber = `${floor}${roomNumStr}`;

      rooms.push({
        id: `room-${roomNumber}`,
        roomNumber,
        floor,
        roomType,
        monthlyRent: rent,
        status: 'Available',
        tenantName: '',
        tenantPhone: '',
        notes: '',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return rooms;
}

/**
 * Demo preset to demonstrate occupied and maintenance states
 */
export function generateDemoPresetRooms(): Room[] {
  const baseRooms = generateInitialRooms();

  const demoOccupants: Record<string, { tenant: string; phone: string; status: 'Occupied' | 'Maintenance'; moveIn?: string; contractEnd?: string }> = {
    '101': { tenant: 'ကိုအောင်ကျော် (Ko Aung Kyaw)', phone: '081-234-5678', status: 'Occupied', moveIn: '2026-01-15', contractEnd: '2027-01-14' },
    '105': { tenant: 'မစန္ဒာ (Ma Sandar)', phone: '089-876-5432', status: 'Occupied', moveIn: '2026-03-01', contractEnd: '2027-02-28' },
    '109': { tenant: '', phone: '', status: 'Maintenance' },
    '203': { tenant: 'ဦးကျော်ဝင်း (U Kyaw Win)', phone: '084-555-1212', status: 'Occupied', moveIn: '2026-02-10', contractEnd: '2027-02-09' },
    '207': { tenant: 'မသီတာ (Ma Thidar)', phone: '082-999-8877', status: 'Occupied', moveIn: '2025-11-01', contractEnd: '2026-10-31' },
    '302': { tenant: 'ကိုမျိုးမင်း (Ko Myo Min)', phone: '086-111-2233', status: 'Occupied', moveIn: '2026-04-15', contractEnd: '2027-04-14' },
    '308': { tenant: '', phone: '', status: 'Maintenance' },
    '404': { tenant: 'မနွယ်နွယ် (Ma Nwe Nwe)', phone: '083-444-5566', status: 'Occupied', moveIn: '2026-05-01', contractEnd: '2027-04-30' },
    '411': { tenant: 'ကိုဝင်းလှိုင် (Ko Win Hlaing)', phone: '087-777-6655', status: 'Occupied', moveIn: '2026-06-01', contractEnd: '2027-05-31' },
    '501': { tenant: 'ကိုထွန်းထွန်း (Ko Tun Tun)', phone: '085-333-2211', status: 'Occupied', moveIn: '2026-02-01', contractEnd: '2027-01-31' },
    '506': { tenant: 'မခင်လေး (Ma Khin Lay)', phone: '088-222-3344', status: 'Occupied', moveIn: '2026-07-01', contractEnd: '2027-06-30' },
    '602': { tenant: 'ကိုဇော်ဇော် (Ko Zaw Zaw)', phone: '080-666-7788', status: 'Occupied', moveIn: '2026-08-15', contractEnd: '2027-08-14' },
  };

  return baseRooms.map((room) => {
    const demo = demoOccupants[room.roomNumber];
    if (demo) {
      return {
        ...room,
        status: demo.status,
        tenantName: demo.tenant,
        tenantPhone: demo.phone,
        checkInDate: demo.moveIn || (demo.status === 'Occupied' ? '2026-09-01' : undefined),
        moveInDate: demo.moveIn,
        contractEndDate: demo.contractEnd,
        notes: demo.status === 'Maintenance' ? 'Air conditioner inspection & cleaning' : '၁ နှစ် စာချုပ် (1-Year Rental Agreement)',
        updatedAt: new Date().toISOString(),
      };
    }
    return room;
  });
}

export function calculateSummaryStats(rooms: Room[]): SummaryStats {
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === 'Occupied').length;
  const availableRooms = rooms.filter((r) => r.status === 'Available').length;
  const maintenanceRooms = rooms.filter((r) => r.status === 'Maintenance').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const totalMonthlyRentValue = rooms.reduce((sum, r) => sum + r.monthlyRent, 0);
  const currentCollectedRent = rooms
    .filter((r) => r.status === 'Occupied')
    .reduce((sum, r) => sum + r.monthlyRent, 0);

  return {
    totalRooms,
    occupiedRooms,
    availableRooms,
    maintenanceRooms,
    occupancyRate,
    totalMonthlyRentValue,
    currentCollectedRent,
  };
}
