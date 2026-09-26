import { RouteSegment, SafetyZone, CCTVCamera, ThreatReport, SafetyEngineMode } from '@/types';

export interface EngineContext {
  safetyZones: SafetyZone[];
  cctvCameras: CCTVCamera[];
  verifiedThreats: ThreatReport[];
  isNightTime?: boolean;
}

export interface SegmentScoreResult {
  score: number; // 0 - 100
  factors: {
    lighting: number;
    surveillance: number;
    hazardPenalty: number;
    zoneBonusOrPenalty: number;
    crowdDensityFactor: number;
  };
  warnings: string[];
}

export interface RouteScoreResult {
  overallScore: number; // 0 - 100
  tierLevel: 'safe' | 'moderate' | 'high_risk' | 'critical';
  segmentScores: SegmentScoreResult[];
  cctvCoveragePercent: number;
  wellLitPercent: number;
  hazardCount: number;
  summary: string;
}

export interface SafetyScoreEngine {
  readonly id: SafetyEngineMode;
  readonly name: string;
  readonly description: string;
  calculateSegmentScore(segment: RouteSegment, context: EngineContext): Promise<SegmentScoreResult>;
  calculateRouteScore(segments: RouteSegment[], context: EngineContext): Promise<RouteScoreResult>;
}

// -------------------------------------------------------------
// 1. Manual Safety Engine
// Uses admin-defined zones, road ratings, verified threats, and lighting heuristics
// -------------------------------------------------------------
export class ManualSafetyEngine implements SafetyScoreEngine {
  readonly id = 'manual' as const;
  readonly name = 'Manual Grid Engine';
  readonly description = 'Calculates safety based on admin-defined safety zones, verified threat density, and road infrastructure ratings.';

  async calculateSegmentScore(segment: RouteSegment, context: EngineContext): Promise<SegmentScoreResult> {
    let score = segment.baseSafetyScore || 70;
    const warnings: string[] = [];

    // Lighting factor
    let lightingBonus = 0;
    if (segment.lightingQuality === 'excellent') lightingBonus = 15;
    else if (segment.lightingQuality === 'good') lightingBonus = 8;
    else if (segment.lightingQuality === 'fair') lightingBonus = 0;
    else {
      lightingBonus = -20;
      warnings.push(`Low lighting on ${segment.roadName}`);
    }

    // Zone correlation
    let zoneBonus = 0;
    for (const zone of context.safetyZones.filter(z => z.active)) {
      const dist = calculateDistance(segment.from.lat, segment.from.lng, zone.center.lat, zone.center.lng);
      if (dist <= zone.radiusMeters) {
        if (zone.type === 'safe_corridor' || zone.type === 'police_patrol_sector') {
          zoneBonus += 12;
        } else if (zone.type === 'caution_zone') {
          zoneBonus -= 15;
          warnings.push(`Crosses ${zone.name}`);
        } else if (zone.type === 'high_risk_zone') {
          zoneBonus -= 30;
          warnings.push(`High risk alert in ${zone.name}`);
        }
      }
    }

    // Verified threats penalty
    let threatPenalty = 0;
    const nearbyVerifiedThreats = context.verifiedThreats.filter(t => {
      const d1 = calculateDistance(segment.from.lat, segment.from.lng, t.latitude, t.longitude);
      const d2 = calculateDistance(segment.to.lat, segment.to.lng, t.latitude, t.longitude);
      return d1 < 250 || d2 < 250;
    });

    for (const threat of nearbyVerifiedThreats) {
      if (threat.severity === 'critical') threatPenalty += 25;
      else if (threat.severity === 'high') threatPenalty += 15;
      else if (threat.severity === 'moderate') threatPenalty += 10;
      else threatPenalty += 5;

      warnings.push(`Verified threat nearby: ${threat.description.substring(0, 45)}...`);
    }

    // Patrol frequency
    let patrolBonus = 0;
    if (segment.patrolFrequency === 'frequent') patrolBonus = 10;
    else if (segment.patrolFrequency === 'occasional') patrolBonus = 5;

    score = Math.max(15, Math.min(100, score + lightingBonus + zoneBonus + patrolBonus - threatPenalty));

    return {
      score: Math.round(score),
      factors: {
        lighting: lightingBonus,
        surveillance: patrolBonus,
        hazardPenalty: threatPenalty,
        zoneBonusOrPenalty: zoneBonus,
        crowdDensityFactor: 0,
      },
      warnings,
    };
  }

