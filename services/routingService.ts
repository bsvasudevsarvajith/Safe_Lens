import { Coordinates, NavigationRoute, RouteSegment, RouteTier } from '@/types';
import { EngineContext, getSafetyScoreEngine } from '@/lib/engines/safetyEngine';

export interface RouteGenerationOptions {
  origin: Coordinates;
  destination: Coordinates;
  context: EngineContext;
  engineMode?: 'manual' | 'ai_cctv' | 'hybrid';
}

export async function generateMultiRoutes(options: RouteGenerationOptions): Promise<NavigationRoute[]> {
  const { origin, destination, context, engineMode = 'hybrid' } = options;
  const engine = getSafetyScoreEngine(engineMode);

  // Calculate straight-line baseline
  const directDistanceMeters = calculateHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  const directBearing = calculateBearing(origin.lat, origin.lng, destination.lat, destination.lng);

  // Generate 3 distinct paths:
  // 1. Highest Safety (guided through safe corridors, CCTV zones, arterial well-lit boulevards)
  // 2. Balanced (main avenue with moderate surveillance)
  // 3. Fastest (direct shortest line through intermediate alleys/side roads)

  const rawRouteConfigs: Array<{
    tier: RouteTier;
    title: string;
    description: string;
    distanceMultiplier: number;
    speedMps: number;
    segmentCount: number;
    waypointsOffset: number; // offset lateral in degrees
    lightingProfile: ('poor' | 'fair' | 'good' | 'excellent')[];
    patrolProfile: ('none' | 'occasional' | 'frequent')[];
    cctvProbability: number;
    baseSafety: number;
  }> = [
    {
      tier: 'highest_safety',
      title: 'Safest Corridor Route',
      description: 'Prioritizes verified CCTV monitoring, well-lit boulevards, and municipal police safe corridors.',
      distanceMultiplier: 1.18, // slightly longer for safety
      speedMps: 1.25, // brisk walk 4.5 km/h
      segmentCount: 5,
      waypointsOffset: 0.0028,
      lightingProfile: ['excellent', 'good', 'excellent', 'good', 'excellent'],
      patrolProfile: ['frequent', 'frequent', 'frequent', 'occasional', 'frequent'],
      cctvProbability: 0.9,
      baseSafety: 92,
    },
    {
      tier: 'balanced',
      title: 'Balanced Main Road Route',
      description: 'Follows major public avenues with steady pedestrian traffic and moderate lighting.',
      distanceMultiplier: 1.08,
      speedMps: 1.25,
      segmentCount: 4,
      waypointsOffset: -0.0018,
      lightingProfile: ['good', 'fair', 'good', 'good'],
      patrolProfile: ['occasional', 'occasional', 'none', 'occasional'],
      cctvProbability: 0.65,
      baseSafety: 80,
    },
    {
      tier: 'fastest',
      title: 'Fastest Direct Route',
      description: 'Shortest path navigating side alleys and transit cuts. Lower lighting and surveillance.',
      distanceMultiplier: 1.0,
      speedMps: 1.25,
      segmentCount: 4,
      waypointsOffset: 0.0004,
      lightingProfile: ['poor', 'fair', 'poor', 'fair'],
      patrolProfile: ['none', 'none', 'occasional', 'none'],
      cctvProbability: 0.3,
      baseSafety: 62,
    },
  ];

  const generatedRoutes: NavigationRoute[] = [];

  for (const cfg of rawRouteConfigs) {
    const totalDist = directDistanceMeters * cfg.distanceMultiplier;
    const durationSeconds = Math.round(totalDist / cfg.speedMps);
    const totalDurationMins = Math.max(1, Math.round(durationSeconds / 60));

    // Synthesize intermediate coordinates along arc
    const routeCoords: Coordinates[] = [origin];
    const segments: RouteSegment[] = [];
    const instructions: { instruction: string; distanceMeters: number; coordinate: Coordinates }[] = [];

    const numWaypoints = cfg.segmentCount;
    for (let i = 1; i <= numWaypoints; i++) {
      const fraction = i / (numWaypoints + 1);
      // Interpolate along line + sinusoidal lateral detour
      const latInterp = origin.lat + (destination.lat - origin.lat) * fraction;
      const lngInterp = origin.lng + (destination.lng - origin.lng) * fraction;

      const lateralDetour = Math.sin(fraction * Math.PI) * cfg.waypointsOffset;
      const pointLat = latInterp + lateralDetour;
      const pointLng = lngInterp - lateralDetour * 0.7;

      routeCoords.push({ lat: pointLat, lng: pointLng });
    }
    routeCoords.push(destination);

    // Build segments
    const segmentNames = [
      'Promenade Parkway',
      'Beacon Grand Boulevard',
      'Civic Center Avenue',
      'Heritage Safe Corridor',
      'Station Link Road',
      'Metropolitan Walkway',
    ];

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const from = routeCoords[i];
      const to = routeCoords[i + 1];
      const segDist = calculateHaversineDistance(from.lat, from.lng, to.lat, to.lng);
      const segSecs = Math.round(segDist / cfg.speedMps);

      const isCctv = Math.random() < cfg.cctvProbability;
      const roadName = segmentNames[i % segmentNames.length];
      const lighting = cfg.lightingProfile[i % cfg.lightingProfile.length];
      const patrol = cfg.patrolProfile[i % cfg.patrolProfile.length];

      // Check for verified threats on this segment
      const threatsNear = context.verifiedThreats.filter(t => {
        const d = calculateHaversineDistance(from.lat, from.lng, t.latitude, t.longitude);
        return d < 200;
      }).length;

      const segment: RouteSegment = {
        id: `seg-${cfg.tier}-${i}`,
        from,
        to,
        roadName: `${roadName} (Sect. ${i + 1})`,
        distanceMeters: Math.round(segDist),
        durationSeconds: segSecs,
        baseSafetyScore: cfg.baseSafety,
        lightingQuality: lighting,
        patrolFrequency: patrol,
        cctvCovered: isCctv,
        activeThreatCount: threatsNear,
      };

      segments.push(segment);

      // Turn instructions
      const action = i === 0 ? 'Start navigation from origin towards' : i === routeCoords.length - 2 ? 'Continue to final destination at' : `Turn right onto`;
      instructions.push({
        instruction: `${action} ${roadName} (${lighting === 'excellent' ? 'Brightly lit' : lighting === 'poor' ? 'Caution: Dim' : 'Well lit'}, ${isCctv ? 'CCTV Active' : 'Unmonitored'})`,
        distanceMeters: Math.round(segDist),
        coordinate: from,
      });
    }

    // Run segment and overall route scoring through the active SafetyScoreEngine
    const routeScoreResult = await engine.calculateRouteScore(segments, context);

    generatedRoutes.push({
      id: `route-${cfg.tier}-${Date.now()}`,
      tier: cfg.tier,
      title: cfg.title,
      description: cfg.description,
      totalDistanceKm: Number((totalDist / 1000).toFixed(2)),
      totalDurationMins,
      safetyScore: routeScoreResult.overallScore,
      safetyLevel: routeScoreResult.tierLevel,
      cctvCoveragePercent: routeScoreResult.cctvCoveragePercent,
      wellLitPercent: routeScoreResult.wellLitPercent,
      verifiedHazardsCount: routeScoreResult.hazardCount,
      recommended: cfg.tier === 'highest_safety',
      segments,
      waypoints: routeCoords,
      instructions,
    });
  }

  // CRITICAL REQUIREMENT: Rank routes primarily by Safety Score (descending), NOT merely distance!
  return generatedRoutes.sort((a, b) => b.safetyScore - a.safetyScore);
}

// -------------------------------------------------------------
// Geo Calculation Utilities
// -------------------------------------------------------------
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin((lon2 - lon1) * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180));
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos((lon2 - lon1) * (Math.PI / 180));
  const b = (Math.atan2(y, x) * 180) / Math.PI;
  return (b + 360) % 360;
}
