'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  GraduationCap,
  Lock,
  Mail,
  User,
  Phone,
  Hash,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'STUDENT' | 'PARENT'>('STUDENT');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          firstName,
          lastName,
          email,
          password,
          phone,
          studentId: role === 'STUDENT' || role === 'PARENT' ? studentId : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create account');

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-lg w-full space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-white mx-auto flex items-center justify-center shadow-lg border-2 border-ua-gold p-1 mb-2">
            <img
              src="/ua-logo.png"
              alt="University of the Assumption Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Create Portal Account
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            University of the Assumption • Finance Appointment Registration
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Select Your Role
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'STUDENT', label: 'Student' },
              { id: 'PARENT', label: 'Parent' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setRole(item.id as 'STUDENT' | 'PARENT')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition ${
                  role === item.id
                    ? 'bg-ua-blue text-white border-ua-blue shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            Note: Staff, Admin, and Kiosk accounts are provisioned and managed by University Administration.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-ua-red rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Juan"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ua-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dela Cruz"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ua-blue"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Institutional / Personal Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan.delacruz@ua.edu.ph"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ua-blue"
              />
            </div>
          </div>

          {(role === 'STUDENT' || role === 'PARENT') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {role === 'STUDENT' ? 'Student ID Number' : "Student ID (Child / Ward's ID)"}
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. UA-2024-00123"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ua-blue"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+63 9XX XXX XXXX"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ua-blue"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ua-blue"
                />
              </div>
            </div>
          </div>

          {/* Real-Time Password Requirements Feedback */}
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
                  <span className="text-[13px]">
                    {/[^A-Za-z0-9]/.test(password) ? '✓' : '○'}
                  </span>
                  <span>1 special symbol</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-ua-blue hover:bg-ua-blue-light disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-600">
          Already registered?{' '}
          <Link href="/login" className="font-bold text-ua-blue hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}

