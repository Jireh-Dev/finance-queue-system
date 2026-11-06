'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calendar,
  QrCode,
  Users,
  ShieldCheck,
  MonitorPlay,
  LogOut,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    {
      name: 'Live Queue Board',
      href: '/queue',
      icon: MonitorPlay,
      roles: ['ALL'],
      badge: 'Live',
    },
    {
      name: 'My Appointments',
      href: '/dashboard',
      icon: Calendar,
      roles: ['STUDENT', 'PARENT', 'ADMIN', 'STAFF'],
    },
    {
      name: 'Book Slot',
      href: '/book',
      icon: QrCode,
      roles: ['STUDENT', 'PARENT', 'ADMIN'],
    },
    {
      name: 'Cashier & Scanner',
      href: '/staff',
      icon: Users,
      roles: ['STAFF', 'ADMIN'],
      badge: 'Staff',
    },
    {
      name: 'Admin & Audits',
      href: '/admin',
      icon: ShieldCheck,
      roles: ['ADMIN'],
    },
  ];

  const visibleLinks = navLinks.filter((link) => {
    if (link.roles.includes('ALL')) return true;
    if (!user) return link.href === '/queue';
    return link.roles.includes(user.role);
  });

  return (
    <header className="bg-ua-blue text-white shadow-md sticky top-0 z-50 border-b-2 border-ua-gold no-print">
      {/* Top institution bar */}
      <div className="bg-ua-blue-dark px-4 py-1.5 text-xs text-blue-100 border-b border-blue-900/60">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-heading font-semibold text-ua-gold-light tracking-wide uppercase">
              University of the Assumption
            </span>
            <span className="hidden sm:inline text-blue-300/60">|</span>
            <span className="hidden sm:inline text-blue-200">Finance & Accounting Office</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="hidden md:inline text-blue-200">City of San Fernando, Pampanga</span>
            <span className="bg-ua-red px-2.5 py-0.5 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider text-white shadow-sm">
              Official Portal
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link
            href="/"
            className="flex items-center gap-3 group min-h-[44px] cursor-pointer focus-visible:ring-2 focus-visible:ring-white rounded-xl p-1"
          >
            {/* Official University of the Assumption Seal */}
            <div className="w-11 h-11 rounded-full bg-white p-0.5 shadow-md border-2 border-ua-gold transform group-hover:scale-105 transition-transform shrink-0 overflow-hidden flex items-center justify-center">
              <img
                src="/ua-logo.png"
                alt="University of the Assumption Seal"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="font-heading font-extrabold text-base sm:text-lg tracking-tight flex items-center gap-1.5 text-white">
                <span>UA Finance</span>
                <span className="text-slate-900 font-heading font-bold text-xs sm:text-sm px-2 py-0.5 rounded-md bg-ua-gold shadow-sm">
                  Queue & QR
                </span>
              </div>
              <p className="text-[11px] text-blue-200 hidden sm:block">
                Appointment & Live Queue System
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1" aria-label="Main Navigation">
            {visibleLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-heading font-semibold transition-all duration-200 cursor-pointer min-h-[44px] ${
                    isActive
                      ? 'bg-white text-ua-blue shadow-md'
                      : 'text-blue-100 hover:bg-ua-blue-light hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.name}</span>
                  {link.badge && (
                    <span
                      role="status"
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        link.badge === 'Live'
                          ? 'bg-ua-red text-white animate-pulse'
                          : 'bg-ua-gold text-slate-900'
                      }`}
                    >
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Section: Auth State & Actions */}
          <div className="hidden sm:flex items-center gap-3">
            {loading ? (
              <div className="w-24 h-9 bg-blue-800/60 rounded-xl animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-heading font-bold leading-tight">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 text-[11px] text-ua-gold-light">
                    <span className="font-semibold uppercase tracking-wider bg-blue-950/60 px-2 py-0.5 rounded">
                      {user.role}
                    </span>
                    {user.studentId && (
                      <span className="text-blue-200">({user.studentId})</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="min-h-[44px] min-w-[44px] p-2.5 text-blue-200 hover:text-white hover:bg-ua-red rounded-xl transition-colors border border-blue-400/30 cursor-pointer flex items-center justify-center"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="min-h-[44px] px-4 py-2 text-xs font-heading font-semibold text-blue-100 hover:text-white hover:bg-ua-blue-light rounded-xl transition cursor-pointer flex items-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="min-h-[44px] px-4 py-2 text-xs font-heading font-bold bg-ua-gold hover:bg-ua-gold-light text-slate-900 hover:text-black rounded-xl shadow-md transition border border-yellow-300/40 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-blue-200 hover:text-white hover:bg-ua-blue-light cursor-pointer flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-ua-blue-dark border-t border-blue-800 px-4 pt-3 pb-5 space-y-2 animate-slide-up">
          {user && (
            <div className="pb-3 mb-2 border-b border-blue-700/60 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-200">Signed in as:</p>
                <p className="font-heading font-bold text-sm text-white">
                  {user.firstName} {user.lastName} ({user.role})
                </p>
                {user.studentId && (
                  <p className="text-xs text-ua-gold font-medium">{user.studentId}</p>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 bg-ua-red hover:bg-red-700 text-xs text-white rounded-xl font-bold cursor-pointer transition shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}

          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-heading font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-white text-ua-blue shadow-sm'
                    : 'text-blue-100 hover:bg-ua-blue-light hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{link.name}</span>
                </div>
                {link.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      link.badge === 'Live'
                        ? 'bg-ua-red text-white'
                        : 'bg-ua-gold text-slate-900'
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {!user && (
            <div className="pt-3 border-t border-blue-800 flex gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex-1 flex items-center justify-center text-xs font-heading font-bold bg-white text-ua-blue rounded-xl cursor-pointer"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex-1 flex items-center justify-center text-xs font-heading font-bold bg-ua-gold text-slate-900 rounded-xl cursor-pointer"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
