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
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  QueryConstraint,
} from 'firebase/firestore';
import { auth, db } from './firebaseClient';

// ==================================================================
// Storage backend
// ------------------------------------------------------------------
// - Firebase configured (`db` set): everything is read from / written to
//   Cloud Firestore, shared across all devices and protected by
//   firebase/firestore.rules.
// - Demo mode (no Firebase keys): data lives in this browser's localStorage,
//   seeded from lib/mockData. Nothing is shared between devices.
// ==================================================================

// Store keys (also the localStorage keys) and their Firestore collections
export const STORAGE_KEYS = {
  CAMERAS: 'sr_cctv_cameras',
  ZONES: 'sr_safety_zones',
  REPORTS: 'sr_threat_reports',
  SETTINGS: 'sr_system_settings',
  USERS: 'sr_users',
  SOS: 'sr_sos_events',
  LOGS: 'sr_admin_logs',
} as const;

const COLLECTIONS: Record<string, string> = {
  [STORAGE_KEYS.CAMERAS]: 'cctvCameras',
  [STORAGE_KEYS.ZONES]: 'safetyZones',
  [STORAGE_KEYS.REPORTS]: 'reports',
  [STORAGE_KEYS.SETTINGS]: 'systemSettings',
  [STORAGE_KEYS.USERS]: 'users',
  [STORAGE_KEYS.SOS]: 'sosEvents',
  [STORAGE_KEYS.LOGS]: 'adminLogs',
};

const SETTINGS_DOC_ID = 'global';

