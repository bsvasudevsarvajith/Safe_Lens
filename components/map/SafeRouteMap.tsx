'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Coordinates, NavigationRoute, SafetyZone, CCTVCamera, ThreatReport } from '@/types';
import { Loader2 } from 'lucide-react';

interface SafeRouteMapProps {
  center: Coordinates;
  zoom?: number;
  routes?: NavigationRoute[];
  selectedRouteId?: string;
  onSelectRoute?: (routeId: string) => void;
  userLocation?: Coordinates;
  safetyZones?: SafetyZone[];
  cctvCameras?: CCTVCamera[];
  threats?: ThreatReport[];
  onMapClick?: (coords: Coordinates) => void;
  isPickingLocation?: boolean;
  activeJourneyLocation?: Coordinates;
  height?: string;
}

const DynamicLeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[450px] bg-slate-900 flex flex-col items-center justify-center text-slate-400 rounded-2xl border border-slate-800">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
      <span className="text-sm font-medium">Initializing Safe Route Geospatial Grid...</span>
    </div>
  ),
});

export default function SafeRouteMap(props: SafeRouteMapProps) {
  return <DynamicLeafletMap {...props} />;
}
