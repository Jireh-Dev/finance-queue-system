'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  QrCode,
  Users,
  ShieldCheck,
  Clock,
  ArrowRight,
  Flame,
  CheckCircle2,
  Sparkles,
  Award,
  Building,
} from 'lucide-react';

export default function HomePage() {
  const [queueSummary, setQueueSummary] = useState<any>(null);

  useEffect(() => {
    fetch('/api/queue')
      .then((res) => res.json())
      .then((data) => setQueueSummary(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-ua-blue via-ua-blue-dark to-slate-950 text-white overflow-hidden py-16 px-4 sm:px-6 lg:px-8 border-b-4 border-ua-gold">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-ua-gold/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-ua-red/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Heading and action */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-900/70 border border-ua-gold/50 text-xs font-heading font-semibold text-ua-gold-light backdrop-blur-sm shadow-sm">
                <img
                  src="/ua-logo.png"
                  alt="UA Seal"
                  className="w-5 h-5 rounded-full bg-white object-contain"
                />
                <span>University of the Assumption • Official Finance Portal</span>
              </div>

              <h1 className="font-heading text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Finance Office <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-ua-gold-light via-yellow-200 to-white">
                  Appointment & Live Queue
                </span>{' '}
                System
              </h1>

              <p className="text-sm sm:text-base text-blue-100 max-w-xl leading-relaxed">
                Empowering students, parents, and guardians of the{' '}
                <strong className="text-white">University of the Assumption</strong> with
                frictionless appointment scheduling, instant 256-bit secure QR code check-in,
                and real-time live queue tracking.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  href="/book"
                  className="min-h-[44px] px-6 py-3 bg-ua-gold hover:bg-ua-gold-light text-slate-950 font-heading font-bold text-sm rounded-xl shadow-lg hover:shadow-glow-gold transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Appointment</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/queue"
                  className="min-h-[44px] px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-heading font-bold text-sm rounded-xl border border-white/20 backdrop-blur-sm transition-all duration-200 flex items-center gap-2 cursor-pointer"
                >
                  <Flame className="w-4 h-4 text-ua-gold" />
                  <span>View Live Queue</span>
                </Link>

                <Link
                  href="/login"
                  className="min-h-[44px] px-5 py-3 text-blue-200 hover:text-white font-heading font-semibold text-sm transition flex items-center cursor-pointer"
                >
                  Sign In Portal →
                </Link>
              </div>

              {/* Trust badges */}
              <div className="pt-6 border-t border-blue-800/60 grid grid-cols-3 gap-4 text-left">
                <div>
                  <div className="font-heading text-xl sm:text-2xl font-black text-ua-gold-light">CSPRNG</div>
                  <div className="text-[11px] text-blue-200">256-bit Secure QR Tokens</div>
                </div>
                <div>
                  <div className="font-heading text-xl sm:text-2xl font-black text-emerald-400">0 min</div>
                  <div className="text-[11px] text-blue-200">Wasted Hallway Waiting</div>
                </div>
                <div>
                  <div className="font-heading text-xl sm:text-2xl font-black text-blue-300">100%</div>
                  <div className="text-[11px] text-blue-200">Audit Logged & Verified</div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Queue Snapshot Card */}
            <div className="lg:col-span-5">
              <div className="bg-white/95 text-slate-800 rounded-2xl shadow-2xl p-6 border-2 border-ua-gold/60 backdrop-blur-md relative">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <h2 className="font-heading font-bold text-sm text-ua-blue uppercase tracking-wide">
                      Live Queue Monitor
                    </h2>
                  </div>
                  <span className="text-xs font-heading font-semibold px-2.5 py-0.5 rounded-full bg-ua-blue-50 text-ua-blue border border-blue-200">
                    Real-Time
                  </span>
                </div>

                {/* Now Serving Highlight */}
                <div className="mt-5 text-center p-5 rounded-xl bg-gradient-to-b from-blue-50 to-slate-50 border border-blue-100">
                  <div className="text-xs font-heading font-bold uppercase tracking-wider text-slate-500">
                    Now Serving at Counter
                  </div>
                  <div className="font-heading text-4xl sm:text-5xl font-black text-ua-blue my-2 tracking-tight">
                    {queueSummary?.nowServing ? `Q-${queueSummary.nowServing.queueNumber}` : 'Q-101'}
                  </div>
                  <div className="text-xs font-heading font-semibold text-ua-gold flex items-center justify-center gap-1.5">
                    <Award className="w-3.5 h-3.5" />
                    <span>
                      {queueSummary?.nowServing?.counterName || 'Window 1 - Tuition & Cash Collections'}
                    </span>
                  </div>
                </div>

                {/* Live stats grid */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-xs text-slate-500 font-medium">Currently In Line</div>
                    <div className="font-heading text-2xl font-black text-slate-900 mt-1">
                      {queueSummary?.totalWaitingCount ?? 2} visitors
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-xs text-slate-500 font-medium">Est. Wait Time</div>
                    <div className="font-heading text-2xl font-black text-emerald-600 mt-1">
                      ~{queueSummary?.estimatedWaitMinutes ?? 16} mins
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    href="/queue"
                    className="min-h-[44px] w-full flex items-center justify-center text-center py-2.5 bg-ua-blue hover:bg-ua-blue-light text-white font-heading font-bold text-xs rounded-xl transition shadow-md cursor-pointer"
                  >
                    Open Fullscreen Live Display Board →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Navigation Portal Cards */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Role-Based Access Portals
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Tailored interfaces designed for students, parents, finance staff, and administration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Students & Parents */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between group hover:border-ua-blue">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-ua-blue flex items-center justify-center mb-4 group-hover:scale-105 transition transform shadow-sm">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-slate-900">Students & Parents</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Book finance appointments, select specific payment purposes, view digital QR
                tickets, and track live queue progress from your mobile phone.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Choose purpose & convenient time slots</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Generate instant secure QR ticket</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Real-time queue tracking & rescheduling</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
              <Link
                href="/book"
                className="min-h-[44px] flex-1 flex items-center justify-center text-center py-2 px-3 bg-ua-blue text-white rounded-xl text-xs font-heading font-bold hover:bg-ua-blue-light transition cursor-pointer"
              >
                Book Now
              </Link>
              <Link
                href="/dashboard"
                className="min-h-[44px] flex items-center justify-center py-2 px-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-heading font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                Dashboard
              </Link>
            </div>
          </div>

          {/* Card 2: Finance Office Staff & Cashiers */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between group hover:border-ua-gold">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-ua-gold flex items-center justify-center mb-4 group-hover:scale-105 transition transform shadow-sm">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-slate-900">Cashier & Staff Terminal</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Scan student QR codes via webcam or simulation input, validate appointments, advance
                queues, call next visitors, and issue official transaction remarks.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Instant QR validation & queue assignment</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Multi-window cashier management</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Prevention of reused or cancelled tokens</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                href="/staff"
                className="min-h-[44px] flex items-center justify-center text-center py-2 px-3 bg-ua-gold text-slate-950 rounded-xl text-xs font-heading font-bold hover:bg-ua-gold-light transition cursor-pointer"
              >
                Open Cashier Console →
              </Link>
            </div>
          </div>

          {/* Card 3: Administration */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between group hover:border-ua-red">
            <div>
              <div className="w-12 h-12 rounded-xl bg-red-50 text-ua-red flex items-center justify-center mb-4 group-hover:scale-105 transition transform shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-slate-900">Administrator Console</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Full governance over user accounts and roles, complete audit logging (including
                failed QR attempts), and daily transaction / visitor analytics.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>User and RBAC role administration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tamper-evident system audit trail</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Daily traffic & purpose reports</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                href="/admin"
                className="min-h-[44px] flex items-center justify-center text-center py-2 px-3 bg-slate-900 text-white rounded-xl text-xs font-heading font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Admin Governance →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Architecture Highlight */}
      <section className="bg-blue-50/70 border-y border-blue-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-ua-blue text-white flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-slate-900">CSPRNG Token Security</h4>
                <p className="text-xs text-slate-600 mt-1">
                  QR codes never contain unencrypted personal info or plain IDs. Each ticket uses
                  Node cryptographically secure random bytes (256-bit entropy).
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-ua-gold text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-slate-900">Zero Idle Waiting</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Live polling updates notify students of their current position and estimated
                  turn, eliminating crowded hallways outside the cashier.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-ua-red text-white flex items-center justify-center shrink-0 shadow-sm">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading font-bold text-sm text-slate-900">Institutional Governance</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Built specifically around University of the Assumption finance workflows, with
                  multi-window support, clearance processing, and full audit logs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
