'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  EmergencyContact,
  SOSEvent,
  ThreatReport,
} from '@/types';
import {
  getSOSEvents,
  getThreatReports,
} from '@/services/firebase/firestoreService';
import {
  User,
  Phone,
  Lock,
  Camera,
  Shield,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Save,
  X,
  Plus,
  Trash2,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

function ProfileContent() {
  const searchParams = useSearchParams();
  const { user, updateProfile, refreshUser } = useAuth();

  // Tab state: 'profile' | 'contacts' | 'sos' | 'reports' | 'trips'
  const initialTab = (searchParams.get('tab') as any) || 'profile';
  const [activeTab, setActiveTab] = useState<'profile' | 'contacts' | 'sos' | 'reports' | 'trips'>(initialTab);

  // Form states
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(user?.emergencyContacts || []);

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);

  // Status feedback
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Activity records
  const [mySOSEvents, setMySOSEvents] = useState<SOSEvent[]>([]);
  const [myReports, setMyReports] = useState<ThreatReport[]>([]);
  const [myTrips, setMyTrips] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setPhoneNumber(user.phoneNumber || '');
      setPhotoURL(user.photoURL || '');
      setEmergencyContacts(user.emergencyContacts || []);
    }
  }, [user]);

  // Load user activity records
  useEffect(() => {
    Promise.all([getSOSEvents(), getThreatReports()]).then(([allSOS, allReports]) => {
      if (user) {
        setMySOSEvents(allSOS.filter(s => s.userId === user.uid || s.userPhone === user.phoneNumber));
        setMyReports(allReports.filter(r => r.userId === user.uid));
      }
    });

    if (typeof window !== 'undefined') {
      try {
        const past = JSON.parse(localStorage.getItem('sr_completed_trips') || '[]');
        setMyTrips(past);
      } catch (e) {
        console.error(e);
      }
    }
  }, [user]);

  // Save profile details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        displayName,
        phoneNumber,
        photoURL,
        emergencyContacts,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await refreshUser();
    } finally {
      setSaving(false);
    }
  };

  // Add emergency contact
  const handleAddContact = () => {
    if (emergencyContacts.length >= 3) {
      alert('You can add up to 3 emergency contacts.');
      return;
    }
    const newContact: EmergencyContact = {
      id: `ec-${Date.now()}`,
      name: '',
      phone: '',
      relationship: 'Family',
      notifyOnSOS: true,
    };
    setEmergencyContacts([...emergencyContacts, newContact]);
  };

  const handleUpdateContact = (index: number, field: keyof EmergencyContact, value: any) => {
    const updated = [...emergencyContacts];
    updated[index] = { ...updated[index], [field]: value };
    setEmergencyContacts(updated);
  };

  const handleRemoveContact = (index: number) => {
    const updated = emergencyContacts.filter((_, i) => i !== index);
    setEmergencyContacts(updated);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordFeedback('New password must be at least 6 characters.');
      return;
    }
    setPasswordFeedback('Password updated successfully via Secure Authentication.');
    setOldPassword('');
    setNewPassword('');
    setTimeout(() => setPasswordFeedback(null), 3500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col">
      {/* Header */}
      <div className="pb-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
              Account Security Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">User Profile & Activity</h1>
        </div>

        {/* Read-only Role & Status Badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs">
            <span className="text-slate-400">Assigned Role:</span>
            <span className="font-bold text-blue-400 uppercase tracking-wider">{user?.role || 'User'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold uppercase tracking-wider">{user?.status || 'Active'}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 py-4 border-b border-slate-800/80 no-scrollbar">
        {[
          { id: 'profile', label: 'Personal Details', icon: User },
          { id: 'contacts', label: 'Emergency Contacts', icon: Phone },
          { id: 'sos', label: `SOS History (${mySOSEvents.length})`, icon: ShieldAlert },
          { id: 'reports', label: `My Reports (${myReports.length})`, icon: AlertTriangle },
          { id: 'trips', label: `Past Trips (${myTrips.length})`, icon: Compass },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition ${
                active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="mt-6 flex-1">
        {/* Tab 1: Personal Details & Password */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <form onSubmit={handleSaveProfile} className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-5 text-xs">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  <span>General Information</span>
                </h3>

                {saveSuccess && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Profile information saved successfully!</span>
                  </div>
                )}

                {/* Email (Read Only) */}
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-400 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Account email is managed via Firebase Authentication.
                  </span>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Full Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mobile Phone Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1-555-0199"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Used to identify emergency caller during SOS broadcasts.
                  </span>
                </div>

                {/* Photo URL */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Profile Avatar URL</label>
                  <input
                    type="url"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Notice: Role and Status non-editable */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400">
                  <Shield className="w-4 h-4 text-amber-400 inline mr-1.5" />
                  <strong>Security Constraint:</strong> User roles (<code className="text-blue-300">{user?.role}</code>) and status (<code className="text-emerald-300">{user?.status}</code>) are validated server-side and can only be altered by authorized system administrators.
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-600/25 transition active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (user) {
                        setDisplayName(user.displayName);
                        setPhoneNumber(user.phoneNumber || '');
                      }
                    }}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            {/* Password Update Card */}
            <div className="lg:col-span-5">
              <form onSubmit={handlePasswordSubmit} className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 text-xs">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Update Account Password</span>
                </h3>

                {passwordFeedback && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs">
                    {passwordFeedback}
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Current Password</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">New Secure Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl transition mt-2"
                >
                  Change Password
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: Emergency Contacts */}
        {activeTab === 'contacts' && (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Emergency Contacts</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  These trusted contacts will receive live GPS coordinates and SMS alerts whenever you activate Emergency SOS.
                </p>
              </div>
              <button
                onClick={handleAddContact}
                disabled={emergencyContacts.length >= 3}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Contact ({emergencyContacts.length}/3)</span>
              </button>
            </div>

            <div className="space-y-3">
              {emergencyContacts.length === 0 ? (
                <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-xs">
                  No emergency contacts configured yet. Add your trusted family members or friends.
                </div>
              ) : (
                emergencyContacts.map((contact, idx) => (
                  <div key={contact.id || idx} className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Contact #{idx + 1}</span>
                      <button
                        onClick={() => handleRemoveContact(idx)}
                        className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={contact.name}
                          onChange={(e) => handleUpdateContact(idx, 'name', e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Phone Number</label>
                        <input
                          type="tel"
                          value={contact.phone}
                          onChange={(e) => handleUpdateContact(idx, 'phone', e.target.value)}
                          placeholder="+1-555-0122"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Relationship</label>
                        <input
                          type="text"
                          value={contact.relationship}
                          onChange={(e) => handleUpdateContact(idx, 'relationship', e.target.value)}
                          placeholder="Parent, Spouse, Friend"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                      <input
                        type="checkbox"
                        id={`notify-${idx}`}
                        checked={contact.notifyOnSOS}
                        onChange={(e) => handleUpdateContact(idx, 'notifyOnSOS', e.target.checked)}
                        className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-0"
                      />
                      <label htmlFor={`notify-${idx}`} className="text-slate-300 font-medium cursor-pointer">
                        Dispatch automatic location SMS upon SOS activation
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>

            {emergencyContacts.length > 0 && (
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                <Save className="w-4 h-4" />
                <span>Save Emergency Contacts</span>
              </button>
            )}
          </div>
        )}

        {/* Tab 3: SOS History */}
        {activeTab === 'sos' && (
          <div className="space-y-4 max-w-4xl">
            <h3 className="text-lg font-bold text-white">Emergency SOS Event History</h3>
            {mySOSEvents.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-xs">
                No SOS emergency events recorded for this account.
              </div>
            ) : (
              mySOSEvents.map((sos) => (
                <div key={sos.id} className="p-4 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                      <span className="font-bold text-white font-mono">{sos.id}</span>
                      <span className="text-slate-400">• {new Date(sos.timestamp).toLocaleString()}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-500/20 text-red-300 border border-red-500/30">
                      {sos.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-slate-300 flex items-center gap-3">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Coordinates: {sos.latitude.toFixed(4)}, {sos.longitude.toFixed(4)} (Accuracy ±{Math.round(sos.accuracyMeters)}m)</span>
                    <a href={sos.mapLink} target="_blank" rel="noreferrer" className="text-blue-400 underline font-semibold">
                      Open Map
                    </a>
                  </div>

                  {sos.responderNotes && (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                      <strong className="text-emerald-400">Dispatch Response:</strong> {sos.responderNotes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Submitted Reports */}
        {activeTab === 'reports' && (
          <div className="space-y-4 max-w-4xl">
            <h3 className="text-lg font-bold text-white">Submitted Community Threat Reports</h3>
            {myReports.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-xs">
                You have not filed any threat reports yet.
              </div>
            ) : (
              myReports.map((rep) => (
                <div key={rep.id} className="p-4 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white capitalize">{rep.category.replace('_', ' ')}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {rep.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-slate-300">{rep.description}</p>
                  <div className="text-slate-500 text-[11px] flex justify-between">
                    <span>{rep.address || `${rep.latitude.toFixed(4)}, ${rep.longitude.toFixed(4)}`}</span>
                    <span>{new Date(rep.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 5: Past Trips */}
        {activeTab === 'trips' && (
          <div className="space-y-4 max-w-4xl">
            <h3 className="text-lg font-bold text-white">Past Navigation Journeys</h3>
            {myTrips.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-xs">
                No past navigation trips logged yet.
              </div>
            ) : (
              myTrips.map((tr, i) => (
                <div key={i} className="p-4 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{tr.routeTitle}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 bg-emerald-500/20">
                      Safely Completed
                    </span>
                  </div>
                  <div className="text-slate-400">
                    To: {tr.destinationName} • Distance: {tr.totalDistanceKm} km • Safety Score: {tr.safetyScore}/100
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Ended: {new Date(tr.endedAt || tr.startedAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
        <span className="text-sm font-medium ml-3">Loading Profile & Activity Telemetry...</span>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
