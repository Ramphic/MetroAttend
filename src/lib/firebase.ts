import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as firebaseSignOut,
  Auth,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Firestore 
} from 'firebase/firestore';
import { Employee, AttendanceRecord, WorkplaceSettings, StaffCategory, SystemNotification, AttendanceStatus } from '../types';
import { getDeviceSignature } from './deviceFingerprint';
import { DEFAULT_DUR_EMPLOYEES, getHistoricalAttendanceRecords } from '../data';

// Configuration from environment variables (with project defaults for deployed environments)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBrnaPztFK9oo_-V71R4L_88bFoJU7caAE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'durattendance.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'durattendance',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'durattendance.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '99884343146',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:99884343146:web:fe11334a1ccca71e22cf13',
};

// Check if valid Firebase configuration is provided
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.apiKey.length > 5
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
}

export { auth, db, googleProvider };

/**
 * Sign in with Email and Password
 */
export async function signInEmailPassword(email: string, password: string): Promise<User> {
  if (!auth) throw new Error('Firebase Authentication is not available. Please verify credentials.');
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

/**
 * Register a new employee with Email and Password
 */
export async function createEmailAccount(email: string, password: string, displayName: string): Promise<User> {
  if (!auth) throw new Error('Firebase Authentication is not available. Please verify credentials.');
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName.trim()) {
    await updateProfile(cred.user, { displayName: displayName.trim() });
  }
  return cred.user;
}

/**
 * Send password reset email
 */
export async function resetUserPassword(email: string): Promise<void> {
  if (!auth) throw new Error('Firebase Authentication is not available.');
  await sendPasswordResetEmail(auth, email.trim());
}

// ----------------------------------------------------
// CREDENTIAL STORE & FALLBACK REGISTRY
// ----------------------------------------------------

export interface StoredCredential {
  email: string;
  password: string;
  uid: string;
  name: string;
  createdAt: string;
}

const LOCAL_CREDENTIALS_KEY = 'metroattend_credentials';

