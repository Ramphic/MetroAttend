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

// Single designated Admin Email from env or fallback
export const DESIGNATED_ADMIN_EMAIL = (
  import.meta.env.VITE_ADMIN_EMAIL || 'admin@metroworks.gov.gh'
).trim().toLowerCase();

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

// Default Workplace location: User configured site
export const DEFAULT_WORKPLACE: WorkplaceSettings = {
  officeName: 'MetroWorks Main Office',
  latitude: 5.706728467520077,
  longitude: -0.2981852347735038,
  geofenceRadius: 100, // meters
  workStartTime: '08:00',
  gracePeriodMinutes: 15,
  allowCheckout: true,
  workEndTime: '17:00',
  breakTime: '12:30',
  weekendWorkAllowed: false,
  orgName: 'MetroWorks Infrastructure Agency',
  orgCode: 'MWI',
  orgEmail: 'info@metroworks.gov.gh',
  orgPhone: '+233 30 200 0000',
  orgAddress: 'P.O. Box GP 1234, High Street, Accra, Ghana',
  timezone: 'Africa/Accra (GMT+0)',
  antiSpoofing: true,
  deviceLock: true,
  sessionTimeout: 60,
};

// Local storage keys for fallback when Firebase credentials are not yet entered
const LOCAL_USERS_KEY = 'metroattend_users';
const LOCAL_ATTENDANCE_KEY = 'metroattend_attendance';
const LOCAL_SETTINGS_KEY = 'metroattend_settings';

// Read local storage users
function getLocalUsers(): Employee[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((u: Employee) => !u.name?.includes('Kwame Mensah')) : [];
  } catch {
    return [];
  }
}

function saveLocalUsers(users: Employee[]) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function getLocalAttendance(): AttendanceRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_ATTENDANCE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((r: AttendanceRecord) => !r.name?.includes('Kwame Mensah')) : [];
  } catch {
    return [];
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
  if (db) {
    try {
      const q = collection(db, 'users');
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as Employee));
      }
    } catch (e) {
      console.warn('Error getting employees from Firestore, using local storage:', e);
    }
  }
  return getLocalUsers();
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
  const todayStr = record.date || new Date().toISOString().split('T')[0];

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
    (r.date === todayStr || r.date === 'Today') && 
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
  const todayStr = new Date().toISOString().split('T')[0];

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
  const idx = local.findIndex(r => (r.userId === userId || r.employeeId === userId) && (r.date === todayStr || r.date === 'Today'));
  if (idx >= 0) {
    local[idx].checkOut = checkOutTime;
    saveLocalAttendance(local);
  }
}

/**
 * Cancel an early check-out to resume the active workday
 */
export async function cancelCheckOut(userId: string): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0];

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
  const idx = local.findIndex(r => (r.userId === userId || r.employeeId === userId) && (r.date === todayStr || r.date === 'Today'));
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
  const todayStr = new Date().toISOString().split('T')[0];
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
  const idx = local.findIndex(r => (r.userId === userId || r.employeeId === userId) && (r.date === todayStr || r.date === 'Today'));
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
  const todayStr = new Date().toISOString().split('T')[0];

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
  const filtered = local.filter(r => !((r.userId === userId || r.employeeId === userId) && (r.date === todayStr || r.date === 'Today')));
  saveLocalAttendance(filtered);
}

/**
 * Fetch today's verified attendance record for a user
 */
export async function getTodayUserAttendance(userId: string): Promise<AttendanceRecord | null> {
  const todayStr = new Date().toISOString().split('T')[0];

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
  const found = local.find(r => (r.userId === userId || r.employeeId === userId) && (r.date === todayStr || r.date === 'Today'));
  return found || null;
}


/**
 * Subscribe to today's attendance (real-time for Admin Dashboard)
 */
export function subscribeTodayAttendance(callback: (records: AttendanceRecord[]) => void): () => void {
  const todayStr = new Date().toISOString().split('T')[0];

  if (db) {
    try {
      const q = query(collection(db, 'attendance'), where('date', '==', todayStr));
      const unsubscribe = onSnapshot(q, (snap) => {
        const records: AttendanceRecord[] = snap.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord));
        if (records.length > 0) {
          callback(records);
        } else {
          callback(getLocalAttendance());
        }
      }, (error) => {
        console.warn('Firestore snapshot error, using local data:', error);
        callback(getLocalAttendance());
      });
      return unsubscribe;
    } catch (e) {
      console.warn('Failed to subscribe to Firestore attendance:', e);
    }
  }

  callback(getLocalAttendance());
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
  if (db) {
    try {
      const ref = doc(db, 'organization', 'workplace');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as WorkplaceSettings;
      }
    } catch (e) {
      console.warn('Error loading workplace settings from Firestore:', e);
    }
  }

  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
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

