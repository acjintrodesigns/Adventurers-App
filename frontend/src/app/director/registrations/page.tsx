'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ApiChild } from '@/lib/compliance';

export default function DirectorRegistrationsPage() {
  const { token } = useAuth();
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5009';

  const [children, setChildren] = useState<ApiChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadChildren = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/children');
      setChildren(Array.isArray(data) ? data : []);
    } catch {
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadChildren();
  }, []);

  const pendingChildren = useMemo(
    () => children
      .filter((child) => child.status === 'Pending')
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
    [children],
  );

  const updateStatus = async (child: ApiChild, status: 'Approved' | 'Rejected') => {
    if (!token) return;
    setActioningId(child.id);
    setActionMsg(null);

    try {
      const res = await fetch(`${base}/api/children/${child.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error(`Failed to ${status.toLowerCase()} registration.`);

      setChildren((prev) => prev.map((c) => (c.id === child.id ? { ...c, status } : c)));
      setActionMsg({ type: 'success', text: `${child.name} has been ${status.toLowerCase()}.` });
    } catch (err: unknown) {
      setActionMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Action failed.',
      });
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Registrations</h1>
          <p className="text-gray-500 text-sm mt-1">Review and process all pending child registrations.</p>
        </div>
        <Link
          href="/director/dashboard"
          className="text-sm font-semibold text-[#1e3a5f] hover:underline"
        >
          Back to Dashboard
        </Link>
      </div>

      {actionMsg && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm border ${
            actionMsg.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {actionMsg.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pending Registrations</p>
          <p className="text-3xl font-bold text-[#1e3a5f] mt-1">{loading ? '...' : pendingChildren.length}</p>
        </div>
        <span className="text-xs font-semibold bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">Action Queue</span>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">Loading registrations...</div>
      ) : pendingChildren.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <p className="text-lg font-semibold text-gray-700">No pending registrations</p>
          <p className="text-sm text-gray-500 mt-1">All caught up. New submissions will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingChildren.map((child) => (
            <div key={child.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-[#1e3a5f] overflow-hidden flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {child.photoUrl ? (
                    <img src={child.photoUrl} alt={child.name} className="w-full h-full object-cover" />
                  ) : (
                    child.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{child.name}</p>
                  <p className="text-xs text-gray-500 truncate">{child.class} • {child.parentName ?? 'Unknown parent'}</p>
                  <p className="text-xs text-gray-400 truncate">
                    Submitted: {child.createdAt ? new Date(child.createdAt).toLocaleDateString('en-ZA') : 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/director/children/${child.id}`}
                  className="text-xs text-[#1e3a5f] font-medium hover:underline"
                >
                  Open Profile
                </Link>
                <button
                  onClick={() => updateStatus(child, 'Approved')}
                  disabled={actioningId === child.id}
                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {actioningId === child.id ? '...' : 'Approve'}
                </button>
                <button
                  onClick={() => updateStatus(child, 'Rejected')}
                  disabled={actioningId === child.id}
                  className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {actioningId === child.id ? '...' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
