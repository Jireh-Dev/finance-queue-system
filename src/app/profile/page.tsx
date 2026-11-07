'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  GraduationCap,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit details state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/user/profile')
      .then((res) => {
        if (!res.ok) {
          router.push('/login?redirect=/profile');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
          setFirstName(data.user.firstName || '');
          setLastName(data.user.lastName || '');
          setEmail(data.user.email || '');
          setPhone(data.user.phone || '');
        }
      })
      .catch((err) => {
        console.error('Fetch profile error:', err);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setUpdatingProfile(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setUser(data.user);
      setProfileSuccess('Profile details successfully updated!');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      setProfileError(err.message || 'Error updating profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setPasswordSuccess('Password successfully changed!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Error updating password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-ua-blue border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Loading User Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ua-blue to-ua-blue-dark text-white flex items-center justify-center shadow-md border-2 border-ua-gold shrink-0">
              <User className="w-8 h-8 text-ua-gold-light" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-black text-xl sm:text-2xl text-slate-900">
                  {user?.firstName} {user?.lastName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider bg-blue-100 text-ua-blue border border-blue-200">
                  {user?.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>{user?.email}</span>
                {user?.studentId && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-slate-700">ID: {user.studentId}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>Member since: <strong>{new Date(user?.createdAt).toLocaleDateString()}</strong></div>
            <div>Institutional Account: <strong className="text-ua-blue">University of the Assumption</strong></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: View & Edit Contact Details */}
          <section className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-ua-blue" />
                <h2 className="font-heading font-bold text-base text-slate-900">
                  Contact Information
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">Edit & Save</span>
            </div>

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-ua-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-ua-blue focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-ua-blue focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+63 912 345 6789"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-ua-blue focus:outline-none"
                  />
                </div>
              </div>

              {user?.studentId && (
                <div>
                  <label className="block text-[11px] font-heading font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Student / Ward Identification (Locked)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user.studentId}
                    className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-100 text-slate-500 rounded-xl cursor-not-allowed"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={updatingProfile}
                className="w-full min-h-[44px] py-2.5 px-4 bg-ua-blue hover:bg-ua-blue-light disabled:opacity-50 text-white font-heading font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {updatingProfile ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Contact Changes</span>
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Section 2: Change Password */}
          <section className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-ua-gold" />
                <h2 className="font-heading font-bold text-base text-slate-900">
                  Security & Password
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">Password Update</span>
            </div>

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-ua-blue focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 uppercase, 1 symbol"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-ua-blue focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Must contain at least 8 characters, one uppercase letter, and one symbol.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-ua-blue focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={changingPassword || !currentPassword || !newPassword}
                className="w-full min-h-[44px] py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-heading font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {changingPassword ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-ua-gold" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

