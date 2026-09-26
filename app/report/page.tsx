'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import {
  ThreatCategory,
  ThreatSeverity,
  ThreatReport,
} from '@/types';
import {
  createThreatReport,
  getThreatReports,
} from '@/services/firebase/firestoreService';
import {
  AlertTriangle,
  MapPin,
  Camera,
  CheckCircle2,
  Clock,
  ShieldCheck,
  XCircle,
  HelpCircle,
  Loader2,
  Upload,
} from 'lucide-react';

export default function ThreatReportPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { coords: gpsCoords, loading: gpsLoading } = useGeolocation();

  // Form states
  const [category, setCategory] = useState<ThreatCategory>('poor_lighting');
  const [severity, setSeverity] = useState<ThreatSeverity>('moderate');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Existing reports feed
  const [recentReports, setRecentReports] = useState<ThreatReport[]>([]);

  useEffect(() => {
    getThreatReports().then(setRecentReports);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    try {
      const newRep = await createThreatReport({
        userId: user?.uid || 'anonymous-citizen',
        userName: user?.displayName || 'Citizen Reporter',
        category,
        severity,
        description,
        latitude: gpsCoords?.lat || 12.9716,
        longitude: gpsCoords?.lng || 77.5946,
        address: address || 'Reported via Live GPS Location',
        imageUrl: imagePreview || undefined,
      });

      setSuccessMessage('Threat Report submitted successfully! It has entered the verification workflow.');
      setDescription('');
      setAddress('');
      setImagePreview(null);
      // Refresh reports
      const updated = await getThreatReports();
      setRecentReports(updated);
    } catch (err: any) {
      console.error('Error filing report:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col">
      {/* Header */}
      <div className="pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            Community Safety Grid
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">Report a Safety Hazard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Submit hazards, broken lighting, or suspicious activity. Verified reports are incorporated into citywide navigation safety scores.
        </p>
      </div>

      {/* Verification Lifecycle Notice */}
      <div className="my-6 p-4 rounded-3xl bg-blue-950/30 border border-blue-500/30 text-xs text-slate-300">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-blue-300 text-sm">Strict Verification Lifecycle</h4>
            <p className="mt-1 leading-relaxed text-slate-300">
              To prevent false routing disruptions, reports advance through a validation lifecycle:
              <strong className="text-white"> Pending &rarr; Under Review &rarr; Verified / Rejected &rarr; Resolved</strong>.
              Only <span className="text-emerald-400 font-bold">Verified</span> reports penalize route safety scores.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-6">
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Submit Hazard Report</span>
            </h2>

            {successMessage && (
              <div className="mb-4 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Category */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Hazard Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ThreatCategory)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="poor_lighting">Poor or Broken Street Lighting</option>
                  <option value="suspicious_activity">Suspicious Activity / Loitering</option>
                  <option value="harassment">Harassment or Unsafe Group</option>
                  <option value="blocked_route">Physical Hazard / Blocked Pedestrian Walkway</option>
                  <option value="wildlife_hazard">Aggressive Animals / Wildlife</option>
                  <option value="isolated_area">Desolate or Blind Corridor</option>
                  <option value="other">Other Safety Concern</option>
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Severity Level</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'moderate', 'high', 'critical'] as ThreatSeverity[]).map((lvl) => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setSeverity(lvl)}
                      className={`py-2 px-2 rounded-xl uppercase font-bold text-[10px] tracking-wider border transition ${
                        severity === lvl
                          ? lvl === 'critical'
                            ? 'bg-red-600 text-white border-red-500'
                            : lvl === 'high'
                            ? 'bg-orange-600 text-white border-orange-500'
                            : lvl === 'moderate'
                            ? 'bg-amber-600 text-white border-amber-500'
                            : 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Detailed Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the condition, exact landmarks, or immediate hazards..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Street Address / Landmark</label>
                <div className="relative">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Near 4th Cross and Main Road"
                    className="w-full pl-3.5 pr-20 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
                  />
                  <div className="absolute right-2 top-1.5">
                    <span className="text-[10px] font-mono bg-blue-950 text-blue-300 px-2 py-1 rounded-lg border border-blue-800 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      {gpsCoords ? `${gpsCoords.lat.toFixed(3)}, ${gpsCoords.lng.toFixed(3)}` : 'GPS'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Evidence Photo (Optional)</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl cursor-pointer text-slate-300 text-xs transition">
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>Choose Photo</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                  {imagePreview && (
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-700">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImagePreview(null)}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center text-[10px] font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-amber-600/20 transition active:scale-95 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{submitting ? 'Transmitting Report...' : 'File Community Report'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Recent Community Reports Feed */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Live Community Reports Feed</span>
            </h3>
            <span className="text-xs text-slate-500">{recentReports.length} reports</span>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {recentReports.map((report) => {
              const isVerified = report.status === 'verified';
              const isPending = report.status === 'pending';
              const isUnderReview = report.status === 'under_review';
              const isResolved = report.status === 'resolved';

              return (
                <div
                  key={report.id}
                  className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white capitalize">
                        {report.category.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        report.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        report.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {report.severity}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1 ${
                      isVerified ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                      isUnderReview ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                      isResolved ? 'bg-slate-700 text-slate-300' :
                      'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      {isVerified && <ShieldCheck className="w-3 h-3" />}
                      {isPending && <Clock className="w-3 h-3" />}
                      <span>{report.status.replace('_', ' ')}</span>
                    </span>
                  </div>

                  <p className="text-slate-300">{report.description}</p>

                  {report.imageUrl && (
                    <div className="mt-2 w-full h-32 rounded-2xl overflow-hidden border border-slate-800">
                      <img src={report.imageUrl} alt="Hazard evidence" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{report.address || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}</span>
                    </div>
                    <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>

                  {report.verificationNotes && (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-emerald-400">
                      <strong>Moderator Note:</strong> {report.verificationNotes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