export function getLocalCredentials(): StoredCredential[] {
  try {
    const raw = localStorage.getItem(LOCAL_CREDENTIALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCredentials(list: StoredCredential[]) {
  try {
    localStorage.setItem(LOCAL_CREDENTIALS_KEY, JSON.stringify(list));
  } catch {}
}

export async function saveStoredCredential(email: string, password: string, uid: string, name: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const record: StoredCredential = {
    email: cleanEmail,
    password,
    uid,
    name,
    createdAt: new Date().toISOString(),
  };

  if (db) {
    try {
      const docId = `cred_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
      await setDoc(doc(db, 'credentials', docId), record, { merge: true });
    } catch (e) {
      console.warn('Error saving credential to Firestore:', e);
    }
  }

  const list = getLocalCredentials();
  const idx = list.findIndex(c => c.email === cleanEmail);
  if (idx >= 0) {
    list[idx] = record;
  } else {
    list.push(record);
  }
  saveLocalCredentials(list);
}

export async function getStoredCredential(email: string): Promise<StoredCredential | null> {
  const cleanEmail = email.trim().toLowerCase();

  if (db) {
    try {
      const docId = `cred_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
      const snap = await getDoc(doc(db, 'credentials', docId));
      if (snap.exists()) {
        return snap.data() as StoredCredential;
      }
    } catch (e) {
      console.warn('Error fetching credential from Firestore:', e);
    }
  }

  const list = getLocalCredentials();
  const found = list.find(c => c.email === cleanEmail);
  return found || null;
}

export async function findUserByEmail(email: string): Promise<Employee | null> {
  const cleanEmail = email.trim().toLowerCase();

  if (db) {
    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { ...snap.docs[0].data(), id: snap.docs[0].id } as Employee;
      }
    } catch (e) {
      console.warn('Error searching user by email in Firestore:', e);
    }
  }

  const local = getLocalUsers();
  return local.find(u => u.email?.trim().toLowerCase() === cleanEmail) || null;
}

// Single designated Admin Email from env or fallback
export const DESIGNATED_ADMIN_EMAIL = (
  import.meta.env.VITE_ADMIN_EMAIL || 'otoojoojotandoh100@gmail.com'
).trim().toLowerCase();

/**
 * Return current local calendar date formatted as YYYY-MM-DD
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Haversine distance formula in meters between two GPS points
 */
export function calculateDistanceMeters(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const calculateDistance = calculateDistanceMeters;

export const DEFAULT_ROAD_PROJECTS: import('../types').RoadProjectSite[] = [
  { id: 'proj_1', name: 'Kasoa Interchange & Access Slipway Corridor', corridor: 'Accra-Winneba Road', locality: 'Kasoa', latitude: 5.535000, longitude: -0.420000, radius: 800, status: 'Active' },
  { id: 'proj_2', name: 'Dansoman Coastal Road & Stormwater Drainage', corridor: 'Beach Road / SSNIT Hospital Corridor', locality: 'Dansoman', latitude: 5.552000, longitude: -0.258000, radius: 600, status: 'Active' },
  { id: 'proj_3', name: 'Amasaman Highway Dualization & Bridge Works', corridor: 'Accra-Nsawam Trunk Road', locality: 'Amasaman', latitude: 5.725000, longitude: -0.320000, radius: 800, status: 'Active' },
  { id: 'proj_4', name: 'Pokuase - Ofankor Dualization Arterial', corridor: 'Pokuase Interchange Sector', locality: 'Pokuase', latitude: 5.706700, longitude: -0.298200, radius: 600, status: 'Active' },
  { id: 'proj_5', name: 'Spintex Road Junction Improvement Project', corridor: 'Spintex Arterial Corridor', locality: 'Spintex', latitude: 5.632000, longitude: -0.108000, radius: 600, status: 'Active' },
  { id: 'proj_6', name: 'Accra-Tema Motorway Expansion Corridor', corridor: 'Motorway Corridor', locality: 'Accra - Tema', latitude: 5.658000, longitude: -0.052000, radius: 1000, status: 'Active' },
  { id: 'proj_7', name: 'Materials Testing Lab & Asphalt Plant Facility', corridor: 'Quality Control Sector', locality: 'Industrial Area', latitude: 5.578000, longitude: -0.224000, radius: 450, status: 'Active' },
];

// Default Workplace location: Department of Urban Roads HQ (Ministries, Accra)
export const DEFAULT_WORKPLACE: WorkplaceSettings = {
  officeName: 'Department of Urban Roads (DUR HQ)',
  latitude: 5.549200,
  longitude: -0.197800,
  geofenceRadius: 350, // 350 meters gives complete compound coverage and accommodates indoor GPS inaccuracy
  workStartTime: '08:00',
  gracePeriodMinutes: 15,
  allowCheckout: true,
  workEndTime: '17:00',
  breakTime: '12:30',
  weekendWorkAllowed: false,
  orgName: 'Department of Urban Roads',
  orgCode: 'DUR',
  orgEmail: 'info@dur.gov.gh',
  orgPhone: '+233 30 268 5685',
  orgAddress: 'Treasury Road, Ministries, Accra, Ghana (GA-143-4328)',
  timezone: 'Africa/Accra (GMT+0)',
  antiSpoofing: true,
  deviceLock: true,
  sessionTimeout: 60,
  roadProjects: DEFAULT_ROAD_PROJECTS,
};

// Local storage keys for fallback when Firebase credentials are not yet entered
const LOCAL_USERS_KEY = 'metroattend_users';
const LOCAL_ATTENDANCE_KEY = 'metroattend_attendance';
const LOCAL_SETTINGS_KEY = 'metroattend_settings';

// Read local storage users
function getLocalUsers(): Employee[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) {
      saveLocalUsers(DEFAULT_DUR_EMPLOYEES);
      return DEFAULT_DUR_EMPLOYEES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const cleaned = parsed.filter((u: Employee) => !u.name?.includes('Kwame Mensah'));
      if (cleaned.length > 0) return cleaned;
    }
    saveLocalUsers(DEFAULT_DUR_EMPLOYEES);
    return DEFAULT_DUR_EMPLOYEES;
  } catch {
    return DEFAULT_DUR_EMPLOYEES;
  }
}

function saveLocalUsers(users: Employee[]) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function getLocalAttendance(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_ATTENDANCE_KEY);
    if (!raw) {
      const initial = getHistoricalAttendanceRecords();
      saveLocalAttendance(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const cleaned = parsed.filter((r: AttendanceRecord) => !r.name?.includes('Kwame Mensah') && r.date !== 'Today');
      if (cleaned.length > 0) return cleaned;
    }
    const initial = getHistoricalAttendanceRecords();
    saveLocalAttendance(initial);
    return initial;
  } catch {
    return getHistoricalAttendanceRecords();
  }
}

function saveLocalAttendance(records: AttendanceRecord[]) {
  localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(records));
}

/**
 * Fetch a user profile by UID
 */
export async function getUserProfile(uid: string): Promise<Employee | null> {
  if (db) {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as Employee;
      }
    } catch (e) {
      console.warn('Error fetching user from Firestore, checking local storage:', e);
    }
  }

  const local = getLocalUsers();
  const match = local.find(u => u.uid === uid || u.id === uid);
  return match || null;
}

/**
 * Save or update a user profile
 */
export async function saveUserProfile(uid: string, data: Partial<Employee>): Promise<void> {
  if (db) {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { ...data, uid, id: uid }, { merge: true });
    } catch (e) {
      console.warn('Error saving user to Firestore, falling back to local storage:', e);
    }
  }

  const local = getLocalUsers();
  const idx = local.findIndex(u => u.uid === uid || u.id === uid);
  if (idx >= 0) {
    local[idx] = { ...local[idx], ...data, uid };
  } else {
    local.push({
      id: uid,
      uid,
      name: data.name || 'Staff Member',
      staffId: data.staffId || `MWI-${Math.floor(1000 + Math.random() * 9000)}`,
      category: data.category || 'Permanent Staff',
      department: data.department || 'Operations',
      position: data.position || 'Staff',
      supervisor: data.supervisor || 'Manager',
      email: data.email || '',
      phone: data.phone || '',
      status: 'Active',
      avatar: (data.name || 'SM').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
      role: data.role || 'employee',
      profileComplete: data.profileComplete ?? true,
      ...data,
    } as Employee);
  }
  saveLocalUsers(local);
}

