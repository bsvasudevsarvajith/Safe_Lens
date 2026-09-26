'use client';

import React, { useState } from 'react';
import { SOSEvent } from '@/types';
import { Phone, MapPin, Copy, Check, ShieldAlert, X, AlertTriangle } from 'lucide-react';
import { updateSOSEventStatus } from '@/services/firebase/firestoreService';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  sosEvent: SOSEvent | null;
  policeNumber?: string;
  ambulanceNumber?: string;
}

export default function SOSModal({
  isOpen,
  onClose,
  sosEvent,
  policeNumber = '112',
  ambulanceNumber = '108',
}: SOSModalProps) {
  const [copied, setCopied] = useState(false);
  const [resolving, setResolving] = useState(false);

  if (!isOpen) return null;

  const mapLink = sosEvent?.mapLink || `https://maps.google.com/?q=${sosEvent?.latitude || 12.9716},${sosEvent?.longitude || 77.5946}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(mapLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleResolve = async (isFalseAlarm: boolean = false) => {
    if (!sosEvent) {
      onClose();
      return;
    }
    setResolving(true);
    try {
      await updateSOSEventStatus(
        sosEvent.id,
        isFalseAlarm ? 'false_alarm' : 'resolved',
        isFalseAlarm ? 'User dismissed as accidental/test.' : 'Resolved by user confirmation.'
      );
      onClose();
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-red-500 rounded-3xl p-6 shadow-2xl text-white">
        {/* Pulsing Emergency Header */}
        <div className="flex items-center justify-between pb-4 border-b border-red-500/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500 flex items-center justify-center text-red-500 animate-pulse">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest font-black text-red-400">Emergency Protocol Active</span>
              <h2 className="text-xl font-bold text-white">SOS Signal Transmitted</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Banner */}
        <div className="my-5 p-4 rounded-2xl bg-red-950/50 border border-red-500/40 text-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200">Live GPS broadcasted to emergency responders.</p>
              <p className="text-xs text-red-300/80 mt-1">
                Your coordinates have been pinned and dispatchers have been alerted with high priority.
              </p>
            </div>
          </div>
        </div>

        {/* Location & Map Link */}
        <div className="space-y-3 mb-6">
          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3 truncate">
              <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="truncate">
                <div className="text-xs text-slate-400">Exact GPS Coordinates</div>
                <div className="text-sm font-mono font-medium text-slate-100 truncate">
                  {sosEvent ? `${sosEvent.latitude.toFixed(5)}, ${sosEvent.longitude.toFixed(5)} (±${Math.round(sosEvent.accuracyMeters)}m)` : 'Locating satellite fix...'}
                </div>
              </div>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs font-semibold rounded-xl text-slate-200 transition shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Share Link'}
            </button>
          </div>

          {/* Notified Contacts preview */}
          {sosEvent?.notifiedContacts && sosEvent.notifiedContacts.length > 0 && (
            <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/40 text-xs text-slate-300">
              <span className="font-semibold text-slate-200 block mb-1">Emergency Contacts Notified:</span>
              <ul className="space-y-0.5">
                {sosEvent.notifiedContacts.map((c, i) => (
                  <li key={i} className="text-slate-400">• {c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Instant Telephone Dialer Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <a
            href={`tel:${policeNumber}`}
            className="flex items-center justify-center gap-2.5 py-3.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-600/30 transition text-center"
          >
            <Phone className="w-5 h-5" />
            <span>Call Police ({policeNumber})</span>
          </a>
          <a
            href={`tel:${ambulanceNumber}`}
            className="flex items-center justify-center gap-2.5 py-3.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl shadow-lg shadow-amber-600/30 transition text-center"
          >
            <Phone className="w-5 h-5" />
            <span>Ambulance ({ambulanceNumber})</span>
          </a>
        </div>

        {/* Modal actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
          <button
            onClick={() => handleResolve(true)}
            disabled={resolving}
            className="text-slate-400 hover:text-slate-200 py-1 transition"
          >
            Accidental trigger? Mark False Alarm
          </button>
          <button
            onClick={() => handleResolve(false)}
            disabled={resolving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 font-semibold text-white rounded-xl transition"
          >
            I Am Safe Now (Resolve)
          </button>
        </div>
      </div>
    </div>
  );
}
