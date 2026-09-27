'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Shield,
  Navigation,
  AlertTriangle,
  LayoutDashboard,
  User,
  Compass,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import SOSButton from '@/components/sos/SOSButton';

export default function Navbar() {
  const pathname = usePathname();
  const { user, isModerator, isAdmin, switchUserPersona, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [personaOpen, setPersonaOpen] = useState(false);

  const navLinks = [
    { label: 'Navigate', href: '/navigation', icon: Navigation },
    { label: 'Active Journey', href: '/trip', icon: Compass },
    { label: 'Report Threat', href: '/report', icon: AlertTriangle },
  ];

  if (isModerator) {
    navLinks.push({ label: 'Admin Dispatch', href: '/admin', icon: LayoutDashboard });
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/85 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 p-0.5 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400 group-hover:text-blue-400 transition" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-emerald-300 to-teal-200">
                SafeRoute
              </span>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                AI
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium tracking-wide">
              Smart Surveillance & SOS
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navLinks.map(link => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                  active
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Actions & Role Persona Switcher */}
        <div className="hidden md:flex items-center gap-3">
          {/* Quick Persona Switcher for demonstration */}
          <div className="relative">
            <button
              onClick={() => setPersonaOpen(!personaOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-700/60 transition"
            >
              <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-amber-400' : isModerator ? 'bg-purple-400' : 'bg-emerald-400'}`} />
              <span className="capitalize">{user?.role ? user.role.replaceAll('_', ' ') : 'Guest'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {personaOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in">
                <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Switch Active Persona
                </div>
                <button
                  onClick={() => { switchUserPersona('user'); setPersonaOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                >
                  <span>Regular Citizen</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">User</span>
                </button>
                <button
                  onClick={() => { switchUserPersona('safety_moderator'); setPersonaOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                >
                  <span>Safety Dispatcher</span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">Mod</span>
                </button>
                <button
                  onClick={() => { switchUserPersona('admin'); setPersonaOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                >
                  <span>Chief Admin</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">Admin</span>
                </button>
              </div>
            )}
          </div>

          {/* User Profile Link */}
          <Link
            href="/profile"
            className="flex items-center gap-2 p-1.5 pr-3 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs">
              {user?.displayName ? user.displayName.charAt(0) : 'U'}
            </div>
            <span className="text-xs font-medium text-slate-200 max-w-[90px] truncate">
              {user?.displayName || 'My Profile'}
            </span>
          </Link>

          {/* Header Compact SOS */}
          <SOSButton variant="compact" />
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center gap-2">
          <SOSButton variant="compact" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-6 bg-slate-950 border-b border-slate-800 space-y-3">
          <div className="space-y-1">
            {navLinks.map(link => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-900"
                >
                  <Icon className="w-5 h-5 text-blue-400" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-900"
            >
              <User className="w-5 h-5 text-emerald-400" />
              <span>User Profile & Contacts</span>
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Current Persona:</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => switchUserPersona('user')}
                className="px-2 py-1 bg-slate-800 rounded text-slate-200 text-xs"
              >
                User
              </button>
              <button
                onClick={() => switchUserPersona('safety_moderator')}
                className="px-2 py-1 bg-slate-800 rounded text-slate-200 text-xs"
              >
                Moderator
              </button>
              <button
                onClick={() => switchUserPersona('admin')}
                className="px-2 py-1 bg-slate-800 rounded text-slate-200 text-xs"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