/**
 * Fetch all employees for Staff Management
 */
export async function getAllEmployees(): Promise<Employee[]> {
  let firestoreUsers: Employee[] = [];
  if (db) {
    try {
      const q = collection(db, 'users');
      const snap = await getDocs(q);
      if (!snap.empty) {
        firestoreUsers = snap.docs.map(d => ({ ...d.data(), id: d.id } as Employee));
      }
    } catch (e) {
      console.warn('Error getting employees from Firestore, using local storage:', e);
    }
  }

  const local = getLocalUsers();

  // Combine baseline DUR workforce with any registered users (like the administrator)
  const combined = new Map<string, Employee>();
  
  // 1. Seed base DUR workforce
  for (const emp of DEFAULT_DUR_EMPLOYEES) {
    combined.set(emp.email.toLowerCase(), emp);
  }
  // 2. Merge local storage users
  for (const emp of local) {
    const key = (emp.email || emp.id || emp.uid || '').toLowerCase();
    if (key) combined.set(key, emp);
  }
  // 3. Merge Firestore users (highest precedence for profile updates / admin role)
  for (const emp of firestoreUsers) {
    const key = (emp.email || emp.id || emp.uid || '').toLowerCase();
    if (key) combined.set(key, emp);
  }

  return Array.from(combined.values());
}

/**
 * Delete an employee record
 */
export async function deleteEmployee(uid: string): Promise<void> {
  if (db) {
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (e) {
      console.warn('Error deleting user from Firestore:', e);
    }
  }

  const local = getLocalUsers();
  const filtered = local.filter(u => u.uid !== uid && u.id !== uid);
  saveLocalUsers(filtered);
}

/**
 * Toggle employee status (Active <-> Inactive)
 */
export async function toggleEmployeeStatus(uid: string, currentStatus: 'Active' | 'Inactive'): Promise<'Active' | 'Inactive'> {
  const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
  await saveUserProfile(uid, { status: nextStatus });
  return nextStatus;
}

/**
 * Record a new check-in with Device Signature & Anti-Proxy Collision Detection
 */
export async function recordCheckIn(record: AttendanceRecord): Promise<string> {
  const sig = getDeviceSignature();
  const todayStr = record.date || getLocalDateString();

  const enrichedRecord: AttendanceRecord = {
    ...record,
    deviceId: sig.deviceId,
    deviceModel: sig.deviceModel,
    deviceBrowser: sig.deviceBrowser,
    deviceOs: sig.deviceOs,
    deviceLabel: sig.deviceLabel,
    isSharedDevice: false,
    timestamp: Date.now(),
  };

  if (db) {
    try {
      // Cross-worker collision check: Did another user check in with this physical phone today?
      const q = query(
        collection(db, 'attendance'),
        where('date', '==', todayStr),
        where('deviceId', '==', sig.deviceId)
      );
      const snap = await getDocs(q);
      const otherDoc = snap.docs.find(d => {
        const data = d.data();
        return (data.userId || data.employeeId) !== (record.userId || record.employeeId);
      });

      if (otherDoc) {
        const colliding = otherDoc.data() as AttendanceRecord;
        enrichedRecord.isSharedDevice = true;
        enrichedRecord.sharedWithEmployeeName = colliding.name || 'Another Employee';

        // Flag the earlier check-in as well so both records display the shared device warning
        await updateDoc(otherDoc.ref, {
          isSharedDevice: true,
          sharedWithEmployeeName: record.name || 'Another Employee',
        });
      }

      const col = collection(db, 'attendance');
      const docRef = await addDoc(col, enrichedRecord);

      if (record.userId) {
        saveUserProfile(record.userId, {
          lastDeviceId: sig.deviceId,
          lastDeviceLabel: sig.deviceLabel,
        });
      }

      return docRef.id;
    } catch (e) {
      console.warn('Error saving attendance to Firestore, using local storage:', e);
    }
  }

  // Local storage fallback
  const local = getLocalAttendance();
  const localCollision = local.find(r => 
    r.date === todayStr && 
    r.deviceId === sig.deviceId && 
    (r.userId || r.employeeId) !== (record.userId || record.employeeId)
  );

  if (localCollision) {
    enrichedRecord.isSharedDevice = true;
    enrichedRecord.sharedWithEmployeeName = localCollision.name || 'Another Employee';
    localCollision.isSharedDevice = true;
    localCollision.sharedWithEmployeeName = record.name || 'Another Employee';
  }

  const newId = `att_${Date.now()}`;
  enrichedRecord.id = newId;
  local.unshift(enrichedRecord);
  saveLocalAttendance(local);

  if (record.userId) {
    saveUserProfile(record.userId, {
      lastDeviceId: sig.deviceId,
      lastDeviceLabel: sig.deviceLabel,
    });
  }

  return newId;
}

