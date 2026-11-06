'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Clock,
  Users,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Sparkles,
  Award,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Bell,
} from 'lucide-react';

export default function PublicLiveQueueBoard() {
  const [queueData, setQueueData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const previousServingIdRef = useRef<string | null>(null);

  // Synthesize institutional counter chime via Web Audio API
  const playCounterChime = () => {
    if (!audioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Note 1 (E5 - 659 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.6);

      // Note 2 (G#5 - 830 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(830.61, ctx.currentTime + 0.25);
      gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.25);
      osc2.stop(ctx.currentTime + 0.9);
    } catch (e) {
      console.warn('Audio chime failed:', e);
    }
  };

  const fetchLiveQueue = async () => {
    try {
      const res = await fetch('/api/queue', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setQueueData(data);

        // Check if now serving changed to play chime
        const currentServingId = data?.nowServing?.id;
        if (
          previousServingIdRef.current &&
          currentServingId &&
          previousServingIdRef.current !== currentServingId
        ) {
          playCounterChime();
        }
        previousServingIdRef.current = currentServingId || null;
      }
    } catch (e) {
      console.error('Error fetching live queue:', e);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const safeFetch = async () => {
      try {
        const res = await fetch('/api/queue', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          setQueueData(data);

          const currentServingId = data?.nowServing?.id;
          if (
            previousServingIdRef.current &&
            currentServingId &&
            previousServingIdRef.current !== currentServingId
          ) {
            playCounterChime();
          }
          previousServingIdRef.current = currentServingId || null;
        }
      } catch (e) {
        if (isMounted) {
          console.error('Error fetching live queue:', e);
        }
      }
    };

    safeFetch();

    // Real-Time EventSource (Server-Sent Events) for instant zero-latency updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/queue/events');

      eventSource.addEventListener('queue-init', (e: MessageEvent) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(e.data);
          setQueueData(data);
          previousServingIdRef.current = data?.nowServing?.id || null;
        } catch (err) {
          console.error('Failed to parse queue-init event:', err);
        }
      });

      eventSource.addEventListener('queue-update', (e: MessageEvent) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(e.data);
          setQueueData(data);

          const currentServingId = data?.nowServing?.id;
          if (
            previousServingIdRef.current &&
            currentServingId &&
            previousServingIdRef.current !== currentServingId
          ) {
            playCounterChime();
          }
          previousServingIdRef.current = currentServingId || null;
        } catch (err) {
          console.error('Failed to parse queue-update event:', err);
        }
      });

      eventSource.onerror = () => {
        // Fallback gracefully to background polling if SSE connection drops
      };
    } catch (err) {
      console.warn('SSE not supported or failed to connect; relying on polling fallback:', err);
    }

    // Safety polling fallback every 6 seconds in case of network reconnection
    const queueInterval = setInterval(safeFetch, 6000);

    const updateClock = () => {
      if (!isMounted) return;
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
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(queueInterval);
      clearInterval(clockInterval);
    };
  }, [audioEnabled]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const servingList = queueData?.servingList || [];
  const waitingQueue = queueData?.waitingQueue || [];

  return (
    <div className="flex-1 bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none">
      {/* Top Header Bar */}
      <header className="bg-slate-900/95 border-2 border-ua-gold/70 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white p-1 shadow-lg border-2 border-ua-gold shrink-0 overflow-hidden flex items-center justify-center">
            <img
              src="/ua-logo.png"
              alt="University of the Assumption Seal"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-xs font-bold uppercase tracking-widest text-ua-gold-light">
                University of the Assumption
              </span>
              <span
                role="status"
                aria-live="polite"
                className="px-2.5 py-0.5 rounded-full bg-ua-red text-white text-[10px] font-heading font-black uppercase tracking-wider animate-pulse flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                <span>Live Queue</span>
              </span>
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-black tracking-tight text-white">
              Finance Office Queue Display
            </h1>
          </div>
        </div>

        {/* Live Digital Clock & Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right">
            <div
              className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-ua-gold-light"
              aria-label={`Current time is ${currentTime}`}
            >
              {currentTime || '08:00:00 AM'}
            </div>
            <div className="text-xs text-slate-400 font-medium">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>

          {/* Sound Notification Chime Toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              audioEnabled
                ? 'bg-ua-gold text-slate-950 border-yellow-400 font-bold shadow-glow-gold'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title={audioEnabled ? 'Counter Chime Active' : 'Enable Audio Chime'}
            aria-label={audioEnabled ? 'Counter Chime Active' : 'Enable Audio Chime'}
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="min-h-[44px] min-w-[44px] p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 transition border border-slate-700 cursor-pointer flex items-center justify-center"
            title="Toggle Fullscreen"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Display Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 flex-1">
        {/* Left Column: Now Serving Counter Displays (8 cols) */}
        <section className="lg:col-span-8 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Flame className="w-6 h-6 text-ua-gold" />
              <h2 className="font-heading text-lg font-black uppercase tracking-wider text-slate-200">
                Now Serving at Cashier Counters
              </h2>
            </div>
            <div
              role="status"
              aria-live="polite"
              className="text-xs font-bold text-emerald-400 bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Real-Time Active</span>
            </div>
          </div>

          {servingList.length === 0 ? (
            <div className="flex-1 bg-slate-900/60 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mb-3">
                <Award className="w-8 h-8" />
              </div>
              <div className="font-heading text-xl font-bold text-slate-300">
                Cashier Windows Ready for Service
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Please proceed to the cashier check-in desk or present your digital QR ticket upon arrival.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              {servingList.map((item: any) => (
                <div
                  key={item.id}
                  className="bg-gradient-to-br from-ua-blue via-ua-blue-dark to-slate-900 rounded-2xl p-6 border-2 border-ua-gold shadow-2xl flex flex-col justify-between relative overflow-hidden transform hover:scale-[1.01] transition duration-200 animate-fade-in"
                >
                  <div className="absolute top-0 right-0 bg-ua-gold text-slate-950 font-heading font-black text-xs px-3.5 py-1.5 rounded-bl-xl uppercase tracking-wider shadow-sm">
                    {item.counterName?.split('-')[0].trim() || 'Window'}
                  </div>

                  <div>
                    <div className="text-xs font-heading font-bold uppercase tracking-widest text-blue-200 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-ua-gold" />
                      <span>Now Serving</span>
                    </div>
                    <div className="font-heading text-6xl sm:text-7xl font-black text-white tracking-tight my-2 drop-shadow-md">
                      Q-{item.queueNumber}
                    </div>
                    <div className="font-heading text-lg sm:text-xl font-bold text-ua-gold-light truncate">
                      {item.user.firstName} {item.user.lastName}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-blue-800/80 mt-4 flex items-center justify-between text-xs text-blue-100">
                    <span className="truncate max-w-[200px] font-medium">{item.purpose}</span>
                    <span className="font-heading font-semibold text-white bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/50">
                      {item.counterName?.split('-')[1]?.trim() || 'Cashier Counter'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Upcoming Queue Tickets & Summary (4 cols) */}
        <section className="lg:col-span-4 bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-ua-gold" />
                <span>Next in Line ({waitingQueue.length})</span>
              </h3>
              <span
                role="status"
                aria-atomic="true"
                className="text-xs text-ua-gold font-heading font-bold bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-600/30"
              >
                ~{queueData?.estimatedWaitMinutes ?? 0}m wait
              </span>
            </div>

            <div className="mt-4 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {waitingQueue.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No visitors currently in waiting line.
                </div>
              ) : (
                waitingQueue.map((item: any, idx: number) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 hover:border-slate-700 flex items-center justify-between text-xs transition duration-150"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-ua-blue font-heading font-black text-white flex items-center justify-center text-xs shadow-sm">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-heading font-black text-sm text-white">
                          Queue #{item.queueNumber}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                          {item.user.firstName} {item.user.lastName}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-heading font-bold bg-blue-950 text-blue-300 border border-blue-800">
                      Waiting
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Metrics Bar at Bottom */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Completed Today</div>
              <div className="font-heading text-2xl font-black text-emerald-400 mt-1">
                {queueData?.completedTodayCount ?? 0}
              </div>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Currently Waiting</div>
              <div className="font-heading text-2xl font-black text-ua-gold-light mt-1">
                {waitingQueue.length}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Ticker Footer */}
      <footer className="bg-slate-900/90 border border-slate-800 px-4 py-3 rounded-xl flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-ua-gold shrink-0" />
          <span>
            Please prepare your Student ID and have your digital or printed QR ticket ready.
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-medium">
          City of San Fernando, Pampanga • St. Thomas Building Ground Floor
        </div>
      </footer>
    </div>
  );
}
