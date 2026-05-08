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

function parseMedicalInfo(raw?: string | null) {
  if (!raw || raw.trim().toLowerCase() === 'no medical aid') return null;
  const [aidPart = '', extraPart = ''] = raw.split('||').map((s) => s.trim());
  const aidPieces = aidPart.split('|').map((s) => s.trim()).filter(Boolean);
  const [coverType, aidName, aidPlan, aidNumber] = aidPieces;
  const extraFields: Record<string, string> = {};
  extraPart.split('|').forEach((seg) => {
    const colon = seg.indexOf(':');
    if (colon > -1) {
      const key = seg.slice(0, colon).trim();
      const val = seg.slice(colon + 1).trim();
      if (key && val) extraFields[key] = val;
    }
  });
  return { coverType, aidName, aidPlan, aidNumber, ...extraFields };
}

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

  const paidChildren = children.filter((c) => c.status === 'Paid');
  const unpaidCount = children.length - paidChildren.length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Children Management
          {unpaidCount > 0 && (
            <span className="ml-3 text-sm font-semibold bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
              {unpaidCount} unpaid moved to Registrations
            </span>
          )}
        </h1>
        <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full">
          Paid only ({paidChildren.length})
        </span>
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
                Paid Children ({paidChildren.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ? (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">Loading children...</div>
              ) : paidChildren.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">No paid children yet. Unpaid children are listed on Registrations.</div>
              ) : (
                paidChildren.map((child) => {
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
                          </div>
                          <p className="text-xs text-gray-400">{child.class} · {child.parentName ?? 'Unknown parent'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[child.status] ?? ''}`}>
                          {child.status}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/director/children/${child.id}`);
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#1e3a5f] text-white hover:bg-[#2a4f7c] transition-colors"
                        >
                          View Profile
                        </button>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Avatar + name hero */}
              <div className="bg-[#1e3a5f] px-6 py-5 flex flex-col items-center text-white">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center font-bold text-2xl mb-2">
                  {selected.name.charAt(0)}
                </div>
                <h3 className="text-base font-bold text-center">{selected.name}</h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-2 ${statusColors[selected.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {selected.status}
                </span>
              </div>

              <div className="p-5 space-y-4">
                {/* Quick facts grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">Date of Birth</p>
                    <p className="text-sm font-medium text-gray-800">
                      {selected.dateOfBirth ? new Date(selected.dateOfBirth).toLocaleDateString('en-ZA') : '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">Class</p>
                    <p className="text-sm font-medium text-gray-800">{selected.class || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">Parent</p>
                    <p className="text-sm font-medium text-gray-800">{selected.parentName ?? '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">Indemnity</p>
                    <p className={`text-sm font-semibold ${selected.indemnitySigned ? 'text-green-600' : 'text-red-500'}`}>
                      {selected.indemnitySigned ? '✓ Signed' : '✗ Not signed'}
                    </p>
                  </div>
                </div>

                {/* Medical Aid — parsed */}
                {(() => {
                  const med = parseMedicalInfo(selected.medicalAidInfo);
                  if (!med && !selected.medicalAidInfo) return (
                    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Medical Information</p>
                      <p className="text-sm text-gray-400 italic">None recorded</p>
                    </div>
                  );
                  if (!med) return (
                    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Medical Information</p>
                      <p className="text-sm text-gray-800">{selected.medicalAidInfo}</p>
                    </div>
                  );
                  const { coverType, aidName, aidPlan, aidNumber, ...extras } = med;
                  return (
                    <div className="bg-blue-50 rounded-lg px-3 py-3 space-y-2">
                      <p className="text-[10px] uppercase tracking-wide text-blue-400 font-semibold">Medical Aid</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        {coverType && (
                          <div>
                            <p className="text-[10px] text-gray-400">Type</p>
                            <p className="text-sm font-medium text-gray-800">{coverType}</p>
                          </div>
                        )}
                        {aidName && (
                          <div>
                            <p className="text-[10px] text-gray-400">Provider</p>
                            <p className="text-sm font-medium text-gray-800 capitalize">{aidName}</p>
                          </div>
                        )}
                        {aidPlan && (
                          <div>
                            <p className="text-[10px] text-gray-400">Plan</p>
                            <p className="text-sm font-medium text-gray-800 capitalize">{aidPlan}</p>
                          </div>
                        )}
                        {aidNumber && (
                          <div>
                            <p className="text-[10px] text-gray-400">Number</p>
                            <p className="text-sm font-medium text-gray-800">{aidNumber}</p>
                          </div>
                        )}
                      </div>
                      {Object.keys(extras).length > 0 && (
                        <div className="pt-2 border-t border-blue-100 space-y-1.5">
                          {Object.entries(extras).map(([k, v]) => (
                            <div key={k}>
                              <p className="text-[10px] text-gray-400">{k}</p>
                              <p className="text-sm font-medium text-gray-800">{v}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Demerits */}
                {(selected.demeritCount ?? 0) > 0 && (
                  <div className={`rounded-lg px-3 py-2.5 ${(selected.demeritCount ?? 0) >= 5 ? 'bg-red-50' : 'bg-orange-50'}`}>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Active Demerits</p>
                    <DemeritBadge count={selected.demeritCount ?? 0} />
                    {selected.isDelistedFromCamps && (
                      <p className="text-xs text-red-600 font-semibold mt-1">Camp payments blocked</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                {selected.status === 'Pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(selected, 'Approved')}
                      disabled={actioningId === selected.id}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(selected, 'Rejected')}
                      disabled={actioningId === selected.id}
                      className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
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
