import { Employee, AttendanceRecord, AttendanceStatus } from './types';

export const employees: Employee[] = [
  {
    id: '1',
    name: 'Kwame Mensah',
    staffId: 'MWI-00482',
    category: 'Permanent Staff',
    department: 'Engineering',
    position: 'Senior Civil Engineer',
    supervisor: 'Daniel Owusu',
    email: 'k.mensah@metroworks.gov.gh',
    phone: '+233 24 123 4567',
    status: 'Active',
    avatar: 'KM',
  },
  {
    id: '2',
    name: 'Ama Boateng',
    staffId: 'MWI-I-0031',
    category: 'Intern',
    department: 'Administration',
    position: 'Administrative Intern',
    supervisor: 'Grace Asante',
    email: 'a.boateng@metroworks.gov.gh',
    phone: '+233 20 987 6543',
    status: 'Active',
    avatar: 'AB',
  },
  {
    id: '3',
    name: 'Kofi Asare',
    staffId: 'MWI-NS-0012',
    category: 'National Service Personnel',
    department: 'Finance',
    position: 'Finance Assistant',
    supervisor: 'Emmanuel Adjei',
    email: 'k.asare@metroworks.gov.gh',
    phone: '+233 55 234 5678',
    status: 'Active',
    avatar: 'KA',
  },
  {
    id: '4',
    name: 'Abena Osei',
    staffId: 'MWI-C-0008',
    category: 'Contract Staff',
    department: 'Information Technology',
    position: 'IT Systems Analyst',
    supervisor: 'Yaw Darko',
    email: 'a.osei@metroworks.gov.gh',
    phone: '+233 26 345 6789',
    status: 'Active',
    avatar: 'AO',
  },
  {
    id: '5',
    name: 'Daniel Owusu',
    staffId: 'MWI-00201',
    category: 'Permanent Staff',
    department: 'Engineering',
    position: 'Head of Engineering',
    supervisor: 'Director General',
    email: 'd.owusu@metroworks.gov.gh',
    phone: '+233 24 456 7890',
    status: 'Active',
    avatar: 'DO',
  },
  {
    id: '6',
    name: 'Efua Mensah',
    staffId: 'MWI-00334',
    category: 'Permanent Staff',
    department: 'Human Resources',
    position: 'HR Manager',
    supervisor: 'Director General',
    email: 'e.mensah@metroworks.gov.gh',
    phone: '+233 50 567 8901',
    status: 'Active',
    avatar: 'EM',
  },
  {
    id: '7',
    name: 'Samuel Tetteh',
    staffId: 'MWI-NS-0019',
    category: 'National Service Personnel',
    department: 'Legal Affairs',
    position: 'Legal Research Assistant',
    supervisor: 'Grace Asante',
    email: 's.tetteh@metroworks.gov.gh',
    phone: '+233 27 678 9012',
    status: 'Active',
    avatar: 'ST',
  },
  {
    id: '8',
    name: 'Akosua Amponsah',
    staffId: 'MWI-I-0045',
    category: 'Intern',
    department: 'Engineering',
    position: 'Engineering Intern',
    supervisor: 'Daniel Owusu',
    email: 'a.amponsah@metroworks.gov.gh',
    phone: '+233 24 789 0123',
    status: 'Active',
    avatar: 'AA',
  },
];

export const kwameAttendance: AttendanceRecord[] = [
  { date: 'September 17, 2026', dayLabel: 'Wednesday', checkIn: '8:03 AM', checkOut: '5:02 PM', status: 'Present', locationVerified: true },
  { date: 'September 16, 2026', dayLabel: 'Tuesday', checkIn: '7:54 AM', checkOut: '5:08 PM', status: 'Present', locationVerified: true },
  { date: 'September 15, 2026', dayLabel: 'Monday', checkIn: '8:27 AM', checkOut: '5:01 PM', status: 'Late', locationVerified: true },
  { date: 'September 12, 2026', dayLabel: 'Friday', checkIn: '8:01 AM', checkOut: '5:00 PM', status: 'Present', locationVerified: true },
  { date: 'September 11, 2026', dayLabel: 'Thursday', checkIn: '8:09 AM', checkOut: '5:05 PM', status: 'Present', locationVerified: true },
  { date: 'September 10, 2026', dayLabel: 'Wednesday', checkIn: '—', checkOut: '—', status: 'Absent', locationVerified: false },
  { date: 'September 9, 2026', dayLabel: 'Tuesday', checkIn: '8:00 AM', checkOut: '5:03 PM', status: 'Present', locationVerified: true },
  { date: 'September 8, 2026', dayLabel: 'Monday', checkIn: '7:59 AM', checkOut: '5:11 PM', status: 'Present', locationVerified: true },
  { date: 'September 5, 2026', dayLabel: 'Friday', checkIn: '8:22 AM', checkOut: '5:00 PM', status: 'Late', locationVerified: true },
  { date: 'September 4, 2026', dayLabel: 'Thursday', checkIn: '8:02 AM', checkOut: '5:01 PM', status: 'Present', locationVerified: true },
];

interface TodayRecord {
  employeeId: string;
  name: string;
  category: string;
  department: string;
  checkIn: string;
  checkOut: string;
  locationVerified: boolean;
  status: AttendanceStatus;
}

export const todayAttendance: TodayRecord[] = [
  { employeeId: '1', name: 'Kwame Mensah', category: 'Permanent Staff', department: 'Engineering', checkIn: '8:03 AM', checkOut: '—', locationVerified: true, status: 'Present' },
  { employeeId: '2', name: 'Ama Boateng', category: 'Intern', department: 'Administration', checkIn: '8:21 AM', checkOut: '—', locationVerified: true, status: 'Late' },
  { employeeId: '3', name: 'Kofi Asare', category: 'National Service', department: 'Finance', checkIn: '7:56 AM', checkOut: '—', locationVerified: true, status: 'Present' },
  { employeeId: '4', name: 'Abena Osei', category: 'Contract Staff', department: 'IT', checkIn: '8:00 AM', checkOut: '—', locationVerified: true, status: 'Present' },
  { employeeId: '5', name: 'Daniel Owusu', category: 'Permanent Staff', department: 'Engineering', checkIn: '7:45 AM', checkOut: '—', locationVerified: true, status: 'Present' },
  { employeeId: '6', name: 'Efua Mensah', category: 'Permanent Staff', department: 'HR', checkIn: '—', checkOut: '—', locationVerified: false, status: 'Absent' },
  { employeeId: '7', name: 'Samuel Tetteh', category: 'National Service', department: 'Legal', checkIn: '8:19 AM', checkOut: '—', locationVerified: true, status: 'Late' },
  { employeeId: '8', name: 'Akosua Amponsah', category: 'Intern', department: 'Engineering', checkIn: '8:04 AM', checkOut: '—', locationVerified: true, status: 'Present' },
];

export const weeklyTrend = [
  { day: 'Mon', present: 108, late: 9, absent: 9 },
  { day: 'Tue', present: 112, late: 7, absent: 7 },
  { day: 'Wed', present: 105, late: 14, absent: 7 },
  { day: 'Thu', present: 115, late: 5, absent: 6 },
  { day: 'Fri', present: 108, late: 12, absent: 6 },
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
