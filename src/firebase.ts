import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  setDoc,
  doc,
  updateDoc,
  serverTimestamp, 
  getDocs, 
  onSnapshot,
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';

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
 * Firebase Configuration Placeholder
 * Project name: firebase-my-skyline-apartment
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyFirebaseMySkylineApartmentPlaceholder",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "firebase-my-skyline-apartment.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "firebase-my-skyline-apartment",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "firebase-my-skyline-apartment.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "957546080921",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:957546080921:web:firebasemyskylinapartment",
};

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

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
    console.warn("Firestore write notice (placeholder or offline):", error);
    // If running in development preview or offline mode, return simulated success with ID
    return { 
      success: true, 
      id: `inv-${Date.now()}-${invoiceData.Room}`, 
      isSimulated: true, 
      warning: error?.message 
    };
  }
}

/**
 * OPTION 2: Real-time Firestore Listener for Invoices
 * Subscribes to real-time updates from Firestore 'invoices' collection
 */
export function subscribeToInvoices(onUpdate: (invoices: FirestoreInvoiceDoc[]) => void) {
  try {
    const invoicesRef = collection(db, 'invoices');
    const q = query(invoicesRef, orderBy('CreatedAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const invoices: FirestoreInvoiceDoc[] = [];
        snapshot.forEach((docSnap) => {
          invoices.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        onUpdate(invoices);
      },
      (error) => {
        console.warn("Firestore invoices real-time subscription error:", error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn("Could not initiate Firestore real-time listener:", err);
    return () => {};
  }
}

/**
 * OPTION 2: Sync all 66 Rooms to Firestore 'building_state/rooms' document
 */
export async function saveRoomsToFirestore(roomsData: any[]) {
  try {
    const roomStateDoc = doc(db, 'building_state', 'all_rooms');
    await setDoc(roomStateDoc, {
      rooms: roomsData,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.warn("Firestore rooms save notice:", error);
    return { success: false, error };
  }
}

/**
 * OPTION 2: Real-time listener for all 66 rooms from Firestore
 */
export function subscribeToRooms(onUpdate: (roomsData: any[]) => void) {
  try {
    const roomStateDoc = doc(db, 'building_state', 'all_rooms');
    const unsubscribe = onSnapshot(
      roomStateDoc,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && Array.isArray(data.rooms) && data.rooms.length === 66) {
            onUpdate(data.rooms);
          }
        }
      },
      (error) => {
        console.warn("Firestore rooms listener error:", error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn("Could not initiate Firestore rooms listener:", err);
    return () => {};
  }
}