  async calculateRouteScore(segments: RouteSegment[], context: EngineContext): Promise<RouteScoreResult> {
    if (segments.length === 0) {
      return {
        overallScore: 50,
        tierLevel: 'moderate',
        segmentScores: [],
        cctvCoveragePercent: 0,
        wellLitPercent: 0,
        hazardCount: 0,
        summary: 'No route segments provided.',
      };
    }

    const segmentScores: SegmentScoreResult[] = [];
    let totalScoreWeighted = 0;
    let totalDistance = 0;
    let litDistance = 0;
    let cctvDistance = 0;
    let hazardCount = 0;

    for (const seg of segments) {
      const res = await this.calculateSegmentScore(seg, context);
      segmentScores.push(res);
      const weight = seg.distanceMeters || 100;
      totalDistance += weight;
      totalScoreWeighted += res.score * weight;

      if (seg.lightingQuality === 'good' || seg.lightingQuality === 'excellent') {
        litDistance += weight;
      }
      if (seg.cctvCovered) {
        cctvDistance += weight;
      }
      hazardCount += res.factors.hazardPenalty > 0 ? 1 : 0;
    }

    const overallScore = Math.round(totalScoreWeighted / Math.max(1, totalDistance));
    const tierLevel = getTierLevel(overallScore);

    return {
      overallScore,
      tierLevel,
      segmentScores,
      cctvCoveragePercent: Math.round((cctvDistance / Math.max(1, totalDistance)) * 100),
      wellLitPercent: Math.round((litDistance / Math.max(1, totalDistance)) * 100),
      hazardCount,
      summary: `Evaluated via Manual Safety Grid: ${tierLevel.toUpperCase()} rating. ${hazardCount} verified hazard sectors.`,
    };
  }
}

// -------------------------------------------------------------
// 2. AI / CCTV Safety Engine
// Evaluates real-time human count, crowd density, lighting quality, and vision anomaly flags
// -------------------------------------------------------------
export class AiCctvSafetyEngine implements SafetyScoreEngine {
  readonly id = 'ai_cctv' as const;
  readonly name = 'AI Vision & CCTV Engine';
  readonly description = 'Uses real-time multimodal AI analysis of public CCTV video & snapshot feeds, crowd density, and anomaly detection.';

  async calculateSegmentScore(segment: RouteSegment, context: EngineContext): Promise<SegmentScoreResult> {
    let score = 65;
    const warnings: string[] = [];

    // Find nearest CCTV cameras covering this segment
    const nearbyCameras = context.cctvCameras.filter(cam => {
      const d1 = calculateDistance(segment.from.lat, segment.from.lng, cam.location.lat, cam.location.lng);
      const d2 = calculateDistance(segment.to.lat, segment.to.lng, cam.location.lat, cam.location.lng);
      return (d1 < 300 || d2 < 300) && cam.status === 'online';
    });

    let surveillanceScore = 0;
    let crowdFactor = 0;
    let lightingBonus = 0;
    let anomalyPenalty = 0;

    if (nearbyCameras.length > 0) {
      surveillanceScore = 20; // Verified active CCTV monitoring
      for (const cam of nearbyCameras) {
        if (cam.lastAnalysis) {
          const analysis = cam.lastAnalysis;
          // Lighting from AI
          if (analysis.lightingScore >= 75) lightingBonus += 10;
          else if (analysis.lightingScore < 40) {
            lightingBonus -= 15;
            warnings.push(`AI Vision: Poor illumination detected at Camera ${cam.cameraCode}`);
          }

          // Crowd density factor (Healthy walking density vs deserted dark alley vs hazardous stampede)
          if (analysis.crowdDensityPercent >= 15 && analysis.crowdDensityPercent <= 70) {
            crowdFactor += 12; // Natural pedestrian vigilance
          } else if (analysis.crowdDensityPercent < 10) {
            crowdFactor -= 8; // Isolated / deserted corridor
            warnings.push(`AI Vision: Deserted path detected at ${cam.name}`);
          } else if (analysis.crowdDensityPercent > 85) {
            crowdFactor -= 15; // Hazardous overcrowding
            warnings.push(`AI Vision: Dense crowd surge detected at ${cam.name}`);
          }

          // Anomalies detected by AI (human disturbance, blockages, etc.)
          if (analysis.anomalyDetected) {
            anomalyPenalty += 28;
            warnings.push(`AI Vision Alert: ${analysis.anomalyType || 'Suspicious activity'} flagged at ${cam.cameraCode}`);
          }
        }
      }
    } else {
      warnings.push(`Unmonitored corridor: No active CCTV feed on ${segment.roadName}`);
    }

    score = Math.max(10, Math.min(100, score + surveillanceScore + lightingBonus + crowdFactor - anomalyPenalty));

    return {
      score: Math.round(score),
      factors: {
        lighting: lightingBonus,
        surveillance: surveillanceScore,
        hazardPenalty: anomalyPenalty,
        zoneBonusOrPenalty: 0,
        crowdDensityFactor: crowdFactor,
      },
      warnings,
    };
  }

