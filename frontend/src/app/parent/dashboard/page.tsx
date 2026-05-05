'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { deriveComplianceIssues, type ApiChild } from '@/lib/compliance';

const events = [
  { name: 'Parents Evening', date: 'Jan 22, 2024', fee: 'Free' },
  { name: 'Investiture Ceremony', date: 'Feb 3, 2024', fee: 'R50/child' },
  { name: 'Camp Out', date: 'Mar 15, 2024', fee: 'R200/child' },
];

function getAge(dob: string) {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age--;
  return age;
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const [children, setChildren] = useState<ApiChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/children')
      .then((data) => setChildren(data))
      .catch((err) => setError(err?.message ?? 'Failed to load children'))
      .finally(() => setLoading(false));
  }, []);

  const actionItems = children.flatMap((child) => {
    const issues = deriveComplianceIssues(child);
    return issues.map((issue) => ({
      childId: child.id,
      childName: child.name,
      className: child.class,
      type: issue.type,
      message: issue.message,
    }));
  }).filter((item) => item.type !== 'discipline');

  const demeritNotices = children.flatMap((child) =>
    (child.activeDemerits ?? []).map((record) => ({
      childId: child.id,
      childName: child.name,
      className: child.class,
      isDelistedFromCamps: child.isDelistedFromCamps ?? false,
      record,
    }))
  );

  const unpaidChildren = children.filter((c) => c.status !== 'Paid');
  const hasUnpaidChildren = !loading && !error && children.length > 0 && unpaidChildren.length > 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Parent Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name ?? 'Parent'}</p>
      </div>

      {/* Registration payment required banner */}
      {hasUnpaidChildren && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-4">
          <div className="text-2xl">🔒</div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-1">Registration Payment Required</h2>
            <p className="text-sm text-blue-800">
              {unpaidChildren.length === 1
                ? `${unpaidChildren[0].name}'s registration fee has not been paid yet.`
                : `${unpaidChildren.length} children have unpaid registration fees.`
              }{' '}
              Events, camps, and all other activities are locked until registration is complete.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {unpaidChildren.map((c) => (
                <span key={c.id} className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  c.status === 'Approved' ? 'bg-green-100 text-green-700' :
                  c.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {c.name} — {c.status === 'Approved' ? 'Awaiting Payment' : c.status}
                </span>
              ))}
              {unpaidChildren.some((c) => c.status === 'Approved') && (
                <a href="/parent/register-child" className="text-xs font-semibold text-blue-700 underline ml-1 self-center">
                  Pay now →
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && !error && actionItems.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wide">Action Required</h2>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
              {actionItems.length} item{actionItems.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="space-y-2">
            {actionItems.map((item, index) => (
              <div key={`${item.childId}-${index}`} className="bg-white border border-amber-100 rounded-lg px-3 py-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.childName} <span className="text-gray-400 font-normal">({item.className})</span></p>
                  <p className="text-xs text-gray-600">{item.message}</p>
                </div>
                <Link
                  href={`/parent/children/${item.childId}/indemnity`}
                  className="text-xs text-[#1e3a5f] font-semibold hover:underline whitespace-nowrap"
                >
                  Fix
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && demeritNotices.length > 0 && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-rose-900 uppercase tracking-wide">Demerit Notices</h2>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-rose-100 text-rose-800">
              {demeritNotices.length} active
            </span>
          </div>
          <div className="space-y-3">
            {demeritNotices.map((notice) => (
              <div key={notice.record.id} className="bg-white border border-rose-100 rounded-lg px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-800">
                      {notice.childName} <span className="text-gray-400 font-normal">({notice.className})</span>
                    </p>
                    <p className="text-xs text-gray-600"><span className="font-semibold text-gray-700">Reason:</span> {notice.record.reason}</p>
                    <p className="text-xs text-gray-600"><span className="font-semibold text-gray-700">Consequence:</span> {notice.record.consequence}</p>
                    <p className="text-xs text-gray-600"><span className="font-semibold text-gray-700">Remedy:</span> {notice.record.remedy}</p>
                    <p className="text-xs text-gray-500">
                      Approved by {notice.record.approvedByDirectorName ?? 'Director'}
                      {notice.record.expiresAt ? ` · Expires ${new Date(notice.record.expiresAt).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {notice.isDelistedFromCamps && (
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-center">
                        Camp payments blocked
                      </span>
                    )}
                    <Link
                      href="/parent/payments"
                      className="text-xs text-[#1e3a5f] font-semibold hover:underline whitespace-nowrap"
                    >
                      View payments
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Children Cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700">My Children</h2>
        </div>

        {loading && (
          <p className="text-sm text-gray-400">Loading children…</p>
        )}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
        {!loading && !error && children.length === 0 && (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400">
            <p className="text-sm">No children registered yet.</p>
            <Link href="/parent/register-child" className="mt-2 inline-block text-sm text-purple-600 font-semibold hover:underline">
              Register your first child →
            </Link>
          </div>
        )}
        {!loading && !error && children.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {children.map((c) => (
              <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
                <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center text-3xl">
                  {c.photoUrl ? (
                    <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    '👤'
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{c.name}</p>
                  <p className="text-sm text-gray-500">Class: {c.class}</p>
                  <p className="text-sm text-gray-500">Age: {getAge(c.dateOfBirth)}</p>
                  <p className="text-sm text-gray-500">Active demerits: {c.demeritCount ?? 0}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    c.status === 'Paid'
                      ? 'bg-green-100 text-green-700'
                      : c.status === 'Approved'
                      ? 'bg-blue-100 text-blue-700'
                      : c.status === 'Rejected'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {c.status === 'Approved' ? 'Awaiting Payment' : c.status}
                  </span>
                  {c.isDelistedFromCamps && (
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-rose-100 text-rose-700">
                      Camps locked
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Upcoming Events</h2>
          {hasUnpaidChildren ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
              <span className="text-3xl">🔒</span>
              <p className="text-sm font-semibold text-gray-500">Locked</p>
              <p className="text-xs text-gray-400">Pay your registration fee to access events.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((e) => (
                <div key={e.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{e.name}</p>
                    <p className="text-xs text-gray-400">{e.date}</p>
                  </div>
                  <span className="text-xs font-semibold text-[#1e3a5f] bg-blue-50 px-2 py-1 rounded-full">
                    {e.fee}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payments placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Recent Payments</h2>
          <p className="text-sm text-gray-400 text-center py-4">Payment history coming soon.</p>
        </div>
      </div>
    </div>
  );
}
