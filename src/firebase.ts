import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp, 
  getDocs, 
  onSnapshot,
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { Room, RoomStatusType } from './types/room';

/**
 * Update invoice status in Firestore
 */
export async function updateInvoiceStatus(invoiceId: string, status: 'Pending' | 'Paid') {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    await updateDoc(invoiceRef, { Status: status });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating invoice status:", error);
    return { success: false, error };
  }
}
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';

/**
 * Firebase Configuration for Skyline Residence
 * Project: my-skyline-apartment
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyASiqKLrT8x0fxONbGJKex2e_kOHkb9oBQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "my-skyline-apartment.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "my-skyline-apartment",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "my-skyline-apartment.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "806962587782",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:806962587782:web:2255e09c099fa725604907",
};

/**
 * Check if real Firebase environment configuration is present.
 */
export const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey.trim() !== '' &&
  !firebaseConfig.apiKey.includes('DummyKey') &&
  !firebaseConfig.apiKey.includes('Placeholder') &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId.trim() !== ''
);

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

export {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
export type { User };

/**
 * Interface matching requested Firestore 'invoices' collection schema:
 * {Room: 101, Month: "Oct 2026", Electricity: 350, Water: 450, TotalAmount: 2500, Status: "Pending"}
 */
export interface FirestoreInvoiceDoc {
  id?: string;
  Room: number;
  Month: string;
  Electricity: number;
  Water: number;
  TotalAmount: number;
  Status: 'Pending' | 'Paid';
  RoomRent?: number;
  CommonFee?: number;
  TenantName?: string;
  ElectricDiff?: number;
  WaterDiff?: number;
  CreatedAt?: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): Error {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  return new Error(errMessage);
}

/**
 * Save an invoice to Firestore 'invoices' collection
 */
export async function saveInvoiceToFirestore(invoiceData: Omit<FirestoreInvoiceDoc, 'id'>) {
  try {
    const invoicesRef = collection(db, 'invoices');
    const docRef = await addDoc(invoicesRef, {
      ...invoiceData,
      CreatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    const err = handleFirestoreError(error, OperationType.CREATE, 'invoices');
    return { 
      success: false, 
      error: err.message || 'Invoice သိမ်းဆည်း၍ မရပါ' 
    };
  }
}

/**
 * Real-time Firestore Listener for Invoices
 * Subscribes to real-time updates from Firestore 'invoices' collection
 */
export function subscribeToInvoices(
  onUpdate: (invoices: FirestoreInvoiceDoc[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const invoicesRef = collection(db, 'invoices');
    const unsubscribe = onSnapshot(
      invoicesRef,
      (snapshot) => {
        const invoices: FirestoreInvoiceDoc[] = [];
        snapshot.forEach((docSnap) => {
          invoices.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        // Sort by CreatedAt descending in memory
        invoices.sort((a, b) => {
          const timeA = a.CreatedAt?.toMillis ? a.CreatedAt.toMillis() : (a.CreatedAt?.seconds ? a.CreatedAt.seconds * 1000 : (typeof a.CreatedAt === 'string' ? new Date(a.CreatedAt).getTime() : 0));
          const timeB = b.CreatedAt?.toMillis ? b.CreatedAt.toMillis() : (b.CreatedAt?.seconds ? b.CreatedAt.seconds * 1000 : (typeof b.CreatedAt === 'string' ? new Date(b.CreatedAt).getTime() : 0));
          return timeB - timeA;
        });
        onUpdate(invoices);
      },
      (error) => {
        const err = handleFirestoreError(error, OperationType.LIST, 'invoices');
        if (onError) onError(err);
      }
    );
    return unsubscribe;
  } catch (err: any) {
    const errorObj = handleFirestoreError(err, OperationType.LIST, 'invoices');
    if (onError) onError(errorObj);
    return () => {};
  }
}

/**
 * Interface for Public Room document in Firestore 'rooms' collection
 * doc ID = roomNumber (e.g. "101")
 */
export interface PublicRoomDoc {
  id: string;
  roomNumber: string;
  floor: number;
  roomType: string;
  monthlyRent: number;
  status: RoomStatusType;
  tenantName: string;
  updatedAt?: any;
}

/**
 * Interface for Sensitive Room Private document in Firestore 'roomPrivate' collection
 * doc ID = roomNumber (e.g. "101") - ONLY Admin read/write
 */
export interface RoomPrivateDoc {
  id: string;
  roomNumber: string;
  tenantPhone?: string;
  privateNotes?: string;
  notes?: string;
  moveInDate?: string;
  contractEndDate?: string;
  checkInDate?: string;
  updatedAt?: any;
}

/**
 * Delete invoice from Firestore 'invoices' collection
 */
export async function deleteInvoiceFromFirestore(invoiceId: string) {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    await deleteDoc(invoiceRef);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting invoice from Firestore:", error);
    return { success: false, error: error?.message || 'Invoice ဖျက်၍ မရပါ' };
  }
}

/**
 * 2. Auto-seed 66 rooms to Firestore 'rooms' collection if empty.
 * Floors 1-4 = 1,700฿, Floors 5-6 = 1,200฿, All Available.
 * Admin-only operation.
 */
export async function seedInitialRoomsIfEmpty(isAdmin: boolean): Promise<{ seeded: boolean; error?: string }> {
  if (!isAdmin) {
    return { seeded: false };
  }

  try {
    const roomsCol = collection(db, 'rooms');
    const existingSnap = await getDocs(roomsCol);
    if (!existingSnap.empty) {
      return { seeded: false };
    }

    const batch = writeBatch(db);
    for (let floor = 1; floor <= 6; floor++) {
      const rent = floor <= 4 ? 1700 : 1200;
      const roomType = floor <= 4 ? 'Standard Room (လွှာ ၁-၄)' : 'Economy Room (လွှာ ၅-၆)';

      for (let r = 1; r <= 11; r++) {
        const roomNumStr = r < 10 ? `0${r}` : `${r}`;
        const roomNumber = `${floor}${roomNumStr}`;
        const roomRef = doc(db, 'rooms', roomNumber);

        batch.set(roomRef, {
          id: roomNumber,
          roomNumber,
          floor,
          roomType,
          monthlyRent: rent,
          status: 'Available',
          tenantName: '',
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
    return { seeded: true };
  } catch (err: any) {
    console.error("Error seeding initial rooms in Firestore:", err);
    return { seeded: false, error: err?.message || String(err) };
  }
}

/**
 * 1. Read Firestore 'rooms' collection (doc ID = roomNumber) via onSnapshot in real-time.
 */
export function subscribeToRoomsCollection(
  onUpdate: (rooms: PublicRoomDoc[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const roomsCol = collection(db, 'rooms');
    return onSnapshot(
      roomsCol,
      (snapshot) => {
        const roomsList: PublicRoomDoc[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as PublicRoomDoc;
          roomsList.push({
            ...data,
            id: docSnap.id,
            roomNumber: data.roomNumber || docSnap.id,
          });
        });

        // Numerical sorting by roomNumber (101, 102, ... 611)
        roomsList.sort((a, b) => parseInt(a.roomNumber, 10) - parseInt(b.roomNumber, 10));
        onUpdate(roomsList);
      },
      (error) => {
        console.error("Firestore 'rooms' onSnapshot error:", error);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.error("Error attaching 'rooms' listener:", err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * 3. Subscribe to Firestore 'roomPrivate' collection (Admin only).
 * Contains phone number, private notes, contract dates.
 */
export function subscribeToRoomPrivateCollection(
  onUpdate: (privateMap: Record<string, RoomPrivateDoc>) => void,
  onError?: (err: Error) => void
) {
  try {
    const privCol = collection(db, 'roomPrivate');
    return onSnapshot(
      privCol,
      (snapshot) => {
        const privateMap: Record<string, RoomPrivateDoc> = {};
        snapshot.forEach((docSnap) => {
          privateMap[docSnap.id] = {
            ...(docSnap.data() as RoomPrivateDoc),
            id: docSnap.id,
            roomNumber: docSnap.id,
          };
        });
        onUpdate(privateMap);
      },
      (error) => {
        console.warn("Firestore 'roomPrivate' onSnapshot:", error?.message);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.warn("Could not initiate 'roomPrivate' listener:", err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Save room update to Firestore.
 * - Public fields -> 'rooms/{roomNumber}'
 * - Private fields -> 'roomPrivate/{roomNumber}' (phone, private notes, contract dates)
 * Admin only.
 */
export async function saveRoomToFirestore(
  roomData: Room,
  isAdmin: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!isAdmin) {
    return { success: false, error: 'ခွင့်ပြုချက်မရှိပါ (Admin သီးသန့် ဖြစ်ပါသည်)' };
  }

  try {
    const roomNumber = roomData.roomNumber;
    const roomRef = doc(db, 'rooms', roomNumber);
    const privateRef = doc(db, 'roomPrivate', roomNumber);

    const isAvailable = roomData.status === 'Available';

    const publicPayload: Partial<PublicRoomDoc> = {
      id: roomNumber,
      roomNumber,
      floor: roomData.floor,
      roomType: roomData.roomType,
      monthlyRent: roomData.monthlyRent,
      status: roomData.status,
      tenantName: isAvailable ? '' : (roomData.tenantName || ''),
      updatedAt: serverTimestamp(),
    };

    const privatePayload: Partial<RoomPrivateDoc> = {
      id: roomNumber,
      roomNumber,
      tenantPhone: isAvailable ? '' : (roomData.tenantPhone || ''),
      privateNotes: roomData.privateNotes ?? roomData.notes ?? '',
      notes: roomData.notes ?? '',
      moveInDate: isAvailable ? '' : (roomData.moveInDate || roomData.checkInDate || ''),
      contractEndDate: isAvailable ? '' : (roomData.contractEndDate || ''),
      checkInDate: isAvailable ? '' : (roomData.checkInDate || roomData.moveInDate || ''),
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(roomRef, publicPayload, { merge: true });
    batch.set(privateRef, privatePayload, { merge: true });
    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error("Error saving room to Firestore:", error);
    return { success: false, error: error?.message || 'အခန်းဒေတာ သိမ်းဆည်း၍ မရပါ' };
  }
}