const DEFAULT_ADMIN_LOGS: AdminLog[] = [
  {
    id: 'log-01',
    adminId: 'admin-001',
    adminEmail: 'admin@safecity.org',
    action: 'System initialized',
    category: 'settings_change',
    details: 'Safe Route and Emergency SOS system activated with Hybrid Safety Engine.',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

// ------------------------------------------------------------------
// Local (demo) subscriber pattern
// ------------------------------------------------------------------
type ListenerCallback<T> = (data: T) => void;
const subscribers: Record<string, Set<ListenerCallback<unknown>>> = {};

function notifySubscribers(key: string, data: unknown) {
  subscribers[key]?.forEach(cb => {
    try {
      cb(data);
    } catch (err) {
      console.error('Subscriber callback error:', err);
    }
  });
}

/**
 * Subscribe to changes of one store (use a STORAGE_KEYS value).
 * Firestore mode: real-time listener, fires on changes from ANY device.
 * Demo mode: fires on changes made in this browser tab.
 */
export function subscribeToStore<T>(key: string, callback: ListenerCallback<T>): () => void {
  if (db && COLLECTIONS[key]) {
    return onSnapshot(
      collection(db, COLLECTIONS[key]),
      snap => callback(snap.docs.map(d => d.data()) as unknown as T),
      err => console.warn(`Live updates for ${key} unavailable:`, err.message)
    );
  }

  if (!subscribers[key]) subscribers[key] = new Set();
  subscribers[key].add(callback as ListenerCallback<unknown>);
  return () => {
    subscribers[key]?.delete(callback as ListenerCallback<unknown>);
  };
}

// ------------------------------------------------------------------
// localStorage helpers (demo mode)
// ------------------------------------------------------------------
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
// Generic document helpers that work on both backends.
// `idField` is the property holding the document id ('id', or 'uid' for users).
// ------------------------------------------------------------------
async function listDocs<T>(
  key: string,
  localDefault: T[],
  options: { firestoreDefault?: T[]; constraints?: QueryConstraint[] } = {}
): Promise<T[]> {
  if (db) {
    const snap = await getDocs(query(collection(db, COLLECTIONS[key]), ...(options.constraints ?? [])));
    const docs = snap.docs.map(d => d.data() as T);
    // Config collections (cameras, zones) fall back to the built-in defaults
    // until an admin saves real data.
    return docs.length === 0 && options.firestoreDefault ? options.firestoreDefault : docs;
  }
  return getStoredItem<T[]>(key, localDefault);
}

async function getDocById<T>(key: string, id: string, localDefault: T[], idField: keyof T): Promise<T | null> {
  if (db) {
    const snap = await getDoc(doc(db, COLLECTIONS[key], id));
    return snap.exists() ? (snap.data() as T) : null;
  }
  const all = getStoredItem<T[]>(key, localDefault);
  return all.find(item => item[idField] === id) ?? null;
}

/** Create or fully replace a document. New local documents are added at the front. */
async function putDoc<T>(key: string, item: T, localDefault: T[], idField: keyof T): Promise<void> {
  const id = String(item[idField]);
  if (db) {
    await setDoc(doc(db, COLLECTIONS[key], id), item as Record<string, unknown>);
    return;
  }
  const all = getStoredItem<T[]>(key, localDefault);
  const idx = all.findIndex(x => x[idField] === item[idField]);
  if (idx === -1) all.unshift(item);
  else all[idx] = item;
  setStoredItem(key, all);
}

/** Update some fields of an existing document. Returns the updated document, or null if missing. */
async function patchDoc<T>(
  key: string,
  id: string,
  changes: Partial<T>,
  localDefault: T[],
  idField: keyof T,
  firestoreDefault?: T[]
): Promise<T | null> {
  if (db) {
    const ref = doc(db, COLLECTIONS[key], id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, changes as Record<string, unknown>);
      return { ...(snap.data() as T), ...changes };
    }
    // Document only exists as a built-in default (e.g. a seed camera): save it in full
    const base = firestoreDefault?.find(x => String(x[idField]) === id);
    if (!base) return null;
    const merged = { ...base, ...changes };
    await setDoc(ref, merged as Record<string, unknown>);
    return merged;
  }
  const all = getStoredItem<T[]>(key, localDefault);
  const idx = all.findIndex(x => String(x[idField]) === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...changes };
  setStoredItem(key, all);
  return all[idx];
}

const nowIso = () => new Date().toISOString();

// ------------------------------------------------------------------
// Threat Reports Service
// ------------------------------------------------------------------
export async function getThreatReports(): Promise<ThreatReport[]> {
  return listDocs<ThreatReport>(STORAGE_KEYS.REPORTS, INITIAL_THREAT_REPORTS, {
    constraints: db ? [orderBy('createdAt', 'desc')] : [],
  });
}

export async function getVerifiedThreats(): Promise<ThreatReport[]> {
  // CRITICAL REQUIREMENT: Only verified reports feed into route scoring!
  if (db) {
    return listDocs<ThreatReport>(STORAGE_KEYS.REPORTS, [], { constraints: [where('status', '==', 'verified')] });
  }
  const all = await getThreatReports();
  return all.filter(r => r.status === 'verified');
}

export async function createThreatReport(
  reportData: Omit<ThreatReport, 'id' | 'status' | 'upvotes' | 'createdAt' | 'updatedAt'>
): Promise<ThreatReport> {
  const newReport: ThreatReport = {
    ...reportData,
    id: `rep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    status: 'pending', // Starts at pending workflow
    upvotes: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await putDoc(STORAGE_KEYS.REPORTS, newReport, INITIAL_THREAT_REPORTS, 'id');
  await logAdminAction('system', 'System', 'threat_moderation', `New threat reported: ${newReport.category} at ${newReport.address || 'GPS Location'}`);
  return newReport;
}

export async function updateThreatReportStatus(
  reportId: string,
  status: ReportStatus,
  reviewerEmail: string,
  verificationNotes?: string
): Promise<ThreatReport | null> {
  const changes: Partial<ThreatReport> = {
    status,
    reviewedBy: reviewerEmail,
    reviewedAt: nowIso(),
    updatedAt: nowIso(),
  };
  if (verificationNotes) changes.verificationNotes = verificationNotes;

  const updated = await patchDoc<ThreatReport>(STORAGE_KEYS.REPORTS, reportId, changes, INITIAL_THREAT_REPORTS, 'id');
  if (!updated) return null;

  await logAdminAction(
    reviewerEmail,
    reviewerEmail,
    'threat_moderation',
    `Report ${reportId} marked as ${status}. ${status === 'verified' ? 'Now factored into route safety scores.' : ''}`
  );
  return updated;
}

// ------------------------------------------------------------------
// Safety Zones Service
// ------------------------------------------------------------------
export async function getSafetyZones(): Promise<SafetyZone[]> {
  return listDocs<SafetyZone>(STORAGE_KEYS.ZONES, INITIAL_SAFETY_ZONES, { firestoreDefault: INITIAL_SAFETY_ZONES });
}

export async function saveSafetyZone(zone: Omit<SafetyZone, 'id' | 'updatedAt'>, existingId?: string): Promise<SafetyZone> {
  if (existingId) {
    const updated = await patchDoc<SafetyZone>(
      STORAGE_KEYS.ZONES,
      existingId,
      { ...zone, updatedAt: nowIso() },
      INITIAL_SAFETY_ZONES,
      'id',
      INITIAL_SAFETY_ZONES
    );
    if (updated) return updated;
  }

  const newZone: SafetyZone = { ...zone, id: `zone-${Date.now()}`, updatedAt: nowIso() };
  await putDoc(STORAGE_KEYS.ZONES, newZone, INITIAL_SAFETY_ZONES, 'id');
  return newZone;
}

// ------------------------------------------------------------------
// CCTV Cameras & AI Service
// ------------------------------------------------------------------
export async function getCCTVCameras(): Promise<CCTVCamera[]> {
  return listDocs<CCTVCamera>(STORAGE_KEYS.CAMERAS, INITIAL_CAMERAS, { firestoreDefault: INITIAL_CAMERAS });
}

export async function updateCameraAnalysis(cameraId: string, analysis: CCTVAnalysis): Promise<CCTVCamera | null> {
  return patchDoc<CCTVCamera>(
    STORAGE_KEYS.CAMERAS,
    cameraId,
    { lastAnalysis: analysis, updatedAt: nowIso() },
    INITIAL_CAMERAS,
    'id',
    INITIAL_CAMERAS
  );
}

export async function updateCameraStatus(cameraId: string, status: 'online' | 'degraded' | 'offline'): Promise<void> {
  await patchDoc<CCTVCamera>(
    STORAGE_KEYS.CAMERAS,
    cameraId,
    { status, updatedAt: nowIso() },
    INITIAL_CAMERAS,
    'id',
    INITIAL_CAMERAS
  );
}

// ------------------------------------------------------------------
// SOS Events Service
// ------------------------------------------------------------------
/**
 * All SOS events (moderators/admins), or only one user's events when `userId` is given.
 * In Firestore mode regular users may only read their own events.
 */
export async function getSOSEvents(userId?: string): Promise<SOSEvent[]> {
  if (db) {
    const constraints: QueryConstraint[] = userId
      ? [where('userId', '==', userId)]
      : [orderBy('timestamp', 'desc')];
    const events = await listDocs<SOSEvent>(STORAGE_KEYS.SOS, [], { constraints });
    return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
  const all = getStoredItem<SOSEvent[]>(STORAGE_KEYS.SOS, INITIAL_SOS_EVENTS);
  return userId ? all.filter(s => s.userId === userId) : all;
}

export async function createSOSEvent(params: {
  userId: string;
  userName: string;
  userPhone: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  notifiedContacts: string[];
  locationSource?: 'gps' | 'unavailable';
}): Promise<SOSEvent> {
  const newSOS: SOSEvent = {
    id: `sos-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: params.userId,
    userName: params.userName,
    userPhone: params.userPhone,
    latitude: params.latitude,
    longitude: params.longitude,
    accuracyMeters: params.accuracyMeters,
    locationSource: params.locationSource ?? 'gps',
    status: 'active',
    mapLink: params.locationSource === 'unavailable' ? '' : `https://maps.google.com/?q=${params.latitude},${params.longitude}`,
    notifiedContacts: params.notifiedContacts,
    timestamp: nowIso(),
  };

  // The SOS itself must be saved; a failure here is reported to the caller.
  await putDoc(STORAGE_KEYS.SOS, newSOS, INITIAL_SOS_EVENTS, 'id');

  await logAdminAction(
    params.userId,
    params.userName,
    'sos_dispatch',
    params.locationSource === 'unavailable'
      ? `CRITICAL: SOS Alert triggered — GPS LOCATION UNAVAILABLE, contact caller at ${params.userPhone}`
      : `CRITICAL: SOS Alert triggered at ${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)}`
  );

  return newSOS;
}

export async function updateSOSEventStatus(
  sosId: string,
  status: SOSEventStatus,
  responderNotes?: string,
  dispatchedTo?: string
): Promise<SOSEvent | null> {
  const changes: Partial<SOSEvent> = { status };
  if (responderNotes) changes.responderNotes = responderNotes;
  if (dispatchedTo) changes.dispatchedTo = dispatchedTo;
  if (status === 'resolved' || status === 'false_alarm') changes.resolvedAt = nowIso();

  const updated = await patchDoc<SOSEvent>(STORAGE_KEYS.SOS, sosId, changes, INITIAL_SOS_EVENTS, 'id');
  if (!updated) return null;

  await logAdminAction('admin', 'Dispatch Center', 'sos_dispatch', `SOS Event ${sosId} updated to ${status}`);
  return updated;
}

// ------------------------------------------------------------------
// System Settings Service (single document)
// ------------------------------------------------------------------
export async function getSystemSettings(): Promise<SystemSettings> {
  if (db) {
    try {
      const snap = await getDoc(doc(db, COLLECTIONS[STORAGE_KEYS.SETTINGS], SETTINGS_DOC_ID));
      return snap.exists() ? { ...INITIAL_SYSTEM_SETTINGS, ...(snap.data() as SystemSettings) } : INITIAL_SYSTEM_SETTINGS;
    } catch (err) {
      console.warn('Could not load system settings, using defaults:', err);
      return INITIAL_SYSTEM_SETTINGS;
    }
  }
  return getStoredItem<SystemSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SYSTEM_SETTINGS);
}

