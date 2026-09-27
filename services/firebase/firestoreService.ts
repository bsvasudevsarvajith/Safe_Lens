import {
  CCTVCamera,
  CCTVAnalysis,
  SafetyZone,
  ThreatReport,
  ReportStatus,
  SOSEvent,
  SOSEventStatus,
  SystemSettings,
  UserProfile,
  AdminLog,
  DashboardMetrics,
} from '@/types';
import {
  INITIAL_CAMERAS,
  INITIAL_SAFETY_ZONES,
  INITIAL_THREAT_REPORTS,
  INITIAL_SYSTEM_SETTINGS,
  INITIAL_USERS,
  INITIAL_SOS_EVENTS,
} from '@/lib/mockData/initialData';

// In-browser resilient state storage keys for seamless operation
const STORAGE_KEYS = {
  CAMERAS: 'sr_cctv_cameras',
  ZONES: 'sr_safety_zones',
  REPORTS: 'sr_threat_reports',
  SETTINGS: 'sr_system_settings',
  USERS: 'sr_users',
  SOS: 'sr_sos_events',
  LOGS: 'sr_admin_logs',
};

// Event listener subscriber pattern for real-time reactivity
type ListenerCallback<T> = (data: T) => void;
const subscribers: Record<string, Set<ListenerCallback<any>>> = {};

function notifySubscribers(key: string, data: any) {
  if (subscribers[key]) {
    subscribers[key].forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error('Subscriber callback error:', err);
      }
    });
  }
}

export function subscribeToStore<T>(key: string, callback: ListenerCallback<T>): () => void {
  if (!subscribers[key]) {
    subscribers[key] = new Set();
  }
  subscribers[key].add(callback);

  // Return unsubscribe handler
  return () => {
    subscribers[key]?.delete(callback);
  };
}

// Local storage helper
function getStoredItem<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return defaultVal;
  }
}

function setStoredItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifySubscribers(key, value);
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
  }
}

// ------------------------------------------------------------------
// Threat Reports Service
// ------------------------------------------------------------------
export async function getThreatReports(): Promise<ThreatReport[]> {
  return getStoredItem<ThreatReport[]>(STORAGE_KEYS.REPORTS, INITIAL_THREAT_REPORTS);
}

export async function getVerifiedThreats(): Promise<ThreatReport[]> {
  const all = await getThreatReports();
  // CRITICAL REQUIREMENT: Only verified reports feed into route scoring!
  return all.filter(r => r.status === 'verified');
}

