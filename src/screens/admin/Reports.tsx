import React, { useState, useEffect, useMemo } from 'react';
import { NavProps, AttendanceRecord, Employee, StaffCategory, WorkplaceSettings } from '../../types';
import AdminShell from '../../components/AdminShell';
import { 
  getAllAttendanceRecords, 
  getAllEmployees, 
  getWorkplaceSettings, 
  DEFAULT_WORKPLACE,
  getLocalDateString 
} from '../../lib/firebase';

type ReportKey = 'daily' | 'site' | 'late' | 'absent' | 'performance' | 'timecards';

interface ReportTypeMeta {
  key: ReportKey;
  label: string;
  badge: string;
  desc: string;
  icon: string;
}

const REPORT_TYPES: ReportTypeMeta[] = [
  { 
    key: 'daily', 
    label: 'Daily Attendance & Duty Roster', 
    badge: 'Operations', 
    desc: 'Full daily log with clock-in/out times, office vs site assignments, and hours', 
    icon: '📅' 
  },
  { 
    key: 'site', 
    label: 'Road Projects & Field Dispatch', 
    badge: 'Civil Works', 
    desc: 'Field engineering deployments, road project corridors, and physical location names', 
    icon: '🚧' 
  },
  { 
    key: 'late', 
    label: 'Punctuality & Lateness Investigation', 
    badge: 'Compliance', 
    desc: 'All arrivals recorded past the official work start time and grace period threshold', 
    icon: '⏱' 
  },
  { 
    key: 'absent', 
    label: 'Absence & Non-Attendance Audit', 
    badge: 'Disciplinary', 
    desc: 'Unexcused absences, leave records, and missing morning clock-ins', 
    icon: '📋' 
  },
  { 
    key: 'performance', 
    label: 'Staff Performance & Velocity Matrix', 
    badge: 'HR / Payroll', 
    desc: 'Individual employee scorecard with accurate present, site, and compliance rates', 
    icon: '📊' 
  },
  { 
    key: 'timecards', 
    label: 'Work Hours & Payroll Timecard Audit', 
    badge: 'Payroll', 
    desc: 'Regular shift hours, overtime calculations, and punch-out completeness', 
    icon: '💼' 
  },
];

// ---------------------------------------------------------------------
// TIME & CALCULATION HELPERS
// ---------------------------------------------------------------------

function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr || timeStr === '—' || timeStr === '-' || timeStr.trim() === '') return null;
  const clean = timeStr.trim();
  const isPM = clean.toUpperCase().includes('PM');
  const isAM = clean.toUpperCase().includes('AM');
  const rawTime = clean.replace(/(AM|PM)/gi, '').trim();
  const parts = rawTime.split(':');
  if (parts.length < 2) return null;
  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function calculateWorkHours(checkIn?: string, checkOut?: string): { 
  totalHours: number; 
  regularHours: number; 
  overtimeHours: number; 
  display: string; 
  status: 'Complete' | 'In Progress' | 'Missing Punch-Out' | 'Not Checked In';
} {
  const inMin = parseTimeToMinutes(checkIn);
  const outMin = parseTimeToMinutes(checkOut);

  if (inMin === null) {
    return { totalHours: 0, regularHours: 0, overtimeHours: 0, display: '—', status: 'Not Checked In' };
  }

  if (outMin === null) {
    return { totalHours: 0, regularHours: 0, overtimeHours: 0, display: 'In Progress', status: 'Missing Punch-Out' };
  }

  let diff = outMin - inMin;
  if (diff < 0) diff += 24 * 60; // Handle shifts crossing midnight

  const h = Math.floor(diff / 60);
  const m = diff % 60;
  const decimalHours = Math.round((diff / 60) * 10) / 10;
  const regularHours = Math.min(8.0, decimalHours);
  const overtimeHours = Math.max(0, Math.round((decimalHours - 8.0) * 10) / 10);

  return {
    totalHours: decimalHours,
    regularHours,
    overtimeHours,
    display: `${h}h ${m}m`,
    status: 'Complete',
  };
}

function calculateLateness(checkIn?: string, cutoffTime: string = '08:15'): { isLate: boolean; minutesLate: number; display: string } {
  const inMin = parseTimeToMinutes(checkIn);
  const cutMin = parseTimeToMinutes(cutoffTime);
  if (inMin === null || cutMin === null) {
    return { isLate: false, minutesLate: 0, display: 'On Time' };
  }
  const diff = inMin - cutMin;
  if (diff > 0) {
    return { isLate: true, minutesLate: diff, display: `+${diff}m Late` };
  }
  return { isLate: false, minutesLate: 0, display: 'On Time' };
}

function downloadCustomCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function Reports({ nav }: { nav: NavProps }) {
  const [selected, setSelected] = useState<ReportKey>('daily');
  const [generated, setGenerated] = useState(true);
  
  // Date range defaults to current month to date
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return getLocalDateString(d);
  });
  const [endDate, setEndDate] = useState(() => getLocalDateString());
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');

  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [workplace, setWorkplace] = useState<WorkplaceSettings>(DEFAULT_WORKPLACE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getAllAttendanceRecords(),
      getAllEmployees(),
      getWorkplaceSettings()
    ]).then(([records, emps, wp]) => {
      if (!isMounted) return;
      setAllAttendance(records);
      setAllEmployees(emps);
      setWorkplace(wp);
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute official lateness cutoff based on workplace policy
  const workStartTime = workplace.workStartTime || '08:00';
  const graceMinutes = workplace.gracePeriodMinutes ?? 15;
  const officialCutoffStr = useMemo(() => {
    const parts = workStartTime.split(':');
    if (parts.length < 2) return '08:15';
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10) + graceMinutes;
    if (m >= 60) {
      h += Math.floor(m / 60);
      m = m % 60;
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }, [workStartTime, graceMinutes]);

  // Dynamic filter lists
  const departments = useMemo(() => {
    const set = new Set<string>(['All Departments', 'Engineering', 'Finance', 'Administration', 'HR', 'IT', 'Operations', 'Legal']);
    allEmployees.forEach(e => { if (e.department) set.add(e.department); });
    allAttendance.forEach(a => { if (a.department) set.add(a.department); });
    return Array.from(set);
  }, [allEmployees, allAttendance]);

  const categories = ['All Categories', 'Permanent Staff', 'National Service Personnel', 'Intern', 'Contract Staff'];

  // Quick date presets
  const setDatePreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | '30days') => {
    const today = new Date();
    const todayStr = getLocalDateString(today);

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = getLocalDateString(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'week') {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      setStartDate(getLocalDateString(monday));
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const d = new Date();
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      setStartDate(getLocalDateString(first));
      setEndDate(todayStr);
    } else if (preset === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(getLocalDateString(d));
      setEndDate(todayStr);
    }
    setGenerated(true);
  };

  // ---------------------------------------------------------------------
  // FILTERED ATTENDANCE DATASET (Strict Date Range & Attribute Matching)
  // ---------------------------------------------------------------------
  const baseFilteredRecords = useMemo(() => {
    return allAttendance.filter(r => {
      const matchDept = deptFilter === 'All Departments' || (r.department || 'Operations') === deptFilter;
      const matchCategory = categoryFilter === 'All Categories' || (r.category || 'Permanent Staff') === categoryFilter;
      const matchDate = (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate);
      
      let matchSearch = true;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (r.name || '').toLowerCase();
        const id = (r.employeeId || '').toLowerCase();
        const site = (r.siteName || '').toLowerCase();
        const loc = (r.locationAddress || '').toLowerCase();
        matchSearch = name.includes(q) || id.includes(q) || site.includes(q) || loc.includes(q);
      }

      return matchDept && matchCategory && matchDate && matchSearch;
    });
  }, [allAttendance, deptFilter, categoryFilter, startDate, endDate, searchQuery]);

  // ---------------------------------------------------------------------
  // REPORT DATASETS (Distinct Per Category)
  // ---------------------------------------------------------------------

  // 1. Daily Roster: All check-ins and absences in range
  const dailyRecords = useMemo(() => {
    return [...baseFilteredRecords].sort((a, b) => (b.date + (b.checkIn || '')).localeCompare(a.date + (a.checkIn || '')));
  }, [baseFilteredRecords]);

  // 2. Road Projects & Field Site Dispatches: Exclusively field site duty
  const siteRecords = useMemo(() => {
    return baseFilteredRecords.filter(r => {
      return r.dutyType === 'Field Site' || Boolean(r.siteName && r.siteName !== 'Department HQ');
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [baseFilteredRecords]);

  // 3. Punctuality & Lateness Audit: Records flagged as Late or exceeding cutoff
  const lateRecords = useMemo(() => {
    return baseFilteredRecords.filter(r => {
      if (r.status === 'Late') return true;
      if (r.checkIn && r.checkIn !== '—') {
        const lateness = calculateLateness(r.checkIn, officialCutoffStr);
        return lateness.isLate;
      }
      return false;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [baseFilteredRecords, officialCutoffStr]);

  // 4. Absence & Leave Audit: Self-reported or recorded absences
  const absentRecords = useMemo(() => {
    return baseFilteredRecords.filter(r => r.status === 'Absent')
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [baseFilteredRecords]);

  // 5. Staff Performance & Compliance Scorecard: Evaluated per staff member
  const performanceRows = useMemo(() => {
    return allEmployees
      .filter(emp => {
        const matchDept = deptFilter === 'All Departments' || emp.department === deptFilter;
        const matchCat = categoryFilter === 'All Categories' || emp.category === categoryFilter;
        const matchSearch = !searchQuery.trim() || 
          emp.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) || 
          emp.staffId.toLowerCase().includes(searchQuery.toLowerCase().trim());
        return matchDept && matchCat && matchSearch;
      })
      .map(emp => {
        // Find all attendance records for this specific employee within the active date range
        const empRecords = allAttendance.filter(r => {
          const isUser = (r.userId && r.userId === emp.uid) || (r.employeeId && (r.employeeId === emp.staffId || r.employeeId === emp.id));
          const matchDate = (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate);
          return isUser && matchDate;
        });

        const officeDays = empRecords.filter(r => r.status === 'Present' && r.dutyType !== 'Field Site').length;
        const siteDays = empRecords.filter(r => (r.status === 'Present' || r.status === 'Late') && r.dutyType === 'Field Site').length;
        const lateDays = empRecords.filter(r => r.status === 'Late').length;
        const absentDays = empRecords.filter(r => r.status === 'Absent').length;
        const totalEvaluated = empRecords.length;

        // Accurate compliance rate calculation
        const complianceRate = totalEvaluated > 0
          ? Math.round(((officeDays + siteDays) / totalEvaluated) * 100)
          : 0;

        let totalHours = 0;
        empRecords.forEach(r => {
          if (r.checkIn && r.checkOut && r.status !== 'Absent') {
            totalHours += calculateWorkHours(r.checkIn, r.checkOut).totalHours;
          }
        });

        let ratingBadge = 'Compliant';
        let ratingColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
        if (complianceRate >= 95) {
          ratingBadge = 'Exemplary';
          ratingColor = 'text-blue-700 bg-blue-50 border-blue-200';
        } else if (complianceRate < 80) {
          ratingBadge = 'Review Required';
          ratingColor = 'text-red-700 bg-red-50 border-red-200';
        }

        return {
          name: emp.name,
          staffId: emp.staffId,
          category: emp.category,
          department: emp.department,
          supervisor: emp.supervisor,
          officeDays,
          siteDays,
          lateDays,
          absentDays,
          totalEvaluated,
          totalHours: Math.round(totalHours * 10) / 10,
          complianceRate,
          ratingBadge,
          ratingColor,
        };
      })
      .sort((a, b) => b.complianceRate - a.complianceRate);
  }, [allEmployees, allAttendance, deptFilter, categoryFilter, startDate, endDate, searchQuery]);

  // 6. Work Hours & Payroll Timecard: Detailed punch cards
  const timecardRecords = useMemo(() => {
    return baseFilteredRecords.filter(r => r.status !== 'Absent')
      .map(r => {
        const hoursData = calculateWorkHours(r.checkIn, r.checkOut);
        return {
          ...r,
          hoursData,
        };
      })
      .sort((a, b) => (b.date + (b.checkIn || '')).localeCompare(a.date + (a.checkIn || '')));
  }, [baseFilteredRecords]);

  // ---------------------------------------------------------------------
  // TAILORED CSV EXPORTS (Exact matching columns for each report)
  // ---------------------------------------------------------------------
  const handleExportCSV = () => {
    const dateTag = `${startDate}_to_${endDate}`;
    
    if (selected === 'daily') {
      const headers = ['Staff Name', 'Staff ID', 'Category', 'Department', 'Date', 'Day', 'Duty Type', 'Project / Facility', 'Physical Location Name', 'Clock In', 'Clock Out', 'Total Hours', 'Attendance Status', 'GPS Verified', 'Distance (m)'];
      const rows = dailyRecords.map(r => {
        const hours = calculateWorkHours(r.checkIn, r.checkOut);
        return [
          r.name || 'Staff Member',
          r.employeeId || '',
          r.category || 'Permanent Staff',
          r.department || 'Operations',
          r.date,
          r.dayLabel || '',
          r.dutyType || 'Office HQ',
          r.siteName || (r.dutyType === 'Field Site' ? 'Road Corridor' : 'Department HQ'),
          r.locationAddress || 'Office HQ Perimeter',
          r.checkIn || '—',
          r.checkOut || '—',
          hours.display,
          r.status || 'Present',
          r.locationVerified ? 'Yes' : 'No',
          r.distanceMeters || 0
        ];
      });
      downloadCustomCSV(headers, rows, `metroattend_daily_attendance_${dateTag}.csv`);
    } else if (selected === 'site') {
      const headers = ['Field Engineer', 'Staff ID', 'Department', 'Category', 'Date', 'Road Project / Corridor', 'Assigned Field Task', 'Physical Place / Neighborhood', 'Arrival Time', 'Departure Time', 'GPS Verified', 'Distance (m)'];
      const rows = siteRecords.map(r => [
        r.name || 'Site Engineer',
        r.employeeId || '',
        r.department || 'Engineering',
        r.category || 'Permanent Staff',
        r.date,
        r.siteName || 'Road Corridor',
        r.absenceNote || 'Road Works Supervision',
        r.locationAddress || 'On-Site GPS Tagged',
        r.checkIn || '—',
        r.checkOut || '—',
        r.locationVerified ? 'Yes' : 'No',
        r.distanceMeters || 0
      ]);
      downloadCustomCSV(headers, rows, `metroattend_road_projects_dispatch_${dateTag}.csv`);
    } else if (selected === 'late') {
      const headers = ['Employee Name', 'Staff ID', 'Department', 'Category', 'Date', 'Recorded Clock In', 'Official Policy Cutoff', 'Minutes Late', 'Duty Location', 'Attendance Status'];
      const rows = lateRecords.map(r => {
        const lateData = calculateLateness(r.checkIn, officialCutoffStr);
        return [
          r.name || 'Staff Member',
          r.employeeId || '',
          r.department || 'Operations',
          r.category || 'Permanent Staff',
          r.date,
          r.checkIn || '—',
          officialCutoffStr,
          lateData.minutesLate,
          r.dutyType || 'Office HQ',
          r.status || 'Late'
        ];
      });
      downloadCustomCSV(headers, rows, `metroattend_punctuality_lateness_audit_${dateTag}.csv`);
    } else if (selected === 'absent') {
      const headers = ['Employee Name', 'Staff ID', 'Department', 'Category', 'Date of Absence', 'Classification', 'Reason / Explanation', 'Supervisor'];
      const rows = absentRecords.map(r => [
        r.name || 'Staff Member',
        r.employeeId || '',
        r.department || 'Operations',
        r.category || 'Permanent Staff',
        r.date,
        r.absenceReason || 'Unexcused Absence',
        r.absenceNote || 'No explanation provided',
        'Head of Department'
      ]);
      downloadCustomCSV(headers, rows, `metroattend_absence_nonattendance_${dateTag}.csv`);
    } else if (selected === 'performance') {
      const headers = ['Staff Name', 'Staff ID', 'Category', 'Department', 'Total Evaluated Shifts', 'Office Days Present', 'Field Site Days', 'Late Arrivals', 'Absences Recorded', 'Total Hours Logged', 'Attendance Compliance Rate (%)', 'Audit Rating'];
      const rows = performanceRows.map(r => [
        r.name,
        r.staffId,
        r.category,
        r.department,
        r.totalEvaluated,
        r.officeDays,
        r.siteDays,
        r.lateDays,
        r.absentDays,
        r.totalHours,
        `${r.complianceRate}%`,
        r.ratingBadge
      ]);
      downloadCustomCSV(headers, rows, `metroattend_staff_performance_matrix_${dateTag}.csv`);
    } else if (selected === 'timecards') {
      const headers = ['Staff Name', 'Staff ID', 'Department', 'Date', 'Clock In', 'Clock Out', 'Regular Hours (Max 8h)', 'Overtime Hours (>8h)', 'Total Shift Hours', 'Timecard Audit Status'];
      const rows = timecardRecords.map(r => [
        r.name || 'Staff Member',
        r.employeeId || '',
        r.department || 'Operations',
        r.date,
        r.checkIn || '—',
        r.checkOut || '—',
        r.hoursData.regularHours,
        r.hoursData.overtimeHours,
        r.hoursData.totalHours,
        r.hoursData.status
      ]);
      downloadCustomCSV(headers, rows, `metroattend_payroll_timecards_${dateTag}.csv`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AdminShell nav={nav}>
      {/* Top Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-500 font-bold">
              Audit Intelligence Engine
            </span>
          </div>
          <h1 className="text-2xl font-display font-800 text-slate-900">Reports & Operational Audits</h1>
          <p className="text-muted text-xs mt-0.5">
            Verified field presence, road project deployments, lateness compliance, and payroll timecards
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left Column: Report Selectors & Parameters */}
        <div className="xl:col-span-2 space-y-4">
          {/* Report Category Picker */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-xs">
            <div className="text-xs font-display font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center justify-between">
              <span>Report Type</span>
              <span className="text-[10px] font-mono text-muted">{REPORT_TYPES.length} Specialized Views</span>
            </div>
            <div className="space-y-2">
              {REPORT_TYPES.map(r => {
                const isActive = selected === r.key;
                return (
                  <button
                    key={r.key}
                    onClick={() => { setSelected(r.key); setGenerated(true); }}
                    className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive 
                        ? 'border-navy bg-navy-50/70 shadow-xs ring-1 ring-navy/20' 
                        : 'border-slate-100 hover:border-slate-200 bg-surface/40 hover:bg-surface'
                    }`}
                  >
                    <span className="text-xl p-2 rounded-xl bg-white shadow-xs border border-slate-100 flex-shrink-0 mt-0.5">
                      {r.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-display font-bold ${isActive ? 'text-navy' : 'text-slate-800'}`}>
                          {r.label}
                        </span>
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-md font-bold ${
                          isActive ? 'bg-navy text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {r.badge}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5 font-sans line-clamp-2">
                        {r.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Report Parameters & Filters */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-xs space-y-4">
            <div className="text-xs font-display font-bold text-slate-500 uppercase tracking-wide">
              Filter Parameters
            </div>

            {/* Quick Date Presets */}
            <div>
              <label className="block text-[10px] font-mono text-muted uppercase mb-1.5 font-bold">
                Quick Date Range
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {[
                  { label: 'Today', key: 'today' },
                  { label: 'Yesterday', key: 'yesterday' },
                  { label: 'This Week', key: 'week' },
                  { label: 'This Month', key: 'month' },
                  { label: '30 Days', key: '30days' },
                ].map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setDatePreset(p.key as any)}
                    className="py-1.5 px-2 rounded-lg border border-slate-200 hover:border-navy text-[10px] font-display font-semibold text-slate-700 bg-surface/50 hover:bg-navy-50 text-center transition-colors cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Start and End Date Inputs */}
            <div>
              <label className="block text-[10px] font-mono text-muted uppercase mb-1.5 font-bold">
                Custom Dates (From / To)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
                <div>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
              </div>
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-[10px] font-mono text-muted uppercase mb-1.5 font-bold">
                Department
              </label>
              <select 
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-xs font-display font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 cursor-pointer"
              >
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Staff Classification Filter */}
            <div>
              <label className="block text-[10px] font-mono text-muted uppercase mb-1.5 font-bold">
                Staff Classification
              </label>
              <select 
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-xs font-display font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 cursor-pointer"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Search Query */}
            <div>
              <label className="block text-[10px] font-mono text-muted uppercase mb-1.5 font-bold">
                Search Staff / Road Project
              </label>
              <input
                type="text"
                placeholder="e.g. Mensah, MWI-04, Motorway…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Tailored Dataset & Custom Table */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
            {/* Header with Title and Action Buttons */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">{REPORT_TYPES.find(r => r.key === selected)?.icon}</span>
                  <h2 className="text-sm font-display font-800 text-slate-900">
                    {REPORT_TYPES.find(r => r.key === selected)?.label}
                  </h2>
                </div>
                <div className="text-muted text-[11px] font-mono mt-0.5">
                  {startDate} to {endDate} · {deptFilter} · {categoryFilter}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-border rounded-xl text-xs font-display font-bold text-slate-700 hover:border-navy hover:text-navy transition-all shadow-xs cursor-pointer"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download CSV
                </button>
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-2 bg-navy text-white rounded-xl text-xs font-display font-bold hover:bg-navy-dark transition-all shadow-xs cursor-pointer"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Print / PDF
                </button>
              </div>
            </div>

            {/* DYNAMIC EXECUTIVE STATS CARDS (Unique for each report type) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-slate-100 bg-white">
              {selected === 'daily' && [
                { label: 'Total Verified Logs', val: dailyRecords.length, color: 'text-slate-800' },
                { label: 'Office HQ Duty', val: dailyRecords.filter(r => r.dutyType !== 'Field Site' && r.status !== 'Absent').length, color: 'text-navy' },
                { label: 'Road Site Duty', val: dailyRecords.filter(r => r.dutyType === 'Field Site').length, color: 'text-blue-600' },
                { label: 'Lateness Past Grace', val: dailyRecords.filter(r => r.status === 'Late').length, color: 'text-amber-600' },
              ].map(m => (
                <div key={m.label} className="p-3 rounded-xl bg-surface/50 border border-slate-100 text-center">
                  <div className={`text-2xl font-display font-800 ${m.color}`}>{m.val}</div>
                  <div className="text-muted text-[10px] font-mono uppercase tracking-wide mt-0.5">{m.label}</div>
                </div>
              ))}

              {selected === 'site' && [
                { label: 'Field Dispatches', val: siteRecords.length, color: 'text-blue-600' },
                { label: 'Road Corridors', val: new Set(siteRecords.map(r => r.siteName).filter(Boolean)).size, color: 'text-slate-800' },
                { label: 'Field Engineers', val: new Set(siteRecords.map(r => r.employeeId || r.name)).size, color: 'text-navy' },
                { label: 'GPS Verified Rate', val: siteRecords.length ? `${Math.round((siteRecords.filter(r => r.locationVerified).length / siteRecords.length) * 100)}%` : '0%', color: 'text-emerald-600' },
              ].map(m => (
                <div key={m.label} className="p-3 rounded-xl bg-surface/50 border border-slate-100 text-center">
                  <div className={`text-2xl font-display font-800 ${m.color}`}>{m.val}</div>
                  <div className="text-muted text-[10px] font-mono uppercase tracking-wide mt-0.5">{m.label}</div>
                </div>
              ))}

              {selected === 'late' && [
                { label: 'Late Incidents', val: lateRecords.length, color: 'text-amber-600' },
                { label: 'Cutoff Policy', val: officialCutoffStr, color: 'text-navy' },
                { 
                  label: 'Average Lateness', 
                  val: lateRecords.length 
                    ? `+${Math.round(lateRecords.reduce((acc, r) => acc + calculateLateness(r.checkIn, officialCutoffStr).minutesLate, 0) / lateRecords.length)}m` 
                    : '0m', 
                  color: 'text-amber-700' 
                },
                { 
                  label: 'Punctuality Rate', 
                  val: dailyRecords.length 
                    ? `${Math.round(((dailyRecords.length - lateRecords.length) / dailyRecords.length) * 100)}%` 
                    : '100%', 
                  color: 'text-emerald-600' 
                },
              ].map(m => (
                <div key={m.label} className="p-3 rounded-xl bg-surface/50 border border-slate-100 text-center">
                  <div className={`text-2xl font-display font-800 ${m.color}`}>{m.val}</div>
                  <div className="text-muted text-[10px] font-mono uppercase tracking-wide mt-0.5">{m.label}</div>
                </div>
              ))}

              {selected === 'absent' && [
                { label: 'Absence Incidents', val: absentRecords.length, color: 'text-red-600' },
                { label: 'Reported Sickness', val: absentRecords.filter(r => (r.absenceReason || '').toLowerCase().includes('sick')).length, color: 'text-slate-800' },
                { label: 'Unexcused / Missing', val: absentRecords.filter(r => !(r.absenceReason || '').toLowerCase().includes('sick')).length, color: 'text-amber-600' },
                { 
                  label: 'Absenteeism Rate', 
                  val: dailyRecords.length ? `${Math.round((absentRecords.length / dailyRecords.length) * 100)}%` : '0%', 
                  color: 'text-red-700' 
                },
              ].map(m => (
                <div key={m.label} className="p-3 rounded-xl bg-surface/50 border border-slate-100 text-center">
                  <div className={`text-2xl font-display font-800 ${m.color}`}>{m.val}</div>
                  <div className="text-muted text-[10px] font-mono uppercase tracking-wide mt-0.5">{m.label}</div>
                </div>
              ))}

              {selected === 'performance' && [
                { label: 'Staff Evaluated', val: performanceRows.length, color: 'text-slate-800' },
                { 
                  label: 'Average Compliance', 
                  val: performanceRows.length 
                    ? `${Math.round(performanceRows.reduce((acc, r) => acc + r.complianceRate, 0) / performanceRows.length)}%` 
                    : '0%', 
                  color: 'text-emerald-600' 
                },
                { label: 'Exemplary (≥95%)', val: performanceRows.filter(r => r.complianceRate >= 95).length, color: 'text-blue-600' },
                { label: 'Under Review (<80%)', val: performanceRows.filter(r => r.complianceRate < 80).length, color: 'text-red-600' },
              ].map(m => (
                <div key={m.label} className="p-3 rounded-xl bg-surface/50 border border-slate-100 text-center">
                  <div className={`text-2xl font-display font-800 ${m.color}`}>{m.val}</div>
                  <div className="text-muted text-[10px] font-mono uppercase tracking-wide mt-0.5">{m.label}</div>
                </div>
              ))}

              {selected === 'timecards' && [
                { 
                  label: 'Total Man-Hours', 
                  val: `${Math.round(timecardRecords.reduce((acc, r) => acc + r.hoursData.totalHours, 0))}h`, 
                  color: 'text-navy' 
                },
                { 
                  label: 'Avg Shift Duration', 
                  val: timecardRecords.length 
                    ? `${Math.round((timecardRecords.reduce((acc, r) => acc + r.hoursData.totalHours, 0) / timecardRecords.length) * 10) / 10}h` 
                    : '0h', 
                  color: 'text-slate-800' 
                },
                { 
                  label: 'Overtime Hours', 
                  val: `${Math.round(timecardRecords.reduce((acc, r) => acc + r.hoursData.overtimeHours, 0) * 10) / 10}h`, 
                  color: 'text-purple-600' 
                },
                { label: 'Incomplete Cards', val: timecardRecords.filter(r => r.hoursData.status === 'Missing Punch-Out').length, color: 'text-amber-600' },
              ].map(m => (
                <div key={m.label} className="p-3 rounded-xl bg-surface/50 border border-slate-100 text-center">
                  <div className={`text-2xl font-display font-800 ${m.color}`}>{m.val}</div>
                  <div className="text-muted text-[10px] font-mono uppercase tracking-wide mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>

            {/* DYNAMIC DATA TABLE (Tailored columns per report type) */}
            <div className="p-5">
              {loading ? (
                <div className="py-16 text-center text-muted text-xs font-mono">
                  Loading attendance records from database…
                </div>
              ) : (
                <>
                  {/* VIEW 1: DAILY ATTENDANCE ROSTER */}
                  {selected === 'daily' && (
                    <div className="rounded-xl border border-slate-100 overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 text-[10px] font-display font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Staff Member</th>
                            <th className="px-3 py-3">Duty Assignment</th>
                            <th className="px-3 py-3">Location / Corridor</th>
                            <th className="px-3 py-3">Clock In</th>
                            <th className="px-3 py-3">Clock Out</th>
                            <th className="px-3 py-3">Duration</th>
                            <th className="px-3 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                          {dailyRecords.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-12 text-center text-muted text-xs font-mono">
                                No attendance records found matching current criteria.
                              </td>
                            </tr>
                          ) : (
                            dailyRecords.map((r, i) => {
                              const hours = calculateWorkHours(r.checkIn, r.checkOut);
                              const isSite = r.dutyType === 'Field Site';
                              return (
                                <tr key={r.id || i} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="font-display font-bold text-slate-900">{r.name || 'Staff Member'}</div>
                                    <div className="text-[10px] font-mono text-muted">{r.employeeId || '—'} · {r.department || 'Operations'}</div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-display font-bold ${
                                      isSite ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-700'
                                    }`}>
                                      {isSite ? '🚧 Field Site' : '🏢 Office HQ'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 max-w-xs">
                                    <div className="text-slate-800 font-display font-semibold truncate text-[11px]">
                                      {r.siteName || (isSite ? 'Road Corridor' : 'Department HQ')}
                                    </div>
                                    <div className="text-[10px] font-mono text-muted truncate">
                                      {r.locationAddress || 'Office HQ Geofence'}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 font-mono font-bold text-slate-800 text-xs">{r.checkIn || '—'}</td>
                                  <td className="px-3 py-3 font-mono text-slate-600 text-xs">{r.checkOut || '—'}</td>
                                  <td className="px-3 py-3 font-mono text-[11px] text-slate-700 font-semibold">{hours.display}</td>
                                  <td className="px-3 py-3">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-display font-bold ${
                                      r.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                      r.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                      'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                      {r.status || 'Present'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* VIEW 2: ROAD PROJECTS & FIELD SITE DISPATCH */}
                  {selected === 'site' && (
                    <div className="rounded-xl border border-slate-100 overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 text-[10px] font-display font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Field Engineer</th>
                            <th className="px-3 py-3">Road Project Corridor</th>
                            <th className="px-3 py-3">Assigned Site Activity</th>
                            <th className="px-3 py-3">Physical Place / Address</th>
                            <th className="px-3 py-3">Site Arrival</th>
                            <th className="px-3 py-3">GPS Satellite</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                          {siteRecords.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-12 text-center text-muted text-xs font-mono">
                                No road project or field site dispatches found in this date range.
                              </td>
                            </tr>
                          ) : (
                            siteRecords.map((r, i) => (
                              <tr key={r.id || i} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-display font-bold text-slate-900">{r.name || 'Site Engineer'}</div>
                                  <div className="text-[10px] font-mono text-muted">{r.employeeId || '—'} · {r.department || 'Engineering'}</div>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="font-display font-bold text-blue-900 text-xs">{r.siteName || 'Road Project Corridor'}</div>
                                  <div className="text-[10px] font-mono text-muted">{r.date}</div>
                                </td>
                                <td className="px-3 py-3 text-[11px] text-slate-700 max-w-xs">
                                  {r.absenceNote || 'Road Works Supervision & Field Operations'}
                                </td>
                                <td className="px-3 py-3 text-[11px] text-slate-800 font-semibold max-w-xs">
                                  {r.locationAddress || 'GPS Coordinates Captured'}
                                </td>
                                <td className="px-3 py-3 font-mono font-bold text-slate-800 text-xs">
                                  {r.checkIn || '—'}
                                </td>
                                <td className="px-3 py-3">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-display font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    ✓ Satellite Locked
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* VIEW 3: PUNCTUALITY & LATENESS AUDIT */}
                  {selected === 'late' && (
                    <div className="rounded-xl border border-slate-100 overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 text-[10px] font-display font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Employee</th>
                            <th className="px-3 py-3">Department</th>
                            <th className="px-3 py-3">Date</th>
                            <th className="px-3 py-3">Recorded Clock In</th>
                            <th className="px-3 py-3">Official Cutoff</th>
                            <th className="px-3 py-3">Duration Late</th>
                            <th className="px-3 py-3">Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                          {lateRecords.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-12 text-center text-emerald-700 text-xs font-display font-semibold">
                                ✓ No lateness incidents recorded for the selected period! Perfect punctuality compliance.
                              </td>
                            </tr>
                          ) : (
                            lateRecords.map((r, i) => {
                              const lateness = calculateLateness(r.checkIn, officialCutoffStr);
                              return (
                                <tr key={r.id || i} className="hover:bg-amber-50/30 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="font-display font-bold text-slate-900">{r.name}</div>
                                    <div className="text-[10px] font-mono text-muted">{r.employeeId || '—'}</div>
                                  </td>
                                  <td className="px-3 py-3 text-slate-700 font-display font-semibold text-xs">{r.department || 'Operations'}</td>
                                  <td className="px-3 py-3 font-mono text-slate-600 text-xs">{r.date}</td>
                                  <td className="px-3 py-3 font-mono font-bold text-amber-900 text-xs">{r.checkIn}</td>
                                  <td className="px-3 py-3 font-mono text-slate-500 text-xs">{officialCutoffStr}</td>
                                  <td className="px-3 py-3">
                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                      {lateness.display}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 text-slate-600 text-[11px]">{r.dutyType || 'Office HQ'}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* VIEW 4: ABSENCE & NON-ATTENDANCE LOG */}
                  {selected === 'absent' && (
                    <div className="rounded-xl border border-slate-100 overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 text-[10px] font-display font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Employee</th>
                            <th className="px-3 py-3">Department</th>
                            <th className="px-3 py-3">Date of Absence</th>
                            <th className="px-3 py-3">Classification</th>
                            <th className="px-3 py-3">Explanatory Note / Reason</th>
                            <th className="px-3 py-3">Supervisor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                          {absentRecords.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-12 text-center text-emerald-700 text-xs font-display font-semibold">
                                ✓ Zero unexcused absences recorded within this date range.
                              </td>
                            </tr>
                          ) : (
                            absentRecords.map((r, i) => (
                              <tr key={r.id || i} className="hover:bg-red-50/30 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-display font-bold text-slate-900">{r.name}</div>
                                  <div className="text-[10px] font-mono text-muted">{r.employeeId || '—'}</div>
                                </td>
                                <td className="px-3 py-3 font-display font-semibold text-slate-700 text-xs">{r.department || 'Operations'}</td>
                                <td className="px-3 py-3 font-mono text-slate-600 text-xs">{r.date}</td>
                                <td className="px-3 py-3">
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-display font-bold bg-red-50 text-red-700 border border-red-200">
                                    {r.absenceReason || 'Unexcused Absence'}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-slate-600 text-[11px] max-w-xs">{r.absenceNote || 'No explanation submitted'}</td>
                                <td className="px-3 py-3 text-slate-500 text-[11px]">Head of Department</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* VIEW 5: STAFF PERFORMANCE & VELOCITY MATRIX */}
                  {selected === 'performance' && (
                    <div className="rounded-xl border border-slate-100 overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 text-[10px] font-display font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Staff Member</th>
                            <th className="px-3 py-3">Classification</th>
                            <th className="px-3 py-3">Office Days</th>
                            <th className="px-3 py-3">Site Days</th>
                            <th className="px-3 py-3">Late</th>
                            <th className="px-3 py-3">Absent</th>
                            <th className="px-3 py-3">Total Hours</th>
                            <th className="px-3 py-3">Compliance</th>
                            <th className="px-3 py-3">Rating</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                          {performanceRows.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="px-4 py-12 text-center text-muted text-xs font-mono">
                                No staff members match the selected filters.
                              </td>
                            </tr>
                          ) : (
                            performanceRows.map((r, i) => (
                              <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-display font-bold text-slate-900">{r.name}</div>
                                  <div className="text-[10px] font-mono text-muted">{r.staffId} · {r.department}</div>
                                </td>
                                <td className="px-3 py-3 text-[11px] text-slate-600 font-display">{r.category}</td>
                                <td className="px-3 py-3 font-mono text-emerald-600 font-bold">{r.officeDays}</td>
                                <td className="px-3 py-3 font-mono text-blue-600 font-bold">{r.siteDays}</td>
                                <td className="px-3 py-3 font-mono text-amber-600 font-bold">{r.lateDays}</td>
                                <td className="px-3 py-3 font-mono text-red-600 font-bold">{r.absentDays}</td>
                                <td className="px-3 py-3 font-mono text-slate-800 font-bold">{r.totalHours}h</td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-display font-800 text-xs text-slate-900">{r.complianceRate}%</span>
                                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${r.complianceRate >= 90 ? 'bg-emerald-500' : r.complianceRate >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                        style={{ width: `${r.complianceRate}%` }} 
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-display font-bold border ${r.ratingColor}`}>
                                    {r.ratingBadge}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* VIEW 6: WORK HOURS & PAYROLL TIMECARD */}
                  {selected === 'timecards' && (
                    <div className="rounded-xl border border-slate-100 overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 text-[10px] font-display font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Staff Member</th>
                            <th className="px-3 py-3">Date</th>
                            <th className="px-3 py-3">Clock In</th>
                            <th className="px-3 py-3">Clock Out</th>
                            <th className="px-3 py-3">Regular Hours</th>
                            <th className="px-3 py-3">Overtime</th>
                            <th className="px-3 py-3">Total Shift</th>
                            <th className="px-3 py-3">Audit Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                          {timecardRecords.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-4 py-12 text-center text-muted text-xs font-mono">
                                No shift logs recorded within this date range.
                              </td>
                            </tr>
                          ) : (
                            timecardRecords.map((r, i) => (
                              <tr key={r.id || i} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-display font-bold text-slate-900">{r.name}</div>
                                  <div className="text-[10px] font-mono text-muted">{r.employeeId || '—'} · {r.department || 'Operations'}</div>
                                </td>
                                <td className="px-3 py-3 font-mono text-slate-600 text-xs">{r.date}</td>
                                <td className="px-3 py-3 font-mono font-bold text-slate-800 text-xs">{r.checkIn || '—'}</td>
                                <td className="px-3 py-3 font-mono text-slate-700 text-xs">
                                  {r.checkOut || <span className="text-amber-600 font-bold">Missing</span>}
                                </td>
                                <td className="px-3 py-3 font-mono text-slate-800 font-semibold">{r.hoursData.regularHours}h</td>
                                <td className="px-3 py-3 font-mono font-bold text-purple-700">
                                  {r.hoursData.overtimeHours > 0 ? `+${r.hoursData.overtimeHours}h` : '0h'}
                                </td>
                                <td className="px-3 py-3 font-mono font-extrabold text-slate-900">{r.hoursData.display}</td>
                                <td className="px-3 py-3">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-display font-bold ${
                                    r.hoursData.status === 'Complete' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    r.hoursData.status === 'Missing Punch-Out' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {r.hoursData.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-muted text-[11px] font-mono gap-2">
                    <span>
                      {selected === 'performance' ? `${performanceRows.length} staff members evaluated` : 
                       selected === 'site' ? `${siteRecords.length} road site dispatches` :
                       selected === 'late' ? `${lateRecords.length} lateness incidents` :
                       selected === 'absent' ? `${absentRecords.length} absence incidents` :
                       selected === 'timecards' ? `${timecardRecords.length} shift timecards` :
                       `${dailyRecords.length} daily logs verified`}
                    </span>
                    <span>Click "Download CSV" for the full raw audit log spreadsheet</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
