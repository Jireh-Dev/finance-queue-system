'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { FINANCE_PURPOSES, TIME_SLOTS } from '@/lib/constants';
import QRModal from '@/components/QRModal';

export default function BookAppointmentPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Form states
  const [purpose, setPurpose] = useState(FINANCE_PURPOSES[0]);
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[2]); // 09:00 AM - 09:30 AM
  const [remarks, setRemarks] = useState('');

  // Slot Capacity Tracking
  const [slotCapacities, setSlotCapacities] = useState<Record<string, { bookedCount: number; maxCapacity: number; availableSlots: number; isFull: boolean }>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  // Fetch slot availability when appointmentDate changes
  useEffect(() => {
    if (!appointmentDate) return;
    setLoadingSlots(true);

    fetch(`/api/appointments/slots?date=${appointmentDate}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.slots) {
          const map: Record<string, any> = {};
          data.slots.forEach((s: any) => {
            map[s.slot] = s;
          });
          setSlotCapacities(map);

          // If currently selected slot is full, choose the first available slot
          const current = map[timeSlot];
          if (current?.isFull) {
            const firstAvailable = data.slots.find((s: any) => !s.isFull);
            if (firstAvailable) {
              setTimeSlot(firstAvailable.slot);
            }
          }
        }
      })
      .catch((err) => console.error('Error fetching slot capacities:', err))
      .finally(() => setLoadingSlots(false));
  }, [appointmentDate]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/login?redirect=/book');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => router.push('/login?redirect=/book'))
      .finally(() => setLoadingUser(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose,
          appointmentDate,
          timeSlot,
          remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule appointment');

      setCreatedAppointment(data.appointment);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-ua-blue border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-heading font-semibold">Verifying your account session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="min-h-[44px] inline-flex items-center gap-1.5 text-xs font-heading font-bold text-slate-600 hover:text-ua-blue transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Success Modal / Display */}
        {createdAppointment ? (
          <div className="bg-white rounded-2xl shadow-card-hover border border-slate-200 p-8 text-center max-w-xl mx-auto space-y-6 animate-slide-up">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-heading font-bold px-3 py-1 rounded-full bg-blue-50 text-ua-blue uppercase tracking-wider border border-blue-200">
                CSPRNG QR Code Generated
              </span>
              <h2 className="font-heading text-2xl font-black text-slate-900 mt-2">
                Appointment Confirmed!
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Your appointment has been registered with the University of the Assumption Finance Office.
              </p>
            </div>

            {/* Appointment Summary Box */}
            <div className="bg-slate-50 rounded-xl p-5 text-left border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Student Name:</span>
                <span className="font-heading font-bold text-slate-900">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
              {user?.studentId && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Student ID:</span>
                  <span className="font-semibold text-slate-800">{user.studentId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Date:</span>
                <span className="font-heading font-bold text-ua-blue">
                  {new Date(createdAppointment.appointmentDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Time Slot:</span>
                <span className="font-heading font-bold text-slate-900">
                  {createdAppointment.timeSlot}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Purpose:</span>
                <span className="font-medium text-slate-800 text-right max-w-[200px]">
                  {createdAppointment.purpose}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowQRModal(true)}
                className="min-h-[44px] flex-1 py-3 px-4 bg-ua-blue hover:bg-ua-blue-light text-white font-heading font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>View & Print QR Ticket</span>
              </button>

              <Link
                href="/dashboard"
                className="min-h-[44px] flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-heading font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {showQRModal && (
              <QRModal
                appointmentId={createdAppointment.id}
                onClose={() => setShowQRModal(false)}
              />
            )}
          </div>
        ) : (
          /* Booking Form */
          <div className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-ua-blue to-ua-blue-dark text-white p-6 sm:p-8 border-b-2 border-ua-gold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-400/40 text-xs font-heading font-semibold text-ua-gold-light mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-ua-gold" />
                  <span>Official UA Finance Portal</span>
                </div>
                <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">
                  Schedule Finance Appointment
                </h1>
                <p className="text-xs text-blue-100 mt-1">
                  Select your transaction purpose, date, and preferred queue slot
                </p>
              </div>

              {user && (
                <div className="bg-blue-950/70 p-3.5 rounded-xl border border-blue-400/30 text-right text-xs">
                  <div className="text-blue-300">Booking for:</div>
                  <div className="font-heading font-bold text-white text-sm">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-ua-gold text-[11px] font-medium">
                    {user.studentId || user.role}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="m-6 p-4 bg-red-50 border border-red-200 text-ua-red rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
              {/* Step 1: Purpose Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-heading font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-ua-blue" />
                  <span>1. Select Transaction Purpose</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FINANCE_PURPOSES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPurpose(item)}
                      className={`min-h-[44px] p-3 text-left rounded-xl border text-xs font-medium transition-all flex items-start justify-between gap-2 cursor-pointer ${purpose === item
                          ? 'bg-blue-50/80 border-ua-blue text-ua-blue font-bold shadow-sm ring-2 ring-ua-blue'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      <span>{item}</span>
                      {purpose === item && (
                        <CheckCircle2 className="w-4 h-4 text-ua-blue shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Date Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-heading font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-ua-blue" />
                  <span>2. Choose Appointment Date</span>
                </label>
                <div className="max-w-xs">
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="min-h-[44px] w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ua-blue font-medium"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Finance office operates Monday to Saturday, 8:00 AM – 5:00 PM.
                  </p>
                </div>
              </div>

              {/* Step 3: Time Slot Selection with Real-time Capacity Badges */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-heading font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-ua-blue" />
                    <span>3. Select Preferred Time Slot</span>
                  </label>
                  {loadingSlots && (
                    <span className="text-[11px] text-slate-400 animate-pulse font-medium">
                      Checking availability...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {TIME_SLOTS.map((slot) => {
                    const info = slotCapacities[slot];
                    const isFull = info?.isFull;
                    const available = info?.availableSlots ?? 10;
                    const max = info?.maxCapacity ?? 10;

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isFull}
                        onClick={() => setTimeSlot(slot)}
                        className={`min-h-[56px] py-2.5 px-3 rounded-xl border text-xs font-heading font-bold text-center transition flex flex-col items-center justify-center gap-1 ${
                          isFull
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                            : timeSlot === slot
                            ? 'bg-ua-blue text-white border-ua-blue shadow-md ring-2 ring-ua-blue/30 cursor-pointer'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 cursor-pointer'
                        }`}
                      >
                        <span className="text-[12px]">{slot}</span>
                        {/* Availability Pill */}
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            isFull
                              ? 'bg-rose-100 text-rose-700 font-bold'
                              : timeSlot === slot
                              ? 'bg-blue-900/60 text-ua-gold-light'
                              : available <= 3
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {isFull ? 'Full (0 left)' : `${available}/${max} slots left`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 4: Remarks / Notes */}
              <div className="space-y-2">
                <label className="block text-xs font-heading font-bold text-slate-800 uppercase tracking-wider">
                  4. Additional Notes / Particulars (Optional)
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Paying 2nd installment for 1st Term BS Nursing, claiming graduation clearance..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-ua-blue"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>A secure 256-bit CSPRNG QR ticket will be generated upon confirmation.</span>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] w-full sm:w-auto px-8 py-3.5 bg-ua-blue hover:bg-ua-blue-light disabled:opacity-50 text-white font-heading font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>Confirm & Generate QR Ticket</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
