'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Flame,
  Volume2,
  VolumeX,
  RotateCcw,
  UserCheck,
  Building,
  Sparkles,
  Camera,
  XCircle,
  FileCheck,
  Send,
  ShieldAlert,
  Search,
  Wifi,
  WifiOff,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { SERVICE_COUNTERS } from '@/lib/constants';

export default function StaffQueueConsole() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selectedCounter, setSelectedCounter] = useState(SERVICE_COUNTERS[0]);
  const [queueData, setQueueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Scanner & Token states
  const [scanInputToken, setScanInputToken] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // USB Scanner Ergonomics & Audio
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const manualSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [audioFeedback, setAudioFeedback] = useState(true);
  const lastScannedTokenRef = useRef<{ token: string; time: number } | null>(null);

  // Completion / Action remarks
  const [activeActionAppt, setActiveActionAppt] = useState<any>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Network connection state & backoff retry
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'RECONNECTING' | 'OFFLINE'>('CONNECTED');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Manual Student Lookup states
  const [showManualLookup, setShowManualLookup] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [manualResults, setManualResults] = useState<any[]>([]);
  const [searchingManual, setSearchingManual] = useState(false);
  const [confirmManualAppt, setConfirmManualAppt] = useState<any>(null);
  const [manualReason, setManualReason] = useState('Phone screen unreadable / battery died');
  const [submittingManual, setSubmittingManual] = useState(false);

  // Sound confirmation chimes using Web Audio API
  const playScanBeep = (type: 'SUCCESS' | 'WARNING' | 'ERROR') => {
    if (!audioFeedback) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'SUCCESS') {
        // High, crisp double-beep (880Hz -> 1320Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime);
        gain1.gain.setValueAtTime(0.12, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.12);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);
        gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.1);
        osc2.stop(ctx.currentTime + 0.28);
      } else if (type === 'WARNING') {
        // Double tone warning (587Hz -> 440Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        // Low error buzz (220Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  const focusScannerInput = () => {
    // Do NOT steal focus if any modal or dialog is open
    if (showManualLookup || activeActionAppt || confirmManualAppt) {
      return;
    }
    setTimeout(() => {
      if (showManualLookup || activeActionAppt || confirmManualAppt) {
        return;
      }
      if (scanInputRef.current) {
        scanInputRef.current.focus();
        scanInputRef.current.select();
      }
    }, 50);
  };

  // Automatically focus the Manual Lookup search input when modal opens
  useEffect(() => {
    if (showManualLookup) {
      setTimeout(() => {
        if (manualSearchInputRef.current) {
          manualSearchInputRef.current.focus();
          manualSearchInputRef.current.select();
        }
      }, 50);
    } else {
      // When closed, restore focus to the main QR Scanner input box
      focusScannerInput();
    }
  }, [showManualLookup]);

  // Global Keyboard Capture & Focus Enforcement
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. If Manual Lookup or Transaction Complete modal is open, do not steal focus
      if (showManualLookup || activeActionAppt || confirmManualAppt) {
        if (e.key === 'Escape') {
          if (confirmManualAppt) {
            setConfirmManualAppt(null);
          } else if (showManualLookup) {
            setShowManualLookup(false);
            focusScannerInput();
          } else if (activeActionAppt) {
            setActiveActionAppt(null);
            focusScannerInput();
          }
        }
        return;
      }

      // 2. Check if activeElement is an input, textarea, or inside any dialog
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

      if (activeEl?.closest('[role="dialog"]') || (activeEl && activeEl !== scanInputRef.current && isInput)) {
        return;
      }

      // If Escape key pressed on main page, clear input
      if (e.key === 'Escape') {
        setScanInputToken('');
        focusScannerInput();
        return;
      }

      // If Enter or NumpadEnter is pressed anywhere on page and input has content, trigger scan
      if (e.key === 'Enter' || e.code === 'NumpadEnter') {
        if (activeEl === scanInputRef.current) {
          return;
        }
        if (scanInputToken.trim()) {
          e.preventDefault();
          handleValidateToken();
          return;
        }
      }

      // If cashier presses a printable character while focus was lost, redirect focus and append
      if (
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        activeEl !== scanInputRef.current
      ) {
        if (scanInputRef.current) {
          scanInputRef.current.focus();
        }
      }
    };

    const handleGlobalClick = (e: MouseEvent) => {
      // If modal is open, do not interfere with click focus
      if (showManualLookup || activeActionAppt || confirmManualAppt) {
        return;
      }

      // If click was inside modal or on interactive elements, let them work normally
      const target = e.target as HTMLElement | null;
      if (
        target?.closest('button') ||
        target?.closest('select') ||
        target?.closest('textarea') ||
        target?.closest('input') ||
        target?.closest('a') ||
        target?.closest('[role="dialog"]')
      ) {
        return;
      }

      // Otherwise, return focus to scanner input
      focusScannerInput();
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    window.addEventListener('click', handleGlobalClick, true);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
      window.removeEventListener('click', handleGlobalClick, true);
    };
  }, [activeActionAppt, showManualLookup, confirmManualAppt, scanInputToken]);

  const fetchQueue = async () => {
    try {
      const [userRes, queueRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/queue', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        }),
      ]);

      if (!userRes.ok) {
        router.push('/login?redirect=/staff');
        return;
      }

      const userData = await userRes.json();
      if (userData.user.role !== 'STAFF' && userData.user.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      setUser(userData.user);

      if (queueRes.ok) {
        const q = await queueRes.json();
        setQueueData(q);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const safeFetchQueue = async () => {
      try {
        const [userRes, queueRes] = await Promise.all([
          fetch('/api/auth/me', { cache: 'no-store' }),
          fetch('/api/queue', {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          }),
        ]);

        if (!userRes.ok) {
          if (isMounted) router.push('/login?redirect=/staff');
          return;
        }

        const userData = await userRes.json();
        if (userData.user.role !== 'STAFF' && userData.user.role !== 'ADMIN') {
          if (isMounted) router.push('/dashboard');
          return;
        }
        if (isMounted) setUser(userData.user);

        if (queueRes.ok && isMounted) {
          const q = await queueRes.json();
          setQueueData(q);
        }
      } catch (e) {
        if (isMounted) console.error(e);
      } finally {
        if (isMounted) {
          setLoading(false);
          focusScannerInput();
        }
      }
    };

    safeFetchQueue();

    // Reconnection handling with exponential backoff & event source recovery
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let backoffDelay = 2000;

    const connectSSE = () => {
      if (!isMounted) return;
      try {
        if (eventSource) eventSource.close();
        eventSource = new EventSource('/api/queue/events');

        eventSource.onopen = () => {
          if (isMounted) {
            setConnectionStatus('CONNECTED');
            setReconnectAttempts(0);
            backoffDelay = 2000;
          }
        };

        eventSource.addEventListener('queue-update', (e: MessageEvent) => {
          if (!isMounted) return;
          try {
            const freshData = JSON.parse(e.data);
            setQueueData(freshData);
            setConnectionStatus('CONNECTED');
          } catch (err) {
            console.error('Failed to parse SSE in cashier terminal:', err);
          }
        });

        eventSource.onerror = () => {
          if (!isMounted) return;
          setConnectionStatus('RECONNECTING');
          setReconnectAttempts((prev) => prev + 1);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Exponential backoff up to 30s
          const nextWait = Math.min(backoffDelay, 30000);
          backoffDelay = backoffDelay * 1.5;
          reconnectTimeout = setTimeout(connectSSE, nextWait);
        };
      } catch (err) {
        if (isMounted) {
          setConnectionStatus('RECONNECTING');
          reconnectTimeout = setTimeout(connectSSE, 5000);
        }
      }
    };

    connectSSE();

    // High-resilience polling fallback interval (every 4 seconds) to prevent silent data dropouts on Vercel
    const interval = setInterval(async () => {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        if (isMounted) setConnectionStatus('OFFLINE');
        return;
      }
      try {
        await safeFetchQueue();
        if (isMounted && connectionStatus !== 'CONNECTED') {
          setConnectionStatus('CONNECTED');
        }
      } catch {
        if (isMounted) setConnectionStatus('RECONNECTING');
      }
    }, 4000);

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(interval);
    };
  }, [router]);

  // Handle Token Scan or Validation
  const handleValidateToken = async (tokenToTest?: string) => {
    const targetToken = (tokenToTest || scanInputToken).trim();
    if (!targetToken) {
      focusScannerInput();
      return;
    }

    // Instantly clear the input field and refocus within 100ms for continuous scanning
    setScanInputToken('');
    setTimeout(() => {
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
    }, 80);

    // Duplicate Scan Protection: Prevent rapid double scan within 3 seconds
    const now = Date.now();
    if (
      lastScannedTokenRef.current &&
      lastScannedTokenRef.current.token === targetToken &&
      now - lastScannedTokenRef.current.time < 3000
    ) {
      playScanBeep('WARNING');
      setScannerError('This ticket was just scanned a moment ago. Ready for next student.');
      focusScannerInput();
      return;
    }

    setScanning(true);
    setScanResult(null);
    setScannerError(null);

    try {
      // Validate against the dedicated token validation endpoint with rate limiting & audit logs
      const res = await fetch('/api/queue/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: targetToken,
          counterName: selectedCounter,
        }),
      });

      const data = await res.json();
      lastScannedTokenRef.current = { token: targetToken, time: Date.now() };

      if (!res.ok) {
        playScanBeep('ERROR');
        setScannerError(data.error || 'Failed to validate QR code');
        setScanResult(data);
      } else {
        // Success or Already checked-in / serving
        if (data.code === 'CHECKED_IN_SUCCESS') {
          playScanBeep('SUCCESS');
        } else {
          // Already checked in or serving warning
          playScanBeep('WARNING');
        }
        setScanResult(data);
        await fetchQueue();
      }
    } catch (err: any) {
      playScanBeep('ERROR');
      setScannerError(err.message || 'Network error scanning QR token');
    } finally {
      setScanning(false);
      focusScannerInput();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault();
      handleValidateToken();
    }
  };

  // Manual Student Lookup handlers
  const handleSearchManual = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = manualQuery.trim();
    if (!query) return;

    setSearchingManual(true);
    try {
      const res = await fetch(`/api/queue/manual-lookup?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setManualResults(data.results || []);
      }
    } catch (err) {
      console.error('Manual search error:', err);
    } finally {
      setSearchingManual(false);
    }
  };

  const handleConfirmManualCheckIn = async () => {
    if (!confirmManualAppt) return;
    setSubmittingManual(true);

    try {
      const res = await fetch('/api/queue/manual-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: confirmManualAppt.id,
          reason: manualReason,
          counterName: selectedCounter,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to process manual check-in');
      } else {
        playScanBeep('SUCCESS');
        setConfirmManualAppt(null);
        setShowManualLookup(false);
        setManualQuery('');
        setManualResults([]);
        setScanResult(data);
        await fetchQueue();
      }
    } catch (err: any) {
      alert(err.message || 'Error executing manual check-in override');
    } finally {
      setSubmittingManual(false);
      focusScannerInput();
    }
  };

  // Call Next Waiting Visitor
  const handleCallNext = async () => {
    try {
      const res = await fetch('/api/queue/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CALL_NEXT',
          counterName: selectedCounter,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'No visitors waiting to call.');
      } else {
        await fetchQueue();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Specific Status Updates (Start Serving, Complete, Missed)
  const handleAdvanceStatus = async (
    apptId: string,
    action: 'START_SERVING' | 'COMPLETE' | 'MARK_MISSED',
    remarks?: string
  ) => {
    setSubmittingAction(true);
    try {
      const res = await fetch('/api/queue/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: apptId,
          action,
          counterName: selectedCounter,
          remarks: remarks || actionRemarks || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update visitor queue state.');
      } else {
        setActiveActionAppt(null);
        setActionRemarks('');
        await fetchQueue();
        focusScannerInput();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAction(false);
      focusScannerInput();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-ua-blue border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-heading font-semibold">
            Connecting to Finance Cashier Terminal...
          </p>
        </div>
      </div>
    );
  }

  const servingList = queueData?.servingList || [];
  const waitingQueue = queueData?.waitingQueue || [];
  const upcomingToday = queueData?.upcomingToday || [];

  return (
    <div className="flex-1 bg-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Cashier Header */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white p-0.5 border-2 border-ua-gold flex items-center justify-center shadow-md shrink-0 overflow-hidden">
              <img
                src="/ua-logo.png"
                alt="UA Seal"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-xl font-black text-slate-900 tracking-tight">
                  Finance Cashier Terminal
                </h1>
                <span className="text-[11px] font-heading font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-ua-blue border border-blue-200">
                  Staff Console
                </span>
                {/* Visual Network Status Indicator */}
                <span
                  className={`text-[10px] font-heading font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 transition-colors ${
                    connectionStatus === 'CONNECTED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : connectionStatus === 'RECONNECTING'
                      ? 'bg-amber-50 text-amber-700 border border-amber-300 animate-pulse'
                      : 'bg-rose-50 text-rose-700 border border-rose-300'
                  }`}
                  title={
                    connectionStatus === 'CONNECTED'
                      ? 'Real-time WebSocket/SSE connected'
                      : `Reconnecting attempt #${reconnectAttempts}...`
                  }
                >
                  {connectionStatus === 'CONNECTED' ? (
                    <>
                      <Wifi className="w-3 h-3 text-emerald-600" />
                      <span>Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-amber-600" />
                      <span>{connectionStatus === 'RECONNECTING' ? 'Reconnecting...' : 'Offline'}</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Logged in as <strong>{user?.firstName} {user?.lastName}</strong> ({user?.email})
              </p>
            </div>
          </div>

          {/* Window / Counter Selector with min-height 44px */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Audio Toggle */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setAudioFeedback(!audioFeedback)}
                className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                  audioFeedback
                    ? 'bg-blue-50 text-ua-blue border-blue-200'
                    : 'bg-slate-100 text-slate-400 border-slate-300'
                }`}
                title={audioFeedback ? 'Scanner Audio Beep Active' : 'Scanner Audio Muted'}
                aria-label={audioFeedback ? 'Scanner Audio Beep Active' : 'Scanner Audio Muted'}
              >
                {audioFeedback ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-heading font-bold text-slate-500 uppercase tracking-wider mb-1">
                Active Service Window
              </label>
              <select
                value={selectedCounter}
                onChange={(e) => {
                  setSelectedCounter(e.target.value);
                  focusScannerInput();
                }}
                className="min-h-[44px] text-xs font-heading font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-ua-blue cursor-pointer w-full sm:w-auto"
              >
                {SERVICE_COUNTERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowManualLookup(true)}
              className="min-h-[44px] mt-0 sm:mt-5 px-4 py-2.5 bg-blue-50 hover:bg-ua-blue text-ua-blue hover:text-white border border-blue-200 font-heading font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Manual Student Search by Name or ID"
            >
              <Search className="w-4 h-4" />
              <span>Manual Lookup</span>
            </button>

            <button
              onClick={handleCallNext}
              className="min-h-[44px] mt-0 sm:mt-5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Call Next in Line</span>
            </button>
          </div>
        </div>

        {/* Real-Time Queue Monitor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Serving at Windows (6 cols) */}
          <section className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-card space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-heading font-bold text-sm text-slate-800 flex items-center gap-2">
                <Flame className="w-4 h-4 text-ua-gold" />
                <span>Now Serving at Windows</span>
              </h2>
              <span
                role="status"
                className="text-xs font-heading font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200"
              >
                {servingList.length} Active at Windows
              </span>
            </div>

            {/* Currently Serving List */}
            {servingList.length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                No visitor currently being served. Click "Call Next in Line" to call the next waiting student.
              </div>
            ) : (
              <div className="space-y-3">
                {servingList.map((appt: any) => (
                  <div
                    key={appt.id}
                    className="p-4 rounded-xl border border-amber-300 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-lg font-black text-ua-blue">
                          Queue #{appt.queueNumber}
                        </span>
                        <StatusBadge status={appt.status} size="sm" />
                        <span className="text-[11px] font-heading font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          {appt.counterName || selectedCounter}
                        </span>
                      </div>
                      <div className="font-heading font-bold text-slate-800 text-sm mt-1">
                        {appt.user?.firstName && appt.user?.lastName
                          ? `${appt.user.firstName} ${appt.user.lastName}`
                          : appt.studentName || `Ticket Q-${appt.queueNumber ?? appt.id}`}
                      </div>
                      <div className="text-xs text-slate-600">{appt.purpose}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveActionAppt(appt)}
                        className="min-h-[44px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>Complete Visit</span>
                      </button>

                      <button
                        onClick={() => handleAdvanceStatus(appt.id, 'MARK_MISSED')}
                        className="min-h-[44px] px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-heading font-semibold text-xs rounded-xl border border-slate-300 transition cursor-pointer"
                        title="Mark as Missed"
                      >
                        Missed
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Waiting in Line (Checked-in) (6 cols) */}
          <section className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-card space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-sm text-slate-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-ua-blue" />
                <span>Waiting in Line ({waitingQueue.length})</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">Checked in via Door Kiosk</span>
            </div>

            {waitingQueue.length === 0 ? (
              <div className="p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400 italic">
                No students currently waiting in queue. Visitors will appear here immediately upon scanning their QR code at the Door Kiosk.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {waitingQueue.map((appt: any, idx: number) => (
                  <div
                    key={appt.id}
                    className="min-h-[50px] p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/40 hover:border-blue-200 flex items-center justify-between text-xs transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-ua-blue text-white font-heading font-bold flex items-center justify-center text-xs shadow-sm">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-heading font-bold text-slate-900 text-sm">
                          Queue #{appt.queueNumber} —{' '}
                          {appt.user?.firstName && appt.user?.lastName
                            ? `${appt.user.firstName} ${appt.user.lastName}`
                            : appt.studentName || 'Student Visitor'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {appt.purpose} • Checked-in at{' '}
                          {new Date(appt.checkInTime || appt.updatedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAdvanceStatus(appt.id, 'START_SERVING')}
                      className="min-h-[40px] px-3.5 py-1.5 bg-ua-blue hover:bg-ua-blue-light text-white font-heading font-bold text-xs rounded-xl shadow-sm transition cursor-pointer flex items-center justify-center"
                    >
                      Call to {selectedCounter.split('-')[0].trim()}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Completion Modal / Remarks Drawer */}
        {activeActionAppt && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-up border border-slate-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-heading font-bold text-sm text-slate-900">
                  Complete Transaction — Queue #{activeActionAppt.queueNumber}
                </h3>
                <button
                  onClick={() => {
                    setActiveActionAppt(null);
                    focusScannerInput();
                  }}
                  className="min-h-[44px] min-w-[44px] text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs space-y-1 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <strong>Visitor:</strong>{' '}
                  {activeActionAppt.user?.firstName && activeActionAppt.user?.lastName
                    ? `${activeActionAppt.user.firstName} ${activeActionAppt.user.lastName}`
                    : activeActionAppt.studentName || `Queue #${activeActionAppt.queueNumber}`}
                </div>
                <div>
                  <strong>Purpose:</strong> {activeActionAppt.purpose}
                </div>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cashier Remarks / Official Receipt Number
                </label>
                <textarea
                  rows={3}
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  placeholder="e.g. Official Receipt #OR-2026-98124 issued. Full tuition cleared."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-ua-blue"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setActiveActionAppt(null);
                    focusScannerInput();
                  }}
                  className="min-h-[44px] flex-1 py-2 px-3 bg-slate-100 text-slate-700 font-heading font-bold text-xs rounded-xl cursor-pointer hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={() =>
                    handleAdvanceStatus(activeActionAppt.id, 'COMPLETE', actionRemarks)
                  }
                  className="min-h-[44px] flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs rounded-xl shadow transition cursor-pointer"
                >
                  {submittingAction ? 'Saving...' : 'Mark Transaction Completed'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fallback Manual Student Lookup Modal */}
        {showManualLookup && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-slide-up border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-ua-blue" />
                  <h3 className="font-heading font-bold text-base text-slate-900">
                    Manual Student Lookup
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowManualLookup(false);
                    setConfirmManualAppt(null);
                  }}
                  className="min-h-[44px] min-w-[44px] text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Use this override when a visitor cannot display their QR ticket due to an unreadable screen or dead battery.
              </p>

              {/* Search Form */}
              <form onSubmit={handleSearchManual} className="flex gap-2">
                <input
                  ref={manualSearchInputRef}
                  type="text"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  placeholder="Enter Student ID, First Name, or Last Name..."
                  className="min-h-[44px] flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-ua-blue focus:outline-none font-medium"
                />
                <button
                  type="submit"
                  disabled={searchingManual || !manualQuery.trim()}
                  className="min-h-[44px] px-4 py-2 bg-ua-blue hover:bg-ua-blue-light disabled:opacity-50 text-white font-heading font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  {searchingManual ? 'Searching...' : 'Search'}
                </button>
              </form>

              {/* Search Results */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {manualResults.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 italic">
                    {manualQuery ? 'No scheduled appointments found matching query.' : 'Type a name or Student ID and click Search.'}
                  </div>
                ) : (
                  manualResults.map((appt) => (
                    <div
                      key={appt.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-ua-blue transition flex items-center justify-between text-xs gap-2"
                    >
                      <div>
                        <div className="font-heading font-bold text-slate-900">
                          {appt.user?.firstName && appt.user?.lastName
                            ? `${appt.user.firstName} ${appt.user.lastName}`
                            : appt.studentName || 'Student Visitor'}{' '}
                          <span className="text-slate-500 font-normal">
                            ({appt.user?.studentId || 'No ID'})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {appt.purpose} • {appt.timeSlot} • Status: <strong className="text-slate-700">{appt.status}</strong>
                        </div>
                      </div>

                      {appt.status === 'CONFIRMED' ? (
                        <button
                          type="button"
                          onClick={() => setConfirmManualAppt(appt)}
                          className="min-h-[40px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                        >
                          Select for Check-in
                        </button>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-200 px-2 py-1 rounded">
                          {appt.status}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Confirmation Step Before Manual Check-in */}
              {confirmManualAppt && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3 animate-slide-up">
                  <div className="flex items-center gap-2 text-amber-900 font-heading font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Confirm Manual Check-in Override</span>
                  </div>

                  <div className="text-xs text-amber-800 space-y-1">
                    <div>
                      <strong>Student:</strong>{' '}
                      {confirmManualAppt.user?.firstName && confirmManualAppt.user?.lastName
                        ? `${confirmManualAppt.user.firstName} ${confirmManualAppt.user.lastName}`
                        : confirmManualAppt.studentName || 'Student Visitor'}{' '}
                      ({confirmManualAppt.user?.studentId || 'N/A'})
                    </div>
                    <div>
                      <strong>Purpose:</strong> {confirmManualAppt.purpose}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1">
                      Reason for Manual Override (Logged in Audit Log)
                    </label>
                    <input
                      type="text"
                      value={manualReason}
                      onChange={(e) => setManualReason(e.target.value)}
                      placeholder="e.g. Phone screen cracked / dead battery"
                      className="w-full px-3 py-1.5 text-xs border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setConfirmManualAppt(null)}
                      className="min-h-[40px] flex-1 py-1.5 px-3 bg-white text-slate-700 border border-slate-300 font-heading font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submittingManual}
                      onClick={handleConfirmManualCheckIn}
                      className="min-h-[40px] flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs rounded-xl shadow transition cursor-pointer"
                    >
                      {submittingManual ? 'Checking in...' : 'Confirm Manual Check-in'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
