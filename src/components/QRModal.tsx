'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Printer, ShieldCheck, Calendar, Clock, User, Hash, Copy, Check } from 'lucide-react';
import StatusBadge from './StatusBadge';

interface QRModalProps {
  appointmentId: string;
  onClose: () => void;
}

export default function QRModal({ appointmentId, onClose }: QRModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/appointments/${appointmentId}/qr`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load QR code');
        return res.json();
      })
      .then((resData) => {
        if (resData.success) {
          setData(resData);
        } else {
          setError(resData.error || 'Failed to load QR code');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [appointmentId]);

  const handleCopyToken = async () => {
    const token = data?.qrToken;
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy token:', err);
    }
  };

  const handleDownload = () => {
    if (!data?.dataUrl) return;
    const link = document.createElement('a');
    link.href = data.dataUrl;
    link.download = `UA-Finance-QR-${data.appointment?.id || 'ticket'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-ua-blue text-white px-6 py-4 flex items-center justify-between border-b-2 border-ua-gold no-print">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <span>Appointment QR Ticket</span>
            </h3>
            <p className="text-xs text-blue-200">Present this QR code at the Cashier counter</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-ua-blue-light transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-ua-blue border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Generating secure QR ticket...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-red-600 text-sm">{error}</div>
          ) : (
            <div className="space-y-5">
              {/* Ticket printable body */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-slate-50/50 text-center relative overflow-hidden">
                <div className="w-12 h-12 rounded-full bg-white p-0.5 border border-ua-gold mx-auto mb-2 shadow-sm overflow-hidden flex items-center justify-center">
                  <img
                    src="/ua-logo.png"
                    alt="University of the Assumption Seal"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-xs font-heading font-bold text-ua-blue uppercase tracking-wider mb-0.5">
                  University of the Assumption
                </div>
                <div className="text-[11px] text-slate-500 mb-4 font-medium">
                  Finance & Accounting Office • Official Queue Ticket
                </div>

                {/* QR Code Container */}
                <div className="inline-block p-3 bg-white rounded-xl shadow-sm border border-slate-200">
                  <img
                    src={data.dataUrl}
                    alt="Appointment QR Code"
                    className="w-48 h-48 object-contain mx-auto"
                  />
                </div>

                {/* Queue Number Badge if checked in */}
                {data.appointment.queueNumber && (
                  <div className="mt-3 inline-block bg-ua-blue text-white px-4 py-1.5 rounded-full text-base font-black tracking-wide shadow-sm">
                    Queue #{data.appointment.queueNumber}
                  </div>
                )}

                {/* Details Breakdown */}
                <div className="mt-4 pt-4 border-t border-slate-200 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Student/Visitor
                    </span>
                    <span className="font-bold text-slate-800">
                      {data.appointment.studentName}
                    </span>
                  </div>

                  {data.appointment.studentId && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-slate-400" /> Student ID
                      </span>
                      <span className="font-semibold text-slate-700">
                        {data.appointment.studentId}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date
                    </span>
                    <span className="font-semibold text-slate-800">
                      {new Date(data.appointment.appointmentDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Time Slot
                    </span>
                    <span className="font-semibold text-slate-800">
                      {data.appointment.timeSlot}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Purpose</span>
                    <span className="font-semibold text-ua-blue text-right max-w-[200px] truncate">
                      {data.appointment.purpose}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500">Status</span>
                    <StatusBadge status={data.appointment.status} size="sm" />
                  </div>
                </div>

                {/* Security verification notice with Click-to-Copy */}
                <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    title="Click to copy full 64-char token"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:border-slate-300 transition text-[11px] font-mono text-slate-700 shadow-sm cursor-pointer group active:scale-95"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate max-w-[200px] text-slate-600 font-medium">
                      {data.qrToken ? `${data.qrToken.substring(0, 12)}...${data.qrToken.substring(data.qrToken.length - 8)}` : 'CSPRNG Token'}
                    </span>
                    {copied ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-heading font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 animate-in fade-in">
                        <Check className="w-3 h-3" />
                        <span>Copied!</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-heading font-semibold text-slate-400 group-hover:text-ua-blue">
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </span>
                    )}
                  </button>
                  <span className="text-[10px] text-slate-400">Click token to copy 256-bit CSPRNG hex</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 no-print">
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold rounded-xl border transition cursor-pointer min-h-[44px] ${
                    copied
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                  title="Copy 64-character token to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-500" />
                      <span>Copy Token</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-ua-blue hover:bg-ua-blue-light text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download QR</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition cursor-pointer min-h-[44px]"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Ticket</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