export async function updateSystemSettings(settings: Partial<SystemSettings>, adminEmail: string = 'admin@safecity.org'): Promise<SystemSettings> {
  const current = await getSystemSettings();
  const updated: SystemSettings = { ...current, ...settings, updatedAt: nowIso() };

  if (db) {
    await setDoc(doc(db, COLLECTIONS[STORAGE_KEYS.SETTINGS], SETTINGS_DOC_ID), updated);
  } else {
    setStoredItem(STORAGE_KEYS.SETTINGS, updated);
  }

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
  return listDocs<UserProfile>(STORAGE_KEYS.USERS, INITIAL_USERS);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  return getDocById<UserProfile>(STORAGE_KEYS.USERS, uid, INITIAL_USERS, 'uid');
}

/** Create the profile document for a newly registered user. */
export async function createUserProfile(profile: UserProfile): Promise<void> {
  await putDoc(STORAGE_KEYS.USERS, profile, INITIAL_USERS, 'uid');
}

// SECURITY: Users can only update displayName, phoneNumber, photoURL, and emergencyContacts.
// Role and status can NEVER be changed by the user themselves (also enforced by Firestore rules).
export async function updateUserSelfProfile(
  uid: string,
  updates: Pick<UserProfile, 'displayName' | 'phoneNumber' | 'photoURL' | 'emergencyContacts'>
): Promise<UserProfile | null> {
  const current = await getUserProfile(uid);
  if (!current) return null;

  // Explicit whitelist to block role/status escalation.
  // displayName must not be blank; the other fields may be cleared with ''.
  const changes: Partial<UserProfile> = {
    displayName: updates.displayName?.trim() || current.displayName,
    phoneNumber: updates.phoneNumber ?? current.phoneNumber ?? '',
    photoURL: updates.photoURL ?? current.photoURL ?? '',
    emergencyContacts: updates.emergencyContacts ?? current.emergencyContacts,
    updatedAt: nowIso(),
  };

  return patchDoc<UserProfile>(STORAGE_KEYS.USERS, uid, changes, INITIAL_USERS, 'uid');
}