/**
 * Record a check-out
 */
export async function recordCheckOut(userId: string, checkOutTime: string): Promise<void> {
  const todayStr = getLocalDateString();

  if (db) {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', userId),
        where('date', '==', todayStr)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        await updateDoc(docRef, { checkOut: checkOutTime });
        return;
      }
    } catch (e) {
      console.warn('Error updating check-out in Firestore, falling back to local storage:', e);
    }
  }

  const local = getLocalAttendance();
  const idx = local.findIndex(r => (r.userId === userId || r.employeeId === userId) && r.date === todayStr);
  if (idx >= 0) {
    local[idx].checkOut = checkOutTime;
    saveLocalAttendance(local);
  }
}

/**
 * Cancel an early check-out to resume the active workday
 */
export async function cancelCheckOut(userId: string): Promise<void> {
  const todayStr = getLocalDateString();

  if (db) {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', userId),
        where('date', '==', todayStr)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        await updateDoc(docRef, { checkOut: '—' });
        return;
      }
    } catch (e) {
      console.warn('Error resetting check-out in Firestore, using local storage:', e);
    }
  }

  const local = getLocalAttendance();
  const idx = local.findIndex(r => (r.userId === userId || r.employeeId === userId) && r.date === todayStr);
  if (idx >= 0) {
    local[idx].checkOut = '—';
    saveLocalAttendance(local);
  }
}

/**
 * Record an employee self-reported absence
 */
export async function recordAbsence(
  userId: string,
  userName: string,
  userCategory: string,
  userDepartment: string,
  userPhotoURL: string | undefined,
  reason: string,
  note?: string
): Promise<string> {
  const todayStr = getLocalDateString();
  const dayLabel = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  const record: AttendanceRecord = {
    userId,
    employeeId: userId,
    name: userName,
    category: userCategory,
    department: userDepartment,
    photoURL: userPhotoURL,
    date: todayStr,
    dayLabel,
    checkIn: '—',
    checkOut: '—',
    status: 'Absent',
    locationVerified: false,
    absenceReason: reason,
    absenceNote: note || '',
    timestamp: Date.now(),
  };

  if (db) {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', userId),
        where('date', '==', todayStr)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        await updateDoc(docRef, {
          status: 'Absent',
          checkIn: '—',
          checkOut: '—',
          absenceReason: reason,
          absenceNote: note || '',
          locationVerified: false,
        });
        return docRef.id;
      } else {
        const col = collection(db, 'attendance');
        const docRef = await addDoc(col, record);
        return docRef.id;
      }
    } catch (e) {
      console.warn('Error recording absence in Firestore, using local storage:', e);
    }
  }

  const local = getLocalAttendance();
  const idx = local.findIndex(r => (r.userId === userId || r.employeeId === userId) && r.date === todayStr);
  if (idx >= 0) {
    local[idx] = {
      ...local[idx],
      status: 'Absent',
      checkIn: '—',
      checkOut: '—',
      absenceReason: reason,
      absenceNote: note || '',
      locationVerified: false,
    };
    saveLocalAttendance(local);
    return local[idx].id || `att_${Date.now()}`;
  } else {
    const newId = `att_${Date.now()}`;
    record.id = newId;
    local.unshift(record);
    saveLocalAttendance(local);
    return newId;
  }
}

/**
 * Cancel a self-reported absence so the employee can check in normally
 */
export async function cancelAbsence(userId: string): Promise<void> {
  const todayStr = getLocalDateString();

  if (db) {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', userId),
        where('date', '==', todayStr)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDoc(snap.docs[0].ref);
        return;
      }
    } catch (e) {
      console.warn('Error cancelling absence in Firestore, using local storage:', e);
    }
  }

  const local = getLocalAttendance();
  const filtered = local.filter(r => !((r.userId === userId || r.employeeId === userId) && r.date === todayStr));
  saveLocalAttendance(filtered);
}

/**
 * Fetch today's verified attendance record for a user
 */
export async function getTodayUserAttendance(userId: string): Promise<AttendanceRecord | null> {
  const todayStr = getLocalDateString();

  if (db) {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('userId', '==', userId),
        where('date', '==', todayStr)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { ...snap.docs[0].data(), id: snap.docs[0].id } as AttendanceRecord;
      }
    } catch (e) {
      console.warn('Error fetching today user attendance from Firestore:', e);
    }
  }

  const local = getLocalAttendance();
  const found = local.find(r => (r.userId === userId || r.employeeId === userId) && r.date === todayStr);
  return found || null;
}


/**
 * Subscribe to today's attendance (real-time for Admin Dashboard)
 */
export function subscribeTodayAttendance(callback: (records: AttendanceRecord[]) => void): () => void {
  const todayStr = getLocalDateString();

  if (db) {
    try {
      const q = query(collection(db, 'attendance'), where('date', '==', todayStr));
      const unsubscribe = onSnapshot(q, (snap) => {
        const records: AttendanceRecord[] = snap.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord));
        if (records.length > 0) {
          callback(records);
        } else {
          const localToday = getLocalAttendance().filter(r => r.date === todayStr);
          callback(localToday);
        }
      }, (error) => {
        console.warn('Firestore snapshot error, using local data:', error);
        callback(getLocalAttendance().filter(r => r.date === todayStr));
      });
      return unsubscribe;
    } catch (e) {
      console.warn('Failed to subscribe to Firestore attendance:', e);
    }
  }

  callback(getLocalAttendance().filter(r => r.date === todayStr));
  return () => {};
}