  async calculateRouteScore(segments: RouteSegment[], context: EngineContext): Promise<RouteScoreResult> {
    if (segments.length === 0) {
      return {
        overallScore: 50,
        tierLevel: 'moderate',
        segmentScores: [],
        cctvCoveragePercent: 0,
        wellLitPercent: 0,
        hazardCount: 0,
        summary: 'No route segments provided.',
      };
    }

    const segmentScores: SegmentScoreResult[] = [];
    let totalScoreWeighted = 0;
    let totalDistance = 0;
    let cctvMonitoredDistance = 0;
    let litDistance = 0;
    let anomalyCount = 0;

    for (const seg of segments) {
      const res = await this.calculateSegmentScore(seg, context);
      segmentScores.push(res);
      const weight = seg.distanceMeters || 100;
      totalDistance += weight;
      totalScoreWeighted += res.score * weight;

      if (res.factors.surveillance > 0) {
        cctvMonitoredDistance += weight;
      }
      if (res.factors.lighting >= 0) {
        litDistance += weight;
      }
      if (res.factors.hazardPenalty > 0) {
        anomalyCount++;
      }
    }

    const overallScore = Math.round(totalScoreWeighted / Math.max(1, totalDistance));
    const tierLevel = getTierLevel(overallScore);

    return {
      overallScore,
      tierLevel,
      segmentScores,
      cctvCoveragePercent: Math.round((cctvMonitoredDistance / Math.max(1, totalDistance)) * 100),
      wellLitPercent: Math.round((litDistance / Math.max(1, totalDistance)) * 100),
      hazardCount: anomalyCount,
      summary: `AI Vision & CCTV Analysis: ${tierLevel.toUpperCase()} safety index. ${Math.round((cctvMonitoredDistance / Math.max(1, totalDistance)) * 100)}% route under active vision surveillance.`,
    };
  }
}

// -------------------------------------------------------------
// 3. Hybrid Safety Engine (Combined Power)
// Seamless blend of 60% Real-time AI CCTV + 40% Admin Manual Grid & Verified Reports
// -------------------------------------------------------------
export class HybridSafetyEngine implements SafetyScoreEngine {
  readonly id = 'hybrid' as const;
  readonly name = 'Hybrid Intelligence Engine';
  readonly description = 'Blends real-time AI computer vision telemetry (60%) with verified community reports and municipal safety zones (40%).';

  private manualEngine = new ManualSafetyEngine();
  private aiEngine = new AiCctvSafetyEngine();

  async calculateSegmentScore(segment: RouteSegment, context: EngineContext): Promise<SegmentScoreResult> {
    const manual = await this.manualEngine.calculateSegmentScore(segment, context);
    const ai = await this.aiEngine.calculateSegmentScore(segment, context);

    const blendedScore = Math.round(ai.score * 0.6 + manual.score * 0.4);
    const uniqueWarnings = Array.from(new Set([...manual.warnings, ...ai.warnings]));

    return {
      score: blendedScore,
      factors: {
        lighting: Math.round(ai.factors.lighting * 0.6 + manual.factors.lighting * 0.4),
        surveillance: Math.round(ai.factors.surveillance * 0.6 + manual.factors.surveillance * 0.4),
        hazardPenalty: Math.round(ai.factors.hazardPenalty * 0.6 + manual.factors.hazardPenalty * 0.4),
        zoneBonusOrPenalty: manual.factors.zoneBonusOrPenalty,
        crowdDensityFactor: ai.factors.crowdDensityFactor,
      },
      warnings: uniqueWarnings,
    };
  }

  async calculateRouteScore(segments: RouteSegment[], context: EngineContext): Promise<RouteScoreResult> {
    const manual = await this.manualEngine.calculateRouteScore(segments, context);
    const ai = await this.aiEngine.calculateRouteScore(segments, context);

    const overallScore = Math.round(ai.overallScore * 0.6 + manual.overallScore * 0.4);
    const tierLevel = getTierLevel(overallScore);

    return {
      overallScore,
      tierLevel,
      segmentScores: ai.segmentScores,
      cctvCoveragePercent: ai.cctvCoveragePercent,
      wellLitPercent: Math.max(ai.wellLitPercent, manual.wellLitPercent),
      hazardCount: ai.hazardCount + manual.hazardCount,
      summary: `Hybrid Engine: ${overallScore}/100 safety score. Synchronized AI CCTV feeds with verified municipal threat grid.`,
    };
  }
}

// -------------------------------------------------------------
// Engine Registry & Factory
// -------------------------------------------------------------
const engines: Record<SafetyEngineMode, SafetyScoreEngine> = {
  manual: new ManualSafetyEngine(),
  ai_cctv: new AiCctvSafetyEngine(),
  hybrid: new HybridSafetyEngine(),
};

export function getSafetyScoreEngine(mode: SafetyEngineMode = 'hybrid'): SafetyScoreEngine {
  return engines[mode] || engines.hybrid;
}

// -------------------------------------------------------------
// Helper math functions
// -------------------------------------------------------------
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
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

function getTierLevel(score: number): 'safe' | 'moderate' | 'high_risk' | 'critical' {
  if (score >= 85) return 'safe';
  if (score >= 70) return 'moderate';
  if (score >= 50) return 'high_risk';
  return 'critical';
}
