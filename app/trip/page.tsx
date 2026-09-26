'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveJourney } from '@/hooks/useActiveJourney';
import SafeRouteMap from '@/components/map/SafeRouteMap';
import {
  Clock,
  Compass,
  MapPin,
  Shield,
  ShieldAlert,
  CheckCircle2,
  Navigation,
  ArrowRight,
  Play,
  Pause,
  AlertTriangle,
  Radio,
  Phone,
} from 'lucide-react';
import SOSButton from '@/components/sos/SOSButton';
import { getCCTVCameras, getSafetyZones, getVerifiedThreats } from '@/services/firebase/firestoreService';

export default function ActiveTripPage() {
  const router = useRouter();
  const {
    journey,
    activeRoute,
    isSimulating,
    setIsSimulating,
    endTrip,
    currentInstruction,
  } = useActiveJourney();

  const [endModalOpen, setEndModalOpen] = useState(false);
  const [arrivedSuccessfully, setArrivedSuccessfully] = useState(false);

  // Environmental context for map
  const [cameras, setCameras] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [threats, setThreats] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      getCCTVCameras(),
      getSafetyZones(),
      getVerifiedThreats(),
    ]).then(([cams, zns, thrts]) => {
      setCameras(cams);
      setZones(zns);
      setThreats(thrts);
    });
  }, []);

  // When journey reaches 100%
  useEffect(() => {
    if (journey && journey.progressPercent >= 100) {
      setArrivedSuccessfully(true);
    }
  }, [journey?.progressPercent]);

  const handleConfirmEndTrip = (safe: boolean) => {
    endTrip(safe);
    setEndModalOpen(false);
    router.push('/profile?tab=trips');
  };

  if (!journey || !activeRoute) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 text-blue-400 flex items-center justify-center mx-auto mb-4">
          <Compass className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">No Active Journey In Progress</h1>
        <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
          Start a safe route from the navigation screen to activate live remaining distance, arrival telemetry, and corridor surveillance.
        </p>
        <button
          onClick={() => router.push('/navigation')}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 font-bold text-sm text-white rounded-2xl shadow-lg shadow-blue-600/30 transition"
        >
          <Navigation className="w-4 h-4" />
          <span>Go to Navigation</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col">
      {/* Active Trip Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center animate-pulse">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
                Live Journey In Progress
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                {journey.routeTitle}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              To: {journey.destinationName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Simulation Toggle */}
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isSimulating ? 'Pause Motion' : 'Resume Motion'}</span>
          </button>

          {/* End Trip Action */}
          <button
            onClick={() => setEndModalOpen(true)}
            className="px-4 py-1.5 bg-red-950/80 hover:bg-red-900/80 border border-red-500/40 text-red-200 text-xs font-bold rounded-xl transition"
          >
            End Trip
          </button>
        </div>
      </div>

      {/* Main Grid: Telemetry + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 flex-1">
        {/* Left Column: Live Progress & Safety Telemetry */}
        <div className="lg:col-span-5 space-y-4">
          {/* Continuous Real-time Metrics Card */}
          <div className="p-6 rounded-3xl bg-slate-900/85 border border-slate-800 shadow-xl space-y-5">
            {/* Live Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400 font-semibold uppercase tracking-wider">Journey Progress</span>
                <span className="font-extrabold text-emerald-400 font-mono text-sm">{journey.progressPercent}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-emerald-400 to-teal-300 transition-all duration-700 ease-out"
                  style={{ width: `${journey.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Continuous Live Time and Distance Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
                <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Remaining</span>
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {journey.remainingDurationMins} <span className="text-xs font-normal text-slate-400">mins</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
                <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mb-1">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Distance</span>
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {journey.remainingDistanceKm} <span className="text-xs font-normal text-slate-400">km</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80">
                <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-purple-400" />
                  <span>ETA</span>
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {journey.estimatedArrival}
                </div>
              </div>
            </div>

            {/* Turn by turn instruction banner */}
            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Next Waypoint</span>
                  <p className="text-sm font-bold text-white mt-0.5">{currentInstruction}</p>
                </div>
              </div>
            </div>

            {/* Corridor Safety Status */}
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-emerald-300 block">Monitored Safe Corridor Active</span>
                  <span className="text-[11px] text-emerald-400/80">
                    CCTV Coverage: {activeRoute.cctvCoveragePercent}% • Well Lit: {activeRoute.wellLitPercent}%
                  </span>
                </div>
              </div>
              <div className="text-lg font-black text-emerald-300 font-mono">
                {journey.safetyScore}/100
              </div>
            </div>

            {/* Persistent Emergency SOS Quick Access */}
            <div className="pt-2">
              <span className="text-xs font-semibold text-slate-400 block mb-2">Emergency Quick Action:</span>
              <SOSButton variant="inline" />
            </div>
          </div>

          {/* Quick Dispatch Contacts while traveling */}
          <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 text-xs">
            <span className="font-bold text-slate-300 block mb-2 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-red-400" />
              <span>Direct Emergency Helpline Speed Dial</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="tel:112"
                className="p-2.5 bg-slate-950 hover:bg-slate-800 rounded-xl border border-slate-800 text-center font-bold text-red-400"
              >
                Police (112)
              </a>
              <a
                href="tel:108"
                className="p-2.5 bg-slate-950 hover:bg-slate-800 rounded-xl border border-slate-800 text-center font-bold text-amber-400"
              >
                Ambulance (108)
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Active Live Map */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="relative flex-1 min-h-[500px] rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
            <SafeRouteMap
              center={journey.currentLocation}
              zoom={15}
              routes={[activeRoute]}
              selectedRouteId={activeRoute.id}
              activeJourneyLocation={journey.currentLocation}
              safetyZones={zones}
              cctvCameras={cameras}
              threats={threats}
              height="100%"
            />

            {/* Floating Live Telemetry Badge on Map */}
            <div className="absolute top-4 left-4 z-[500] bg-slate-950/90 backdrop-blur-md border border-slate-800 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div className="text-xs">
                <span className="text-slate-400">Position:</span>{' '}
                <span className="font-mono font-bold text-white">
                  {journey.currentLocation.lat.toFixed(4)}, {journey.currentLocation.lng.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Arrival Confirmation Modal */}
      {(endModalOpen || arrivedSuccessfully) && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-white">
              {arrivedSuccessfully ? 'Destination Reached!' : 'End Active Trip?'}
            </h3>
            <p className="text-slate-400 text-sm mt-2">
              Please confirm your safety status to record and close out this trip.
            </p>

            <div className="mt-6 space-y-2.5">
              <button
                onClick={() => handleConfirmEndTrip(true)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/30 transition"
              >
                Yes, I Have Arrived Safely
              </button>
              <button
                onClick={() => handleConfirmEndTrip(false)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl transition text-xs"
              >
                End Trip (Did not complete)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