/**
 * Get attendance records for a specific employee
 */
export async function getEmployeeAttendance(userId: string): Promise<AttendanceRecord[]> {
  if (db) {
    try {
      const q = query(collection(db, 'attendance'), where('userId', '==', userId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord));
      }
    } catch (e) {
      console.warn('Error fetching employee attendance from Firestore:', e);
    }
  }

  const local = getLocalAttendance();
  const filtered = local.filter(r => r.userId === userId || r.employeeId === userId);
  return filtered;
}

/**
 * Get workplace settings (office GPS coordinates & geofence)
 */
export async function getWorkplaceSettings(): Promise<WorkplaceSettings> {
  let settings: WorkplaceSettings = DEFAULT_WORKPLACE;

  if (db) {
    try {
      const ref = doc(db, 'organization', 'workplace');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        settings = { ...DEFAULT_WORKPLACE, ...(snap.data() as WorkplaceSettings) };
        if (!settings.roadProjects || settings.roadProjects.length === 0) {
          settings.roadProjects = DEFAULT_ROAD_PROJECTS;
        }
        return settings;
      }
    } catch (e) {
      console.warn('Error loading workplace settings from Firestore:', e);
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (raw) {
      settings = { ...DEFAULT_WORKPLACE, ...JSON.parse(raw) };
      if (!settings.roadProjects || settings.roadProjects.length === 0) {
        settings.roadProjects = DEFAULT_ROAD_PROJECTS;
      }
      return settings;
    }
  } catch {}
  return DEFAULT_WORKPLACE;
}

/**
 * Save workplace settings
 */
export async function saveWorkplaceSettings(settings: WorkplaceSettings): Promise<void> {
  if (db) {
    try {
      const ref = doc(db, 'organization', 'workplace');
      await setDoc(ref, settings, { merge: true });
    } catch (e) {
      console.warn('Error saving workplace settings to Firestore:', e);
    }
  }
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
}

// ----------------------------------------------------
// NOTIFICATIONS SYSTEM
// ----------------------------------------------------

const LOCAL_NOTIFICATIONS_KEY = 'metroattend_notifications';

/**
 * Accurately format a notification timestamp into relative or calendar time.
 * Completely eliminates false "X today" static strings when viewed on subsequent days.
 */
export function formatNotificationTime(timestamp?: number, fallbackStr?: string): string {
  if (timestamp && typeof timestamp === 'number' && !isNaN(timestamp) && timestamp > 0) {
    const notifDate = new Date(timestamp);
    const now = new Date();

    const timeFormatted = notifDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    // Compare date boundaries in local time
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    const notifTime = notifDate.getTime();

    if (notifTime >= todayStart && notifTime < tomorrowStart) {
      const diffSec = Math.floor((now.getTime() - notifTime) / 1000);
      if (diffSec < 60 && diffSec >= -5) return 'Just now';
      if (diffSec < 3600 && diffSec >= 60) return `${Math.floor(diffSec / 60)}m ago`;
      return `Today at ${timeFormatted}`;
    } else if (notifTime >= yesterdayStart && notifTime < todayStart) {
      return `Yesterday at ${timeFormatted}`;
    } else {
      const daysDiff = Math.floor((todayStart - notifTime) / (24 * 60 * 60 * 1000));
      if (daysDiff < 7 && daysDiff > 0) {
        const weekday = notifDate.toLocaleDateString('en-GB', { weekday: 'short' });
        return `${weekday} at ${timeFormatted}`;
      } else {
        const dateStr = notifDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        return `${dateStr} at ${timeFormatted}`;
      }
    }
  }

  if (fallbackStr && typeof fallbackStr === 'string') {
    return fallbackStr.replace(/\s+today$/i, '');
  }

  return 'Recently';
}

const initialNotifications: SystemNotification[] = [
  {
    id: 'notif_welcome',
    title: 'Department Attendance System Active',
    body: 'Digital workforce logging & site geofencing is now live. Verify your GPS location to clock in on duty.',
    time: 'Recent',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    unread: false,
    type: 'info',
    broadcast: true,
  },
  {
    id: 'notif_policy',
    title: 'Workplace Attendance Policy',
    body: 'Standard working hours are 08:00 to 17:00. Ensure you record your check-in and departure check-out daily.',
    time: 'Recent',
    timestamp: Date.now() - 1000 * 60 * 60 * 48,
    unread: false,
    type: 'warning',
    broadcast: true,
  },
];

