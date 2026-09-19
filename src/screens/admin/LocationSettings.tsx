import React, { useState, useEffect } from 'react';
import { NavProps, WorkplaceSettings } from '../../types';
import AdminShell from '../../components/AdminShell';
import { getWorkplaceSettings, saveWorkplaceSettings, DEFAULT_WORKPLACE, calculateDistanceMeters } from '../../lib/firebase';

export default function LocationSettings({ nav }: { nav: NavProps }) {
  const [settings, setSettings] = useState<WorkplaceSettings>(DEFAULT_WORKPLACE);
  const [radius, setRadius] = useState(100);
  const [officeName, setOfficeName] = useState('MetroWorks Main Office');
  const [latitude, setLatitude] = useState('5.706728');
  const [longitude, setLongitude] = useState('-0.298185');
  const [saved, setSaved] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectStatus, setDetectStatus] = useState<string | null>(null);

  // Test GPS Simulator
  const [testLat, setTestLat] = useState('');
  const [testLng, setTestLng] = useState('');
  const [testResult, setTestResult] = useState<{ distance: number; allowed: boolean } | null>(null);

  useEffect(() => {
    getWorkplaceSettings().then(wp => {
      setSettings(wp);
      setRadius(wp.geofenceRadius);
      setOfficeName(wp.officeName);
      setLatitude(wp.latitude.toString());
      setLongitude(wp.longitude.toString());
    });
  }, []);

  const handleSave = async () => {
    const updated: WorkplaceSettings = {
      ...settings,
      officeName,
      latitude: parseFloat(latitude) || DEFAULT_WORKPLACE.latitude,
      longitude: parseFloat(longitude) || DEFAULT_WORKPLACE.longitude,
      geofenceRadius: radius,
    };
    await saveWorkplaceSettings(updated);
    setSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setDetectStatus('Geolocation is not supported by your browser.');
      return;
    }

    setDetecting(true);
    setDetectStatus('Acquiring high-precision GPS satellite fix...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
        setDetecting(false);
        setDetectStatus(`✓ GPS locked (${lat.toFixed(6)}, ${lng.toFixed(6)}) • Accuracy: ±${acc}m`);
        setTimeout(() => setDetectStatus(null), 5000);
      },
      (err) => {
        setDetecting(false);
        setDetectStatus(`GPS failed: ${err.message}. Please check location permissions.`);
        setTimeout(() => setDetectStatus(null), 6000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSetPreset = (name: string, lat: number, lng: number, r: number) => {
    setOfficeName(name);
    setLatitude(lat.toString());
    setLongitude(lng.toString());
    setRadius(r);
  };

  const handleTestCoordinate = () => {
    const tLat = parseFloat(testLat);
    const tLng = parseFloat(testLng);
    const centerLat = parseFloat(latitude);
    const centerLng = parseFloat(longitude);

    if (isNaN(tLat) || isNaN(tLng) || isNaN(centerLat) || isNaN(centerLng)) {
      return;
    }

    const dist = calculateDistanceMeters(tLat, tLng, centerLat, centerLng);
    setTestResult({
      distance: dist,
      allowed: dist <= radius,
    });
  };

  return (
    <AdminShell nav={nav}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-800 text-slate-900">Workplace Geofence Configuration</h1>
          <p className="text-muted text-sm mt-0.5">Manage live GPS coordinates and radius enforcement for employee check-ins</p>
        </div>
        <button
          onClick={handleDetectGPS}
          disabled={detecting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-navy/20 text-navy font-display font-bold text-xs hover:bg-navy-50 transition-colors shadow-xs"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          {detecting ? 'Acquiring GPS...' : 'Detect My Current Location'}
        </button>
      </div>

      {detectStatus && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-xs font-mono border ${
          detectStatus.startsWith('✓') 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          {detectStatus}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Map visualizer */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="relative location-map-bg" style={{ height: 400 }}>
            {/* Roads */}
            <div className="map-road-h" style={{ top: '35%', left: 0, right: 0 }} />
            <div className="map-road-h" style={{ top: '65%', left: 0, right: 0 }} />
            <div className="map-road-v" style={{ left: '28%', top: 0, bottom: 0 }} />
            <div className="map-road-v" style={{ left: '62%', top: 0, bottom: 0 }} />
            <div className="map-road-h" style={{ top: '50%', left: '28%', width: '34%' }} />

            {/* Buildings */}
            {[
              { l: '5%', t: '8%', w: 50, h: 36 },
              { l: '35%', t: '5%', w: 60, h: 28 },
              { l: '68%', t: '10%', w: 44, h: 32 },
              { l: '5%', t: '42%', w: 54, h: 30 },
              { l: '68%', t: '38%', w: 40, h: 35 },
              { l: '5%', t: '72%', w: 48, h: 26 },
              { l: '35%', t: '70%', w: 56, h: 28 },
              { l: '68%', t: '72%', w: 44, h: 24 },
            ].map((b, i) => (
              <div key={i} className="absolute rounded-sm bg-white/50 border border-white/30" style={{ left: b.l, top: b.t, width: b.w, height: b.h }} />
            ))}

            {/* Geofence circle scaled to radius */}
            <div
              className="absolute border-2 border-dashed border-navy rounded-full transition-all duration-300"
              style={{
                left: '50%',
                top: '50%',
                width: Math.min(340, Math.max(80, radius * 1.3)),
                height: Math.min(340, Math.max(80, radius * 1.3)),
                transform: 'translate(-50%, -50%)',
                background: 'rgba(27,58,107,0.08)'
              }}
            />

            {/* Office marker */}
            <div className="absolute" style={{ left: 'calc(50% - 14px)', top: 'calc(50% - 32px)' }}>
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-navy border-2 border-white shadow-lg flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                </div>
                <div className="w-1 h-3 bg-navy rounded-full" />
              </div>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-navy text-white text-[9px] font-display font-700 px-2 py-1 rounded-lg whitespace-nowrap shadow">
                {officeName}
              </div>
            </div>

            {/* Radius label */}
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-xs text-xs font-display font-700 text-navy border border-border">
              Active Radius: {radius}m
            </div>

            {/* Status badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-xs border border-border">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-display font-600 text-success">Live GPS Active</span>
            </div>

            <p className="absolute bottom-3 left-3 right-3 text-center text-[10px] font-mono text-slate-600 bg-white/90 backdrop-blur-sm rounded-lg py-1.5 shadow-sm border border-slate-200">
              Check-in allowed within <strong>{radius}m</strong> of <strong>{latitude}, {longitude}</strong>
            </p>
          </div>

          {/* Quick Coordinate Presets */}
          <div className="p-4 bg-slate-50 border-t border-border flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-display font-700 text-slate-500 uppercase tracking-wide mr-2">Presets:</span>
            <button
              type="button"
              onClick={() => handleSetPreset('MetroWorks Main Facility', 5.706728, -0.298185, 100)}
              className="px-3 py-1.5 rounded-lg bg-white border border-border text-xs font-display font-semibold text-slate-700 hover:border-navy hover:text-navy transition-all shadow-xs"
            >
              🏢 Main Office (5.7067, -0.2982)
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('Depot & Workshop Zone', 5.708512, -0.296144, 150)}
              className="px-3 py-1.5 rounded-lg bg-white border border-border text-xs font-display font-semibold text-slate-700 hover:border-navy hover:text-navy transition-all shadow-xs"
            >
              🚛 Workshop Depot
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('North Operations Center', 5.712390, -0.294100, 200)}
              className="px-3 py-1.5 rounded-lg bg-white border border-border text-xs font-display font-semibold text-slate-700 hover:border-navy hover:text-navy transition-all shadow-xs"
            >
              🏗️ North Station
            </button>
          </div>
        </div>

        {/* Config panel */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-display font-700 text-slate-500 uppercase tracking-wide">Workplace Boundaries</div>
              <span className="bg-success-bg text-success text-[10px] font-display font-700 px-2.5 py-1 rounded-full">ACTIVE</span>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[10px] font-mono text-muted uppercase mb-1.5">Facility Name</label>
                <input
                  type="text"
                  value={officeName}
                  onChange={e => setOfficeName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm font-display font-600 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-muted uppercase mb-1.5">Center Latitude</label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={e => setLatitude(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-muted uppercase mb-1.5">Center Longitude</label>
                  <input
                    type="text"
                    value={longitude}
                    onChange={e => setLongitude(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono text-muted uppercase">Geofence Radius (meters)</label>
                  <span className="text-xs font-mono font-bold text-navy">{radius}m</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={500}
                  step={10}
                  value={radius}
                  onChange={e => setRadius(Number(e.target.value))}
                  className="w-full accent-navy"
                />
                <div className="flex justify-between text-[9px] font-mono text-muted mt-1">
                  <span>30m (Strict perimeter)</span>
                  <span>500m (Campus-wide)</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              className={`w-full py-3.5 rounded-xl font-display font-700 text-sm transition-all shadow-sm ${
                saved ? 'bg-success text-white' : 'bg-navy text-white hover:bg-navy-dark active:scale-[0.98]'
              }`}
            >
              {saved ? '✓ Geofence Saved & Synchronized' : 'Save Geofence Settings'}
            </button>
          </div>

          {/* Test Distance / Coordinate Validator */}
          <div className="bg-white rounded-2xl border border-border p-5 shadow-xs">
            <div className="text-xs font-display font-700 text-slate-800 mb-1">Geofence Range Validator</div>
            <p className="text-muted text-[11px] mb-3">Test an employee's coordinates against current perimeter.</p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <input
                type="text"
                placeholder="Test Latitude"
                value={testLat}
                onChange={e => setTestLat(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border text-xs font-mono"
              />
              <input
                type="text"
                placeholder="Test Longitude"
                value={testLng}
                onChange={e => setTestLng(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border text-xs font-mono"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTestCoordinate}
                className="flex-1 py-2 rounded-xl bg-surface border border-navy/30 text-navy font-display font-bold text-xs hover:bg-navy-50 transition-colors"
              >
                Calculate Distance
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestLat(latitude);
                  setTestLng(longitude);
                  setTestResult({ distance: 0, allowed: true });
                }}
                className="px-3 py-2 rounded-xl bg-surface border border-border text-slate-600 font-display font-bold text-xs hover:bg-slate-100 transition-colors"
              >
                At Center
              </button>
            </div>

            {testResult && (
              <div className={`mt-3 p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
                testResult.allowed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <span>Distance: <strong>{testResult.distance}m</strong></span>
                <span className="font-bold">{testResult.allowed ? '✓ Within Perimeter' : '✕ Out of Range'}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