const initialNotifications: SystemNotification[] = [
  {
    id: 'notif_1',
    title: 'Workplace Attendance Logged',
    body: 'Your morning GPS location was verified and check-in was successfully recorded.',
    time: '8:03 AM today',
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
    unread: true,
    type: 'success',
  },
  {
    id: 'notif_2',
    title: 'Attendance Policy Reminder',
    body: 'Please ensure you log your end-of-day check-out before leaving the facility.',
    time: 'Yesterday',
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    unread: true,
    type: 'warning',
  },
  {
    id: 'notif_3',
    title: 'MetroWorks System Notice',
    body: 'Workplace geofence perimeter coordinates updated to Main Facility.',
    time: '3 days ago',
    timestamp: Date.now() - 1000 * 60 * 60 * 72,
    unread: false,
    type: 'info',
    broadcast: true,
  },
];

function getLocalNotifications(): SystemNotification[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(initialNotifications));
      return initialNotifications;
    }
    return JSON.parse(raw);
  } catch {
    return initialNotifications;
  }
}

function saveLocalNotifications(list: SystemNotification[]) {
  localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(list));
}

export async function getNotifications(userId?: string): Promise<SystemNotification[]> {
  if (db) {
    try {
      const q = collection(db, 'notifications');
      const snap = await getDocs(q);
      if (!snap.empty) {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as SystemNotification));
        return items
          .filter(n => n.broadcast || !n.targetUserId || n.targetUserId === userId)
          .sort((a, b) => b.timestamp - a.timestamp);
      }
    } catch (e) {
      console.warn('Error fetching notifications from Firestore:', e);
    }
  }

  const local = getLocalNotifications();
  return local
    .filter(n => n.broadcast || !n.targetUserId || n.targetUserId === userId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function subscribeNotifications(
  userId: string | undefined, 
  callback: (notifs: SystemNotification[]) => void
): () => void {
  if (db) {
    try {
      const q = collection(db, 'notifications');
      const unsubscribe = onSnapshot(q, (snap) => {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id } as SystemNotification));
        if (items.length > 0) {
          const filtered = items
            .filter(n => n.broadcast || !n.targetUserId || n.targetUserId === userId)
            .sort((a, b) => b.timestamp - a.timestamp);
          callback(filtered);
        } else {
          callback(getLocalNotifications());
        }
      }, (err) => {
        console.warn('Firestore notifications listener error:', err);
        callback(getLocalNotifications());
      });
      return unsubscribe;
    } catch (e) {
      console.warn('Failed to subscribe notifications:', e);
    }
  }

  callback(getLocalNotifications());
  return () => {};
}

export async function addNotification(
  notif: Omit<SystemNotification, 'id'>
): Promise<string> {
  const newId = `notif_${Date.now()}`;
  const fullNotif: SystemNotification = { ...notif, id: newId };

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
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' today';
  await addNotification({
    title,
    body,
    type,
    time: timeStr,
    timestamp: Date.now(),
    unread: true,
    broadcast: true,
  });
}

export async function markNotificationAsRead(id: string): Promise<void> {
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
  local.forEach(n => {
    if (n.broadcast || !n.targetUserId || n.targetUserId === userId) {
      n.unread = false;
    }
  });
  saveLocalNotifications(local);
}

export async function deleteNotification(id: string): Promise<void> {
  if (db) {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (e) {
      console.warn('Error deleting notification from Firestore:', e);
    }
  }

  const local = getLocalNotifications();
  const filtered = local.filter(n => n.id !== id);
  saveLocalNotifications(filtered);
}

// ----------------------------------------------------
// ATTENDANCE MANAGEMENT & EXPORT
// ----------------------------------------------------

export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  if (db) {
    try {
      const q = collection(db, 'attendance');
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord));
      }
    } catch (e) {
      console.warn('Error fetching all attendance records from Firestore:', e);
    }
  }
  return getLocalAttendance();
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

export function exportRecordsToCSV(records: AttendanceRecord[], filename = 'metroattend_attendance.csv') {
  const headers = ['Staff Name', 'Staff ID', 'Category', 'Department', 'Date', 'Day', 'Check In', 'Check Out', 'Status', 'GPS Verified', 'Distance (m)'];
  const rows = records.map(r => [
    `"${r.name || 'Staff Member'}"`,
    `"${r.employeeId || ''}"`,
    `"${r.category || 'Permanent Staff'}"`,
    `"${r.department || 'Operations'}"`,
    `"${r.date || ''}"`,
    `"${r.dayLabel || ''}"`,
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