// ADMIN-ONLY: Update role or status (enforced by Firestore rules in Firestore mode)
export async function adminUpdateUser(
  targetUid: string,
  updates: Partial<Pick<UserProfile, 'role' | 'status'>>,
  adminEmail: string
): Promise<UserProfile | null> {
  const updated = await patchDoc<UserProfile>(
    STORAGE_KEYS.USERS,
    targetUid,
    { ...updates, updatedAt: nowIso() },
    INITIAL_USERS,
    'uid'
  );
  if (!updated) return null;

  await logAdminAction(adminEmail, adminEmail, 'user_management', `User ${targetUid} role/status updated by admin.`);
  return updated;
}

// ------------------------------------------------------------------
// Audit Logs Service
// ------------------------------------------------------------------
export async function getAdminLogs(): Promise<AdminLog[]> {
  return listDocs<AdminLog>(STORAGE_KEYS.LOGS, DEFAULT_ADMIN_LOGS, {
    constraints: db ? [orderBy('timestamp', 'desc')] : [],
  });
}

/**
 * Append an audit log entry. Never throws: a failed log write must not
 * break the action being logged (e.g. an SOS from a signed-out user).
 * In Firestore mode the entry is attributed to the signed-in Firebase user,
 * so it cannot be written under someone else's id.
 */
export async function logAdminAction(
  adminId: string,
  adminEmail: string,
  category: AdminLog['category'],
  details: string
): Promise<void> {
  try {
    const firebaseUser = auth?.currentUser;
    if (db && !firebaseUser) return; // rules only allow signed-in users to write logs

    const newLog: AdminLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      adminId: firebaseUser?.uid ?? adminId,
      adminEmail: firebaseUser?.email ?? adminEmail,
      action: category.replaceAll('_', ' ').toUpperCase(),
      category,
      details,
      timestamp: nowIso(),
    };
    await putDoc(STORAGE_KEYS.LOGS, newLog, DEFAULT_ADMIN_LOGS, 'id');
  } catch (err) {
    console.warn('Audit log write failed:', err);
  }
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
