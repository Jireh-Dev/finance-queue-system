'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  ArrowRight,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      if (data.user.role === 'STAFF') {
        router.push('/staff');
      } else if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else if (data.user.role === 'KIOSK') {
        router.push('/kiosk');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-card border border-slate-200">
        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-white mx-auto flex items-center justify-center shadow-lg border-2 border-ua-gold p-1 mb-3">
            <img
              src="/ua-logo.png"
              alt="University of the Assumption Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="font-heading text-2xl font-black text-slate-900 tracking-tight">
            Sign In to Portal
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            University of the Assumption • Finance & Queue System
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 text-ua-red rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Regular Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@ua.edu.ph"
                className="min-h-[44px] w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ua-blue focus:border-ua-blue transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-ua-blue hover:underline font-semibold"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="min-h-[44px] w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ua-blue focus:border-ua-blue transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] w-full py-3 px-4 bg-ua-blue hover:bg-ua-blue-light disabled:opacity-50 text-white font-heading font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-600">
          Don't have an account yet?{' '}
          <Link href="/register" className="font-heading font-bold text-ua-blue hover:underline cursor-pointer">
            Register New Account
          </Link>
        </div>
      </div>
    </div>
  );
}
