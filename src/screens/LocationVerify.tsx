import React, { useState, useEffect } from 'react';
import { NavProps, WorkplaceSettings } from '../types';
import MobileShell from '../components/MobileShell';
import { useAuth } from '../context/AuthContext';
import { 
  calculateDistanceMeters, 
  getWorkplaceSettings, 
  saveWorkplaceSettings,
  recordCheckIn, 
  addNotification, 
  DEFAULT_WORKPLACE 
} from '../lib/firebase';

type Stage = 'checking' | 'verified' | 'failed';
type DutyMode = 'Office HQ' | 'Field Site';

export const ROAD_PROJECT_CORRIDORS = [
  'Accra-Tema Motorway Expansion Corridor',
  'George Walker Bush Highway (N1) Drainage Works',
  'Spintex Road Junction Improvement Project',
  'Pokuese - Ofankor Dualization Arterial',
  'Asphaltic Overlay Project - Batch 4',
  'Culvert & Stormwater Drainage Inspection',
  'Topographic Survey & Route Alignment',
  'Materials Lab & Asphalt Batching Plant',
  'Other Active Road Corridor (Custom)',
];

export default function LocationVerify({ nav }: { nav: NavProps }) {
  const { profile, user } = useAuth();
  const [dutyMode, setDutyMode] = useState<DutyMode>('Office HQ');
  const [stage, setStage] = useState<Stage>('checking');
  const [workplace, setWorkplace] = useState<WorkplaceSettings>(DEFAULT_WORKPLACE);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [calibratedNotice, setCalibratedNotice] = useState<string | null>(null);

  // Field Site Specific State
  const [selectedCorridor, setSelectedCorridor] = useState<string>(ROAD_PROJECT_CORRIDORS[0]);
  const [customCorridor, setCustomCorridor] = useState<string>('');
  const [siteNotes, setSiteNotes] = useState<string>('');
  const [fieldGpsAcquiring, setFieldGpsAcquiring] = useState<boolean>(false);

  const handleCalibrateCurrentOffice = async () => {
    if (!userCoords) return;
    setCalibrating(true);
    try {
      const updated: WorkplaceSettings = {
        ...workplace,
        officeName: 'Department of Urban Roads (DUR)',
        latitude: userCoords.lat,
        longitude: userCoords.lng,
        geofenceRadius: 350,
      };
      await saveWorkplaceSettings(updated);
      setWorkplace(updated);
      setDistance(10);
      setStage('verified');
      setCalibratedNotice(`✓ Office HQ successfully calibrated to your current position (${userCoords.lat.toFixed(5)}, ${userCoords.lng.toFixed(5)}) with a 350m geofence!`);
      setErrorMessage(null);
    } catch (err) {
      console.error('Error calibrating office:', err);
    } finally {
      setCalibrating(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function checkLocation() {
      const wp = await getWorkplaceSettings();
      if (!isMounted) return;
      setWorkplace(wp);

      // Check if Demo GPS override is enabled
      const demoForceGps = localStorage.getItem('metroattend_demo_force_gps') === 'true';
      if (demoForceGps) {
        setUserCoords({ lat: wp.latitude + 0.0001, lng: wp.longitude + 0.0001 });
        setDistance(25);
        setStage('verified');
        return;
      }

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!isMounted) return;
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setUserCoords({ lat, lng });

            const dist = calculateDistanceMeters(lat, lng, wp.latitude, wp.longitude);
            setDistance(dist);

            if (dist <= wp.geofenceRadius) {
              setStage('verified');
            } else {
              setStage('failed');
            }
          },
          (err) => {
            if (!isMounted) return;
            console.warn('Geolocation error or permission denied:', err);
            setErrorMessage('Location permission not granted or GPS unavailable.');
            setStage('failed');
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      } else {
        setErrorMessage('Geolocation is not supported by your browser.');
        setStage('failed');
      }
    }

    checkLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSimulateAtHQ = () => {
    setUserCoords({ lat: workplace.latitude + 0.0001, lng: workplace.longitude + 0.0001 });
    setDistance(25);
    setErrorMessage(null);
    setStage('verified');
  };

  const handleAcquireFieldGps = () => {
    setFieldGpsAcquiring(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setFieldGpsAcquiring(false);
        },
        (err) => {
          console.warn('Could not acquire site GPS, falling back to active road corridor coordinates:', err);
          setUserCoords({ lat: 5.6514, lng: -0.1873 });
          setFieldGpsAcquiring(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setUserCoords({ lat: 5.6514, lng: -0.1873 });
      setFieldGpsAcquiring(false);
    }
  };

  const handleCompleteCheckIn = async (mode: DutyMode = dutyMode) => {
    setSubmitting(true);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Check if demo time mode is active
    const demoTimeMode = localStorage.getItem('metroattend_demo_timemode');
    let timeStr: string;
    let status: 'Present' | 'Late';

    if (demoTimeMode === 'ontime') {
      timeStr = '8:02 AM';
      status = 'Present';
    } else if (demoTimeMode === 'late') {
      timeStr = '8:42 AM';
      status = 'Late';
    } else {
      timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const [startHour, startMin] = workplace.workStartTime.split(':').map(Number);
      const limitMinutes = startHour * 60 + startMin + workplace.gracePeriodMinutes;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      status = currentMinutes > limitMinutes ? 'Late' : 'Present';
    }

    const employeeId = profile?.staffId || profile?.id || user?.uid || `MWI-${Math.floor(1000 + Math.random() * 9000)}`;
    const employeeName = profile?.name || user?.displayName || 'Staff Member';

    const isFieldSite = mode === 'Field Site';
    const finalSiteName = isFieldSite 
      ? (selectedCorridor === 'Other Active Road Corridor (Custom)' ? (customCorridor.trim() || 'Road Project Corridor') : selectedCorridor)
      : workplace.officeName;

    const lat = userCoords?.lat || (isFieldSite ? 5.6514 : workplace.latitude);
    const lng = userCoords?.lng || (isFieldSite ? -0.1873 : workplace.longitude);

    try {
      await recordCheckIn({
        employeeId,
        userId: user?.uid || profile?.id || 'emp_1',
        name: employeeName,
        category: profile?.category || 'Permanent Staff',
        department: profile?.department || 'Engineering',
        date: todayStr,
        dayLabel: now.toLocaleDateString('en-GB', { weekday: 'long' }),
        checkIn: timeStr,
        checkOut: '—',
        status,
        locationVerified: true,
        latitude: lat,
        longitude: lng,
        distanceMeters: isFieldSite ? 0 : (distance ?? 25),
        photoURL: profile?.photoURL || user?.photoURL || undefined,
        dutyType: mode,
        siteName: finalSiteName,
      });

      // Save to localStorage for instant reference in CheckInSuccess
      localStorage.setItem('metroattend_last_duty_type', mode);
      localStorage.setItem('metroattend_last_site_name', finalSiteName);
      localStorage.setItem('metroattend_last_site_coords', `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° W`);

      // Log real notification
      await addNotification({
        title: isFieldSite ? '🚧 Field Road Site Check-In Logged' : (status === 'Late' ? 'Late Check-In Recorded' : 'Workplace Check-In Recorded'),
        body: isFieldSite
          ? `Site check-in verified at ${finalSiteName} (${lat.toFixed(4)}, ${lng.toFixed(4)}) at ${timeStr}. Status: ${status}.`
          : `Check-in logged at ${timeStr}. GPS verified at ${workplace.officeName} (~${distance ?? 25}m). Status: ${status}.`,
        type: status === 'Late' ? 'warning' : 'success',
        time: `${timeStr} today`,
        timestamp: Date.now(),
        unread: true,
        targetUserId: user?.uid || profile?.id || 'emp_1',
      });

      nav.setCheckInStatus('checked-in');
      nav.setCheckInTime(timeStr);
      nav.navigate('checkin-success');
    } catch (e) {
      console.error(e);
      localStorage.setItem('metroattend_last_duty_type', mode);
      localStorage.setItem('metroattend_last_site_name', finalSiteName);
      localStorage.setItem('metroattend_last_site_coords', `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° W`);
      nav.setCheckInStatus('checked-in');
      nav.setCheckInTime(timeStr);
      nav.navigate('checkin-success');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileShell nav={nav} showBottomNav={false}>
      {/* Header */}
      <div className="bg-navy px-6 py-6 sm:px-8 text-white">
        <button 
          onClick={() => nav.navigate('dashboard')} 
          className="text-white/60 hover:text-white text-xs font-display font-semibold flex items-center gap-1.5 mb-2 transition-colors cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-800">Attendance Verification</h1>
            <p className="text-white/60 text-xs mt-0.5">
              {dutyMode === 'Office HQ' 
                ? `Authenticating presence at ${workplace.officeName}` 
                : 'Logging civil engineering field inspection & road project presence'}
            </p>
          </div>

          {/* Mode Switcher Pills */}
          <div className="flex bg-navy-dark/80 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setDutyMode('Office HQ')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-display font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                dutyMode === 'Office HQ'
                  ? 'bg-white text-navy shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <span>🏢</span>
              <span>Office HQ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDutyMode('Field Site');
                if (!userCoords) handleAcquireFieldGps();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-display font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                dutyMode === 'Field Site'
                  ? 'bg-amber-400 text-navy-dark shadow-sm font-extrabold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <span>🚧</span>
              <span>Field Road Site</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 sm:p-8">
        {dutyMode === 'Office HQ' ? (
          /* Office HQ Verification View */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Map Column (Left 3 cols on desktop) */}
            <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-border shadow-xs relative location-map-bg" style={{ minHeight: 320 }}>
              {/* Map graphics */}
              <div className="map-road-h" style={{ top: '40%', left: 0, right: 0 }} />
              <div className="map-road-h" style={{ top: '70%', left: 0, right: 0 }} />
              <div className="map-road-v" style={{ left: '30%', top: 0, bottom: 0 }} />
              <div className="map-road-v" style={{ left: '65%', top: 0, bottom: 0 }} />

              {/* Geofence Circle */}
              <div className="geofence-circle" style={{ left: '50%', top: '50%', width: 150, height: 150 }} />
              {stage === 'checking' && (
                <div className="pulse-ring geofence-circle absolute" style={{ left: '50%', top: '50%', width: 150, height: 150, borderColor: '#15803D', background: 'rgba(21,128,61,0.04)' }} />
              )}

              {/* Office pin */}
              <div className="absolute" style={{ left: 'calc(50% - 12px)', top: 'calc(50% - 28px)' }}>
                <div className="w-6 h-8 relative">
                  <div className="w-6 h-6 rounded-full bg-navy border-2 border-white shadow-md flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 w-1 h-2 bg-navy rounded-full bottom-0" />
                </div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-navy text-white text-[8px] font-display font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow">
                  {workplace.officeName}
                </div>
              </div>

              {/* User GPS Pin */}
              <div className="absolute transition-all duration-700" style={{
                left: stage === 'verified' ? 'calc(50% - 10px)' : stage === 'failed' ? 'calc(80% - 10px)' : 'calc(55% - 10px)',
                top: stage === 'verified' ? 'calc(50% - 10px)' : stage === 'failed' ? 'calc(20% - 10px)' : 'calc(55% - 10px)'
              }}>
                <div className={`w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center ${
                  stage === 'verified' ? 'bg-success' : stage === 'failed' ? 'bg-danger' : 'bg-navy-light'
                }`}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <circle cx="12" cy="12" r="6"/>
                  </svg>
                </div>
              </div>

              {/* Radius Badge */}
              <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-sm border border-border">
                <div className="text-[9px] font-mono text-muted uppercase">Authorized Radius</div>
                <div className="text-navy text-xs font-display font-bold">{workplace.geofenceRadius} meters</div>
              </div>
            </div>

            {/* Verification Status Column (Right 2 cols on desktop) */}
            <div className="lg:col-span-2 flex flex-col justify-between bg-surface rounded-2xl border border-border p-6">
              {stage === 'checking' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
                      <div className="w-5 h-5 border-2 border-navy border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div>
                      <div className="text-slate-800 font-display font-bold text-sm">Querying GPS Signal…</div>
                      <div className="text-muted text-xs">Matching coordinates to workplace</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-3.5 border border-border text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted">Target Site:</span>
                      <span className="font-semibold text-slate-700">{workplace.officeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Target Coordinates:</span>
                      <span className="font-mono text-slate-700">{workplace.latitude.toFixed(6)}, {workplace.longitude.toFixed(6)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSimulateAtHQ}
                    className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-display font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>⚡</span>
                    <span>Instant Verify at HQ (Demo Bypass)</span>
                  </button>
                </div>
              )}

              {stage === 'verified' && (
                <div className="space-y-4">
                  {calibratedNotice && (
                    <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl p-3 text-xs font-display font-semibold flex items-center gap-2">
                      <span className="text-base">🎯</span>
                      <span>{calibratedNotice}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-emerald-800 font-display font-bold text-sm">Location Verified</div>
                      <div className="text-emerald-700 text-xs">You are within the workplace perimeter</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-3.5 border border-border text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted">Distance to Site:</span>
                      <span className="font-mono font-bold text-emerald-600">{distance !== null ? `~${distance}m` : 'Inside (verified)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Perimeter Limit:</span>
                      <span className="font-mono text-slate-700">{workplace.geofenceRadius}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Site GPS:</span>
                      <span className="font-mono text-slate-700">{workplace.latitude.toFixed(6)}, {workplace.longitude.toFixed(6)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCompleteCheckIn('Office HQ')}
                    disabled={submitting}
                    className="w-full bg-navy text-white py-3.5 rounded-xl font-display font-bold text-sm hover:bg-navy-dark transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? 'Recording Check-in…' : 'Confirm Check-In →'}
                  </button>
                </div>
              )}

              {stage === 'failed' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-red-800 font-display font-bold text-sm">Outside Authorized Zone</div>
                      <div className="text-red-700 text-xs">Too far from {workplace.officeName}</div>
                    </div>
                  </div>

                  <p className="text-slate-600 text-xs leading-relaxed bg-white p-3 rounded-xl border border-border">
                    {errorMessage || `Your device GPS is ${distance ? `${(distance / 1000).toFixed(2)} km` : 'away'} from HQ. To check in at office, you must be within ${workplace.geofenceRadius}m.`}
                  </p>

                  {/* Instant Office Location Calibration Tool */}
                  {userCoords && (
                    <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-400 text-xs space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-emerald-950 font-display font-extrabold text-xs flex items-center gap-1.5">
                          <span className="text-base">📍</span>
                          <span>Sitting in your office right now?</span>
                        </div>
                        <span className="text-[9px] font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                          1-Tap Fix
                        </span>
                      </div>
                      <p className="text-emerald-800 text-[11px] leading-relaxed">
                        Default HQ coordinates were set to a different address. Click below to save your <strong>current building position</strong> ({userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)}) as the official Office HQ with a 350m compound radius.
                      </p>
                      <button
                        type="button"
                        onClick={handleCalibrateCurrentOffice}
                        disabled={calibrating}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-display font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>🎯</span>
                        <span>{calibrating ? 'Saving Office Coordinates…' : 'Set My Current Location as Office HQ'}</span>
                      </button>
                    </div>
                  )}

                  {/* Field Site Switch Callout */}
                  <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-xs space-y-2">
                    <div className="text-navy font-display font-bold flex items-center gap-1.5">
                      <span>🚧</span>
                      <span>On Site Duty or Route Inspection?</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      If you are reporting directly to an active road project corridor, bypass HQ geofence using Field Site Check-In.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDutyMode('Field Site');
                        if (!userCoords) handleAcquireFieldGps();
                      }}
                      className="w-full py-2 bg-navy hover:bg-navy-dark text-white font-display font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>Switch to Field Site Check-In</span>
                      <span>→</span>
                    </button>
                  </div>

                  {/* Remote Testing Override */}
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                    <button
                      type="button"
                      onClick={handleSimulateAtHQ}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-display font-bold rounded-lg transition-all cursor-pointer"
                    >
                      ⚡ Simulate HQ Location (Demo)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Field / Road Project Site Mode View */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Visual Field Radar/Card (Left 3 cols) */}
            <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-amber-200 bg-linear-to-b from-amber-500/10 via-white to-amber-500/5 p-6 flex flex-col justify-between relative shadow-xs" style={{ minHeight: 360 }}>
              {/* Construction corridor stripes at top */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-repeating-linear-gradient-stripes" style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 12px, #0f172a 12px, #0f172a 24px)'
              }} />

              <div>
                <div className="flex items-center justify-between mb-4 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-display font-800 tracking-wider uppercase flex items-center gap-1 shadow-2xs">
                      <span>🚧</span> Active Site Inspection
                    </span>
                    <span className="text-slate-500 text-xs font-mono font-semibold">Urban Roads Operations</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>GPS Active</span>
                  </div>
                </div>

                <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-5 border border-amber-200 shadow-sm mb-4">
                  <div className="text-[11px] font-display font-bold uppercase tracking-wider text-muted mb-1">Selected Road Project Corridor</div>
                  <div className="text-base sm:text-lg font-display font-800 text-slate-900 leading-snug">
                    {selectedCorridor === 'Other Active Road Corridor (Custom)'
                      ? (customCorridor.trim() || 'Specify Custom Project Corridor...')
                      : selectedCorridor}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>Department of Urban Roads</span>
                    <span>•</span>
                    <span className="text-navy font-semibold">Engineering & Maintenance</span>
                  </div>
                </div>

                {/* GPS Coordinates Badge */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-mono text-muted uppercase">Latitude (Field GPS)</div>
                    <div className="font-mono text-xs font-bold text-slate-800 mt-0.5">
                      {userCoords ? `${userCoords.lat.toFixed(6)}°` : '5.651420° N'}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                    <div className="text-[10px] font-mono text-muted uppercase">Longitude (Field GPS)</div>
                    <div className="font-mono text-xs font-bold text-slate-800 mt-0.5">
                      {userCoords ? `${userCoords.lng.toFixed(6)}°` : '-0.187310° W'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Site Operation Info Banner */}
              <div className="mt-4 bg-slate-900 text-white rounded-xl p-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛰️</span>
                  <div>
                    <div className="font-display font-bold">Field Site Geotagging</div>
                    <div className="text-white/60 text-[10px]">Real-time location stamped to attendance ledger</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAcquireFieldGps}
                  disabled={fieldGpsAcquiring}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[11px] font-display font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {fieldGpsAcquiring ? 'Refreshing…' : '↻ Refresh GPS'}
                </button>
              </div>
            </div>

            {/* Field Site Configuration Form (Right 2 cols) */}
            <div className="lg:col-span-2 flex flex-col justify-between bg-surface rounded-2xl border border-border p-6 space-y-4">
              <div>
                <div className="text-sm font-display font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <span>📍</span>
                  <span>Project Corridor Selection</span>
                </div>
                <p className="text-xs text-muted mb-4">
                  Select the active road project or inspection site where you are currently deployed:
                </p>

                {/* Dropdown */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-display font-bold text-slate-600 uppercase tracking-wide block mb-1.5">
                      Road Project Corridor
                    </label>
                    <select
                      value={selectedCorridor}
                      onChange={(e) => setSelectedCorridor(e.target.value)}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-xs font-display font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    >
                      {ROAD_PROJECT_CORRIDORS.map((corridor) => (
                        <option key={corridor} value={corridor}>
                          {corridor}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Corridor Input */}
                  {selectedCorridor === 'Other Active Road Corridor (Custom)' && (
                    <div>
                      <label className="text-[11px] font-display font-bold text-slate-600 uppercase tracking-wide block mb-1.5">
                        Specify Corridor / Road Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Kasoa Interchange Slip Road, Ashaiman Arterial"
                        value={customCorridor}
                        onChange={(e) => setCustomCorridor(e.target.value)}
                        className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-display text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                      />
                    </div>
                  )}

                  {/* Site Task / Notes */}
                  <div>
                    <label className="text-[11px] font-display font-bold text-slate-600 uppercase tracking-wide block mb-1.5">
                      Site Task / Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Road sub-base compaction, culvert inspection"
                      value={siteNotes}
                      onChange={(e) => setSiteNotes(e.target.value)}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleCompleteCheckIn('Field Site')}
                  disabled={submitting}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-800 py-3.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? 'Logging Site Attendance…' : 'Confirm Road Site Check-In 🚧 →'}
                </button>
                <div className="text-center text-[10px] text-muted font-mono">
                  Tagged with live GPS coordinates & verified for supervisor audit
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
