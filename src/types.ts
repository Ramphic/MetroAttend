export type Screen =
  | 'landing'
  | 'register'
  | 'profile-setup'
  | 'dashboard'
  | 'location-verify'
  | 'checkin-success'
  | 'attendance-history'
  | 'emp-profile'
  | 'notifications'
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-staff'
  | 'admin-staff-profile'
  | 'admin-attendance'
  | 'admin-reports'
  | 'admin-location'
  | 'admin-settings';

export type CheckInStatus = 'not-checked-in' | 'checked-in' | 'checked-out';
export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Pending';
export type StaffCategory = 'Permanent Staff' | 'National Service Personnel' | 'Intern' | 'Contract Staff';
export type AdminTab = 'dashboard' | 'attendance' | 'staff' | 'reports' | 'location' | 'settings';
export type UserRole = 'admin' | 'employee';

export interface NavProps {
  navigate: (screen: Screen) => void;
  checkInStatus: CheckInStatus;
  setCheckInStatus: (s: CheckInStatus) => void;
  checkInTime: string;
  checkOutTime: string;
  setCheckInTime: (t: string) => void;
  setCheckOutTime: (t: string) => void;
  selectedEmployeeId: string | null;
  setSelectedEmployeeId: (id: string | null) => void;
  adminTab: AdminTab;
  setAdminTab: (tab: AdminTab) => void;
  onAdminBypass?: () => void;
}

export interface Employee {
  id: string;
  uid?: string;
  name: string;
  staffId: string;
  category: StaffCategory;
  department: string;
  position: string;
  supervisor: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive';
  avatar?: string;
  photoURL?: string;
  role?: UserRole;
  profileComplete?: boolean;
  lastDeviceId?: string;
  lastDeviceLabel?: string;
  registeredDeviceId?: string;
}

export interface AttendanceRecord {
  id?: string;
  employeeId?: string;
  userId?: string;
  name?: string;
  category?: string;
  department?: string;
  photoURL?: string;
  date: string;
  dayLabel: string;
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
  locationVerified: boolean;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  timestamp?: number;
  deviceId?: string;
  deviceModel?: string;
  deviceBrowser?: string;
  deviceOs?: string;
  deviceLabel?: string;
  isSharedDevice?: boolean;
  sharedWithEmployeeName?: string;
}

export interface WorkplaceSettings {
  officeName: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  workStartTime: string;
  gracePeriodMinutes: number;
  allowCheckout?: boolean;
  workEndTime?: string;
  breakTime?: string;
  weekendWorkAllowed?: boolean;
  orgName?: string;
  orgCode?: string;
  orgEmail?: string;
  orgPhone?: string;
  orgAddress?: string;
  timezone?: string;
  antiSpoofing?: boolean;
  deviceLock?: boolean;
  sessionTimeout?: number;
}

export interface SystemNotification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success';
  time: string;
  timestamp: number;
  unread: boolean;
  targetUserId?: string;
  broadcast?: boolean;
}
