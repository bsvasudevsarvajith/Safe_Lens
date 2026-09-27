'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Shield,
  Navigation,
  ShieldAlert,
  Video,
  Eye,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Users,
  Radio,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { getDashboardMetrics } from '@/services/firebase/firestoreService';
import { DashboardMetrics } from '@/types';
import SOSButton from '@/components/sos/SOSButton';
import { POPULAR_LOCATIONS } from '@/lib/mockData/initialData';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    getDashboardMetrics().then(setMetrics);
  }, []);

  // Home / Start button behavior: routes to Navigation if logged in, else Login
  const handleStartNavigation = () => {
    if (isAuthenticated) {
      router.push('/navigation');
    } else {
      router.push('/auth/login?redirect=/navigation');
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Emergency Action Strip */}
      <div className="bg-gradient-to-r from-red-950 via-slate-950 to-red-950 border-b border-red-500/20 py-2.5 px-4 text-center">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-3 text-xs">
          <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>Emergency Rapid Response Ready</span>
          </div>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="text-slate-300">
            Dial <a href="tel:112" className="text-red-400 font-bold underline">112 (Police)</a> or <a href="tel:108" className="text-amber-400 font-bold underline">108 (Ambulance)</a> or press the SOS button anytime.
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-900">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-6 shadow-inner animate-in fade-in slide-in-from-top-4 duration-500">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Dual AI & Municipal Safety Grid Active</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            Navigate the City with{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-emerald-300 to-teal-200">
              Absolute Confidence.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Multi-route navigation ranked by <strong>Safety Scores</strong>, not distance alone. Powered by multimodal AI CCTV surveillance, verified community hazards, and 1-click Emergency SOS.
          </p>

          {/* Primary CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={handleStartNavigation}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-base shadow-xl shadow-blue-600/25 active:scale-95 transition"
            >
              <Navigation className="w-5 h-5" />
              <span>Start Safe Navigation</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              href="/report"
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-base border border-slate-800 transition"
            >
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Report Hazard</span>
            </Link>
          </div>

          {/* Inline Emergency SOS Banner */}
          <div className="mt-8 max-w-md mx-auto">
            <SOSButton variant="inline" />
          </div>
        </div>
      </section>

      {/* Live Safety Metrics Bar */}
      <section className="bg-slate-900/60 border-b border-slate-900 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-3xl font-extrabold text-emerald-400">
                {metrics ? `${metrics.averageCitySafetyScore}%` : '89%'}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>City Safety Index</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-3xl font-extrabold text-blue-400">
                {metrics ? `${metrics.onlineCamerasCount} / ${metrics.totalCamerasCount}` : '5 / 5'}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
                <Video className="w-3.5 h-3.5 text-blue-400" />
                <span>AI CCTV Feeds Online</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-3xl font-extrabold text-teal-300">
                {metrics ? metrics.verifiedThreatsCount : '2'}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Verified City Hazards</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-2xl font-extrabold text-purple-400 uppercase pt-1">
                {metrics?.engineMode || 'Hybrid'}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
                <Radio className="w-3.5 h-3.5 text-purple-400" />
                <span>Active Safety Engine</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
            Intelligent Protection Framework
          </span>
          <h2 className="text-3xl font-bold text-white mt-2">
            Engineered for Real-World Transit Safety
          </h2>
          <p className="text-slate-400 text-sm mt-3">
            Traditional map apps route you along unlit alleys just to save 90 seconds. SafeRoute prioritizes your physical security at every step.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/40 transition group">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-5 group-hover:scale-110 transition">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Multimodal AI CCTV Analysis</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Consumes image snapshots and live video streams to measure real-time human count, crowd density, lumen levels, and detect suspicious anomalies.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/40 transition group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Dual Safety-Score Engine</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Seamlessly toggle between Manual Municipal Grid and AI CCTV modes via a common <code className="text-emerald-400">SafetyScoreEngine</code> interface.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-red-500/40 transition group">
            <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-400 flex items-center justify-center mb-5 group-hover:scale-110 transition">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Instant Emergency SOS</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Instant satellite GPS capture, Google Maps live locator link, <code className="text-red-400">tel:</code> dialer trigger, and emergency contact SMS dispatch.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Location Launcher */}
      <section className="py-12 bg-slate-900/30 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
            <div>
              <h3 className="text-xl font-bold text-white">Popular Monitored Transit Hubs</h3>
              <p className="text-slate-400 text-xs mt-1">Tap any landmark to start immediate safe routing.</p>
            </div>
            <Link
              href="/navigation"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>Custom Navigation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {POPULAR_LOCATIONS.slice(0, 4).map((loc, i) => (
              <button
                key={i}
                onClick={() => router.push(`/navigation?dest=${encodeURIComponent(loc.name)}&lat=${loc.lat}&lng=${loc.lng}`)}
                className="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-left transition"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-xs text-white truncate">{loc.name}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">{loc.address}</div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