function getDismissedIds(userId?: string): string[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`metroattend_dismissed_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getReadIds(userId?: string): string[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`metroattend_read_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getLocalNotifications(): SystemNotification[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(initialNotifications));
      return initialNotifications;
    }
    const list: SystemNotification[] = JSON.parse(raw);
    // Sanitize legacy demo notifications that had hardcoded "8:03 AM today"
    const cleaned = list.filter(n => n.id !== 'notif_1' && n.id !== 'notif_2' && n.id !== 'notif_3');
    return cleaned.length > 0 ? cleaned : initialNotifications;
  } catch {
    return initialNotifications;
  }
}

function saveLocalNotifications(list: SystemNotification[]) {
  localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(list));
}

export async function getNotifications(userId?: string): Promise<SystemNotification[]> {
  const dismissed = getDismissedIds(userId);
  const readIds = getReadIds(userId);

  if (db) {
    try {
      const q = collection(db, 'notifications');
      const snap = await getDocs(q);
      if (!snap.empty) {
        const items = snap.docs.map(d => {
          const data = d.data() as SystemNotification;
          const ts = typeof data.timestamp === 'number' ? data.timestamp : Date.now();
          const isRead = data.unread === false || readIds.includes(d.id);
          return {
            ...data,
            id: d.id,
            timestamp: ts,
            time: formatNotificationTime(ts, data.time),
            unread: !isRead,
          } as SystemNotification;
        });
        return items
          .filter(n => !dismissed.includes(n.id) && (n.broadcast || !n.targetUserId || n.targetUserId === userId))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      }
    } catch (e) {
      console.warn('Error fetching notifications from Firestore:', e);
    }
  }

  const local = getLocalNotifications();
  return local
    .map(n => ({
      ...n,
      time: formatNotificationTime(n.timestamp, n.time),
      unread: readIds.includes(n.id) ? false : n.unread,
    }))
    .filter(n => !dismissed.includes(n.id) && (n.broadcast || !n.targetUserId || n.targetUserId === userId))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export function subscribeNotifications(
  userId: string | undefined, 
  callback: (notifs: SystemNotification[]) => void
): () => void {
  const dismissed = getDismissedIds(userId);
  const readIds = getReadIds(userId);

  if (db) {
    try {
      const q = collection(db, 'notifications');
      const unsubscribe = onSnapshot(q, (snap) => {
        const items = snap.docs.map(d => {
          const data = d.data() as SystemNotification;
          const ts = typeof data.timestamp === 'number' ? data.timestamp : Date.now();
          const isRead = data.unread === false || readIds.includes(d.id);
          return {
            ...data,
            id: d.id,
            timestamp: ts,
            time: formatNotificationTime(ts, data.time),
            unread: !isRead,
          } as SystemNotification;
        });

        if (items.length > 0) {
          const filtered = items
            .filter(n => !dismissed.includes(n.id) && (n.broadcast || !n.targetUserId || n.targetUserId === userId))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          callback(filtered);
        } else {
          callback(
            getLocalNotifications()
              .map(n => ({
                ...n,
                time: formatNotificationTime(n.timestamp, n.time),
                unread: readIds.includes(n.id) ? false : n.unread,
              }))
              .filter(n => !dismissed.includes(n.id) && (n.broadcast || !n.targetUserId || n.targetUserId === userId))
              .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          );
        }
      }, (err) => {
        console.warn('Firestore notifications listener error:', err);
        callback(
          getLocalNotifications()
            .map(n => ({
              ...n,
              time: formatNotificationTime(n.timestamp, n.time),
              unread: readIds.includes(n.id) ? false : n.unread,
            }))
            .filter(n => !dismissed.includes(n.id) && (n.broadcast || !n.targetUserId || n.targetUserId === userId))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        );
      });
      return unsubscribe;
    } catch (e) {
      console.warn('Failed to subscribe notifications:', e);
    }
  }

  callback(
    getLocalNotifications()
      .map(n => ({
        ...n,
        time: formatNotificationTime(n.timestamp, n.time),
        unread: readIds.includes(n.id) ? false : n.unread,
      }))
      .filter(n => !dismissed.includes(n.id) && (n.broadcast || !n.targetUserId || n.targetUserId === userId))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
  );
  return () => {};
}

export async function addNotification(
  notif: Omit<SystemNotification, 'id'>
): Promise<string> {
  const newId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const timestamp = notif.timestamp || Date.now();
  const fullNotif: SystemNotification = { 
    ...notif, 
    id: newId,
    timestamp,
    time: formatNotificationTime(timestamp),
  };

  if (db) {
    try {
      const docRef = await addDoc(collection(db, 'notifications'), fullNotif);
      return docRef.id;
    } catch (e) {
      console.warn('Error saving notification to Firestore:', e);
    }
  }

  const local = getLocalNotifications();
  local.unshift(fullNotif);
  saveLocalNotifications(local);
  return newId;
}

export async function sendBroadcastAnnouncement(
  title: string, 
  body: string, 
  type: 'info' | 'warning' | 'success' = 'info'
): Promise<void> {
  const now = Date.now();
  await addNotification({
    title,
    body,
    type,
    time: formatNotificationTime(now),
    timestamp: now,
    unread: true,
    broadcast: true,
  });
}

export async function markNotificationAsRead(id: string, userId?: string): Promise<void> {
  if (userId) {
    try {
      const readKey = `metroattend_read_${userId}`;
      const raw = localStorage.getItem(readKey);
      const readIds: string[] = raw ? JSON.parse(raw) : [];
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem(readKey, JSON.stringify(readIds));
      }
    } catch {}
  }

  if (db) {
    try {
      const ref = doc(db, 'notifications', id);
      await updateDoc(ref, { unread: false });
    } catch (e) {
      console.warn('Error marking notification as read in Firestore:', e);
    }
  }

  const local = getLocalNotifications();
  const idx = local.findIndex(n => n.id === id);
  if (idx >= 0) {
    local[idx].unread = false;
    saveLocalNotifications(local);
  }
}

