'use client';

import React from 'react';
import { Shield, Phone, Radio, HeartHandshake } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto bg-slate-950 border-t border-slate-900 text-slate-400 text-xs py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Col 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-200 font-bold">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>SafeRoute AI System</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Real-time pedestrian and transit safety grid combining multimodal computer vision surveillance with verified community hazard alerts.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <h4 className="text-slate-200 font-semibold flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-red-400" />
              <span>Emergency Hotlines</span>
            </h4>
            <ul className="space-y-1 text-slate-400">
              <li>• Police Command: <a href="tel:112" className="text-red-400 font-semibold hover:underline">112</a></li>
              <li>• Medical Ambulance: <a href="tel:108" className="text-amber-400 font-semibold hover:underline">108</a></li>
              <li>• Women Helpline: <a href="tel:1091" className="text-pink-400 font-semibold hover:underline">1091</a></li>
              <li>• Fire & Rescue: <a href="tel:101" className="text-slate-300 font-semibold hover:underline">101</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <h4 className="text-slate-200 font-semibold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              <span>Safety Engine Grid</span>
            </h4>
            <p className="text-slate-500">
              Status: <span className="text-emerald-400 font-semibold">Active & Synced</span>
            </p>
            <p className="text-slate-500">
              Engine: <span className="text-slate-300 font-medium">Dual Hybrid (AI CCTV + Municipal Grid)</span>
            </p>
            <p className="text-slate-500">
              Surveillance: <span className="text-slate-300 font-medium">Multimodal Image & Video Telemetry</span>
            </p>
          </div>

          {/* Col 4 */}
          <div className="space-y-2">
            <h4 className="text-slate-200 font-semibold flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-teal-400" />
              <span>Community Protection</span>
            </h4>
            <p className="text-slate-500">
              Threat reports are evaluated through a strict verification lifecycle before affecting navigation routing.
            </p>
            <div className="text-[11px] text-slate-600">
              Encrypted Geolocation • Zero Private Key Exposure
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-slate-500 gap-3">
          <div>
            &copy; {new Date().getFullYear()} SafeRoute Navigation & Emergency SOS Architecture. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Production Ready</span>
            <span>•</span>
            <span>Next.js 16</span>
            <span>•</span>
            <span>TypeScript</span>
            <span>•</span>
            <span>Firebase & Vercel Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
