import { Employee, AttendanceRecord, AttendanceStatus } from './types';

/**
 * Canonical 14-person Department of Urban Roads (DUR) Organizational Workforce
 * Spans Civil Engineers, Quantity Surveyors (QS), National Service Personnel (NSP), Interns, and Field Inspectors.
 */
export const DEFAULT_DUR_EMPLOYEES: Employee[] = [
  {
    id: 'emp_dur_01',
    name: 'Ing. Daniel Owusu',
    staffId: 'DUR-ENG-0104',
    category: 'Permanent Staff',
    department: 'Engineering',
    position: 'Chief Highway & Drainage Engineer',
    supervisor: 'Director General',
    email: 'd.owusu@dur.gov.gh',
    phone: '+233 24 456 7890',
    status: 'Active',
    avatar: 'DO',
    role: 'employee',
    profileComplete: true,
  },
  {
    id: 'emp_dur_02',
    name: 'Ing. Kwesi Adomako',
    staffId: 'DUR-ENG-0215',
    category: 'Permanent Staff',
    department: 'Engineering',
    position: 'Senior Civil Engineer (Site Resident)',
    supervisor: 'Ing. Daniel Owusu',
    email: 'k.adomako@dur.gov.gh',
    phone: '+233 24 123 4567',
    status: 'Active',
    avatar: 'KA',
    role: 'employee',
    profileComplete: true,
  },
  {
    id: 'emp_dur_03',
    name: 'Ing. Michael Boateng',
    staffId: 'DUR-ENG-0318',
    category: 'Permanent Staff',
    department: 'Engineering',
    position: 'Pavement & Materials QC Engineer',
    supervisor: 'Ing. Daniel Owusu',
    email: 'm.boateng@dur.gov.gh',
    phone: '+233 24 887 1122',
    status: 'Active',
    avatar: 'MB',
    role: 'employee',
    profileComplete: true,
  },
  {
    id: 'emp_dur_04',
    name: 'Emmanuel Darko, FGhIS',
    staffId: 'DUR-QS-0042',
    category: 'Permanent Staff',
    department: 'Quantity Surveying',
    position: 'Chief Quantity Surveyor (QS)',
    supervisor: 'Director of Operations',
    email: 'e.darko@dur.gov.gh',
    phone: '+233 20 112 3344',
    status: 'Active',
    avatar: 'ED',
    role: 'employee',
    profileComplete: true,
  },
  {
    id: 'emp_dur_05',
    name: 'Belinda Addo',
    staffId: 'DUR-QS-0089',
    category: 'Permanent Staff',
    department: 'Quantity Surveying',
    position: 'Senior Quantity Surveyor (Valuations)',
    supervisor: 'Emmanuel Darko',
    email: 'b.addo@dur.gov.gh',
    phone: '+233 24 332 1199',
    status: 'Active',
    avatar: 'BA',
    role: 'employee',
    profileComplete: true,
  },
  {
    id: 'emp_dur_06',
    name: 'Efua Mensah',
    staffId: 'DUR-HR-0034',
    category: 'Permanent Staff',
    department: 'Human Resources',
    position: 'Director of Human Resources',
    supervisor: 'Director General',
    email: 'e.mensah@dur.gov.gh',
    phone: '+233 50 567 8901',
    status: 'Active',
    avatar: 'EM',
    role: 'employee',
    profileComplete: true,
  },
  {
    id: 'emp_dur_07',
    name: 'Kofi Asare',
    staffId: 'DUR-NSP-0112',
    category: 'National Service Personnel',
    department: 'Finance',
    position: 'NSP - Financial Audit & Accounts',
    supervisor: 'Chief Accountant',
    email: 'k.asare@dur.gov.gh',
    phone: '+233 55 234 5678',
    status: 'Active',
    avatar: 'KA',
    role: 'employee',
    profileComplete: true,
  },
  {
    id: 'emp_dur_08',
    name: 'Samuel Tetteh',
    staffId: 'DUR-NSP-0119',
    category: 'National Service Personnel',
    department: 'Legal Affairs',
    position: 'NSP - Legal Research & Right-of-Way',
    supervisor: 'Head of Legal',
    email: 's.tetteh@dur.gov.gh',
    phone: '+233 27 678 9012',
    status: 'Active',
    avatar: 'ST',
    role: 'employee',
    profileComplete: true,
  },
  {
    id: 'emp_dur_09',
    name: 'Priscilla Mensah',
    staffId: 'DUR-NSP-0125',
    category: 'National Service Personnel',
    department: 'Engineering',
    position: 'NSP - GIS & Traffic Survey Analyst',
    supervisor: 'Ing. Daniel Owusu',
    email: 'p.mensah@dur.gov.gh',
    phone: '+233 54 889 0012',
    status: 'Active',
    avatar: 'PM',
    role: 'employee',
    profileComplete: true,
  },
  {
    id: 'emp_dur_10',
    name: 'Ama Boateng',
    staffId: 'DUR-INT-0031',
    category: 'Intern',
    department: 'Administration',
    position: 'Administrative & Procurement Intern',
    supervisor: 'Efua Mensah',
    email: 'a.boateng@dur.gov.gh',
    phone: '+233 20 987 6543',
    status: 'Active',
    avatar: 'AB',
    role: 'employee',
    profileComplete: true,
  },
  {
    id: 'emp_dur_11',
    name: 'Akosua Amponsah',
    staffId: 'DUR-INT-0045',
    category: 'Intern',
    department: 'Engineering',
    position: 'Civil Engineering Intern (Site Supervision)',
    supervisor: 'Ing. Kwesi Adomako',
    email: 'a.amponsah@dur.gov.gh',
    phone: '+233 24 789 0123',
    status: 'Active',
    avatar: 'AA',
    role: 'employee',
    profileComplete: true,
  },
  {
    id: 'emp_dur_12',
    name: 'Benjamin Osei',
    staffId: 'DUR-INT-0052',
    category: 'Intern',
    department: 'Information Technology',
    position: 'IT & Geofence Systems Intern',
    supervisor: 'Abena Osei',
    email: 'b.osei@dur.gov.gh',
    phone: '+233 50 123 9988',
    status: 'Active',
    avatar: 'BO',
    role: 'employee',
    profileComplete: true,
  },
  {
    id: 'emp_dur_13',
    name: 'Abena Osei',
    staffId: 'DUR-CNT-0008',
    category: 'Contract Staff',
    department: 'Information Technology',
    position: 'IT Systems Analyst & Geofence Admin',
    supervisor: 'Director General',
    email: 'a.osei@dur.gov.gh',
    phone: '+233 26 345 6789',
    status: 'Active',
    avatar: 'AO',
    role: 'employee',
    profileComplete: true,
  },
  {
    id: 'emp_dur_14',
    name: 'David Quaye',
    staffId: 'DUR-CNT-0015',
    category: 'Contract Staff',
    department: 'Operations',
    position: 'Road Safety & Fleet Inspector',
    supervisor: 'Director of Operations',
    email: 'd.quaye@dur.gov.gh',
    phone: '+233 24 887 6655',
    status: 'Active',
    avatar: 'DQ',
    role: 'employee',
    profileComplete: true,
  },
];

