export type UserRole = 'user' | 'safety_moderator' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  notifyOnSOS: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  emergencyContacts: EmergencyContact[];
  createdAt: string;
  updatedAt: string;
}

export type ThreatCategory = 
  | 'poor_lighting'
  | 'suspicious_activity'
  | 'harassment'
  | 'blocked_route'
  | 'wildlife_hazard'
  | 'isolated_area'
  | 'other';

export type ThreatSeverity = 'low' | 'moderate' | 'high' | 'critical';

export type ReportStatus = 'pending' | 'under_review' | 'verified' | 'rejected' | 'resolved';

export interface ThreatReport {
  id: string;
  userId: string;
  userName: string;
  category: ThreatCategory;
  severity: ThreatSeverity;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  imageUrl?: string;
  status: ReportStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  verificationNotes?: string;
  upvotes: number;
  createdAt: string;
  updatedAt: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteWaypoint extends Coordinates {
  name?: string;
  instruction?: string;
  isLit?: boolean;
  hasCctv?: boolean;
  distanceFromStartKm?: number;
}

export interface RouteSegment {
  id: string;
  from: Coordinates;
  to: Coordinates;
  roadName: string;
  distanceMeters: number;
  durationSeconds: number;
  baseSafetyScore: number;
  lightingQuality: 'poor' | 'fair' | 'good' | 'excellent';
  patrolFrequency: 'none' | 'occasional' | 'frequent';
  cctvCovered: boolean;
  activeThreatCount: number;
  humanCrowdDensity?: number; // 0 - 100%
  calculatedSafetyScore?: number; // 0 - 100
}

export type RouteTier = 'highest_safety' | 'balanced' | 'fastest';

export interface NavigationRoute {
  id: string;
  tier: RouteTier;
  title: string;
  description: string;
  totalDistanceKm: number;
  totalDurationMins: number;
  safetyScore: number; // 0 - 100
  safetyLevel: 'safe' | 'moderate' | 'high_risk' | 'critical';
  cctvCoveragePercent: number;
  wellLitPercent: number;
  verifiedHazardsCount: number;
  recommended: boolean;
  segments: RouteSegment[];
  waypoints: Coordinates[];
  instructions: {
    instruction: string;
    distanceMeters: number;
    coordinate: Coordinates;
  }[];
}

export interface SafetyZone {
  id: string;
  name: string;
  type: 'safe_corridor' | 'caution_zone' | 'high_risk_zone' | 'police_patrol_sector';
  baseScore: number; // 0 - 100
  center: Coordinates;
  radiusMeters: number;
  description: string;
  active: boolean;
  updatedAt: string;
}

export interface CCTVCamera {
  id: string;
  cameraCode: string;
  name: string;
  location: Coordinates;
  address: string;
  streamUrl: string;
  status: 'online' | 'degraded' | 'offline';
  fieldOfViewAngle: number;
  lastAnalysis?: CCTVAnalysis;
  updatedAt: string;
}

export interface CCTVAnalysis {
  id: string;
  cameraId: string;
  cameraCode: string;
  timestamp: string;
  humanCount: number;
  crowdDensityPercent: number; // 0 - 100
  lightingScore: number; // 0 - 100
  anomalyDetected: boolean;
  anomalyType?: 'crowd_surge' | 'loitering' | 'darkness' | 'motion_disturbance' | 'none';
  safetyScoreContribution: number; // 0 - 100
  analyzedInputType: 'image' | 'video';
  confidenceScore: number; // 0 - 1.0
  notes: string;
}

export type SOSEventStatus = 'active' | 'acknowledged' | 'police_dispatched' | 'ambulance_dispatched' | 'resolved' | 'false_alarm';

export interface SOSEvent {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  status: SOSEventStatus;
  mapLink: string;
  notifiedContacts: string[];
  responderNotes?: string;
  dispatchedTo?: string;
  timestamp: string;
  resolvedAt?: string;
}

export interface ActiveJourney {
  id: string;
  userId: string;
  routeId: string;
  routeTitle: string;
  origin: Coordinates;
  originName: string;
  destination: Coordinates;
  destinationName: string;
  startedAt: string;
  estimatedArrival: string;
  totalDistanceKm: number;
  remainingDistanceKm: number;
  remainingDurationMins: number;
  progressPercent: number;
  currentLocation: Coordinates;
  currentStepIndex: number;
  status: 'in_progress' | 'completed' | 'cancelled' | 'sos_triggered';
  safetyScore: number;
}

export type SafetyEngineMode = 'manual' | 'ai_cctv' | 'hybrid';

export interface SystemSettings {
  engineMode: SafetyEngineMode;
  aiModelProvider: 'google_gemini' | 'custom_vision' | 'simulation_engine';
  aiModelName: string;
  emergencyNumbers: {
    police: string;
    ambulance: string;
    womenHelpline: string;
    fireRescue: string;
  };
  sosAutoDial: boolean;
  sosBroadcastAdmin: boolean;
  verifiedReportsWeight: number; // 0 - 100 penalty weight
  cctvFreshnessTtlMinutes: number;
  maintenanceMode: boolean;
  updatedAt: string;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  category: 'threat_moderation' | 'cctv_update' | 'engine_switch' | 'sos_dispatch' | 'user_management' | 'settings_change';
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface DashboardMetrics {
  totalUsers: number;
  activeJourneysCount: number;
  activeSOSEventsCount: number;
  verifiedThreatsCount: number;
  pendingReportsCount: number;
  onlineCamerasCount: number;
  totalCamerasCount: number;
  averageCitySafetyScore: number;
  engineMode: SafetyEngineMode;
}
