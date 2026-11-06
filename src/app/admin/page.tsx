'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Users,
  FileText,
  AlertTriangle,
  BarChart3,
  Search,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  KeyRound,
  Shield,
  Filter,
} from 'lucide-react';

export default function AdminConsole() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'AUDIT_LOGS' | 'USERS'>('ANALYTICS');
  const [loading, setLoading] = useState(true);

  // Stats data
  const [stats, setStats] = useState<any>(null);

  // Audit Logs data
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState('ALL');
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Users data
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'STUDENT',
    studentId: '',
    phone: '',
  });

  const fetchAdminData = async () => {
    try {
      const [meRes, statsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/admin/stats'),
      ]);

      if (!meRes.ok) {
        router.push('/login?redirect=/admin');
        return;
      }

      const meData = await meRes.json();
      if (meData.user.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      setUser(meData.user);

      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async (actionFilter = logFilter) => {
    setLoadingLogs(true);
    try {
      const url =
        actionFilter === 'failed_qr'
          ? '/api/admin/audit-logs?filter=failed_qr'
          : actionFilter !== 'ALL'
          ? `/api/admin/audit-logs?action=${actionFilter}`
          : '/api/admin/audit-logs';

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [router]);

  useEffect(() => {
    if (activeTab === 'AUDIT_LOGS') fetchAuditLogs();
    if (activeTab === 'USERS') fetchUsers();
  }, [activeTab]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      if (res.ok) {
        await fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        setShowCreateUserModal(false);
        setNewUser({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          role: 'STUDENT',
          studentId: '',
          phone: '',
        });
        await fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create user');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-ua-blue border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Authenticating Admin Console...</p>
        </div>
      </div>
    );
  }

  const filteredUsers = usersList.filter(
    (u) =>
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.studentId && u.studentId.toLowerCase().includes(userSearch.toLowerCase()))
  );

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Admin Header */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 border-b-4 border-ua-red shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  University Administration Portal
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-ua-gold text-slate-900">
                  Governance
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit Trail • Security Verification • Role Management • Reports
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              fetchAdminData();
              if (activeTab === 'AUDIT_LOGS') fetchAuditLogs();
              if (activeTab === 'USERS') fetchUsers();
            }}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Refresh System Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('ANALYTICS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'ANALYTICS'
                ? 'bg-ua-blue text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Reports & Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT_LOGS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'AUDIT_LOGS'
                ? 'bg-ua-blue text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Audit Trail & Security Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'USERS'
                ? 'bg-ua-blue text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Accounts & Roles</span>
          </button>
        </div>

        {/* TAB 1: REPORTS & ANALYTICS */}
        {activeTab === 'ANALYTICS' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Bookings
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  {stats?.metrics?.totalAppointments ?? 0}
                </div>
                <div className="text-[11px] text-blue-600 font-semibold mt-1">
                  All recorded appointments
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Completed Today
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
                  {stats?.metrics?.completedToday ?? 0}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Transactions served</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Accounts
                </div>
                <div className="text-2xl sm:text-3xl font-black text-ua-blue mt-1">
                  {stats?.metrics?.totalUsers ?? 0}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Students, staff, admins</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-red-200 bg-red-50/30 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Failed QR Scans</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-ua-red mt-1">
                  {stats?.metrics?.failedScansCount ?? 0}
                </div>
                <div className="text-[11px] text-red-500 font-semibold mt-1">
                  Logged in audit trail
                </div>
              </div>
            </div>

            {/* Purpose Breakdown Table & Progress */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide">
                Transactions by Purpose Breakdown
              </h3>

              {stats?.purposeBreakdown?.length === 0 ? (
                <p className="text-xs text-slate-400">No appointment data recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats?.purposeBreakdown?.map((item: any) => {
                    const total = stats.metrics.todayAppointments || 1;
                    const pct = Math.round((item.count / total) * 100);
                    return (
                      <div key={item.purpose} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700">{item.purpose}</span>
                          <span className="font-bold text-ua-blue">
                            {item.count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-ua-blue rounded-full"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AUDIT TRAIL & SECURITY LOGS */}
        {activeTab === 'AUDIT_LOGS' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-ua-blue" />
                  <span>System Audit Trail & Security Events</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Immutable event records tracking all QR generations, scans, invalid attempts, and status modifications.
                </p>
              </div>

              {/* Action Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">Filter:</span>
                <select
                  value={logFilter}
                  onChange={(e) => {
                    setLogFilter(e.target.value);
                    fetchAuditLogs(e.target.value);
                  }}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl bg-slate-50"
                >
                  <option value="ALL">All Actions</option>
                  <option value="failed_qr">Failed QR Scans (Security)</option>
                  <option value="QR_SCANNED_SUCCESS">QR Scanned Success</option>
                  <option value="QR_GENERATED">QR Generated</option>
                  <option value="STATUS_UPDATED">Status Updated</option>
                  <option value="APPOINTMENT_CREATED">Appointment Created</option>
                  <option value="USER_LOGIN">User Login</option>
                </select>
              </div>
            </div>

            {loadingLogs ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading audit trail...</div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No audit logs found for this filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Actor / User</th>
                      <th className="px-4 py-3">Details</th>
                      <th className="px-4 py-3">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {auditLogs.map((log) => {
                      const isFailedQR = log.action === 'QR_INVALID';
                      return (
                        <tr
                          key={log.id}
                          className={`hover:bg-slate-50/80 ${
                            isFailedQR ? 'bg-red-50/40 text-red-900' : 'text-slate-700'
                          }`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isFailedQR
                                  ? 'bg-red-100 text-ua-red'
                                  : log.action.includes('SUCCESS')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-ua-blue'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap font-sans">
                            {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate font-sans">
                            {typeof log.details === 'object'
                              ? JSON.stringify(log.details)
                              : log.details}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                            {log.ipAddress || '127.0.0.1'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: USERS & ROLES */}
        {activeTab === 'USERS' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name, email, or student ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-ua-blue"
                />
              </div>

              <button
                onClick={() => {
                  setNewUser({
                    firstName: '',
                    lastName: '',
                    email: '',
                    password: '',
                    role: 'STAFF',
                    studentId: '',
                    phone: '',
                  });
                  setShowCreateUserModal(true);
                }}
                className="px-4 py-2 bg-ua-blue hover:bg-ua-blue-light text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Create Staff / Kiosk Account</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Student / Ward ID</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Bookings</th>
                    <th className="px-4 py-3">Change Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.email}</td>
                      <td className="px-4 py-3 text-slate-600">{u.studentId || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'ADMIN'
                              ? 'bg-red-100 text-ua-red'
                              : u.role === 'STAFF'
                              ? 'bg-amber-100 text-amber-800'
                              : u.role === 'KIOSK'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-ua-blue'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {u._count?.appointments ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
                        >
                          <option value="STUDENT">STUDENT</option>
                          <option value="PARENT">PARENT</option>
                          <option value="STAFF">STAFF</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="KIOSK">KIOSK</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Create User */}
        {showCreateUserModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900">Add New Account</h3>
                <button
                  onClick={() => setShowCreateUserModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newUser.firstName}
                      onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newUser.lastName}
                      onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  >
                    <option value="STAFF">STAFF (Cashier Terminal)</option>
                    <option value="KIOSK">KIOSK (Door Scanner PC/Tablet)</option>
                    <option value="ADMIN">ADMIN (System Administrator)</option>
                    <option value="STUDENT">STUDENT</option>
                    <option value="PARENT">PARENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Student ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={newUser.studentId}
                    onChange={(e) => setNewUser({ ...newUser, studentId: e.target.value })}
                    placeholder="e.g. UA-2024-998"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Initial Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-bold text-white bg-ua-blue rounded-xl shadow"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