export async function createThreatReport(
  reportData: Omit<ThreatReport, 'id' | 'status' | 'upvotes' | 'createdAt' | 'updatedAt'>
): Promise<ThreatReport> {
  const all = await getThreatReports();
  const newReport: ThreatReport = {
    ...reportData,
    id: `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    status: 'pending', // Starts at pending workflow
    upvotes: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = [newReport, ...all];
  setStoredItem(STORAGE_KEYS.REPORTS, updated);
  await logAdminAction('system', 'System', 'threat_moderation', `New threat reported: ${newReport.category} at ${newReport.address || 'GPS Location'}`);
  return newReport;
}

export async function updateThreatReportStatus(
  reportId: string,
  status: ReportStatus,
  reviewerEmail: string,
  verificationNotes?: string
): Promise<ThreatReport | null> {
  const all = await getThreatReports();
  const index = all.findIndex(r => r.id === reportId);
  if (index === -1) return null;

  const updatedReport: ThreatReport = {
    ...all[index],
    status,
    reviewedBy: reviewerEmail,
    reviewedAt: new Date().toISOString(),
    verificationNotes: verificationNotes || all[index].verificationNotes,
    updatedAt: new Date().toISOString(),
  };

  all[index] = updatedReport;
  setStoredItem(STORAGE_KEYS.REPORTS, all);

  await logAdminAction(
    reviewerEmail,
    reviewerEmail,
    'threat_moderation',
    `Report ${reportId} marked as ${status}. ${status === 'verified' ? 'Now factored into route safety scores.' : ''}`
  );

  return updatedReport;
}

// ------------------------------------------------------------------
// Safety Zones Service
// ------------------------------------------------------------------
export async function getSafetyZones(): Promise<SafetyZone[]> {
  return getStoredItem<SafetyZone[]>(STORAGE_KEYS.ZONES, INITIAL_SAFETY_ZONES);
}

export async function saveSafetyZone(zone: Omit<SafetyZone, 'id' | 'updatedAt'>, existingId?: string): Promise<SafetyZone> {
  const all = await getSafetyZones();
  if (existingId) {
    const idx = all.findIndex(z => z.id === existingId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...zone, updatedAt: new Date().toISOString() };
      setStoredItem(STORAGE_KEYS.ZONES, all);
      return all[idx];
    }
  }

  const newZone: SafetyZone = {
    ...zone,
    id: `zone-${Date.now()}`,
    updatedAt: new Date().toISOString(),
  };
  all.push(newZone);
  setStoredItem(STORAGE_KEYS.ZONES, all);
  return newZone;
}

// ------------------------------------------------------------------
// CCTV Cameras & AI Service
// ------------------------------------------------------------------
export async function getCCTVCameras(): Promise<CCTVCamera[]> {
  return getStoredItem<CCTVCamera[]>(STORAGE_KEYS.CAMERAS, INITIAL_CAMERAS);
}

export async function updateCameraAnalysis(cameraId: string, analysis: CCTVAnalysis): Promise<CCTVCamera | null> {
  const all = await getCCTVCameras();
  const idx = all.findIndex(c => c.id === cameraId);
  if (idx === -1) return null;

  all[idx] = {
    ...all[idx],
    lastAnalysis: analysis,
    updatedAt: new Date().toISOString(),
  };
  setStoredItem(STORAGE_KEYS.CAMERAS, all);
  return all[idx];
}

export async function updateCameraStatus(cameraId: string, status: 'online' | 'degraded' | 'offline'): Promise<void> {
  const all = await getCCTVCameras();
  const idx = all.findIndex(c => c.id === cameraId);
  if (idx !== -1) {
    all[idx].status = status;
    all[idx].updatedAt = new Date().toISOString();
    setStoredItem(STORAGE_KEYS.CAMERAS, all);
  }
}

// ------------------------------------------------------------------
// SOS Events Service
// ------------------------------------------------------------------
export async function getSOSEvents(): Promise<SOSEvent[]> {
  return getStoredItem<SOSEvent[]>(STORAGE_KEYS.SOS, INITIAL_SOS_EVENTS);
}

export async function createSOSEvent(params: {
  userId: string;
  userName: string;
  userPhone: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  notifiedContacts: string[];
}): Promise<SOSEvent> {
  const all = await getSOSEvents();
  const newSOS: SOSEvent = {
    id: `sos-${Date.now()}`,
    userId: params.userId,
    userName: params.userName,
    userPhone: params.userPhone,
    latitude: params.latitude,
    longitude: params.longitude,
    accuracyMeters: params.accuracyMeters,
    status: 'active',
    mapLink: `https://maps.google.com/?q=${params.latitude},${params.longitude}`,
    notifiedContacts: params.notifiedContacts,
    timestamp: new Date().toISOString(),
  };

  const updated = [newSOS, ...all];
  setStoredItem(STORAGE_KEYS.SOS, updated);

  await logAdminAction(
    params.userId,
    params.userName,
    'sos_dispatch',
    `CRITICAL: SOS Alert triggered at ${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)}`
  );

  return newSOS;
}

export async function updateSOSEventStatus(
  sosId: string,
  status: SOSEventStatus,
  responderNotes?: string,
  dispatchedTo?: string
): Promise<SOSEvent | null> {
  const all = await getSOSEvents();
  const idx = all.findIndex(s => s.id === sosId);
  if (idx === -1) return null;

  all[idx] = {
    ...all[idx],
    status,
    responderNotes: responderNotes || all[idx].responderNotes,
    dispatchedTo: dispatchedTo || all[idx].dispatchedTo,
    resolvedAt: status === 'resolved' || status === 'false_alarm' ? new Date().toISOString() : all[idx].resolvedAt,
  };

  setStoredItem(STORAGE_KEYS.SOS, all);
  await logAdminAction('admin', 'Dispatch Center', 'sos_dispatch', `SOS Event ${sosId} updated to ${status}`);
  return all[idx];
}

// ------------------------------------------------------------------
// System Settings Service
// ------------------------------------------------------------------
export async function getSystemSettings(): Promise<SystemSettings> {
  return getStoredItem<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SYSTEM_SETTINGS);
}

