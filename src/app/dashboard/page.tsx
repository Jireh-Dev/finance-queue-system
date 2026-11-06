'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  QrCode,
  AlertCircle,
  Plus,
  RefreshCw,
  Flame,
  User,
  Hash,
  XCircle,
  CalendarCheck2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import QRModal from '@/components/QRModal';
import { TIME_SLOTS } from '@/lib/constants';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [queueInfo, setQueueInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQRId, setSelectedQRId] = useState<string | null>(null);

  // Reschedule / Cancel Modal states
  const [actionModal, setActionModal] = useState<{
    type: 'CANCEL' | 'RESCHEDULE';
    appointment: any;
  } | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState(TIME_SLOTS[0]);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [userRes, apptsRes, queueRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/appointments'),
        fetch('/api/queue'),
      ]);

      if (!userRes.ok) {
        router.push('/login');
        return;
      }

      const userData = await userRes.json();
      setUser(userData.user);

      if (apptsRes.ok) {
        const apptsData = await apptsRes.json();
        setAppointments(apptsData.appointments || []);
      }

      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setQueueInfo(queueData);
      }
    } catch (err) {
      console.error('Dashboard data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Real-Time EventSource (Server-Sent Events) for live queue and appointment sync
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/queue/events');

      eventSource.addEventListener('queue-update', (e: MessageEvent) => {
        try {
          const freshData = JSON.parse(e.data);
          setQueueInfo(freshData);
          // Refetch user's personal appointments to reflect check-in/serving status changes instantly
          fetch('/api/appointments')
            .then((r) => r.json())
            .then((d) => setAppointments(d.appointments || []))
            .catch(() => {});
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      });
    } catch (err) {
      console.warn('SSE connection failed; falling back to interval polling:', err);
    }

    const interval = setInterval(() => {
      fetch('/api/queue')
        .then((res) => res.json())
        .then((data) => setQueueInfo(data))
        .catch(() => {});
    }, 10000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [router]);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;
    setActionError(null);
    setSubmittingAction(true);

    try {
      const payload: any = {
        action: actionModal.type,
      };

      if (actionModal.type === 'CANCEL') {
        payload.remarks = cancelReason;
      } else if (actionModal.type === 'RESCHEDULE') {
        payload.appointmentDate = rescheduleDate;
        payload.timeSlot = rescheduleSlot;
      }

      const res = await fetch(`/api/appointments/${actionModal.appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update appointment');

      setActionModal(null);
      await fetchDashboardData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-ua-blue border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-heading font-semibold">Loading your appointment dashboard...</p>
        </div>
      </div>
    );
  }

  const activeAppointments = appointments.filter(
    (a) => a.status === 'CONFIRMED' || a.status === 'CHECKED_IN' || a.status === 'SERVING'
  );
  const pastAppointments = appointments.filter(
    (a) => a.status === 'COMPLETED' || a.status === 'CANCELLED' || a.status === 'MISSED'
  );

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-ua-blue via-ua-blue-600 to-ua-blue-dark text-white rounded-2xl p-6 sm:p-8 shadow-card border-b-4 border-ua-gold flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-400/40 text-xs text-ua-gold-light font-heading font-medium mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-ua-gold" />
              <span>{user?.role} Portal</span>
              {user?.studentId && <span>• {user.studentId}</span>}
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-xs text-blue-100 mt-1 max-w-xl">
              Track your appointments, pull up your official 256-bit CSPRNG QR ticket, and watch the live cashier queue in real time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/book"
              className="min-h-[44px] px-5 py-2.5 bg-ua-gold hover:bg-ua-gold-light text-slate-900 hover:text-black font-heading font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </Link>
            <button
              onClick={fetchDashboardData}
              className="min-h-[44px] min-w-[44px] p-2.5 bg-blue-900/60 hover:bg-blue-800 text-blue-200 hover:text-white rounded-xl border border-blue-400/30 transition cursor-pointer flex items-center justify-center"
              title="Refresh Queue Status"
              aria-label="Refresh Queue Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Queue Monitor Widget */}
        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h2 className="font-heading font-bold text-sm text-slate-900 uppercase tracking-wide">
                Finance Counter Live Status
              </h2>
            </div>
            <span
              role="status"
              className="text-xs text-slate-500 font-medium"
            >
              Synchronized with Windows 1 to 4 • 3s Live Refresh
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {/* Box 1: Now Serving */}
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center gap-4 transition hover:shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-ua-blue text-white flex items-center justify-center font-black text-xl shadow-sm shrink-0">
                <Flame className="w-6 h-6 text-ua-gold" />
              </div>
              <div>
                <div className="text-[11px] font-heading font-bold text-slate-500 uppercase tracking-wider">
                  Now Serving
                </div>
                <div className="font-heading text-2xl font-black text-ua-blue">
                  {queueInfo?.nowServing
                    ? `Queue #${queueInfo.nowServing.queueNumber}`
                    : 'Window Open'}
                </div>
                <div className="text-[11px] text-slate-600 truncate max-w-[200px] font-medium">
                  {queueInfo?.nowServing?.counterName || 'Window 1'}
                </div>
              </div>
            </div>

            {/* Box 2: Waiting In Queue */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-4 transition hover:shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-300 text-slate-800 flex items-center justify-center font-heading font-black text-xl shadow-sm shrink-0">
                {queueInfo?.totalWaitingCount ?? 0}
              </div>
              <div>
                <div className="text-[11px] font-heading font-bold text-slate-500 uppercase tracking-wider">
                  Visitors in Line
                </div>
                <div className="font-heading text-xl font-bold text-slate-900">
                  {queueInfo?.totalWaitingCount ?? 0} Waiting
                </div>
                <div className="text-[11px] text-slate-500">Currently checked-in</div>
              </div>
            </div>

            {/* Box 3: Estimated Wait Time */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center gap-4 transition hover:shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] font-heading font-bold text-slate-500 uppercase tracking-wider">
                  Estimated Wait
                </div>
                <div className="font-heading text-xl font-bold text-emerald-700">
                  ~{queueInfo?.estimatedWaitMinutes ?? 0} mins
                </div>
                <div className="text-[11px] text-slate-500">Avg. 8 mins per transaction</div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Active Appointments */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-ua-blue" />
              <span>Active Appointments & QR Tickets</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-ua-blue font-heading font-bold">
                {activeAppointments.length}
              </span>
            </h2>
          </div>

          {activeAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border-2 border-dashed border-slate-300 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-ua-blue mx-auto flex items-center justify-center">
                <CalendarCheck2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-slate-800">No Active Appointments</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  You have no upcoming finance appointments scheduled. Book a slot to skip the waiting line outside the cashier.
                </p>
              </div>
              <Link
                href="/book"
                className="min-h-[44px] inline-flex items-center gap-2 px-6 py-2.5 bg-ua-blue hover:bg-ua-blue-light text-white text-xs font-heading font-bold rounded-xl shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Appointment Now</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-200 p-5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <StatusBadge status={appt.status} />
                      {appt.queueNumber && (
                        <span className="text-xs font-heading font-black px-3 py-1 rounded-full bg-ua-blue text-white shadow-sm">
                          Queue #{appt.queueNumber}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-heading font-bold text-sm text-slate-900 leading-snug">
                        {appt.purpose}
                      </h3>
                      {appt.remarks && (
                        <p className="text-xs text-slate-500 mt-1 italic line-clamp-2">
                          "{appt.remarks}"
                        </p>
                      )}
                    </div>

                    {/* Step Journey Tracker */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-[10px] font-heading font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Progress Journey
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-heading font-bold">
                        <div
                          className={`p-1 rounded ${
                            appt.status === 'CONFIRMED' || appt.status === 'CHECKED_IN' || appt.status === 'SERVING'
                              ? 'bg-blue-100 text-ua-blue'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          1. Booked
                        </div>
                        <div
                          className={`p-1 rounded ${
                            appt.status === 'CHECKED_IN' || appt.status === 'SERVING'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          2. In Line
                        </div>
                        <div
                          className={`p-1 rounded ${
                            appt.status === 'SERVING'
                              ? 'bg-amber-500 text-white animate-pulse'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          3. Serving
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">
                          {new Date(appt.appointmentDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">{appt.timeSlot}</span>
                      </div>
                      {appt.counterName && (
                        <div className="text-[11px] font-heading font-semibold text-ua-blue bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                          Assigned: {appt.counterName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar with Accessible Touch Targets (min 44px) */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedQRId(appt.id)}
                      className="min-h-[44px] flex-1 py-2.5 px-3 bg-ua-blue hover:bg-ua-blue-light text-white rounded-xl text-xs font-heading font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>View QR Ticket</span>
                    </button>

                    {appt.status === 'CONFIRMED' && (
                      <>
                        <button
                          onClick={() =>
                            setActionModal({ type: 'RESCHEDULE', appointment: appt })
                          }
                          className="min-h-[44px] min-w-[44px] p-2 text-slate-600 hover:text-ua-blue hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer flex items-center justify-center"
                          title="Reschedule Appointment"
                          aria-label="Reschedule Appointment"
                        >
                          <CalendarCheck2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setActionModal({ type: 'CANCEL', appointment: appt })
                          }
                          className="min-h-[44px] min-w-[44px] p-2 text-slate-600 hover:text-ua-red hover:bg-red-50 rounded-xl border border-slate-200 transition cursor-pointer flex items-center justify-center"
                          title="Cancel Appointment"
                          aria-label="Cancel Appointment"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section: Past & Completed Appointments */}
        {pastAppointments.length > 0 && (
          <section className="space-y-4 pt-4 border-t border-slate-200">
            <h2 className="font-heading text-base font-bold text-slate-700">Past & Completed Visits</h2>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-heading font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Purpose</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Time Slot</th>
                      <th className="px-5 py-3">Queue #</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Cashier Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pastAppointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {appt.purpose}
                        </td>
                        <td className="px-5 py-3">
                          {new Date(appt.appointmentDate).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 font-medium">{appt.timeSlot}</td>
                        <td className="px-5 py-3 font-heading font-bold text-slate-900">
                          {appt.queueNumber ? `#${appt.queueNumber}` : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={appt.status} size="sm" />
                        </td>
                        <td className="px-5 py-3 text-slate-500 italic">
                          {appt.remarks || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* QR Ticket View Modal */}
      {selectedQRId && (
        <QRModal appointmentId={selectedQRId} onClose={() => setSelectedQRId(null)} />
      )}

      {/* Cancel / Reschedule Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-up border border-slate-200">
            <h3 className="font-heading font-bold text-base text-slate-900">
              {actionModal.type === 'CANCEL'
                ? 'Cancel Appointment'
                : 'Reschedule Appointment Slot'}
            </h3>

            {actionError && (
              <div className="p-3 bg-red-50 text-ua-red text-xs rounded-xl font-medium border border-red-200">
                {actionError}
              </div>
            )}

            <form onSubmit={handleActionSubmit} className="space-y-4">
              {actionModal.type === 'CANCEL' ? (
                <div>
                  <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Reason for Cancellation
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Schedule conflict with class exam, already paid online..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-ua-blue"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                      New Date
                    </label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="min-h-[44px] w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-ua-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                      New Time Slot
                    </label>
                    <select
                      value={rescheduleSlot}
                      onChange={(e) => setRescheduleSlot(e.target.value)}
                      className="min-h-[44px] w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-ua-blue font-medium"
                    >
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="min-h-[44px] flex-1 py-2 px-3 bg-slate-100 text-slate-700 font-heading font-bold text-xs rounded-xl hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className={`min-h-[44px] flex-1 py-2 px-3 text-white font-heading font-bold text-xs rounded-xl shadow transition cursor-pointer ${
                    actionModal.type === 'CANCEL'
                      ? 'bg-ua-red hover:bg-red-700'
                      : 'bg-ua-blue hover:bg-ua-blue-light'
                  }`}
                >
                  {submittingAction
                    ? 'Processing...'
                    : actionModal.type === 'CANCEL'
                    ? 'Confirm Cancellation'
                    : 'Save New Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
