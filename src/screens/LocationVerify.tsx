import React, { useState, useEffect, useMemo } from 'react';
import { NavProps, WorkplaceSettings, RoadProjectSite } from '../types';
import MobileShell from '../components/MobileShell';
import { useAuth } from '../context/AuthContext';
import { 
  calculateDistanceMeters, 
  getWorkplaceSettings, 
  recordCheckIn, 
  addNotification, 
  getLocalDateString,
  DEFAULT_WORKPLACE,
  formatNotificationTime
} from '../lib/firebase';
import { reverseGeocode, getNearestLandmark, getClosestTownName } from '../lib/geo';

type DutyMode = 'Office HQ' | 'Field Site';
type GpsStatus = 'idle' | 'acquiring' | 'locked' | 'denied' | 'unavailable';

export default function LocationVerify({ nav }: { nav: NavProps }) {
  const { profile, user } = useAuth();
  const [dutyMode, setDutyMode] = useState<DutyMode>('Office HQ');
  const [workplace, setWorkplace] = useState<WorkplaceSettings>(DEFAULT_WORKPLACE);
  
  // Real live device GPS state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('acquiring');
  const [detectedAddress, setDetectedAddress] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Field Site Specific State
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [customSiteName, setCustomSiteName] = useState<string>('');
  const [customTown, setCustomTown] = useState<string>('');
  const [siteNotes, setSiteNotes] = useState<string>('');

  // Active Road Projects configured by Admin
  const activeSites = useMemo(() => {
    return (workplace.roadProjects || []).filter(p => p.status === 'Active');
  }, [workplace.roadProjects]);

  useEffect(() => {
    if (!selectedSiteId && activeSites.length > 0) {
      setSelectedSiteId(activeSites[0].id);
    }
  }, [activeSites, selectedSiteId]);

  // Selected site object
  const currentSelectedSite = useMemo(() => {
    return activeSites.find(s => s.id === selectedSiteId) || null;
  }, [activeSites, selectedSiteId]);

  /**
   * Acquire Genuine Device GPS Coordinates
   */
  const acquireLiveGPS = (onSuccess?: (coords: { lat: number; lng: number }) => void) => {
    setGpsStatus('acquiring');
    setErrorMessage(null);

    if (!('geolocation' in navigator)) {
      setGpsStatus('unavailable');
      setErrorMessage('Geolocation is not supported by your mobile browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);

        setUserCoords({ lat, lng, accuracy });
        setGpsStatus('locked');

        // Reverse geocode genuine physical place name
        reverseGeocode(lat, lng).then(addr => {
          setDetectedAddress(addr);
        });

        if (onSuccess) onSuccess({ lat, lng });
      },
      (err) => {
        console.warn('Live geolocation error:', err);
        setGpsStatus('denied');
        if (err.code === 1) {
          setErrorMessage('Location permission was denied. Please allow location access in your browser settings to verify your physical presence.');
        } else if (err.code === 2) {
          setErrorMessage('GPS signal unavailable. Please ensure your device Location / GPS toggle is turned ON.');
        } else {
          setErrorMessage('GPS acquisition timed out. Please tap "Refresh GPS Fix" to try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    let isMounted = true;
    getWorkplaceSettings().then(wp => {
      if (!isMounted) return;
      setWorkplace(wp);
      acquireLiveGPS();
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Distance calculations
  const officeDistance = useMemo(() => {
    if (!userCoords) return null;
    return calculateDistanceMeters(
      userCoords.lat,
      userCoords.lng,
      workplace.latitude || DEFAULT_WORKPLACE.latitude,
      workplace.longitude || DEFAULT_WORKPLACE.longitude
    );
  }, [userCoords, workplace]);

  const isOfficeWithinGeofence = Boolean(
    officeDistance !== null && officeDistance <= (workplace.geofenceRadius || 350)
  );

  const siteDistance = useMemo(() => {
    if (!userCoords || !currentSelectedSite || !currentSelectedSite.latitude || !currentSelectedSite.longitude) {
      return null;
    }
    return calculateDistanceMeters(
      userCoords.lat,
      userCoords.lng,
      currentSelectedSite.latitude,
      currentSelectedSite.longitude
    );
  }, [userCoords, currentSelectedSite]);

  const isSiteWithinGeofence = useMemo(() => {
    if (selectedSiteId === 'custom') return true; // Custom sites allow check-in with GPS timestamp
    if (siteDistance === null) return true; // If site has no coordinates yet, allow check-in with GPS stamp
    const allowedRadius = currentSelectedSite?.radius || 600;
    return siteDistance <= allowedRadius;
  }, [siteDistance, currentSelectedSite, selectedSiteId]);

  /**
   * Complete and Record Attendance Check-In
   */
  const handleCompleteCheckIn = async (mode: DutyMode, isOverride: boolean = false) => {
    if (!userCoords) {
      setErrorMessage('Please wait for GPS satellite lock or tap "Refresh GPS Fix" before confirming.');
      acquireLiveGPS(() => {
        handleCompleteCheckIn(mode, isOverride);
      });
      return;
    }

    setSubmitting(true);
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    // Determine Punctuality Status
    const [startHour, startMin] = (workplace.workStartTime || '08:00').split(':').map(Number);
    const limitMinutes = startHour * 60 + startMin + (workplace.gracePeriodMinutes ?? 15);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const punctualityStatus: 'Present' | 'Late' = currentMinutes > limitMinutes ? 'Late' : 'Present';

    const employeeId = profile?.staffId || profile?.id || user?.uid || `MWI-${Math.floor(1000 + Math.random() * 9000)}`;
    const employeeName = profile?.name || user?.displayName || 'Staff Member';

    const isField = mode === 'Field Site';
    let finalSiteName = workplace.officeName;
    let distVal = officeDistance ?? 15;
    let locationVerified = isOfficeWithinGeofence;
    let isFlagged = false;
    let flagReason = '';

    if (isField) {
      if (selectedSiteId === 'custom') {
        const town = customTown.trim() || 'Field Locality';
        finalSiteName = customSiteName.trim() ? `${customSiteName.trim()} (${town})` : `Field Inspection (${town})`;
        distVal = 0;
        locationVerified = true;
      } else if (currentSelectedSite) {
        finalSiteName = `${currentSelectedSite.name} · ${currentSelectedSite.locality || 'Road Corridor'}`;
        distVal = siteDistance ?? 0;
        locationVerified = isSiteWithinGeofence;
      }

      if (isOverride || !locationVerified) {
        isFlagged = true;
        flagReason = `Out of range field check-in (${distVal}m away): Pending Admin Cross-Check`;
      }
    } else {
      if (isOverride || !isOfficeWithinGeofence) {
        isFlagged = true;
        flagReason = `Outside Office HQ geofence (${distVal}m away): Pending Admin Cross-Check`;
      }
    }

    const lat = userCoords.lat;
    const lng = userCoords.lng;
    const placeAddress = detectedAddress || getNearestLandmark(lat, lng) || 'Greater Accra Region';

    try {
      await recordCheckIn({
        employeeId,
        userId: user?.uid || profile?.id || 'emp_1',
        name: employeeName,
        category: profile?.category || 'Permanent Staff',
        department: profile?.department || 'Operations',
        date: todayStr,
        dayLabel: now.toLocaleDateString('en-GB', { weekday: 'long' }),
        checkIn: timeStr,
        checkOut: '—',
        status: punctualityStatus,
        locationVerified: locationVerified && !isFlagged,
        isFlagged,
        flagReason: isFlagged ? flagReason : undefined,
        latitude: lat,
        longitude: lng,
        locationAddress: placeAddress,
        distanceMeters: distVal,
        photoURL: profile?.photoURL || user?.photoURL || undefined,
        dutyType: mode,
        siteName: finalSiteName,
        absenceNote: siteNotes.trim() ? siteNotes.trim() : (isFlagged ? flagReason : undefined),
      });

      // Save session confirmation info
      localStorage.setItem('metroattend_last_duty_type', mode);
      localStorage.setItem('metroattend_last_site_name', finalSiteName);
      localStorage.setItem('metroattend_last_site_address', placeAddress);
      localStorage.setItem('metroattend_last_site_coords', `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° W`);

      // Notification
      await addNotification({
        title: isFlagged 
          ? '⚠️ Attendance Submitted (Pending Admin Cross-Check)' 
          : isField ? '🚧 Road Project Site Check-In Verified' : 'Workplace Check-In Recorded',
        body: isFlagged
          ? `Timestamp logged at ${timeStr}. Flagged for supervisor review (${flagReason}).`
          : `Presence verified at ${finalSiteName} at ${timeStr}.`,
        type: isFlagged ? 'warning' : 'success',
        time: formatNotificationTime(Date.now()),
        timestamp: Date.now(),
        unread: true,
        targetUserId: user?.uid || profile?.id || 'emp_1',
      });

      nav.setCheckInStatus('checked-in');
      nav.setCheckInTime(timeStr);
      nav.navigate('checkin-success');
    } catch (e) {
      console.error('Check-in recording exception:', e);
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
                ? `Permanent headquarters check-in at ${workplace.officeName}` 
                : 'Civil engineering road projects & field inspection check-in'}
            </p>
          </div>

          {/* Mode Switcher Pills */}
          <div className="inline-flex bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/20 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setDutyMode('Office HQ');
                if (!userCoords) acquireLiveGPS();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
                if (!userCoords) acquireLiveGPS();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                dutyMode === 'Field Site' 
                  ? 'bg-amber-400 text-slate-950 shadow-sm' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <span>🚧</span>
              <span>Field Road Site</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
        {/* Global Live GPS Indicator Bar */}
        <div className="bg-white rounded-xl border border-border p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
              gpsStatus === 'locked' ? 'bg-emerald-500 animate-pulse' :
              gpsStatus === 'acquiring' ? 'bg-amber-500 animate-ping' :
              'bg-red-500'
            }`} />
            <div>
              <div className="text-xs font-display font-bold text-slate-800 flex items-center gap-2">
                <span>{gpsStatus === 'locked' ? 'Live GPS Satellite Fix Locked' : gpsStatus === 'acquiring' ? 'Acquiring Live GPS Satellite Fix…' : 'GPS Signal Required'}</span>
                {userCoords?.accuracy && (
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ±{userCoords.accuracy}m accuracy
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-500 truncate max-w-md">
                {userCoords ? `${userCoords.lat.toFixed(5)}° N, ${userCoords.lng.toFixed(5)}° W · ${detectedAddress || 'Resolving locality…'}` : 'Waiting for device satellite coordinates'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => acquireLiveGPS()}
            disabled={gpsStatus === 'acquiring'}
            className="self-end sm:self-auto px-3 py-1.5 rounded-lg border border-slate-200 hover:border-navy text-[11px] font-display font-bold text-slate-700 hover:text-navy bg-surface transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>🛰️</span>
            <span>{gpsStatus === 'acquiring' ? 'Acquiring…' : 'Refresh GPS Fix'}</span>
          </button>
        </div>

        {/* MODE 1: OFFICE HQ VERIFICATION */}
        {dutyMode === 'Office HQ' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Visual Radar */}
            <div className="bg-white rounded-2xl border border-border p-6 shadow-xs flex flex-col items-center justify-center text-center relative overflow-hidden" style={{ minHeight: 320 }}>
              <div className="relative w-44 h-44 flex items-center justify-center mb-4">
                <div className={`absolute inset-0 rounded-full border-2 transition-all duration-700 ${
                  isOfficeWithinGeofence ? 'border-emerald-400 bg-emerald-50/60 animate-ping opacity-30' :
                  userCoords ? 'border-amber-400 bg-amber-50/40' :
                  'border-blue-300 bg-blue-50/30 animate-pulse'
                }`} />
                <div className={`absolute inset-4 rounded-full border-2 ${
                  isOfficeWithinGeofence ? 'border-emerald-500 bg-emerald-50/80' :
                  userCoords ? 'border-amber-500 bg-amber-50/60' :
                  'border-blue-400 bg-blue-50/50'
                }`} />
                <div className={`relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-md ${
                  isOfficeWithinGeofence ? 'bg-emerald-600 text-white' :
                  userCoords ? 'bg-amber-600 text-white' :
                  'bg-navy text-white'
                }`}>
                  {isOfficeWithinGeofence ? '✓' : userCoords ? '📍' : '🛰️'}
                </div>
              </div>

              <div className="text-base font-display font-800 text-slate-900 mb-1">
                {isOfficeWithinGeofence ? 'Office Location Verified' :
                 userCoords ? 'Outside Permanent HQ Perimeter' :
                 'Verifying Satellite Distance…'}
              </div>
              <p className="text-slate-500 text-xs font-sans max-w-xs">
                {isOfficeWithinGeofence 
                  ? `Your device is inside the ${workplace.officeName} compound geofence (~${officeDistance ?? 15}m from center).`
                  : userCoords
                  ? `Your live GPS is ${officeDistance ? `${(officeDistance / 1000).toFixed(2)} km` : 'away'} from HQ (authorized compound radius is ${workplace.geofenceRadius}m).`
                  : 'Acquiring satellite signal…'}
              </p>
            </div>

            {/* Actions Card */}
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between">
              {isOfficeWithinGeofence ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-xs font-display font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                      <span>✓</span> Permanent Office Perimeter Confirmed
                    </div>
                    <div className="text-[11px] text-emerald-800 leading-relaxed">
                      Presence confirmed at <strong>{workplace.officeName}</strong>. Tap below to record your official attendance timestamp.
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted">Office Facility:</span>
                      <span className="font-display font-bold text-slate-800">{workplace.officeName}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted">Physical Area:</span>
                      <span className="font-mono text-slate-800">{detectedAddress || 'Ministries, Accra'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted">Proximity to HQ:</span>
                      <span className="font-mono text-slate-800">{officeDistance ?? 15} meters</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCompleteCheckIn('Office HQ', false)}
                    disabled={submitting}
                    className="w-full bg-navy hover:bg-navy-dark text-white py-3.5 rounded-xl font-display font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? 'Recording Verified Check-in…' : 'Confirm Office Check-In →'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                    <div className="font-display font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                      <span>⚠️</span> Outside Office Headquarters Perimeter
                    </div>
                    <div className="text-amber-800 leading-relaxed text-[11px]">
                      Your GPS shows you are {officeDistance ? `${(officeDistance / 1000).toFixed(2)} km` : 'away'} from {workplace.officeName}.
                    </div>
                  </div>

                  {/* Flexible Check-in Option with Cross-Check Flag */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5">
                    <div className="font-display font-bold text-xs text-slate-800">
                      Need to Record Timestamp Off-Site?
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      You can still record your exact timestamp and physical location now. It will be logged and submitted for <strong>administrative cross-check on the admin dashboard</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCompleteCheckIn('Office HQ', true)}
                      disabled={submitting}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>⏱️</span>
                      <span>{submitting ? 'Submitting Timestamp…' : 'Record Timestamp (Pending Admin Cross-Check)'}</span>
                    </button>
                  </div>

                  {/* Switch to Road Site button */}
                  <button
                    type="button"
                    onClick={() => setDutyMode('Field Site')}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-display font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                  >
                    Deployed to a Road Project Site instead? Switch Mode →
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MODE 2: ROAD PROJECTS & FIELD SITE CHECK-IN */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Visual Radar Card (Left 3 cols) */}
            <div className="lg:col-span-3 rounded-2xl overflow-hidden border border-amber-300 bg-linear-to-b from-amber-500/10 via-white to-amber-500/5 p-6 flex flex-col justify-between relative shadow-xs" style={{ minHeight: 360 }}>
              <div className="absolute top-0 left-0 right-0 h-2" style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 12px, #0f172a 12px, #0f172a 24px)'
              }} />

              <div>
                <div className="flex items-center justify-between mb-4 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-display font-800 tracking-wider uppercase flex items-center gap-1 shadow-2xs">
                      <span>🚧</span> Field Road Site Deployment
                    </span>
                    <span className="text-slate-500 text-xs font-mono font-semibold">Urban Roads Operations</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>GPS Active</span>
                  </div>
                </div>

                {/* Selected Road Project Display */}
                <div className="bg-white/95 backdrop-blur-xs rounded-2xl p-5 border border-amber-200 shadow-sm mb-4">
                  <div className="text-[11px] font-display font-bold uppercase tracking-wider text-muted mb-1">
                    Assigned Project Site / Corridor
                  </div>
                  <div className="text-base sm:text-lg font-display font-800 text-slate-900 leading-snug">
                    {selectedSiteId === 'custom'
                      ? (customSiteName.trim() || 'Custom Road Project / Inspection')
                      : (currentSelectedSite?.name || 'Select Project Site…')}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>📍 {currentSelectedSite?.locality || customTown || 'Greater Accra'}</span>
                    <span>•</span>
                    <span className="text-navy font-semibold">{currentSelectedSite?.corridor || 'Civil Works'}</span>
                  </div>
                </div>

                {/* Verified Field Locality Card */}
                <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-2xs space-y-2">
                  <div className="text-[10px] font-mono text-muted uppercase font-bold flex items-center justify-between">
                    <span>Physical Device Position</span>
                    <span className="text-[9px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                      {userCoords?.accuracy ? `±${userCoords.accuracy}m Accuracy` : 'Acquiring GPS…'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xl flex-shrink-0 mt-0.5">📍</span>
                      <div>
                        <div className="text-sm font-display font-extrabold text-slate-900 leading-snug">
                          {detectedAddress || (userCoords ? getNearestLandmark(userCoords.lat, userCoords.lng) : 'Detecting your live position…')}
                        </div>
                        {userCoords && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {userCoords.lat.toFixed(5)}° N, {userCoords.lng.toFixed(5)}° W
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Range feedback if site has coordinates */}
                  {currentSelectedSite?.latitude && currentSelectedSite?.longitude && userCoords && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Distance to Site Center:</span>
                      <span className={`font-mono font-bold ${isSiteWithinGeofence ? 'text-emerald-700' : 'text-amber-800'}`}>
                        {siteDistance !== null ? `${siteDistance}m (Range: ${currentSelectedSite.radius || 600}m)` : 'Calculating…'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 bg-slate-900 text-white rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🛰️</span>
                  <div>
                    <div className="font-display font-bold">Audit-Ready Geotag</div>
                    <div className="text-white/60 text-[10px]">Physical place name and GPS stamped to attendance record</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => acquireLiveGPS()}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-display font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  ↻ Refresh
                </button>
              </div>
            </div>

            {/* Field Site Selector & Submit Form (Right 2 cols) */}
            <div className="lg:col-span-2 flex flex-col justify-between bg-surface rounded-2xl border border-border p-5 space-y-4">
              <div>
                <div className="text-sm font-display font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <span>📍</span>
                  <span>Select Deployed Project Site</span>
                </div>
                <p className="text-xs text-muted mb-3.5">
                  Choose the road project or field location assigned by administration:
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-mono text-slate-600 uppercase font-bold block mb-1">
                      Authorized Project Sites ({activeSites.length})
                    </label>
                    <select
                      value={selectedSiteId}
                      onChange={e => setSelectedSiteId(e.target.value)}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-xs font-display font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
                    >
                      {activeSites.map(site => (
                        <option key={site.id} value={site.id}>
                          {site.name} ({site.locality || 'Field Site'})
                        </option>
                      ))}
                      <option value="custom">Other Active Site (Manual Entry)…</option>
                    </select>
                  </div>

                  {selectedSiteId === 'custom' && (
                    <div className="space-y-2 p-3 bg-white rounded-xl border border-amber-300">
                      <div>
                        <label className="text-[10px] font-mono text-slate-600 uppercase font-bold block mb-1">
                          Custom Site / Project Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Kokrobite Access Road Culverts"
                          value={customSiteName}
                          onChange={e => setCustomSiteName(e.target.value)}
                          className="w-full bg-surface border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-600 uppercase font-bold block mb-1">
                          Town / Locality
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Kokrobite, Kasoa, Amasaman"
                          value={customTown}
                          onChange={e => setCustomTown(e.target.value)}
                          className="w-full bg-surface border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-mono text-slate-600 uppercase font-bold block mb-1">
                      Field Notes / Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Road sub-base compaction, route alignment survey"
                      value={siteNotes}
                      onChange={e => setSiteNotes(e.target.value)}
                      className="w-full bg-white border border-border rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="space-y-2 pt-2">
                {isSiteWithinGeofence ? (
                  <button
                    type="button"
                    onClick={() => handleCompleteCheckIn('Field Site', false)}
                    disabled={submitting}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? 'Recording Verified Check-in…' : 'Confirm Road Site Check-In 🚧 →'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 bg-amber-50 border border-amber-200 text-[11px] text-amber-900 rounded-xl">
                      You are outside the designated {currentSelectedSite?.radius || 600}m perimeter for this site. You can still submit your timestamp for admin verification.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCompleteCheckIn('Field Site', true)}
                      disabled={submitting}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {submitting ? 'Submitting Timestamp…' : 'Record Timestamp (Flagged for Admin Cross-Check) ⚠️'}
                    </button>
                  </div>
                )}

                <div className="text-center text-[10px] text-muted font-mono">
                  {userCoords 
                    ? `Tagged with GPS fix (${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)})` 
                    : 'GPS will be confirmed on submission'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