export async function markAllNotificationsAsRead(userId?: string): Promise<void> {
  const local = getLocalNotifications();

  if (userId) {
    try {
      const readKey = `metroattend_read_${userId}`;
      const allIds = local.map(n => n.id);
      localStorage.setItem(readKey, JSON.stringify(allIds));
    } catch {}
  }

  if (db && userId) {
    try {
      const q = query(collection(db, 'notifications'), where('targetUserId', '==', userId));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(d.ref, { unread: false });
      }
    } catch (e) {
      console.warn('Error marking all notifications as read in Firestore:', e);
    }
  }

  local.forEach(n => {
    if (n.broadcast || !n.targetUserId || n.targetUserId === userId) {
      n.unread = false;
    }
  });
  saveLocalNotifications(local);
}

export async function deleteNotification(id: string, userId?: string, isAdminAction = false): Promise<void> {
  // If administrator deletes from Settings, remove completely from Firestore
  if (db && isAdminAction) {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (e) {
      console.warn('Error deleting notification from Firestore:', e);
    }
  }

  // If a regular user dismisses from their mobile device, track locally so it doesn't delete for others
  if (userId && !isAdminAction) {
    try {
      const dismissKey = `metroattend_dismissed_${userId}`;
      const raw = localStorage.getItem(dismissKey);
      const dismissed: string[] = raw ? JSON.parse(raw) : [];
      if (!dismissed.includes(id)) {
        dismissed.push(id);
        localStorage.setItem(dismissKey, JSON.stringify(dismissed));
      }
    } catch {}
  }

  const local = getLocalNotifications();
  const filtered = local.filter(n => n.id !== id);
  saveLocalNotifications(filtered);
}

// ----------------------------------------------------
// ATTENDANCE MANAGEMENT & EXPORT
// ----------------------------------------------------

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  let firestoreRecords: AttendanceRecord[] = [];
  if (db) {
    try {
      const q = collection(db, 'attendance');
      const snap = await getDocs(q);
      if (!snap.empty) {
        firestoreRecords = snap.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord));
      }
    } catch (e) {
      console.warn('Error fetching all attendance records from Firestore:', e);
    }
  }

  const local = getLocalAttendance();

  // Deduplicate and combine by unique key (user + date)
  const recordMap = new Map<string, AttendanceRecord>();
  for (const r of local) {
    const key = `${r.userId || r.employeeId || r.name}_${r.date}`;
    recordMap.set(key, r);
  }
  for (const r of firestoreRecords) {
    const key = `${r.userId || r.employeeId || r.name}_${r.date}`;
    recordMap.set(key, r);
  }

  return Array.from(recordMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export async function updateAttendanceStatus(
  recordId: string, 
  status: AttendanceStatus
): Promise<void> {
  if (db) {
    try {
      const ref = doc(db, 'attendance', recordId);
      await updateDoc(ref, { status });
    } catch (e) {
      console.warn('Error updating attendance status in Firestore:', e);
    }
  }

  const local = getLocalAttendance();
  const idx = local.findIndex(r => r.id === recordId);
  if (idx >= 0) {
    local[idx].status = status;
    saveLocalAttendance(local);
  }
}

/**
 * Approve a flagged out-of-range or site attendance record after admin cross-check
 */
export async function approveFlaggedAttendanceRecord(recordId: string): Promise<void> {
  if (db) {
    try {
      await updateDoc(doc(db, 'attendance', recordId), {
        locationVerified: true,
        isFlagged: false,
        verifiedByAdmin: true,
      });
    } catch (e) {
      console.warn('Error approving flagged attendance in Firestore:', e);
    }
  }

  const local = getLocalAttendance();
  const idx = local.findIndex(r => r.id === recordId);
  if (idx >= 0) {
    local[idx].locationVerified = true;
    local[idx].isFlagged = false;
    local[idx].verifiedByAdmin = true;
    saveLocalAttendance(local);
  }
}

export async function deleteAttendanceRecord(recordId: string): Promise<void> {
  if (db) {
    try {
      await deleteDoc(doc(db, 'attendance', recordId));
    } catch (e) {
      console.warn('Error deleting attendance record from Firestore:', e);
    }
  }

  const local = getLocalAttendance();
  const filtered = local.filter(r => r.id !== recordId);
  saveLocalAttendance(filtered);
}

/**
 * Reset today's attendance record for a specific user (administrative helper)
 */
export async function resetTodayAttendance(userId: string): Promise<void> {
  const todayStr = getLocalDateString();

  if (db) {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('date', '==', todayStr)
      );
      const snap = await getDocs(q);
      const userDocs = snap.docs.filter(d => {
        const data = d.data();
        return data.userId === userId || data.employeeId === userId;
      });

      for (const d of userDocs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn('Error resetting today attendance in Firestore:', e);
    }
  }

  // Clear from local storage
  const local = getLocalAttendance();
  const filtered = local.filter(r => 
    !((r.userId === userId || r.employeeId === userId) && r.date === todayStr)
  );
  saveLocalAttendance(filtered);

  // Clear session state
  try {
    localStorage.removeItem('metroattend_session_state');
    localStorage.removeItem('metroattend_session_date');
  } catch {}
}