export async function updateSystemSettings(settings: Partial<SystemSettings>, adminEmail: string = 'admin@safecity.org'): Promise<SystemSettings> {
  const current = await getSystemSettings();
  const updated: SystemSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  setStoredItem(STORAGE_KEYS.SETTINGS, updated);

  await logAdminAction(
    adminEmail,
    adminEmail,
    'settings_change',
    `Settings updated: Engine Mode set to ${updated.engineMode}, AI Provider: ${updated.aiModelProvider}`
  );

  return updated;
}

// ------------------------------------------------------------------
// User Management & Security Validation
// ------------------------------------------------------------------
export async function getAllUsers(): Promise<UserProfile[]> {
  return getStoredItem<UserProfile[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const users = await getAllUsers();
  return users.find(u => u.uid === uid) || null;
}

// SECURITY: Users can only update displayName, phoneNumber, photoURL, and emergencyContacts.
// Role and status can NEVER be changed by the user themselves!
export async function updateUserSelfProfile(
  uid: string,
  updates: Pick<UserProfile, 'displayName' | 'phoneNumber' | 'photoURL' | 'emergencyContacts'>
): Promise<UserProfile | null> {
  const users = await getAllUsers();
  const idx = users.findIndex(u => u.uid === uid);
  if (idx === -1) return null;

  // Explicit whitelist to block role/status escalation
  users[idx] = {
    ...users[idx],
    displayName: updates.displayName || users[idx].displayName,
    phoneNumber: updates.phoneNumber || users[idx].phoneNumber,
    photoURL: updates.photoURL || users[idx].photoURL,
    emergencyContacts: updates.emergencyContacts || users[idx].emergencyContacts,
    updatedAt: new Date().toISOString(),
  };

  setStoredItem(STORAGE_KEYS.USERS, users);
  return users[idx];
}

// ADMIN-ONLY: Update role or status
export async function adminUpdateUser(
  targetUid: string,
  updates: Partial<Pick<UserProfile, 'role' | 'status'>>,
  adminEmail: string
): Promise<UserProfile | null> {
  const users = await getAllUsers();
  const idx = users.findIndex(u => u.uid === targetUid);
  if (idx === -1) return null;

  users[idx] = {
    ...users[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  setStoredItem(STORAGE_KEYS.USERS, users);
  await logAdminAction(adminEmail, adminEmail, 'user_management', `User ${targetUid} role/status updated by admin.`);
  return users[idx];
}

// ------------------------------------------------------------------
// Audit Logs Service
// ------------------------------------------------------------------
export async function getAdminLogs(): Promise<AdminLog[]> {
  return getStoredItem<AdminLog[]>(STORAGE_KEYS.LOGS, [
    {
      id: 'log-01',
      adminId: 'admin-001',
      adminEmail: 'admin@safecity.org',
      action: 'System initialized',
      category: 'settings_change',
      details: 'Safe Route and Emergency SOS system activated with Hybrid Safety Engine.',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ]);
}

export async function logAdminAction(
  adminId: string,
  adminEmail: string,
  category: AdminLog['category'],
  details: string
): Promise<void> {
  const logs = await getAdminLogs();
  const newLog: AdminLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    adminId,
    adminEmail,
    action: category.replaceAll('_', ' ').toUpperCase(),
    category,
    details,
    timestamp: new Date().toISOString(),
  };
  setStoredItem(STORAGE_KEYS.LOGS, [newLog, ...logs]);
}

// ------------------------------------------------------------------
// Live Dashboard Metrics
// ------------------------------------------------------------------
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [users, reports, cameras, sos, settings] = await Promise.all([
    getAllUsers(),
    getThreatReports(),
    getCCTVCameras(),
    getSOSEvents(),
    getSystemSettings(),
  ]);

  const verifiedThreats = reports.filter(r => r.status === 'verified').length;
  const pendingReports = reports.filter(r => r.status === 'pending' || r.status === 'under_review').length;
  const onlineCameras = cameras.filter(c => c.status === 'online').length;
  const activeSOS = sos.filter(s => s.status === 'active' || s.status === 'police_dispatched' || s.status === 'ambulance_dispatched').length;

  return {
    totalUsers: users.length,
    activeJourneysCount: 3, // Live simulated active travelers
    activeSOSEventsCount: activeSOS,
    verifiedThreatsCount: verifiedThreats,
    pendingReportsCount: pendingReports,
    onlineCamerasCount: onlineCameras,
    totalCamerasCount: cameras.length,
    averageCitySafetyScore: 89,
    engineMode: settings.engineMode,
  };
}
