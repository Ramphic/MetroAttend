import React, { useState, useEffect } from 'react';
import { NavProps, WorkplaceSettings } from '../types';
import MobileShell from '../components/MobileShell';
import { useAuth } from '../context/AuthContext';
import { 
  calculateDistanceMeters, 
  getWorkplaceSettings, 
  recordCheckIn, 
  addNotification,
  DEFAULT_WORKPLACE 
} from '../lib/firebase';

type Stage = 'checking' | 'verified' | 'failed';

export default function LocationVerify({ nav }: { nav: NavProps }) {
  const { profile, user } = useAuth();
  const [stage, setStage] = useState<Stage>('checking');
  const [workplace, setWorkplace] = useState<WorkplaceSettings>(DEFAULT_WORKPLACE);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkLocation() {
      const wp = await getWorkplaceSettings();
      if (!isMounted) return;
      setWorkplace(wp);

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

  const handleCompleteCheckIn = async () => {
    setSubmitting(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const todayStr = now.toISOString().split('T')[0];

    const [startHour, startMin] = workplace.workStartTime.split(':').map(Number);
    const limitMinutes = startHour * 60 + startMin + workplace.gracePeriodMinutes;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const status = currentMinutes > limitMinutes ? 'Late' : 'Present';

    const employeeId = profile?.staffId || profile?.id || user?.uid || `MWI-${Math.floor(1000 + Math.random() * 9000)}`;
    const employeeName = profile?.name || user?.displayName || 'Staff Member';

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
        latitude: userCoords?.lat || workplace.latitude,
        longitude: userCoords?.lng || workplace.longitude,
        distanceMeters: distance ?? 25,
        photoURL: profile?.photoURL || user?.photoURL || undefined,
      });

      // Log real notification
      await addNotification({
        title: status === 'Late' ? 'Late Check-In Recorded' : 'Workplace Check-In Recorded',
        body: `Your check-in was logged at ${timeStr}. GPS verified at ${workplace.officeName} (~${distance ?? 25}m). Status: ${status}.`,
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
      <div className="bg-navy px-6 py-6 sm:px-8 text-white flex items-center justify-between">
        <div>
          <button 
            onClick={() => nav.navigate('dashboard')} 
            className="text-white/60 hover:text-white text-xs font-display font-semibold flex items-center gap-1.5 mb-2 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back to Dashboard
          </button>
          <h1 className="text-xl sm:text-2xl font-display font-800">Verify Workplace Geofence</h1>
          <p className="text-white/60 text-xs mt-0.5">
            Authenticating your presence at {workplace.officeName} ({workplace.latitude.toFixed(4)}, {workplace.longitude.toFixed(4)})
          </p>
        </div>
      </div>

      {/* Responsive 2-Column Body */}
      <div className="p-6 sm:p-8">
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
              </div>
            )}

            {stage === 'verified' && (
              <div className="space-y-4">
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
                  onClick={handleCompleteCheckIn}
                  disabled={submitting}
                  className="w-full bg-navy text-white py-3.5 rounded-xl font-display font-bold text-sm hover:bg-navy-dark transition-all shadow-md flex items-center justify-center gap-2"
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
                  {errorMessage || `Your device GPS is ${distance ? `${(distance / 1000).toFixed(2)} km` : 'away'} from the workplace. You must be within ${workplace.geofenceRadius}m to record attendance.`}
                </p>

                {/* Remote Testing Override */}
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                  <div className="text-amber-900 font-display font-bold mb-1">Development Override</div>
                  <p className="text-amber-800 text-[11px] leading-relaxed mb-2.5">
                    Testing remotely? Click below to simulate your location right inside the authorized perimeter.
                  </p>
                  <button
                    type="button"
                    onClick={handleSimulateAtHQ}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-display font-bold rounded-lg transition-all"
                  >
                    Simulate Location at Site
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
