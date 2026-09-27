'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useActiveJourney } from '@/hooks/useActiveJourney';
import SafeRouteMap from '@/components/map/SafeRouteMap';
import { Coordinates, NavigationRoute, RouteTier } from '@/types';
import {
  generateMultiRoutes,
} from '@/services/routingService';
import {
  getCCTVCameras,
  getSafetyZones,
  getVerifiedThreats,
  getSystemSettings,
} from '@/services/firebase/firestoreService';
import { POPULAR_LOCATIONS, CITY_CENTER } from '@/lib/mockData/initialData';
import {
  Navigation,
  MapPin,
  Shield,
  Clock,
  ArrowRight,
  Eye,
  Sun,
  AlertTriangle,
  Compass,
  CheckCircle2,
  RefreshCw,
  Search,
  Sparkles,
  Loader2,
} from 'lucide-react';

function NavigationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { coords: userGPS, loading: gpsLoading } = useGeolocation();
  const { startJourney } = useActiveJourney();

  // Locations state
  const [origin, setOrigin] = useState<Coordinates>(userGPS || CITY_CENTER);
  const [originName, setOriginName] = useState<string>('Current Location');
  const [destination, setDestination] = useState<Coordinates>({
    lat: POPULAR_LOCATIONS[0].lat,
    lng: POPULAR_LOCATIONS[0].lng,
  });
  const [destinationName, setDestinationName] = useState<string>(POPULAR_LOCATIONS[0].name);

  // Map picking mode
  const [isPickingOrigin, setIsPickingOrigin] = useState(false);
  const [isPickingDestination, setIsPickingDestination] = useState(false);

  // Routes state
  const [routes, setRoutes] = useState<NavigationRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Environmental context data
  const [cameras, setCameras] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [verifiedThreats, setVerifiedThreats] = useState<any[]>([]);
  const [engineMode, setEngineMode] = useState<'manual' | 'ai_cctv' | 'hybrid'>('hybrid');

  // Load contextual data
  useEffect(() => {
    Promise.all([
      getCCTVCameras(),
      getSafetyZones(),
      getVerifiedThreats(),
      getSystemSettings(),
    ]).then(([cams, zns, thrts, sttngs]) => {
      setCameras(cams);
      setZones(zns);
      setVerifiedThreats(thrts);
      setEngineMode(sttngs.engineMode);
    });
  }, []);

  // Update origin once GPS is resolved if not already overridden
  useEffect(() => {
    if (userGPS && originName === 'Current Location') {
      setOrigin(userGPS);
    }
  }, [userGPS, originName]);

  // Read URL params if coming from quick launcher
  useEffect(() => {
    const destParam = searchParams.get('dest');
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    if (destParam && latParam && lngParam) {
      setDestinationName(destParam);
      setDestination({ lat: parseFloat(latParam), lng: parseFloat(lngParam) });
    }
  }, [searchParams]);

  // Compute routes
  const handleCalculateRoutes = async () => {
    setIsCalculating(true);
    try {
      const generated = await generateMultiRoutes({
        origin,
        destination,
        context: {
          safetyZones: zones,
          cctvCameras: cameras,
          verifiedThreats,
        },
        engineMode,
      });

      setRoutes(generated);
      if (generated.length > 0) {
        setSelectedRouteId(generated[0].id); // First route is highest safety!
      }
    } finally {
      setIsCalculating(false);
    }
  };

  // Initial calculation once context loads
  useEffect(() => {
    if (cameras.length > 0) {
      handleCalculateRoutes();
    }
  }, [origin.lat, origin.lng, destination.lat, destination.lng, cameras.length, engineMode]);

  // Map click handler
  const handleMapClick = (clickCoords: Coordinates) => {
    if (isPickingOrigin) {
      setOrigin(clickCoords);
      setOriginName(`Custom Point (${clickCoords.lat.toFixed(4)}, ${clickCoords.lng.toFixed(4)})`);
      setIsPickingOrigin(false);
    } else if (isPickingDestination) {
      setDestination(clickCoords);
      setDestinationName(`Custom Target (${clickCoords.lat.toFixed(4)}, ${clickCoords.lng.toFixed(4)})`);
      setIsPickingDestination(false);
    }
  };

  // Start Trip
  const handleStartTrip = (route: NavigationRoute) => {
    startJourney(route, user?.uid || 'guest-traveler', originName, destinationName);
    router.push('/trip');
  };

  const selectedRoute = routes.find(r => r.id === selectedRouteId) || routes[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
              Safety-Ranked Routing
            </span>
            <span className="text-xs text-slate-400">
              Active Engine: <strong className="text-emerald-400 capitalize">{engineMode.replaceAll('_', ' ')}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">Safe Route Navigation</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCalculateRoutes}
            disabled={isCalculating}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-700 text-slate-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
            <span>Recalculate Grid</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 flex-1">
        {/* Left Column: Route Setup & Route Cards */}
        <div className="lg:col-span-5 space-y-6">
          {/* Origin & Destination Selector Card */}
          <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-400" />
              <span>Waypoints</span>
            </h2>

            {/* Origin */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Starting Origin</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={originName}
                    readOnly
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white truncate focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    if (userGPS) {
                      setOrigin(userGPS);
                      setOriginName('Current GPS Location');
                    }
                  }}
                  className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold rounded-xl border border-blue-500/30 transition shrink-0"
                >
                  GPS
                </button>
                <button
                  onClick={() => {
                    setIsPickingOrigin(!isPickingOrigin);
                    setIsPickingDestination(false);
                  }}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition shrink-0 ${
                    isPickingOrigin
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {isPickingOrigin ? 'Click Map' : 'Pick'}
                </button>
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Destination Target</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={destinationName}
                    readOnly
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white truncate focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    setIsPickingDestination(!isPickingDestination);
                    setIsPickingOrigin(false);
                  }}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition shrink-0 ${
                    isPickingDestination
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {isPickingDestination ? 'Click Map' : 'Pick'}
                </button>
              </div>
            </div>

            {/* Quick Landmark Presets */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">Preset Monitored Destinations:</span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_LOCATIONS.map((loc, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDestination({ lat: loc.lat, lng: loc.lng });
                      setDestinationName(loc.name);
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                      destinationName === loc.name
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {loc.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generated Routes Ranked by Safety Score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Generated Routes (Ranked by Safety)</span>
              </h2>
              <span className="text-[11px] text-slate-500">{routes.length} options computed</span>
            </div>

            {isCalculating ? (
              <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-400 mb-2" />
                <span className="text-xs font-medium">Evaluating AI CCTV & Municipal Safety Scores...</span>
              </div>
            ) : routes.length === 0 ? (
              <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-xs">
                Select an origin and destination to generate safety-scored routes.
              </div>
            ) : (
              routes.map(route => {
                const isSelected = route.id === selectedRouteId;
                const isSafe = route.safetyScore >= 85;
                const isModerate = route.safetyScore >= 70 && route.safetyScore < 85;

                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`p-4 rounded-3xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-blue-500 shadow-xl shadow-blue-500/10'
                        : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                            route.tier === 'highest_safety'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : route.tier === 'balanced'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {route.tier.replaceAll('_', ' ')}
                          </span>
                          {route.recommended && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                              <Sparkles className="w-3 h-3" />
                              <span>Recommended</span>
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-white text-sm mt-1">{route.title}</h3>
                        <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{route.description}</p>
                      </div>

                      {/* Safety Score Badge */}
                      <div className={`p-2.5 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${
                        isSafe
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                          : isModerate
                          ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                          : 'bg-red-950/80 text-red-300 border-red-500/40'
                      }`}>
                        <div className="text-base font-black leading-none">{route.safetyScore}</div>
                        <div className="text-[8px] uppercase tracking-tighter font-bold opacity-80 mt-0.5">Safety</div>
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-300">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Duration</span>
                        <span className="font-bold text-white">{route.totalDurationMins} mins</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Distance</span>
                        <span className="font-bold text-white">{route.totalDistanceKm} km</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">CCTV</span>
                        <span className="font-bold text-emerald-400">{route.cctvCoveragePercent}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase">Lighting</span>
                        <span className="font-bold text-blue-400">{route.wellLitPercent}%</span>
                      </div>
                    </div>

                    {/* Action Button if selected */}
                    {isSelected && (
                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                        <div className="text-xs text-slate-400">
                          {route.verifiedHazardsCount === 0 ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Zero verified hazards
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> {route.verifiedHazardsCount} hazards bypassed
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartTrip(route);
                          }}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition active:scale-95"
                        >
                          <Compass className="w-4 h-4" />
                          <span>Start Trip Now</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Interactive Map Grid */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="relative flex-1 min-h-[500px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
            <SafeRouteMap
              center={origin}
              zoom={13}
              routes={routes}
              selectedRouteId={selectedRouteId || undefined}
              onSelectRoute={(id) => setSelectedRouteId(id)}
              userLocation={userGPS || origin}
              safetyZones={zones}
              cctvCameras={cameras}
              threats={verifiedThreats}
              onMapClick={handleMapClick}
              isPickingLocation={isPickingOrigin || isPickingDestination}
              height="100%"
            />

            {/* Map Legend Overlay */}
            <div className="absolute bottom-4 left-4 z-[500] bg-slate-950/90 backdrop-blur-md border border-slate-800 p-3 rounded-2xl text-[11px] space-y-1.5 shadow-xl text-slate-300 max-w-xs">
              <div className="font-bold text-white text-xs mb-1">Geospatial Safety Grid</div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 bg-emerald-500 rounded" />
                <span>Safest Route ({'>'}85 Score)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 bg-amber-500 rounded" />
                <span>Balanced Route (70-84 Score)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 bg-red-500 rounded" />
                <span>Direct / High Risk Route ({'<'}70)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/40 border border-emerald-500" />
                <span>Police Monitored Safe Corridor</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-blue-600 rounded" />
                <span>AI CCTV Vision Node</span>
              </div>
            </div>
          </div>

          {/* Turn-by-turn preview banner for selected route */}
          {selectedRoute && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold shrink-0">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">
                    {selectedRoute.instructions[0]?.instruction || 'Proceed toward destination'}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Next step: {selectedRoute.instructions[1]?.instruction || 'Continue safely'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleStartTrip(selectedRoute)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shrink-0 flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
              >
                <span>Begin Journey</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NavigationPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
        <span className="text-sm font-medium ml-3">Loading Geospatial Navigation Grid...</span>
      </div>
    }>
      <NavigationContent />
    </Suspense>
  );
}