export const employees: Employee[] = DEFAULT_DUR_EMPLOYEES;

/**
 * Dynamic helper to generate multi-day authentic attendance records
 * across active working days up to today.
 */
export function getHistoricalAttendanceRecords(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const now = new Date();

  // Find 5 most recent workdays (skipping weekends)
  const workDays: { dateStr: string; dayLabel: string; isToday: boolean }[] = [];
  let cur = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  while (workDays.length < 5) {
    const dayOfWeek = cur.getDay(); // 0 is Sun, 6 is Sat
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const year = cur.getFullYear();
      const month = String(cur.getMonth() + 1).padStart(2, '0');
      const day = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayLabel = cur.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      workDays.unshift({
        dateStr,
        dayLabel,
        isToday: dateStr === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      });
    }
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() - 1);
  }

  // Workday seed template for each staff member
  const scheduleProfile = [
    { empId: 'emp_dur_01', duty: 'Office HQ', site: 'Treasury Road HQ', inTime: '7:42 AM', outTime: '5:08 PM', status: 'Present', dist: 14, addr: 'Ministries, Accra (GA-143-4328)', dev: 'iPhone 15 Pro' },
    { empId: 'emp_dur_02', duty: 'Field Site', site: 'Dansoman High Street Corridor', inTime: '7:50 AM', outTime: '5:15 PM', status: 'Present', dist: 42, addr: 'Dansoman Roundabout Corridor, Accra', dev: 'Samsung Galaxy S24' },
    { empId: 'emp_dur_03', duty: 'Field Site', site: 'Materials Testing Lab Facility', inTime: '7:45 AM', outTime: '5:04 PM', status: 'Present', dist: 35, addr: 'Industrial Area Lab Complex, Accra', dev: 'Google Pixel 8' },
    { empId: 'emp_dur_04', duty: 'Office HQ', site: 'Treasury Road HQ', inTime: '7:48 AM', outTime: '5:01 PM', status: 'Present', dist: 18, addr: 'Ministries, Accra (GA-143-4328)', dev: 'MacBook Air / Chrome' },
    { empId: 'emp_dur_05', duty: 'Office HQ', site: 'Treasury Road HQ', inTime: '8:01 AM', outTime: '5:10 PM', status: 'Present', dist: 22, addr: 'Ministries, Accra (GA-143-4328)', dev: 'Samsung Galaxy A54' },
    { empId: 'emp_dur_06', duty: 'Office HQ', site: 'Treasury Road HQ', inTime: '7:56 AM', outTime: '5:00 PM', status: 'Present', dist: 19, addr: 'Ministries, Accra (GA-143-4328)', dev: 'iPhone 13' },
    { empId: 'emp_dur_07', duty: 'Office HQ', site: 'Treasury Road HQ', inTime: '7:55 AM', outTime: '5:02 PM', status: 'Present', dist: 26, addr: 'Ministries, Accra (GA-143-4328)', dev: 'Tecno Camon 20' },
    { empId: 'emp_dur_08', duty: 'Office HQ', site: 'Treasury Road HQ', inTime: '8:24 AM', outTime: '5:12 PM', status: 'Late', dist: 29, addr: 'Ministries, Accra (GA-143-4328)', dev: 'Infinix Note 30' },
    { empId: 'emp_dur_09', duty: 'Field Site', site: 'Amasaman - Pokuase Interchange Corridor', inTime: '8:04 AM', outTime: '5:22 PM', status: 'Present', dist: 58, addr: 'Pokuase ACP Junction, Ga West', dev: 'Samsung Galaxy A34' },
    { empId: 'emp_dur_10', duty: 'Office HQ', site: 'Treasury Road HQ', inTime: '8:18 AM', outTime: '5:00 PM', status: 'Late', dist: 20, addr: 'Ministries, Accra (GA-143-4328)', dev: 'iPhone 12' },
    { empId: 'emp_dur_11', duty: 'Field Site', site: 'Kasoa Interchange & Access Slipway Corridor', inTime: '8:00 AM', outTime: '5:18 PM', status: 'Present', dist: 74, addr: 'Kasoa Old Barrier, Ga South', dev: 'Redmi Note 13' },
    { empId: 'emp_dur_12', duty: 'Office HQ', site: 'Treasury Road HQ', inTime: '—', outTime: '—', status: 'Absent', dist: 0, addr: 'Off Campus', dev: '—', reason: 'Approved Academic Leave' },
    { empId: 'emp_dur_13', duty: 'Office HQ', site: 'Treasury Road HQ', inTime: '7:58 AM', outTime: '5:05 PM', status: 'Present', dist: 15, addr: 'Ministries, Accra (GA-143-4328)', dev: 'ThinkPad T14 / Edge' },
    { empId: 'emp_dur_14', duty: 'Field Site', site: 'Dansoman Coastal Road & Stormwater Drainage', inTime: '8:12 AM', outTime: '5:30 PM', status: 'Present', dist: 480, addr: 'GBC Radio Transmitter Road, Dansoman', dev: 'Nokia XR20 Rugged', isFlaggedToday: true, flagReason: 'Off-perimeter Corridor Inspection' },
  ];

  workDays.forEach((day, dayIdx) => {
    scheduleProfile.forEach((item, itemIdx) => {
      const emp = DEFAULT_DUR_EMPLOYEES.find(e => e.id === item.empId);
      if (!emp) return;

      const recordId = `att_${day.dateStr}_${emp.id}`;
      const isToday = day.isToday;

      // On today, David Quaye has a flagged record pending admin cross check
      const isFlagged = isToday && Boolean(item.isFlaggedToday);
      const verifiedByAdmin = !isFlagged;
      const locationVerified = !isFlagged && item.status !== 'Absent';

      records.push({
        id: recordId,
        userId: emp.id,
        employeeId: emp.id,
        name: emp.name,
        category: emp.category,
        department: emp.department,
        photoURL: emp.photoURL,
        date: day.dateStr,
        dayLabel: day.dayLabel,
        checkIn: item.inTime,
        checkOut: isToday ? '—' : item.outTime,
        status: item.status as AttendanceStatus,
        locationVerified,
        dutyType: item.duty as 'Office HQ' | 'Field Site',
        siteName: item.site,
        locationAddress: item.addr,
        distanceMeters: item.dist,
        latitude: item.duty === 'Field Site' ? 5.552000 : 5.549200,
        longitude: item.duty === 'Field Site' ? -0.258000 : -0.197800,
        deviceLabel: item.dev,
        deviceId: `dev_${emp.id.replace('emp_dur_', '')}`,
        isSharedDevice: false,
        isFlagged,
        flagReason: isFlagged ? item.flagReason : undefined,
        verifiedByAdmin,
        absenceReason: item.status === 'Absent' ? item.reason : undefined,
        timestamp: Date.now() - (4 - dayIdx) * 86400000 - itemIdx * 60000,
      });
    });
  });

  return records;
}

