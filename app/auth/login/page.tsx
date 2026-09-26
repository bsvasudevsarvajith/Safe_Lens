'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Lock, Mail, ArrowRight, Loader2, Sparkles } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/navigation';
  const { login, switchUserPersona } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role: 'user' | 'admin' | 'safety_moderator') => {
    setLoading(true);
    try {
      await switchUserPersona(role);
      router.push(redirectUrl);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900/85 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Citizen Authentication</h1>
        <p className="text-slate-400 text-xs">
          Sign in to access personalized safety routes and SOS telemetry.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="citizen@safecity.org"
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-300 font-semibold">Password</label>
            <Link href="/auth/forgot-password" className="text-blue-400 hover:underline text-[11px]">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 transition active:scale-95 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          <span>Sign In to SafeRoute</span>
        </button>
      </form>

      {/* Quick Demo Personas */}
      <div className="pt-4 border-t border-slate-800 text-center">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center justify-center gap-1 mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Instant Demo Access (1-Click)</span>
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleQuickDemoLogin('user')}
            className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-emerald-400 text-[11px] font-semibold"
          >
            Citizen
          </button>
          <button
            onClick={() => handleQuickDemoLogin('safety_moderator')}
            className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-purple-400 text-[11px] font-semibold"
          >
            Dispatcher
          </button>
          <button
            onClick={() => handleQuickDemoLogin('admin')}
            className="py-1.5 px-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-amber-400 text-[11px] font-semibold"
          >
            Admin
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400">
        Don't have an account?{' '}
        <Link href="/auth/register" className="text-blue-400 font-semibold hover:underline">
          Register New Citizen
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="text-center text-slate-400 text-sm flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span>Loading secure authentication portal...</span>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
