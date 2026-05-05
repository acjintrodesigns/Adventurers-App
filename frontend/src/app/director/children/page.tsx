'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { type ApiChild } from '@/lib/compliance';

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Paid: 'bg-blue-100 text-blue-700',
};

function DemeritBadge({ count }: { count: number }) {
  if (count === 0) return null;
  const danger = count >= 5;
  const warn = count >= 4;
  return (
    <span
      title={`${count}/5 active demerits${danger ? ' — camp payments blocked' : ''}`}
      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
        danger ? 'bg-red-600 text-white' : warn ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {count}/5 ⚠
    </span>
  );
}

export default function DirectorChildrenPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<ApiChild[]>([]);
  const [selected, setSelected] = useState<ApiChild | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected' | 'Paid'>('All');

  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5009';

  const loadChildren = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${base}/api/children`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load children.');
      const data: ApiChild[] = await res.json();
      setChildren(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load children.');
    } finally {
      setLoading(false);
    }
  }, [token, base]);

  useEffect(() => { loadChildren(); }, [loadChildren]);

  const updateStatus = async (child: ApiChild, status: 'Approved' | 'Rejected') => {
    if (!token) return;
    setActioningId(child.id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${base}/api/children/${child.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Failed to ${status.toLowerCase()} child.`);
      }
      const updated: ApiChild = await res.json();
      setChildren((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selected?.id === updated.id) setSelected(updated);
      setSuccess(`${child.name} has been ${status.toLowerCase()}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setActioningId(null);
    }
  };

  const displayed = filter === 'All' ? children : children.filter((c) => c.status === filter);

  const pendingCount = children.filter((c) => c.status === 'Pending').length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Children Management
          {pendingCount > 0 && (
            <span className="ml-3 text-sm font-semibold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
              {pendingCount} pending
            </span>
          )}
        </h1>
        <div className="flex gap-1">
          {(['All', 'Pending', 'Approved', 'Rejected', 'Paid'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filter === f ? 'bg-[#1e3a5f] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-700">
                {filter === 'All' ? `All Children (${children.length})` : `${filter} (${displayed.length})`}
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ? (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">Loading children...</div>
              ) : displayed.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">No children found.</div>
              ) : (
                displayed.map((child) => {
                  const demeritCount = child.demeritCount ?? 0;
                  return (
                    <div
                      key={child.id}
                      className={`flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${selected?.id === child.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelected(child)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {child.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-800">{child.name}</p>
                            <DemeritBadge count={demeritCount} />
                            {child.status !== 'Paid' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 uppercase tracking-wide">
                                Unpaid
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{child.class} · {child.parentName ?? 'Unknown parent'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[child.status] ?? ''}`}>
                          {child.status}
                        </span>
                        {child.status === 'Pending' && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateStatus(child, 'Approved'); }}
                              disabled={actioningId === child.id}
                              className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateStatus(child, 'Rejected'); }}
                              disabled={actioningId === child.id}
                              className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div>
          {selected ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col items-center mb-5">
                <div className="w-20 h-20 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-3xl mb-3">
                  {selected.name.charAt(0)}
                </div>
                <h3 className="text-lg font-bold text-gray-800">{selected.name}</h3>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full mt-1 ${statusColors[selected.status] ?? ''}`}>
                  {selected.status}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Date of Birth</span>
                  <span className="font-medium">
                    {selected.dateOfBirth ? new Date(selected.dateOfBirth).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Class</span>
                  <span className="font-medium">{selected.class}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Medical Aid</span>
                  <span className="font-medium">{selected.medicalAidInfo || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Parent</span>
                  <span className="font-medium">{selected.parentName ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Indemnity</span>
                  <span className={`font-medium ${selected.indemnitySigned ? 'text-green-600' : 'text-red-500'}`}>
                    {selected.indemnitySigned ? 'Signed' : 'Not signed'}
                  </span>
                </div>
                {(selected.demeritCount ?? 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Active Demerits</span>
                    <DemeritBadge count={selected.demeritCount ?? 0} />
                  </div>
                )}
                {selected.isDelistedFromCamps && (
                  <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center font-semibold">
                    Camp payments blocked
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => router.push(`/director/children/${selected.id}`)}
                  className="w-full bg-[#1e3a5f] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c]"
                >
                  View Profile & Manage Demerits
                </button>
              </div>

              {selected.status === 'Pending' && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => updateStatus(selected, 'Approved')}
                    disabled={actioningId === selected.id}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(selected, 'Rejected')}
                    disabled={actioningId === selected.id}
                    className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center text-gray-400">
              <p className="text-4xl mb-2">👆</p>
              <p className="text-sm">Select a child to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