export const kwameAttendance: AttendanceRecord[] = getHistoricalAttendanceRecords().filter(r => r.userId === 'emp_dur_01');
export const todayAttendance = getHistoricalAttendanceRecords().filter(r => r.date === new Date().toISOString().split('T')[0]);

export const weeklyTrend = [
  { day: 'Mon', present: 11, late: 2, absent: 1 },
  { day: 'Tue', present: 12, late: 1, absent: 1 },
  { day: 'Wed', present: 11, late: 2, absent: 1 },
  { day: 'Thu', present: 12, late: 1, absent: 1 },
  { day: 'Fri', present: 11, late: 2, absent: 1 },
];

export const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'Permanent Staff': return 'bg-navy-100 text-navy';
    case 'National Service Personnel':
    case 'National Service': return 'bg-purple-100 text-purple-700';
    case 'Intern': return 'bg-amber-100 text-amber-700';
    case 'Contract Staff': return 'bg-slate-100 text-slate-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export const getStatusColor = (status: AttendanceStatus | string): string => {
  switch (status) {
    case 'Present': return 'bg-success-bg text-success';
    case 'Late': return 'bg-late-bg text-late';
    case 'Absent': return 'bg-danger-bg text-danger';
    case 'Pending': return 'bg-slate-100 text-slate-500';
    default: return 'bg-gray-100 text-gray-500';
  }
};
