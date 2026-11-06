import React from 'react';
import { MapPin, Phone, Mail, Shield, Clock } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t-4 border-ua-blue no-print mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1: Institution Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white p-0.5 border-2 border-ua-gold flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                <img
                  src="/ua-logo.png"
                  alt="University of the Assumption Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-white font-heading font-bold text-base">
                University of the Assumption
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-300 max-w-md">
              Finance Office Appointment & Queue Management Portal. Providing streamlined,
              secure, and transparent cashier services for students, parents, and guardians
              with instant QR check-ins.
            </p>
            <div className="flex items-center gap-4 text-xs text-ua-gold pt-2">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Office Hours: 8:00 AM – 5:00 PM (PST)
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                CSPRNG 256-bit Secure QR
              </span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">
              Quick Portals
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <a href="/queue" className="hover:text-ua-gold-light transition">
                  Public Live Queue Monitor
                </a>
              </li>
              <li>
                <a href="/book" className="hover:text-ua-gold-light transition">
                  Book Finance Appointment
                </a>
              </li>
              <li>
                <a href="/dashboard" className="hover:text-ua-gold-light transition">
                  My Appointment Tickets
                </a>
              </li>
              <li>
                <a href="/staff" className="hover:text-ua-gold-light transition">
                  Cashier & Staff Terminal
                </a>
              </li>
              <li>
                <a href="/admin" className="hover:text-ua-gold-light transition">
                  Admin Audit Logs & Reports
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider">
              Finance Office Contact
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-ua-gold shrink-0 mt-0.5" />
                <span>2nd Floor, Ryan Building, University of the Assumption, City of San Fernando, Pampanga</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-ua-gold shrink-0" />
                <span>(045) 961-3617 / (045) 961-1482</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-ua-gold shrink-0" />
                <span>finance@ua.edu.ph</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} University of the Assumption. All Rights Reserved.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            <span>Built for UA Finance Midterm Capstone & Operations</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

