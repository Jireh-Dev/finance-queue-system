'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-card border border-slate-200">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 mx-auto flex items-center justify-center border-2 border-ua-blue/20 text-ua-blue mb-3">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="font-heading text-2xl font-black text-slate-900 tracking-tight">
            Forgot Password?
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Enter your account email to receive a password reset link.
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 text-ua-red rounded-xl text-xs font-semibold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-heading font-bold text-emerald-800">
                Check Your Inbox
              </h3>
              <p className="text-xs text-emerald-700 leading-relaxed">
                If an account exists for <strong className="text-slate-800">{email}</strong>, you will receive an email with instructions to reset your password shortly.
              </p>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Didn't receive the email? Check your spam folder or wait a moment to try again.
            </p>

            <Link
              href="/login"
              className="min-h-[44px] w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Login</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@ua.edu.ph"
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
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="text-xs font-heading font-semibold text-slate-500 hover:text-ua-blue inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