/**
 * Reset ALL attendance records for today (administrative clean-slate helper)
 */
export async function resetAllTodayAttendance(): Promise<void> {
  const todayStr = getLocalDateString();

  if (db) {
    try {
      const q = query(
        collection(db, 'attendance'),
        where('date', '==', todayStr)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn('Error resetting all today attendance in Firestore:', e);
    }
  }

  const local = getLocalAttendance();
  const filtered = local.filter(r => r.date !== todayStr);
  saveLocalAttendance(filtered);

  try {
    localStorage.removeItem('metroattend_session_state');
    localStorage.removeItem('metroattend_session_date');
  } catch {}
}

/**
 * Simulate a second employee clocking in on the same phone to demo Anti-Buddy Punching alert
 */
export async function simulateSharedDeviceCheckIn(userId: string, primaryName: string): Promise<void> {
  const sig = getDeviceSignature();
  const todayStr = new Date().toISOString().split('T')[0];
  const colleagueName = 'Abena Osei (NSP)';
  const colleagueId = 'emp_nsp_demo_buddy';

  const colleagueRecord: AttendanceRecord = {
    employeeId: 'MWI-8821',
    userId: colleagueId,
    name: colleagueName,
    category: 'National Service Personnel',
    department: 'Engineering',
    date: todayStr,
    dayLabel: new Date().toLocaleDateString('en-GB', { weekday: 'long' }),
    checkIn: '8:05 AM',
    checkOut: '—',
    status: 'Present',
    locationVerified: true,
    latitude: 5.7068,
    longitude: -0.2981,
    distanceMeters: 18,
    deviceId: sig.deviceId,
    deviceModel: sig.deviceModel,
    deviceBrowser: sig.deviceBrowser,
    deviceOs: sig.deviceOs,
    deviceLabel: sig.deviceLabel,
    isSharedDevice: true,
    sharedWithEmployeeName: primaryName || 'Primary Staff',
    timestamp: Date.now() - 60000,
  };

  if (db) {
    try {
      const q = query(collection(db, 'attendance'), where('date', '==', todayStr));
      const snap = await getDocs(q);
      const userDoc = snap.docs.find(d => {
        const data = d.data();
        return data.userId === userId || data.employeeId === userId;
      });

      if (userDoc) {
        await updateDoc(userDoc.ref, {
          isSharedDevice: true,
          sharedWithEmployeeName: colleagueName,
        });
      }

      await addDoc(collection(db, 'attendance'), colleagueRecord);
    } catch (e) {
      console.warn('Error simulating shared device in Firestore:', e);
    }
  }

  const local = getLocalAttendance();
  const idx = local.findIndex(r => (r.userId === userId || r.employeeId === userId) && r.date === todayStr);
  if (idx >= 0) {
    local[idx].isSharedDevice = true;
    local[idx].sharedWithEmployeeName = colleagueName;
  }
  colleagueRecord.id = `att_demo_${Date.now()}`;
  local.unshift(colleagueRecord);
  saveLocalAttendance(local);
}

export function exportRecordsToCSV(records: AttendanceRecord[], filename = 'metroattend_attendance.csv') {
  const headers = ['Staff Name', 'Staff ID', 'Category', 'Department', 'Date', 'Day', 'Duty Type', 'Project / Facility', 'Location / Area', 'Check In', 'Check Out', 'Status', 'GPS Verified', 'Distance (m)'];
  const rows = records.map(r => [
    `"${r.name || 'Staff Member'}"`,
    `"${r.employeeId || ''}"`,
    `"${r.category || 'Permanent Staff'}"`,
    `"${r.department || 'Operations'}"`,
    `"${r.date || ''}"`,
    `"${r.dayLabel || ''}"`,
    `"${r.dutyType || 'Office HQ'}"`,
    `"${r.siteName || 'Department HQ'}"`,
    `"${r.locationAddress || (r.dutyType === 'Field Site' ? (r.siteName || 'Road Project Corridor') : 'Ministries, Central Accra')}"`,
    `"${r.checkIn || ''}"`,
    `"${r.checkOut || ''}"`,
    `"${r.status || 'Present'}"`,
    `"${r.locationVerified ? 'Yes' : 'No'}"`,
    `"${r.distanceMeters || 0}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


