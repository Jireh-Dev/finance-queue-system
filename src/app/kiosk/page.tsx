'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
  LogOut,
  Clock,
  ShieldCheck,
  Building,
  Keyboard,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function DoorKioskPage() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Manual Backup Mode states
  const [manualMode, setManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const inputRef = useRef<HTMLInputElement | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastScannedTokenRef = useRef<{ token: string; time: number } | null>(null);

  // Focus enforcement
  const focusInput = () => {
    // If manual mode is open, do not steal focus from manual input or if user is interacting with manual input
    if (manualMode) {
      setTimeout(() => {
        if (manualInputRef.current && document.activeElement !== manualInputRef.current) {
          manualInputRef.current.focus();
        }
      }, 50);
      return;
    }

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 50);
  };

  // Play audio chime via Web Audio API
  const playKioskSound = (type: 'SUCCESS' | 'ERROR') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'SUCCESS') {
        // High double-tone chime
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.frequency.setValueAtTime(880, ctx.currentTime);
        gain1.gain.setValueAtTime(0.18, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.15);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
        gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.12);
        osc2.stop(ctx.currentTime + 0.35);
      } else {
        // Low error buzz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.28);
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  useEffect(() => {
    // Check kiosk session authentication
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          router.push('/login?redirect=/kiosk');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.user) {
          if (data.user.role !== 'KIOSK' && data.user.role !== 'STAFF' && data.user.role !== 'ADMIN') {
            router.push('/dashboard');
          }
        }
      })
      .catch(() => router.push('/login?redirect=/kiosk'));

    focusInput();

    // Live clock
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);

    // Global focus redirection
    const handleGlobalClick = (e: MouseEvent) => {
      // Don't divert focus if user clicked inside manual mode inputs or buttons
      if (manualMode) {
        return;
      }
      focusInput();
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't divert keystrokes if manual mode is active or user is typing into another input
      if (manualMode) {
        return;
      }
      if (document.activeElement !== inputRef.current) {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          focusInput();
        }
      }
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      clearInterval(clockInterval);
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleGlobalKeyDown);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [router, manualMode]);

  const handleValidate = async (targetToken?: string) => {
    const rawToken = (targetToken || (manualMode && manualInput ? manualInput : tokenInput)).trim();
    if (!rawToken || validating) return;

    // Duplicate scan guard (within 3s)
    const now = Date.now();
    if (
      lastScannedTokenRef.current &&
      lastScannedTokenRef.current.token === rawToken &&
      now - lastScannedTokenRef.current.time < 3000
    ) {
      setTokenInput('');
      setManualInput('');
      focusInput();
      return;
    }

    setTokenInput('');
    setManualInput('');
    setValidating(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/queue/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: rawToken,
          counterName: 'Door Kiosk Self-Service Check-In',
        }),
      });

      const data = await res.json();
      lastScannedTokenRef.current = { token: rawToken, time: Date.now() };

      if (!res.ok) {
        playKioskSound('ERROR');
        setErrorMessage(data.error || 'Invalid or expired QR code.');
        setLastCheckIn(null);
      } else {
        playKioskSound('SUCCESS');
        setLastCheckIn(data.appointment);
        setErrorMessage(null);
      }
    } catch (err: any) {
      playKioskSound('ERROR');
      setErrorMessage(err.message || 'Network error processing QR ticket.');
    } finally {
      setValidating(false);
      focusInput();

      // Reset feedback screen after 4.5 seconds for next student
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setLastCheckIn(null);
        setErrorMessage(null);
        focusInput();
      }, 4500);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-lg border-2 border-ua-gold flex items-center justify-center shrink-0">
            <img
              src="/ua-logo.png"
              alt="UA Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-xs font-bold text-ua-gold uppercase tracking-widest">
                University of the Assumption
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider">
                Door Kiosk Mode
              </span>
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-black text-white">
              Finance Office Check-in Terminal
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-2xl font-black text-ua-gold-light">
              {currentTime || '08:00:00 AM'}
            </div>
            <div className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log out of Kiosk"
            className="p-3 bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-800 transition cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Scanner Section */}
      <main className="my-auto max-w-2xl w-full mx-auto py-8 text-center space-y-6">
        {/* Success Feedback Display */}
        {lastCheckIn ? (
          <div className="p-8 bg-gradient-to-br from-emerald-950/80 to-slate-900 border-2 border-emerald-500 rounded-3xl shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border-2 border-emerald-400">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-heading font-bold text-emerald-400 uppercase tracking-widest">
                Check-in Successful!
              </div>
              <div className="font-heading text-6xl sm:text-7xl font-black text-white tracking-tight drop-shadow-md">
                Q-{lastCheckIn.queueNumber}
              </div>
              <div className="font-heading text-xl font-bold text-ua-gold-light">
                {lastCheckIn.user?.firstName} {lastCheckIn.user?.lastName}
              </div>
              <div className="text-xs text-slate-300">
                Purpose: <strong>{lastCheckIn.purpose}</strong>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-900/40 rounded-2xl border border-emerald-700/50 text-xs text-emerald-200 font-medium">
              You are now in queue! Please proceed inside and watch the big live queue monitor for your number.
            </div>
          </div>
        ) : errorMessage ? (
          /* Error State Display */
          <div className="p-8 bg-rose-950/70 border-2 border-rose-500 rounded-3xl shadow-2xl space-y-4 animate-in shake duration-200">
            <div className="w-20 h-20 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center border-2 border-rose-400">
              <AlertCircle className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <h2 className="font-heading text-xl font-black text-white">
                Check-in Error
              </h2>
              <p className="text-sm text-rose-200 max-w-md mx-auto">
                {errorMessage}
              </p>
            </div>

            <div className="text-xs text-slate-400">
              Please present your digital QR ticket again or ask the cashier counter for assistance.
            </div>
          </div>
        ) : (
          /* Idle Ready State Display */
          <div className="p-10 bg-slate-900/70 border-2 border-dashed border-slate-700 rounded-3xl shadow-xl space-y-6">
            <div className="w-24 h-24 rounded-3xl bg-ua-blue/20 text-ua-gold mx-auto flex items-center justify-center border-2 border-ua-gold/40 animate-pulse">
              <QrCode className="w-14 h-14" />
            </div>

            <div className="space-y-2">
              <h2 className="font-heading text-3xl font-black text-white tracking-tight">
                Scan Your Appointment QR Ticket
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Hold your phone's digital QR ticket or printed appointment slip in front of the optical scanner below.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full border border-slate-700 text-xs text-emerald-400 font-heading font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Laser Scanner Active • Waiting for QR</span>
            </div>
          </div>
        )}

        {/* Toggle for Manual Backup Input */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              const nextMode = !manualMode;
              setManualMode(nextMode);
              if (nextMode) {
                setTimeout(() => {
                  manualInputRef.current?.focus();
                }, 100);
              } else {
                focusInput();
              }
            }}
            className="inline-flex items-center gap-2 text-xs font-heading font-medium text-slate-400 hover:text-ua-gold transition px-3 py-1.5 rounded-xl hover:bg-slate-800/60 border border-transparent hover:border-slate-700 cursor-pointer"
          >
            <Keyboard className="w-4 h-4 text-ua-gold" />
            <span>Scanner broken? Use Manual Backup Input</span>
            {manualMode ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Expandable Manual Input Card */}
        {manualMode && (
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-left space-y-3 animate-in fade-in-50 slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <label className="text-xs font-heading font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Keyboard className="w-4 h-4 text-ua-gold" />
                <span>Manual Token or Code Entry</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                64-char Hex CSPRNG
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualInput.trim()) {
                  handleValidate(manualInput.trim());
                }
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                ref={manualInputRef}
                type="text"
                placeholder="Paste or type 64-character token..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ua-gold focus:border-transparent placeholder:text-slate-600"
              />
              <button
                type="submit"
                disabled={validating || !manualInput.trim()}
                className="px-5 py-2.5 bg-ua-blue hover:bg-ua-blue-light disabled:opacity-50 text-white text-xs font-heading font-bold rounded-xl transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md"
              >
                {validating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Submit Token</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
            <p className="text-[11px] text-slate-500">
              Type or paste the token found on your appointment confirmation page or email slip.
            </p>
          </div>
        )}

        {/* Hidden persistent scanner input field */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleValidate();
          }}
          className="opacity-0 h-0 overflow-hidden"
        >
          <input
            ref={inputRef}
            type="text"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleValidate();
              }
            }}
          />
        </form>
      </main>

      {/* Footer Info */}
      <footer className="text-center text-xs text-slate-500 pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-ua-gold" />
          <span>Official University of the Assumption Finance Gate Check-in</span>
        </div>
        <div className="text-[11px] text-slate-600 font-mono">
          Auto-Focus Active • High-Speed Token Verification
        </div>
      </footer>
    </div>
  );
}

