'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Invalid or missing password reset token. Please request a new link.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError('Password must contain at least one uppercase letter and one special character.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'An error occurred while resetting your password.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
          <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <p className="font-semibold text-sm mb-1">Missing Reset Token</p>
          <p>This password reset link is invalid or incomplete. Please request a new link from the forgot password page.</p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 bg-ua-blue text-white text-xs font-bold rounded-xl hover:bg-ua-blue-light transition"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-heading font-bold text-emerald-800">
            Password Successfully Reset!
          </h3>
          <p className="text-xs text-emerald-700">
            Your account password has been updated. Redirecting you to login...
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 bg-ua-blue text-white text-xs font-bold rounded-xl hover:bg-ua-blue-light transition"
        >
          Proceed to Login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 text-ua-red rounded-xl text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
          New Password
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="min-h-[44px] w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ua-blue focus:border-ua-blue transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Real-time Password Rules Feedback */}
      {password.length > 0 && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
          <div className="text-[11px] font-heading font-bold text-slate-600 mb-1">
            Password Requirements:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
            <div
              className={`flex items-center gap-1.5 ${
                password.length >= 8 ? 'text-emerald-600 font-semibold' : 'text-slate-400'
              }`}
            >
              <span className="text-[13px]">{password.length >= 8 ? '✓' : '○'}</span>
              <span>Min. 8 characters</span>
            </div>
            <div
              className={`flex items-center gap-1.5 ${
                /[A-Z]/.test(password) ? 'text-emerald-600 font-semibold' : 'text-slate-400'
              }`}
            >
              <span className="text-[13px]">{/[A-Z]/.test(password) ? '✓' : '○'}</span>
              <span>1 uppercase letter</span>
            </div>
            <div
              className={`flex items-center gap-1.5 ${
                /[^A-Za-z0-9]/.test(password)
                  ? 'text-emerald-600 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              <span className="text-[13px]">{/[^A-Za-z0-9]/.test(password) ? '✓' : '○'}</span>
              <span>1 special symbol</span>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
          Confirm New Password
        </label>
        <div className="relative">
          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
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
            <span>Reset Password</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-card border border-slate-200">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 mx-auto flex items-center justify-center border-2 border-ua-blue/20 text-ua-blue mb-3">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="font-heading text-2xl font-black text-slate-900 tracking-tight">
            Create New Password
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Choose a strong password with at least 8 characters, an uppercase letter, and a special character.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-ua-blue border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <ResetPasswordContent />
        </Suspense>

        <div className="text-center pt-2 text-xs text-slate-600">
          Remember your password?{' '}
          <Link href="/login" className="font-heading font-bold text-ua-blue hover:underline cursor-pointer">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

