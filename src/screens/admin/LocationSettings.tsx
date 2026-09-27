import React, { useState, useEffect } from 'react';
import { NavProps, WorkplaceSettings, RoadProjectSite } from '../../types';
import AdminShell from '../../components/AdminShell';
import { getWorkplaceSettings, saveWorkplaceSettings, DEFAULT_WORKPLACE, calculateDistanceMeters } from '../../lib/firebase';

export default function LocationSettings({ nav }: { nav: NavProps }) {
  const [settings, setSettings] = useState<WorkplaceSettings>(DEFAULT_WORKPLACE);

  // 1. Permanent Office HQ State (LOCKED & SEPARATE from project sites)
  const [officeName, setOfficeName] = useState('Department of Urban Roads (DUR HQ)');
  const [officeLat, setOfficeLat] = useState('5.549200');
  const [officeLng, setOfficeLng] = useState('-0.197800');
  const [officeRadius, setOfficeRadius] = useState(350);
  const [officeSaved, setOfficeSaved] = useState(false);
  const [detectingHQ, setDetectingHQ] = useState(false);
  const [hqDetectStatus, setHqDetectStatus] = useState<string | null>(null);

  // 2. Road Projects & Field Sites State
  const [roadProjects, setRoadProjects] = useState<RoadProjectSite[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCorridor, setNewProjectCorridor] = useState('');
  const [newProjectLocality, setNewProjectLocality] = useState('');
  const [newProjectLat, setNewProjectLat] = useState('5.535000');
  const [newProjectLng, setNewProjectLng] = useState('-0.420000');
  const [newProjectRadius, setNewProjectRadius] = useState(800);
  const [projectMessage, setProjectMessage] = useState<string | null>(null);

  // 3. Google Maps View & Explorer State
  const [mapCenterLat, setMapCenterLat] = useState('5.549200');
  const [mapCenterLng, setMapCenterLng] = useState('-0.197800');
  const [mapLabel, setMapLabel] = useState('Department of Urban Roads (DUR HQ)');
  const [mapType, setMapType] = useState<'m' | 'k'>('m'); // 'm' = Standard, 'k' = Satellite
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    getWorkplaceSettings().then(wp => {
      setSettings(wp);
      setOfficeName(wp.officeName || 'Department of Urban Roads (DUR HQ)');
      setOfficeLat((wp.latitude || DEFAULT_WORKPLACE.latitude).toFixed(6));
      setOfficeLng((wp.longitude || DEFAULT_WORKPLACE.longitude).toFixed(6));
      setOfficeRadius(wp.geofenceRadius || 350);
      setRoadProjects(wp.roadProjects || []);

      // Center map initially on Office HQ
      setMapCenterLat((wp.latitude || DEFAULT_WORKPLACE.latitude).toFixed(6));
      setMapCenterLng((wp.longitude || DEFAULT_WORKPLACE.longitude).toFixed(6));
      setMapLabel(wp.officeName || 'Department of Urban Roads (DUR HQ)');
    });
  }, []);

  // Save Permanent Office HQ Reference
  const handleSaveOfficeHQ = async () => {
    const parsedLat = parseFloat(officeLat) || DEFAULT_WORKPLACE.latitude;
    const parsedLng = parseFloat(officeLng) || DEFAULT_WORKPLACE.longitude;
    const updated: WorkplaceSettings = {
      ...settings,
      officeName: officeName.trim() || 'Department of Urban Roads (DUR HQ)',
      latitude: parsedLat,
      longitude: parsedLng,
      geofenceRadius: officeRadius,
      roadProjects,
    };
    await saveWorkplaceSettings(updated);
    setSettings(updated);
    setOfficeSaved(true);
    setProjectMessage('✓ Permanent Office Headquarters reference saved successfully.');
    setTimeout(() => {
      setOfficeSaved(false);
      setProjectMessage(null);
    }, 4000);
  };

  // Detect current position for Office HQ
  const handleDetectOfficeHQ = () => {
    if (!navigator.geolocation) {
      setHqDetectStatus('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingHQ(true);
    setHqDetectStatus('Acquiring high-accuracy GPS fix for HQ…');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);
        setOfficeLat(lat.toFixed(6));
        setOfficeLng(lng.toFixed(6));
        setMapCenterLat(lat.toFixed(6));
        setMapCenterLng(lng.toFixed(6));
        setMapLabel(`${officeName} (GPS Acquired)`);
        setDetectingHQ(false);
        setHqDetectStatus(`✓ Device GPS locked (${lat.toFixed(6)}, ${lng.toFixed(6)}) • Accuracy: ±${acc}m`);
        setTimeout(() => setHqDetectStatus(null), 5000);
      },
      (err) => {
        setDetectingHQ(false);
        setHqDetectStatus(`GPS lock failed: ${err.message}. Please check browser permissions.`);
        setTimeout(() => setHqDetectStatus(null), 6000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Search town/location in Ghana
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
    } catch {
      setSearchError('Could not reach location service. Please check your internet connection.');
    } finally {
      setSearching(false);
    }
  };

  // Select Search Result
  const handleSelectSearchResult = (result: { display_name: string; lat: string; lon: string }) => {
    const newLat = parseFloat(result.lat).toFixed(6);
    const newLng = parseFloat(result.lon).toFixed(6);
    const townName = result.display_name.split(',')[0].trim();

    // Center Google Map on this result
    setMapCenterLat(newLat);
    setMapCenterLng(newLng);
    setMapLabel(townName);

    // Prepopulate "Add Project Site" form
    setNewProjectLocality(townName);
    setNewProjectName(`${townName} Road Works Corridor`);
    setNewProjectCorridor(`${townName} Arterial Section`);
    setNewProjectLat(newLat);
    setNewProjectLng(newLng);

    setSearchResults([]);
    setSearchQuery('');
    setProjectMessage(`✓ Google Maps centered on ${townName} (${newLat}, ${newLng}). Site details prepopulated below.`);
    setTimeout(() => setProjectMessage(null), 5000);
  };

  // Quick Pin button handler
  const handleQuickPin = (town: { name: string; lat: number; lng: number; defaultCorridor: string }) => {
    const latStr = town.lat.toFixed(6);
    const lngStr = town.lng.toFixed(6);

    setMapCenterLat(latStr);
    setMapCenterLng(lngStr);
    setMapLabel(`${town.name} Project Sector`);

    // Prepopulate new project site form without touching Office HQ
    setNewProjectLocality(town.name);
    setNewProjectName(`${town.name} Road Construction & Drainage`);
    setNewProjectCorridor(town.defaultCorridor);
    setNewProjectLat(latStr);
    setNewProjectLng(lngStr);
    setNewProjectRadius(800);

    setProjectMessage(`✓ Pinned ${town.name} on Google Maps (${latStr}, ${lngStr}). You can now activate this site below.`);
    setTimeout(() => setProjectMessage(null), 4000);
  };

  // Add & Pin New Road Project Site to live system
  const handleAddProjectSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      alert('Please enter a project site name.');
      return;
    }

    const latNum = parseFloat(newProjectLat) || parseFloat(mapCenterLat);
    const lngNum = parseFloat(newProjectLng) || parseFloat(mapCenterLng);

    const newSite: RoadProjectSite = {
      id: `proj_${Date.now()}`,
      name: newProjectName.trim(),
      corridor: newProjectCorridor.trim() || `${newProjectLocality.trim() || 'Active'} Road Corridor`,
      locality: newProjectLocality.trim() || 'Greater Accra Region',
      latitude: latNum,
      longitude: lngNum,
      radius: newProjectRadius || 600,
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

    // Reset form
    setNewProjectName('');
    setNewProjectCorridor('');
    setNewProjectLocality('');
    setProjectMessage(`✓ Project site "${newSite.name}" pinned and activated! Field engineers can now select and verify check-in at this location.`);
    setTimeout(() => setProjectMessage(null), 5000);
  };

  // Delete project site
  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this project site location?')) return;
    const updatedProjects = roadProjects.filter(p => p.id !== id);
    const updated: WorkplaceSettings = {
      ...settings,
      roadProjects: updatedProjects,
    };
    await saveWorkplaceSettings(updated);
    setSettings(updated);
    setRoadProjects(updatedProjects);
  };

  // Toggle project site status
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

  // Focus map on a project site
  const handleFocusProjectOnMap = (project: RoadProjectSite) => {
    if (project.latitude && project.longitude) {
      setMapCenterLat(project.latitude.toFixed(6));
      setMapCenterLng(project.longitude.toFixed(6));
      setMapLabel(project.name);
      setProjectMessage(`✓ Map focused on ${project.name} (${project.locality})`);
      setTimeout(() => setProjectMessage(null), 3000);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const ghanaTowns = [
    { name: 'Dansoman', lat: 5.552000, lng: -0.258000, defaultCorridor: 'Dansoman Beach Road Drainage' },
    { name: 'Kasoa', lat: 5.535000, lng: -0.420000, defaultCorridor: 'Kasoa Interchange & Slipway Section' },
    { name: 'Amasaman', lat: 5.725000, lng: -0.320000, defaultCorridor: 'Amasaman Highway Dualization' },
    { name: 'Pokuase', lat: 5.706700, lng: -0.298200, defaultCorridor: 'Pokuase - Ofankor Dualization Arterial' },
    { name: 'Spintex', lat: 5.632000, lng: -0.108000, defaultCorridor: 'Spintex Road Junction Improvement' },
    { name: 'Tema', lat: 5.658000, lng: -0.052000, defaultCorridor: 'Accra-Tema Motorway Expansion' },
    { name: 'Lapaz', lat: 5.598000, lng: -0.237000, defaultCorridor: 'N1 Highway Arterial Drainage' },
  ];

  return (
    <AdminShell nav={nav}>
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-800 text-slate-900">Workplace Georeferencing & Site Locations</h1>
          <p className="text-muted text-sm mt-0.5">
            Permanent headquarters geofence & dynamic road project sites for field engineers
          </p>
        </div>
      </div>

      {projectMessage && (
        <div className="mb-5 px-4 py-3 rounded-xl text-xs font-display font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs flex items-center justify-between">
          <span>{projectMessage}</span>
          <button onClick={() => setProjectMessage(null)} className="text-emerald-700 font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}

      {/* Grid: Map Explorer + Add Site (Top) */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 mb-6">
        {/* Interactive Google Map visualizer (3 cols) */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col justify-between">
          {/* Map Header */}
          <div className="p-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🗺️</span>
              <div>
                <div className="text-xs font-display font-extrabold flex items-center gap-2">
                  <span>Google Maps Site Georeferencing</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                    Live Explorer
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate max-w-sm">
                  Pinning: {mapLabel} ({mapCenterLat}° N, {mapCenterLng}° W)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
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

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapCenterLat},${mapCenterLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-display font-bold text-[10px] rounded-lg transition-colors border border-white/20 flex items-center gap-1"
                title="Open coordinates in external Google Maps"
              >
                <span>↗</span>
                <span>Open Google Maps</span>
              </a>
            </div>
          </div>

          {/* Search bar & Quick town pins */}
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
              {ghanaTowns.map(town => (
                <button
                  type="button"
                  key={town.name}
                  onClick={() => handleQuickPin(town)}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-navy text-[11px] font-display font-semibold text-slate-700 hover:text-navy transition-all shadow-2xs cursor-pointer"
                >
                  📍 {town.name}
                </button>
              ))}
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-lg space-y-1 mt-1 max-h-48 overflow-y-auto">
                <div className="text-[10px] font-mono uppercase text-muted font-bold px-2 py-1">Tap a match to center map & pin</div>
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
          <div className="relative w-full bg-slate-100" style={{ height: 400 }}>
            <iframe
              title="Google Maps Site Perimeter"
              src={`https://maps.google.com/maps?q=${mapCenterLat},${mapCenterLng}&t=${mapType}&z=15&output=embed`}
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen
            />
            {/* Live Center Tag */}
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-md border border-slate-200 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-[11px] font-display font-bold text-slate-800">
                <span>{mapLabel}</span>
                <span className="text-slate-400 font-normal"> · </span>
                <span className="font-mono text-navy">{mapCenterLat}, {mapCenterLng}</span>
              </div>
            </div>
          </div>

          {/* Quick Footer Controls */}
          <div className="p-3 bg-slate-50 border-t border-border flex items-center justify-between text-xs text-slate-500">
            <div>
              Map Point: <strong className="font-mono text-slate-800">{mapCenterLat}° N, {mapCenterLng}° W</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setMapCenterLat(officeLat);
                setMapCenterLng(officeLng);
                setMapLabel(officeName);
              }}
              className="text-navy font-display font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>🏢</span>
              <span>Center on Office HQ</span>
            </button>
          </div>
        </div>

        {/* Pin & Add Project Site Form (2 cols) */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚧</span>
                <div>
                  <h2 className="text-sm font-display font-bold text-slate-900">Pin & Add Project Site</h2>
                  <p className="text-[11px] text-muted">Add active site coordinates for field check-in</p>
                </div>
              </div>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md border border-amber-300">
                Site Geofence
              </span>
            </div>

            <form onSubmit={handleAddProjectSite} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-600 uppercase font-bold mb-1">
                  Project / Site Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasoa Interchange Road Works"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border text-xs font-display font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-slate-600 uppercase font-bold mb-1">
                    Town / Locality
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kasoa"
                    value={newProjectLocality}
                    onChange={e => setNewProjectLocality(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-xs font-display text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-600 uppercase font-bold mb-1">
                    Road Corridor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Accra-Winneba Trunk"
                    value={newProjectCorridor}
                    onChange={e => setNewProjectCorridor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-xs font-display text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-slate-600 uppercase font-bold mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={newProjectLat}
                    onChange={e => setNewProjectLat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-600 uppercase font-bold mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={newProjectLng}
                    onChange={e => setNewProjectLng(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono text-slate-600 uppercase font-bold">
                    Site Geofence Radius
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {newProjectRadius} meters
                  </span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={2500}
                  step={50}
                  value={newProjectRadius}
                  onChange={e => setNewProjectRadius(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-muted mt-0.5">
                  <span>200m (Bridge/Junction)</span>
                  <span>2500m (Extended Highway)</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-extrabold text-xs transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer mt-2"
              >
                <span>📍</span>
                <span>Pin & Activate Project Site Corridor</span>
              </button>
            </form>
          </div>

          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed">
            💡 <strong>Field Deployment Tip:</strong> Pinned project sites are immediately displayed in the mobile check-in app. Engineers checking in at this site will authenticate against this {newProjectRadius}m perimeter.
          </div>
        </div>
      </div>

      {/* Grid: Permanent Office HQ Card & Authorized Project Sites List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Permanent Office HQ Card (1 col) */}
        <div className="bg-white rounded-2xl border-2 border-navy/20 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏢</span>
                <div>
                  <h3 className="text-sm font-display font-bold text-navy">Permanent Office Headquarters</h3>
                  <div className="text-[10px] font-mono text-slate-500">Fixed institutional baseline</div>
                </div>
              </div>
              <span className="bg-navy text-white text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full">
                🔒 Fixed HQ
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed font-sans">
              Permanent reference for <strong>interns, national service personnel (NSP), quantity surveyors, accounting, and administrative staff</strong>. This location remains permanently fixed and is never altered when exploring or adding road project sites.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-600 uppercase font-bold mb-1">
                  Headquarters Name
                </label>
                <input
                  type="text"
                  value={officeName}
                  onChange={e => setOfficeName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border text-xs font-display font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-slate-600 uppercase font-bold mb-1">
                    HQ Latitude
                  </label>
                  <input
                    type="text"
                    value={officeLat}
                    onChange={e => setOfficeLat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-600 uppercase font-bold mb-1">
                    HQ Longitude
                  </label>
                  <input
                    type="text"
                    value={officeLng}
                    onChange={e => setOfficeLng(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono text-slate-600 uppercase font-bold">
                    HQ Compound Geofence
                  </label>
                  <span className="text-xs font-mono font-bold text-navy">
                    {officeRadius} meters
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={1000}
                  step={25}
                  value={officeRadius}
                  onChange={e => setOfficeRadius(Number(e.target.value))}
                  className="w-full accent-navy"
                />
              </div>
            </div>

            {hqDetectStatus && (
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 text-navy text-[11px] font-mono rounded-lg">
                {hqDetectStatus}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 mt-4">
            <button
              type="button"
              onClick={handleSaveOfficeHQ}
              className="w-full py-2.5 px-4 bg-navy hover:bg-navy-dark text-white font-display font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{officeSaved ? '✓ Saved!' : 'Save Permanent HQ Reference'}</span>
            </button>
            <button
              type="button"
              onClick={handleDetectOfficeHQ}
              disabled={detectingHQ}
              className="w-full py-2 px-3 bg-surface border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-display font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🎯</span>
              <span>{detectingHQ ? 'Detecting…' : 'Set to My Current Device Location'}</span>
            </button>
          </div>
        </div>

        {/* Authorized Road Project Sites List (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-display font-bold text-slate-900">
                  Authorized Road Project Sites & Corridors ({roadProjects.length})
                </h3>
                <p className="text-[11px] text-muted">
                  Active field engineering sites available for mobile check-in verification
                </p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {roadProjects.length === 0 ? (
                <div className="py-12 text-center text-muted font-display text-xs bg-surface rounded-xl border border-dashed border-border">
                  No project site corridors registered. Use the pin form above to add road project sites.
                </div>
              ) : (
                roadProjects.map(proj => (
                  <div
                    key={proj.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-surface hover:border-navy/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-xs text-slate-900">
                          {proj.name}
                        </span>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          proj.status === 'Active' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {proj.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>📍 {proj.locality || 'Greater Accra'}</span>
                        <span>•</span>
                        <span>{proj.corridor}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {proj.latitude && proj.longitude ? `${proj.latitude.toFixed(5)}° N, ${proj.longitude.toFixed(5)}° W` : 'Coordinates pending'} · Range: {proj.radius || 600}m
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleFocusProjectOnMap(proj)}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-navy text-[11px] font-display font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                        title="Center map on this site"
                      >
                        <span>🗺️</span>
                        <span>View Map</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(proj.id)}
                        className={`px-2.5 py-1.5 text-[11px] font-display font-semibold rounded-lg transition-colors cursor-pointer ${
                          proj.status === 'Active'
                            ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                            : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                        }`}
                      >
                        {proj.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(proj.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete project site"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-muted font-display flex items-center justify-between">
            <span>Staff select from these active project corridors when on field duty.</span>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
