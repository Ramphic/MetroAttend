import React, { useState, useEffect } from 'react';
import { NavProps, WorkplaceSettings, RoadProjectSite } from '../../types';
import AdminShell from '../../components/AdminShell';
import { getWorkplaceSettings, saveWorkplaceSettings, DEFAULT_WORKPLACE, calculateDistanceMeters } from '../../lib/firebase';

export default function LocationSettings({ nav }: { nav: NavProps }) {
  const [settings, setSettings] = useState<WorkplaceSettings>(DEFAULT_WORKPLACE);
  const [radius, setRadius] = useState(350);
  const [officeName, setOfficeName] = useState('Department of Urban Roads (DUR HQ)');
  const [latitude, setLatitude] = useState('5.549200');
  const [longitude, setLongitude] = useState('-0.197800');
  const [saved, setSaved] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectStatus, setDetectStatus] = useState<string | null>(null);

  // Road Projects & Field Sites State
  const [roadProjects, setRoadProjects] = useState<RoadProjectSite[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCorridor, setNewProjectCorridor] = useState('');
  const [newProjectLocality, setNewProjectLocality] = useState('');
  const [projectMessage, setProjectMessage] = useState<string | null>(null);

  // Google Maps View & Search State
  const [mapType, setMapType] = useState<'m' | 'k'>('m'); // 'm' = Standard, 'k' = Satellite
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearchLocation = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', Ghana')}&limit=5`, {
        headers: { 'Accept-Language': 'en' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setSearchResults(data);
        } else {
          setSearchResults([]);
          setSearchError(`No coordinates found for "${q}". Try a broader name like Dansoman, Kasoa, or Amasaman.`);
        }
      }
    } catch (err) {
      setSearchError('Could not reach location service. Please check your internet connection.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (result: { display_name: string; lat: string; lon: string }) => {
    const newLat = parseFloat(result.lat).toFixed(6);
    const newLng = parseFloat(result.lon).toFixed(6);
    setLatitude(newLat);
    setLongitude(newLng);
    setSearchResults([]);
    setSearchQuery('');
    setProjectMessage(`✓ Google Maps centered on: ${result.display_name.split(',')[0]} (${newLat}, ${newLng})`);
    setTimeout(() => setProjectMessage(null), 5000);
  };

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
      setRoadProjects(wp.roadProjects || []);
    });
  }, []);

  const handleSave = async () => {
    const updated: WorkplaceSettings = {
      ...settings,
      officeName,
      latitude: parseFloat(latitude) || DEFAULT_WORKPLACE.latitude,
      longitude: parseFloat(longitude) || DEFAULT_WORKPLACE.longitude,
      geofenceRadius: radius,
      roadProjects,
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

  // Add Road Project to Live Registry
  const handleAddRoadProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const newSite: RoadProjectSite = {
      id: `proj_${Date.now()}`,
      name: newProjectName.trim(),
      corridor: newProjectCorridor.trim() || 'Active Road Corridor',
      locality: newProjectLocality.trim() || 'Greater Accra Region',
      status: 'Active',
      createdAt: new Date().toISOString(),
    };

    const updatedProjects = [newSite, ...roadProjects];
    const updated: WorkplaceSettings = {
      ...settings,
      roadProjects: updatedProjects,
    };

    await saveWorkplaceSettings(updated);
    setSettings(updated);
    setRoadProjects(updatedProjects);
    setNewProjectName('');
    setNewProjectCorridor('');
    setNewProjectLocality('');
    setShowAddModal(false);
    setProjectMessage('✓ Road Project Corridor successfully added and live on field check-in!');
    setTimeout(() => setProjectMessage(null), 4000);
  };

  const handleDeleteProject = async (id: string) => {
    const updatedProjects = roadProjects.filter(p => p.id !== id);
    const updated: WorkplaceSettings = {
      ...settings,
      roadProjects: updatedProjects,
    };
    await saveWorkplaceSettings(updated);
    setSettings(updated);
    setRoadProjects(updatedProjects);
  };

  const handleToggleStatus = async (id: string) => {
    const updatedProjects = roadProjects.map(p => {
      if (p.id === id) {
        return { ...p, status: (p.status === 'Active' ? 'Completed' : 'Active') as 'Active' | 'Completed' };
      }
      return p;
    });
    const updated: WorkplaceSettings = {
      ...settings,
      roadProjects: updatedProjects,
    };
    await saveWorkplaceSettings(updated);
    setSettings(updated);
    setRoadProjects(updatedProjects);
  };

  return (
    <AdminShell nav={nav}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-800 text-slate-900">Workplace & Site Locations</h1>
          <p className="text-muted text-sm mt-0.5">Manage live GPS coordinates, HQ geofence radius, and active road project corridors</p>
        </div>
        <button
          onClick={handleDetectGPS}
          disabled={detecting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-navy/20 text-navy font-display font-bold text-xs hover:bg-navy-50 transition-colors shadow-xs cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          {detecting ? 'Acquiring GPS...' : 'Detect My Current Office Location'}
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

      {projectMessage && (
        <div className="mb-4 px-4 py-3 rounded-xl text-xs font-display font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300">
          {projectMessage}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Real Interactive Google Maps visualizer */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col justify-between">
          {/* Map Top Bar */}
          <div className="p-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🗺️</span>
              <div>
                <div className="text-xs font-display font-extrabold flex items-center gap-2">
                  <span>Interactive Google Maps Integration</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                    Live GPS
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {latitude}° N, {longitude}° W · Geofence: {radius}m
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              {/* Map/Satellite View Toggle */}
              <div className="bg-white/10 p-0.5 rounded-lg flex border border-white/20 text-[10px] font-display font-bold">
                <button
                  type="button"
                  onClick={() => setMapType('m')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${mapType === 'm' ? 'bg-white text-slate-950 shadow-xs' : 'text-white/70 hover:text-white'}`}
                >
                  Map
                </button>
                <button
                  type="button"
                  onClick={() => setMapType('k')}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${mapType === 'k' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-white/70 hover:text-white'}`}
                >
                  Satellite
                </button>
              </div>

              {/* Direct Open in Google Maps */}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-display font-bold text-[10px] rounded-lg transition-colors border border-white/20 flex items-center gap-1"
                title="Open coordinates in external Google Maps"
              >
                <span>↗</span>
                <span>Open in Google Maps</span>
              </a>
            </div>
          </div>

          {/* Interactive Town & Corridor Search Bar */}
          <div className="p-3 bg-slate-50 border-b border-border space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search any town, road, or area in Ghana (e.g. Dansoman, Kasoa, Amasaman)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchLocation()}
                  className="w-full bg-white border border-border rounded-xl pl-8 pr-3 py-2 text-xs font-display text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
                <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
              </div>
              <button
                type="button"
                onClick={() => handleSearchLocation()}
                disabled={searching}
                className="px-3.5 py-2 bg-navy hover:bg-navy-dark text-white text-xs font-display font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-60"
              >
                <span>{searching ? 'Locating…' : 'Locate'}</span>
              </button>
            </div>

            {/* Quick Town Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold mr-1">Quick Pin:</span>
              {[
                { name: 'Dansoman', lat: 5.552000, lng: -0.258000 },
                { name: 'Kasoa', lat: 5.535000, lng: -0.420000 },
                { name: 'Amasaman', lat: 5.725000, lng: -0.320000 },
                { name: 'Spintex', lat: 5.632000, lng: -0.108000 },
                { name: 'Pokuase', lat: 5.706700, lng: -0.298200 },
                { name: 'DUR Ministries HQ', lat: 5.549200, lng: -0.197800 },
              ].map(item => (
                <button
                  type="button"
                  key={item.name}
                  onClick={() => {
                    setLatitude(item.lat.toFixed(6));
                    setLongitude(item.lng.toFixed(6));
                    setOfficeName(item.name.includes('HQ') ? 'Department of Urban Roads (DUR HQ)' : `${item.name} Project Office`);
                    setProjectMessage(`✓ Google Maps centered on ${item.name}`);
                    setTimeout(() => setProjectMessage(null), 3000);
                  }}
                  className="px-2 py-0.8 rounded-md bg-white border border-slate-200 hover:border-navy text-[11px] font-display font-semibold text-slate-700 hover:text-navy transition-all shadow-2xs cursor-pointer"
                >
                  📍 {item.name}
                </button>
              ))}
            </div>

            {/* Search results dropdown/list */}
            {searchResults.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-lg space-y-1 mt-1 max-h-48 overflow-y-auto">
                <div className="text-[10px] font-mono uppercase text-muted font-bold px-2 py-1">Search Results: Tap to Center Google Map</div>
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left p-2 rounded-lg hover:bg-navy-50 text-xs font-display flex items-center justify-between gap-2 border-b border-slate-50 last:border-0 cursor-pointer"
                  >
                    <span className="text-slate-800 font-semibold truncate">{res.display_name}</span>
                    <span className="text-[10px] font-mono text-muted flex-shrink-0">
                      {parseFloat(res.lat).toFixed(4)}, {parseFloat(res.lon).toFixed(4)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchError && (
              <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 font-display">
                {searchError}
              </div>
            )}
          </div>

          {/* Embedded Google Map */}
          <div className="relative w-full bg-slate-100" style={{ height: 420 }}>
            <iframe
              title="Google Maps Workplace Perimeter"
              src={`https://maps.google.com/maps?q=${latitude},${longitude}&t=${mapType}&z=16&output=embed`}
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen
            />

            {/* Live Map Watermark / Geofence Overlay */}
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-md border border-slate-200 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-[11px] font-display font-bold text-slate-800">
                <span>{officeName}</span>
                <span className="text-slate-400 font-normal"> · </span>
                <span className="font-mono text-navy">{radius}m perimeter</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div className="p-3.5 bg-slate-50 border-t border-border flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-500 font-sans">
              Current Center: <strong className="font-mono text-slate-800">{latitude}, {longitude}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDetectGPS}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-display font-bold text-emerald-900 hover:bg-emerald-100 transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <span>🎯</span>
                <span>My Device GPS</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewProjectLocality(officeName.split(' ')[0] || 'Greater Accra');
                  setNewProjectName(`${officeName.split(' ')[0] || 'Municipal'} Road Project`);
                  setShowAddModal(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-display font-extrabold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>➕</span>
                <span>Add Site Corridor Here</span>
              </button>
            </div>
          </div>
        </div>

        {/* Config panel */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-border p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-display font-700 text-slate-500 uppercase tracking-wide">Workplace Boundaries</div>
              <span className="bg-success-bg text-success text-[10px] font-display font-700 px-2.5 py-1 rounded-full">ACTIVE</span>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[10px] font-mono text-muted uppercase mb-1.5 font-bold">Facility Name</label>
                <input
                  type="text"
                  value={officeName}
                  onChange={e => setOfficeName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm font-display font-600 text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-muted uppercase mb-1.5 font-bold">Center Latitude</label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={e => setLatitude(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-muted uppercase mb-1.5 font-bold">Center Longitude</label>
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
                  <label className="text-[10px] font-mono text-muted uppercase font-bold">Geofence Radius (meters)</label>
                  <span className="text-xs font-mono font-bold text-navy">{radius}m</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={500}
                  step={10}
                  value={radius}
                  onChange={e => setRadius(Number(e.target.value))}
                  className="w-full accent-navy cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-muted mt-1">
                  <span>30m (Strict perimeter)</span>
                  <span>500m (Compound-wide)</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              className={`w-full py-3.5 rounded-xl font-display font-700 text-sm transition-all shadow-sm cursor-pointer ${
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
                className="flex-1 py-2 rounded-xl bg-surface border border-navy/30 text-navy font-display font-bold text-xs hover:bg-navy-50 transition-colors cursor-pointer"
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
                className="px-3 py-2 rounded-xl bg-surface border border-border text-slate-600 font-display font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
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

      {/* ROAD PROJECTS & ACTIVE SITES REGISTRY (Dynamic, non-hardcoded!) */}
      <div className="mt-8 bg-white rounded-2xl border border-border p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🚧</span>
              <h2 className="text-base font-display font-800 text-slate-900">
                Active Road Project Corridors & Site Locations
              </h2>
            </div>
            <p className="text-muted text-xs mt-0.5">
              Configured road projects available for field engineers during mobile site check-in ({roadProjects.length} active sites)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-navy hover:bg-navy-dark text-white rounded-xl text-xs font-display font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>+</span>
            <span>Add Road Project Corridor</span>
          </button>
        </div>

        <div className="rounded-xl border border-slate-100 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-display font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Road Project / Corridor</th>
                <th className="px-3 py-3">Corridor Category</th>
                <th className="px-3 py-3">Locality / Sector</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {roadProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted font-mono text-xs">
                    No road projects configured. Click "Add Road Project Corridor" to create one.
                  </td>
                </tr>
              ) : (
                roadProjects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-display font-bold text-slate-900">
                      {proj.name}
                    </td>
                    <td className="px-3 py-3 text-slate-600 font-display text-[11px]">
                      {proj.corridor}
                    </td>
                    <td className="px-3 py-3 text-slate-600 font-mono text-[11px]">
                      {proj.locality || 'Greater Accra'}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-display font-bold ${
                        proj.status === 'Active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {proj.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(proj.id)}
                        className="text-[11px] font-display font-semibold text-navy hover:underline cursor-pointer"
                      >
                        {proj.status === 'Active' ? 'Mark Completed' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(proj.id)}
                        className="text-[11px] font-display font-semibold text-red-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Road Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚧</span>
                <h3 className="text-base font-display font-800 text-slate-900">
                  Add Active Road Project Corridor
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRoadProject} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-muted uppercase mb-1 font-bold">
                  Quick Town Presets
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { town: 'Dansoman', locality: 'Dansoman / Exhibition', name: 'Dansoman Drainage & Paving Project' },
                    { town: 'Kasoa', locality: 'Kasoa / Iron City Corridor', name: 'Kasoa Interchange Slip Road Works' },
                    { town: 'Amasaman', locality: 'Amasaman / Ga West District', name: 'Amasaman - Pokuase Arterial Dualization' },
                    { town: 'Spintex', locality: 'Spintex Road / Coastal', name: 'Spintex Corridor Improvement Project' },
                    { town: 'Pokuase', locality: 'Pokuase / ACP Junction', name: 'Pokuase ACP Arterial Drainage Works' },
                    { town: 'Tema', locality: 'Tema Industrial Enclave', name: 'Tema Community 1 Access Road Asphalt' },
                  ].map(p => (
                    <button
                      type="button"
                      key={p.town}
                      onClick={() => {
                        setNewProjectLocality(p.locality);
                        setNewProjectName(p.name);
                        setNewProjectCorridor(`${p.town} Arterial Works`);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 border border-slate-200 hover:border-amber-300 text-[11px] font-display font-semibold text-slate-800 transition-colors cursor-pointer"
                    >
                      📍 {p.town}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-muted uppercase mb-1 font-bold">
                  Road Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Accra-Nsawam Dualization & Slip Roads"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-display text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-muted uppercase mb-1 font-bold">
                  Corridor / Arterial Classification
                </label>
                <input
                  type="text"
                  placeholder="e.g. N6 Highway Arterial, Urban Drainage"
                  value={newProjectCorridor}
                  onChange={e => setNewProjectCorridor(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-display text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-muted uppercase mb-1 font-bold">
                  Operational Locality / Landmark
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pokuase - Amasaman, Accra West"
                  value={newProjectLocality}
                  onChange={e => setNewProjectLocality(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-xs font-display text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-slate-600 font-display font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-navy text-white font-display font-bold text-xs hover:bg-navy-dark transition-all cursor-pointer shadow-xs"
                >
                  Save Road Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
