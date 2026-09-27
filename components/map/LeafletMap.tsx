'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coordinates, NavigationRoute, SafetyZone, CCTVCamera, ThreatReport } from '@/types';

interface SafeMapProps {
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

export default function LeafletMap({
  center,
  zoom = 14,
  routes = [],
  selectedRouteId,
  onSelectRoute,
  userLocation,
  safetyZones = [],
  cctvCameras = [],
  threats = [],
  onMapClick,
  isPickingLocation = false,
  activeJourneyLocation,
  height = '500px',
}: SafeMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [center.lat, center.lng],
        zoom,
        zoomControl: true,
      });

      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const tileUrl = mapboxToken && mapboxToken.startsWith('pk.')
        ? `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

      const tileAttribution = mapboxToken && mapboxToken.startsWith('pk.')
        ? '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        : '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap';

      L.tileLayer(tileUrl, {
        attribution: tileAttribution,
        maxZoom: 19,
        tileSize: 256,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update center
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.panTo([center.lat, center.lng]);
    }
  }, [center.lat, center.lng]);

  // Handle map click for picking locations
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [onMapClick]);

  // Redraw layers (routes, markers, zones, cameras, threats)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    // 1. Render Safety Zones
    safetyZones.forEach(zone => {
      if (!zone.active) return;
      let color = '#10b981'; // safe corridor
      if (zone.type === 'caution_zone') color = '#f59e0b';
      if (zone.type === 'high_risk_zone') color = '#ef4444';
      if (zone.type === 'police_patrol_sector') color = '#3b82f6';

      const circle = L.circle([zone.center.lat, zone.center.lng], {
        radius: zone.radiusMeters,
        color,
        fillColor: color,
        fillOpacity: 0.18,
        weight: 1.5,
      });

      circle.bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4;">
          <strong style="color: ${color}; text-transform: uppercase; font-size: 11px;">${zone.type.replaceAll('_', ' ')}</strong>
          <h4 style="margin: 4px 0 6px; font-weight: bold; color: #111827;">${zone.name}</h4>
          <p style="margin: 0; color: #4b5563; font-size: 12px;">${zone.description}</p>
          <div style="margin-top: 6px; font-weight: 600; font-size: 11px; color: #374151;">Safety Index: ${zone.baseScore}/100</div>
        </div>
      `);

      circle.addTo(layers);
    });

    // 2. Render Verified Threat Reports
    threats.forEach(threat => {
      const threatIcon = L.divIcon({
        className: 'custom-threat-marker',
        html: `
          <div style="
            background: #dc2626;
            color: white;
            border-radius: 9999px;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 10px rgba(220, 38, 38, 0.6);
            border: 2px solid white;
            font-size: 14px;
            font-weight: bold;
          ">
            ⚠️
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([threat.latitude, threat.longitude], { icon: threatIcon });
      marker.bindPopup(`
        <div style="font-family: sans-serif; max-width: 220px;">
          <div style="background: #fef2f2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; display: inline-block;">
            ${threat.status.toUpperCase()} HAZARD
          </div>
          <h4 style="margin: 6px 0 4px; font-size: 13px; font-weight: bold; color: #111;">${threat.category.replaceAll('_', ' ').toUpperCase()}</h4>
          <p style="margin: 0; font-size: 12px; color: #374151;">${threat.description}</p>
          <div style="margin-top: 6px; font-size: 10px; color: #6b7280;">Reported by ${threat.userName}</div>
        </div>
      `);
      marker.addTo(layers);
    });

    // 3. Render CCTV Cameras
    cctvCameras.forEach(cam => {
      const isOnline = cam.status === 'online';
      const camIcon = L.divIcon({
        className: 'custom-cam-marker',
        html: `
          <div style="
            background: ${isOnline ? '#0284c7' : '#6b7280'};
            color: white;
            border-radius: 6px;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            border: 1.5px solid white;
            font-size: 12px;
          ">
            📹
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([cam.location.lat, cam.location.lng], { icon: camIcon });
      const last = cam.lastAnalysis;

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; max-width: 240px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-weight: bold; color: #0284c7;">${cam.cameraCode}</span>
            <span style="font-size: 10px; background: ${isOnline ? '#dcfce7' : '#f3f4f6'}; color: ${isOnline ? '#166534' : '#4b5563'}; padding: 1px 4px; border-radius: 4px;">
              ${cam.status.toUpperCase()}
            </span>
          </div>
          <h4 style="margin: 4px 0; font-size: 13px; color: #1f2937;">${cam.name}</h4>
          ${last ? `
            <div style="background: #f8fafc; padding: 6px; border-radius: 4px; margin-top: 4px;">
              <div>👥 Detected: <strong>${last.humanCount} pedestrians</strong></div>
              <div>💡 Lighting: <strong>${last.lightingScore}/100</strong></div>
              <div>🛡️ AI Safety: <strong>${last.safetyScoreContribution}/100</strong></div>
              ${last.anomalyDetected ? `<div style="color: #dc2626; font-weight: bold; margin-top: 2px;">⚠️ ${last.anomalyType}</div>` : ''}
            </div>
          ` : '<p style="color: #64748b; font-size: 11px;">Feed awaiting telemetry</p>'}
        </div>
      `);
      marker.addTo(layers);
    });

    // 4. Render Routes
    routes.forEach(route => {
      const isSelected = route.id === selectedRouteId;
      const latlngs = route.waypoints.map(w => [w.lat, w.lng] as [number, number]);

      // Color coding according to safety score
      let routeColor = '#10b981'; // safe
      if (route.safetyScore < 70) routeColor = '#ef4444'; // critical / high risk
      else if (route.safetyScore < 85) routeColor = '#f59e0b'; // moderate

      const polyline = L.polyline(latlngs, {
        color: routeColor,
        weight: isSelected ? 7 : 4,
        opacity: isSelected ? 0.95 : 0.5,
        dashArray: route.tier === 'fastest' ? '6, 6' : undefined,
      });

      polyline.on('click', () => {
        if (onSelectRoute) onSelectRoute(route.id);
      });

      polyline.bindTooltip(
        `${route.title} (Safety: ${route.safetyScore}/100)`,
        { sticky: true, className: 'route-tooltip' }
      );

      polyline.addTo(layers);
    });

    // 5. Origin and Destination Markers if routes exist
    if (routes.length > 0 && routes[0].waypoints.length > 0) {
      const startPt = routes[0].waypoints[0];
      const endPt = routes[0].waypoints[routes[0].waypoints.length - 1];

      // Start Marker
      const startIcon = L.divIcon({
        className: 'start-marker',
        html: `<div style="background: #2563eb; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">A</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker([startPt.lat, startPt.lng], { icon: startIcon }).bindPopup('<strong>Start Origin</strong>').addTo(layers);

      // Destination Marker
      const destIcon = L.divIcon({
        className: 'dest-marker',
        html: `<div style="background: #10b981; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">B</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker([endPt.lat, endPt.lng], { icon: destIcon }).bindPopup('<strong>Destination</strong>').addTo(layers);
    }

    // 6. User Current Location Pulse
    const userLoc = activeJourneyLocation || userLocation;
    if (userLoc) {
      const pulseIcon = L.divIcon({
        className: 'user-pulse-marker',
        html: `
          <div style="position: relative; width: 22px; height: 22px;">
            <div style="
              position: absolute;
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background: #3b82f6;
              opacity: 0.75;
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              position: absolute;
              top: 3px;
              left: 3px;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: #2563eb;
              border: 3px solid white;
              box-shadow: 0 0 8px rgba(37,99,235,0.7);
            "></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      L.marker([userLoc.lat, userLoc.lng], { icon: pulseIcon })
        .bindPopup('<strong>You are here</strong><br/>Live GPS Coordinates Active')
        .addTo(layers);
    }
  }, [
    routes,
    selectedRouteId,
    userLocation,
    activeJourneyLocation,
    safetyZones,
    cctvCameras,
    threats,
    onSelectRoute,
  ]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
      {isPickingLocation && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg z-[1000] animate-bounce">
          Tap anywhere on map to select location
        </div>
      )}
    </div>
  );
}
