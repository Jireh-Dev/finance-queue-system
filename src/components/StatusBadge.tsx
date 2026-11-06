import React from 'react';
import { AppointmentStatus } from '@/lib/types';
import { CheckCircle2, Clock, AlertCircle, XCircle, UserCheck, Flame } from 'lucide-react';

interface StatusBadgeProps {
  status: AppointmentStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3.5 py-1.5 text-sm font-bold',
  }[size];

  switch (status) {
    case 'SERVING':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 shadow-sm animate-pulse ${sizeClasses}`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-600" />
          <span>Now Serving</span>
        </span>
      );
    case 'CHECKED_IN':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-ua-blue border border-blue-200 shadow-sm ${sizeClasses}`}
        >
          <UserCheck className="w-3.5 h-3.5 text-ua-blue" />
          <span>In Queue</span>
        </span>
      );
    case 'CONFIRMED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Confirmed</span>
        </span>
      );
    case 'COMPLETED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 ${sizeClasses}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Completed</span>
        </span>
      );
    case 'CANCELLED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-red-50 text-ua-red border border-red-200 ${sizeClasses}`}
        >
          <XCircle className="w-3.5 h-3.5 text-ua-red" />
          <span>Cancelled</span>
        </span>
      );
    case 'MISSED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 ${sizeClasses}`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Missed</span>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses}`}
        >
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{status}</span>
        </span>
      );
  }
}

