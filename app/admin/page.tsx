'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  CCTVCamera,
  CCTVAnalysis,
  SafetyZone,
  ThreatReport,
  SOSEvent,
  SystemSettings,
  UserProfile,
  AdminLog,
  DashboardMetrics,
  SafetyEngineMode,
  ReportStatus,
  SOSEventStatus,
} from '@/types';
import {
  getDashboardMetrics,
  getCCTVCameras,
  updateCameraAnalysis,
  updateCameraStatus,
  getSafetyZones,
  saveSafetyZone,
  getThreatReports,
  updateThreatReportStatus,
  getSOSEvents,
  updateSOSEventStatus,
  getSystemSettings,
  updateSystemSettings,
  getAllUsers,
  adminUpdateUser,
  getAdminLogs,
  subscribeToStore,
} from '@/services/firebase/firestoreService';
import { analyzeCCTVFeed } from '@/services/aiCctvService';
import {
  LayoutDashboard,
  ShieldAlert,
  AlertTriangle,
  Video,
  MapPin,
  Users,
  Settings,
  FileText,
  Radio,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Phone,
  Eye,
  RefreshCw,
  Plus,
  ShieldCheck,
  ChevronRight,
  Upload,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isModerator, isAdmin } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<
    'overview' | 'sos' | 'threats' | 'cctv' | 'zones' | 'users' | 'settings' | 'logs'
  >('overview');

  // Live data states (all stats live, never hardcoded!)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [cameras, setCameras] = useState<CCTVCamera[]>([]);
  const [zones, setZones] = useState<SafetyZone[]>([]);
  const [threats, setThreats] = useState<ThreatReport[]>([]);
  const [sosEvents, setSOSEvents] = useState<SOSEvent[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [logs, setLogs] = useState<AdminLog[]>([]);

  // AI Analysis testing modal / state
  const [analyzingCamId, setAnalyzingCamId] = useState<string | null>(null);
  const [customInputType, setCustomInputType] = useState<'image' | 'video'>('video');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  // Load all live state
  const loadDashboardData = useCallback(async () => {
    const [m, c, z, t, s, u, st, l] = await Promise.all([
      getDashboardMetrics(),
      getCCTVCameras(),
      getSafetyZones(),
      getThreatReports(),
      getSOSEvents(),
      getAllUsers(),
      getSystemSettings(),
      getAdminLogs(),
    ]);

    setMetrics(m);
    setCameras(c);
    setZones(z);
    setThreats(t);
    setSOSEvents(s);
    setUsersList(u);
    setSettings(st);
    setLogs(l);
  }, []);

  useEffect(() => {
    loadDashboardData();

    // Subscribe to live updates
    const unsubs = [
      subscribeToStore('sr_threat_reports', () => loadDashboardData()),
      subscribeToStore('sr_sos_events', () => loadDashboardData()),
      subscribeToStore('sr_cctv_cameras', () => loadDashboardData()),
      subscribeToStore('sr_system_settings', () => loadDashboardData()),
    ];

    return () => {
      unsubs.forEach(u => u());
    };
  }, [loadDashboardData]);

  // Threat review action
  const handleModerateThreat = async (
    reportId: string,
    status: ReportStatus,
    notes: string
  ) => {
    await updateThreatReportStatus(reportId, status, user?.email || 'admin@safecity.org', notes);
    await loadDashboardData();
  };

  // SOS status update action
  const handleUpdateSOS = async (
    sosId: string,
    status: SOSEventStatus,
    notes: string
  ) => {
    await updateSOSEventStatus(sosId, status, notes, 'Central Police Sector');
    await loadDashboardData();
  };

  // Run AI analysis on camera feed (accepts both image and video!)
  const handleTriggerAI = async (cam: CCTVCamera) => {
    setAnalyzingCamId(cam.id);
    setAiFeedback(null);
    try {
      const analysis = await analyzeCCTVFeed({
        cameraId: cam.id,
        cameraCode: cam.cameraCode,
        sourceType: customInputType,
        dataUrlOrStream: cam.streamUrl,
      });

      await updateCameraAnalysis(cam.id, analysis);
      setAiFeedback(`AI analysis complete: ${analysis.humanCount} pedestrians detected. Lighting ${analysis.lightingScore}/100.`);
      await loadDashboardData();
    } finally {
      setAnalyzingCamId(null);
    }
  };

  // Switch engine mode
  const handleSwitchEngine = async (mode: SafetyEngineMode) => {
    if (!settings) return;
    await updateSystemSettings({ engineMode: mode }, user?.email);
    await loadDashboardData();
  };

  // User role/status update
  const handleUpdateUserRole = async (targetUid: string, role: any, status: any) => {
    await adminUpdateUser(targetUid, { role, status }, user?.email || 'admin@safecity.org');
    await loadDashboardData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col">
      {/* Top Header */}
      <div className="pb-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
              Command Dispatch & Surveillance
            </span>
            <span className="text-xs text-slate-400">
              Operator: <strong className="text-white">{user?.displayName || 'Chief Admin'}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">Admin Command Center</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Sync Live Telemetry</span>
          </button>
        </div>
      </div>

      {/* Admin Subtabs Bar */}
      <div className="flex overflow-x-auto gap-2 py-4 border-b border-slate-800/80 no-scrollbar">
        {[
          { id: 'overview', label: 'City Overview', icon: LayoutDashboard },
          { id: 'sos', label: `SOS Dispatch (${sosEvents.filter(s => s.status !== 'resolved' && s.status !== 'false_alarm').length})`, icon: ShieldAlert },
          { id: 'threats', label: `Threat Moderation (${threats.filter(t => t.status === 'pending' || t.status === 'under_review').length})`, icon: AlertTriangle },
          { id: 'cctv', label: `AI CCTV Surveillance (${cameras.length})`, icon: Video },
          { id: 'zones', label: `Safety Zones (${zones.length})`, icon: MapPin },
          { id: 'users', label: `Users & Roles (${usersList.length})`, icon: Users },
          { id: 'settings', label: 'Engine & Hotlines', icon: Settings },
          { id: 'logs', label: 'Audit Trail', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition ${
                active
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="mt-6 flex-1">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Total Users</span>
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-3xl font-extrabold text-white mt-2">
                  {metrics?.totalUsers ?? usersList.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Registered citizen profiles</div>
              </div>

              <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Open SOS Alerts</span>
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-3xl font-extrabold text-red-400 mt-2">
                  {metrics?.activeSOSEventsCount ?? 0}
                </div>
                <div className="text-[11px] text-red-400/80 mt-1">Requires immediate response</div>
              </div>

              <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Active Cameras</span>
                  <Video className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold text-emerald-400 mt-2">
                  {cameras.filter(c => c.status === 'online').length} / {cameras.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Streaming AI vision feeds</div>
              </div>

              <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">Verified Threats</span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-extrabold text-amber-400 mt-2">
                  {threats.filter(t => t.status === 'verified').length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Actively penalizing routes</div>
              </div>
            </div>

            {/* Quick Engine Switcher Banner */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400">Dual Engine Arbiter</span>
                <h3 className="text-lg font-bold text-white mt-0.5">Active Safety Score Engine Mode</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Switches how citywide routes compute safety scores without modifying application logic.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {(['manual', 'ai_cctv', 'hybrid'] as SafetyEngineMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleSwitchEngine(mode)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition ${
                      settings?.engineMode === mode
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {mode.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Emergency Alerts preview */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Latest Emergency Dispatches</h3>
              {sosEvents.slice(0, 3).map((sos) => (
                <div key={sos.id} className="p-4 rounded-3xl bg-slate-900/50 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center font-bold">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white">{sos.userName} ({sos.userPhone})</div>
                      <div className="text-slate-400 text-[11px]">{sos.latitude.toFixed(4)}, {sos.longitude.toFixed(4)} • {new Date(sos.timestamp).toLocaleTimeString()}</div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-red-500/20 text-red-300 border border-red-500/30">
                    {sos.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: SOS DISPATCH */}
        {activeTab === 'sos' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Emergency SOS Dispatch Center</h3>
            <div className="space-y-3">
              {sosEvents.map((sos) => (
                <div key={sos.id} className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center font-bold">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white">{sos.userName}</h4>
                        <div className="text-slate-400">Phone: {sos.userPhone} • Pinned: {new Date(sos.timestamp).toLocaleString()}</div>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30 self-start sm:self-auto">
                      {sos.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span className="font-mono text-slate-300">{sos.latitude.toFixed(5)}, {sos.longitude.toFixed(5)} (±{Math.round(sos.accuracyMeters)}m)</span>
                    </div>
                    <a
                      href={sos.mapLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 font-bold hover:underline"
                    >
                      View on Google Maps
                    </a>
                  </div>

                  {sos.notifiedContacts.length > 0 && (
                    <div className="text-slate-400 text-[11px]">
                      <strong>Contacts Alerted:</strong> {sos.notifiedContacts.join(' • ')}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleUpdateSOS(sos.id, 'police_dispatched', 'Patrol unit Alpha-1 rerouted.')}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition"
                    >
                      Dispatch Police
                    </button>
                    <button
                      onClick={() => handleUpdateSOS(sos.id, 'ambulance_dispatched', 'Ambulance Unit 108 rerouted.')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition"
                    >
                      Dispatch Ambulance
                    </button>
                    <button
                      onClick={() => handleUpdateSOS(sos.id, 'resolved', 'Verified safe on ground by responders.')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition"
                    >
                      Mark Resolved
                    </button>
                    <button
                      onClick={() => handleUpdateSOS(sos.id, 'false_alarm', 'Caller notified accidental press.')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                    >
                      False Alarm
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: THREAT MODERATION */}
        {activeTab === 'threats' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Threat Reports Moderation</h3>
                <p className="text-slate-400 text-xs">
                  Review and verify community incident submissions. Only verified reports feed into route scoring!
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {threats.map((report) => (
                <div key={report.id} className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm capitalize">{report.category.replace('_', ' ')}</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {report.severity}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px] mt-0.5">
                        Reported by {report.userName} • {new Date(report.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      report.status === 'verified' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                      report.status === 'rejected' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                      'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}>
                      {report.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed">{report.description}</p>

                  {report.imageUrl && (
                    <div className="w-48 h-28 rounded-2xl overflow-hidden border border-slate-800">
                      <img src={report.imageUrl} alt="Proof" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    <span>{report.address || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}</span>
                  </div>

                  {/* Moderation Workflow Controls */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => handleModerateThreat(report.id, 'verified', 'Confirmed by patrol. Incorporated into routing engine.')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition"
                    >
                      Verify & Incorporate
                    </button>
                    <button
                      onClick={() => handleModerateThreat(report.id, 'under_review', 'Dispatched field inspector.')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition"
                    >
                      Mark Under Review
                    </button>
                    <button
                      onClick={() => handleModerateThreat(report.id, 'rejected', 'Deemed non-hazardous or duplicate.')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                    >
                      Reject Report
                    </button>
                    <button
                      onClick={() => handleModerateThreat(report.id, 'resolved', 'Hazard cleared by municipal crew.')}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AI & CCTV SURVEILLANCE */}
        {activeTab === 'cctv' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">AI CCTV Vision Grid</h3>
                <p className="text-slate-400 text-xs">
                  Multimodal surveillance engine analyzing both image frames and video streams for human density, lumen metrics, and hazard anomalies.
                </p>
              </div>

              {/* Source format switcher */}
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
                <span className="text-slate-400 px-2">Analyze Format:</span>
                <button
                  onClick={() => setCustomInputType('video')}
                  className={`px-3 py-1 rounded-xl font-bold uppercase transition ${
                    customInputType === 'video' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Video Stream
                </button>
                <button
                  onClick={() => setCustomInputType('image')}
                  className={`px-3 py-1 rounded-xl font-bold uppercase transition ${
                    customInputType === 'image' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Snapshot Image
                </button>
              </div>
            </div>

            {aiFeedback && (
              <div className="p-3 rounded-2xl bg-blue-950/60 border border-blue-500/40 text-blue-300 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{aiFeedback}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cameras.map((cam) => {
                const isAnalyzing = analyzingCamId === cam.id;
                const last = cam.lastAnalysis;

                return (
                  <div key={cam.id} className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 text-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{cam.name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-slate-800 text-blue-400">
                            {cam.cameraCode}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{cam.address}</div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        cam.status === 'online' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {cam.status}
                      </span>
                    </div>

                    {/* Camera Feed Preview thumbnail */}
                    <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-slate-800 bg-black">
                      <img src={cam.streamUrl} alt={cam.name} className="w-full h-full object-cover opacity-85" />
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        <span>LIVE 1080P • FOV {cam.fieldOfViewAngle}°</span>
                      </div>
                    </div>

                    {/* Last AI Telemetry */}
                    {last ? (
                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-1.5 bg-slate-900 rounded-xl">
                            <span className="text-[10px] text-slate-500 block">Humans</span>
                            <span className="font-bold text-white">{last.humanCount} detected</span>
                          </div>
                          <div className="p-1.5 bg-slate-900 rounded-xl">
                            <span className="text-[10px] text-slate-500 block">Lighting</span>
                            <span className="font-bold text-blue-400">{last.lightingScore}/100</span>
                          </div>
                          <div className="p-1.5 bg-slate-900 rounded-xl">
                            <span className="text-[10px] text-slate-500 block">AI Safety</span>
                            <span className="font-bold text-emerald-400">{last.safetyScoreContribution}/100</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-snug">{last.notes}</p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-slate-500 text-center">
                        Awaiting initial computer vision inference
                      </div>
                    )}

                    {/* Trigger AI Action */}
                    <button
                      onClick={() => handleTriggerAI(cam)}
                      disabled={isAnalyzing}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
                    >
                      {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{isAnalyzing ? 'Running AI Vision...' : `Run AI Analysis (${customInputType.toUpperCase()})`}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: SAFETY ZONES */}
        {activeTab === 'zones' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Municipal Safety Zones & Road Geofences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {zones.map((zone) => (
                <div key={zone.id} className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{zone.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      zone.type === 'safe_corridor' ? 'bg-emerald-500/20 text-emerald-400' :
                      zone.type === 'police_patrol_sector' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {zone.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-slate-400">{zone.description}</p>
                  <div className="flex justify-between text-slate-500 text-[11px] pt-2 border-t border-slate-800">
                    <span>Radius: {zone.radiusMeters}m</span>
                    <span>Base Score: {zone.baseScore}/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: USERS & ROLES */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Registered Users & Role Management</h3>
            <div className="space-y-3">
              {usersList.map((u) => (
                <div key={u.uid} className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-white text-sm">{u.displayName}</div>
                    <div className="text-slate-400">{u.email} • {u.phoneNumber || 'No phone'}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateUserRole(u.uid, e.target.value, u.status)}
                      className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold"
                    >
                      <option value="user">User</option>
                      <option value="safety_moderator">Safety Moderator</option>
                      <option value="admin">Administrator</option>
                    </select>

                    <button
                      onClick={() => handleUpdateUserRole(u.uid, u.role, u.status === 'active' ? 'suspended' : 'active')}
                      className={`px-3 py-1.5 rounded-xl font-bold uppercase text-[10px] ${
                        u.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {u.status}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: SETTINGS & HOTLINES */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4 text-xs">
              <h3 className="text-base font-bold text-white">Emergency Services Telephone Hotlines</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Police Dispatch Number</label>
                  <input
                    type="text"
                    value={settings?.emergencyNumbers.police || '112'}
                    onChange={(e) => {
                      if (settings) {
                        setSettings({
                          ...settings,
                          emergencyNumbers: { ...settings.emergencyNumbers, police: e.target.value },
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Ambulance Number</label>
                  <input
                    type="text"
                    value={settings?.emergencyNumbers.ambulance || '108'}
                    onChange={(e) => {
                      if (settings) {
                        setSettings({
                          ...settings,
                          emergencyNumbers: { ...settings.emergencyNumbers, ambulance: e.target.value },
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (settings) {
                    updateSystemSettings(settings, user?.email);
                    alert('System hotlines saved successfully.');
                  }
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md transition"
              >
                Save Emergency Settings
              </button>
            </div>
          </div>
        )}

        {/* TAB 8: AUDIT TRAIL */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">System Audit & Dispatch Logs</h3>
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{log.action}</span>
                      <span className="text-[10px] text-slate-500 font-mono">by {log.adminEmail}</span>
                    </div>
                    <p className="text-slate-400">{log.details}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
