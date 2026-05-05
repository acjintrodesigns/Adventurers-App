'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { deriveComplianceIssues, type ApiChild } from '@/lib/compliance';

const stats = [
  { label: 'Total Students', value: '48', icon: '👧', color: 'bg-blue-50 text-blue-700' },
  { label: 'Total Income', value: 'R12,450', icon: '💰', color: 'bg-green-50 text-green-700' },
  { label: 'Outstanding Fees', value: 'R2,300', icon: '⚠️', color: 'bg-yellow-50 text-yellow-700' },
  { label: 'Upcoming Events', value: '3', icon: '📅', color: 'bg-purple-50 text-purple-700' },
];

const financialData = [
  { month: 'Sep', income: 4200, expenses: 1800 },
  { month: 'Oct', income: 3900, expenses: 2100 },
  { month: 'Nov', income: 4500, expenses: 1600 },
  { month: 'Dec', income: 2800, expenses: 900 },
  { month: 'Jan', income: 4100, expenses: 2000 },
];

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Paid: 'bg-blue-100 text-blue-700',
};

export default function DirectorDashboard() {
  const { user } = useAuth();
  const [children, setChildren] = useState<ApiChild[]>([]);

  const loadChildren = () => {
    apiFetch('/api/children')
      .then((data: ApiChild[]) => setChildren(Array.isArray(data) ? data : []))
      .catch(() => setChildren([]));
  };

  useEffect(() => { loadChildren(); }, []);

  const pendingChildren = children.filter((c) => c.status === 'Pending');
  const recentChildren = [...children]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 5);

  const complianceAlerts = children
    .map((child) => ({
      ...child,
      issues: deriveComplianceIssues(child),
    }))
    .filter((child) => child.issues.length > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Director Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name ?? 'Director'}</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-5 mb-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-yellow-900 uppercase tracking-wide">Pending Registrations</h2>
          <p className="text-xs text-yellow-700 mt-1">Registrations have moved to a dedicated page for cleaner review and actioning.</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-bold bg-yellow-200 text-yellow-900 px-3 py-1 rounded-full">
            {pendingChildren.length} pending
          </span>
          <Link
            href="/director/registrations"
            className="text-sm bg-[#1e3a5f] text-white px-3 py-2 rounded-lg font-semibold hover:bg-[#16314f] transition-colors"
          >
            Open Registrations
          </Link>
        </div>
      </div>

      {complianceAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-red-900 uppercase tracking-wide">Compliance Alerts</h2>
            <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-1 rounded-full">
              {complianceAlerts.length} children with issues
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {complianceAlerts.map((child) => (
              <div key={child.id} className="bg-white rounded-lg border border-red-100 p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{child.name}</p>
                    <p className="text-xs text-gray-400">{child.class} · Parent: {child.parentName || 'Parent'}</p>
                  </div>
                  <Link href={`/director/children/${child.id}`} className="text-xs text-[#1e3a5f] font-semibold hover:underline whitespace-nowrap">
                    Open Profile
                  </Link>
                </div>
                <ul className="space-y-1">
                  {child.issues.map((issue, idx) => (
                    <li key={idx} className="text-xs text-gray-600">• {issue.message}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl p-5 ${s.color} border border-opacity-30`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-70">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <span className="text-3xl">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link
          href="/director/registrations"
          className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#1e3a5f] transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center text-2xl group-hover:bg-[#1e3a5f] transition-colors">
            📝
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Registrations</p>
            <p className="text-xs text-gray-400 mt-0.5">Review pending applications</p>
          </div>
        </Link>
        <Link
          href="/director/payment-settings"
          className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#1e3a5f] transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-2xl group-hover:bg-[#1e3a5f] transition-colors">
            🏦
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Payment Settings</p>
            <p className="text-xs text-gray-400 mt-0.5">Configure bank details &amp; PayFast</p>
          </div>
        </Link>
        <Link
          href="/director/payments"
          className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#1e3a5f] transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-2xl group-hover:bg-[#1e3a5f] transition-colors">
            💳
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Payments</p>
            <p className="text-xs text-gray-400 mt-0.5">View and manage all payments</p>
          </div>
        </Link>
        <Link
          href="/director/children"
          className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[#1e3a5f] transition-all group"
        >
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-2xl group-hover:bg-[#1e3a5f] transition-colors">
            👧
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Children</p>
            <p className="text-xs text-gray-400 mt-0.5">Manage registrations</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Chart Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Financial Overview</h2>
          <div className="flex items-end gap-3 h-40">
            {financialData.map((d) => {
              const maxVal = 5000;
              const incomeH = Math.round((d.income / maxVal) * 100);
              const expH = Math.round((d.expenses / maxVal) * 100);
              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-1 items-end" style={{ height: '100px' }}>
                    <div
                      className="flex-1 bg-[#1e3a5f] rounded-t"
                      style={{ height: `${incomeH}%` }}
                      title={`Income: R${d.income}`}
                    />
                    <div
                      className="flex-1 bg-yellow-400 rounded-t"
                      style={{ height: `${expH}%` }}
                      title={`Expenses: R${d.expenses}`}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{d.month}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-[#1e3a5f] rounded inline-block" /> Income</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-400 rounded inline-block" /> Expenses</span>
          </div>
        </div>

        {/* Recent Registrations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">Recent Registrations</h2>
            <Link href="/director/children" className="text-xs text-[#1e3a5f] font-semibold hover:underline">
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {recentChildren.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No registrations yet.</p>
            ) : (
              recentChildren.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.name}</p>
                    <p className="text-xs text-gray-400">
                      {r.class}
                      {r.createdAt ? ` · ${new Date(r.createdAt).toLocaleDateString('en-ZA')}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {r.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
