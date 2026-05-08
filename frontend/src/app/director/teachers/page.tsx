'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface TeacherRegistration {
  id: number;
  userId: number;
  email?: string | null;
  fullName: string;
  phone?: string | null;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
  assignedClass?: string | null;
  medicalAidInfo?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  createdAt: string;
}

const CLASS_OPTIONS = ['Little Lamb', 'Early Bird', 'Busy Bee', 'Sunbeam', 'Builder', 'Helping Hand'];

const STATUS_STYLES: Record<string, string> = {
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Pending: 'bg-yellow-100 text-yellow-700',
};

export default function DirectorTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [classSelections, setClassSelections] = useState<Record<number, string>>({});

  const loadTeachers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiFetch('/api/teachers');
      const list: TeacherRegistration[] = Array.isArray(data) ? data : [];
      setTeachers(list);
      const initial: Record<number, string> = {};
      list.forEach((t) => { initial[t.id] = t.assignedClass ?? ''; });
      setClassSelections(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTeachers(); }, []);

  const updateLocalStatus = (id: number, status: string) =>
    setTeachers((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));

  const updateLocalClass = (id: number, cls: string) =>
    setTeachers((prev) => prev.map((t) => (t.id === id ? { ...t, assignedClass: cls } : t)));

  const saveClass = async (id: number) => {
    const cls = classSelections[id] ?? '';
    if (!cls) return;
    try {
      setBusyId(id);
      await apiFetch(`/api/teachers/${id}/assign-class`, {
        method: 'PUT',
        body: JSON.stringify({ assignedClass: cls }),
      });
      updateLocalClass(id, cls);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save class');
    } finally {
      setBusyId(null);
    }
  };

  // Approve: saves selected class first (if changed), then sets status to Approved
  const approve = async (teacher: TeacherRegistration) => {
    try {
      setBusyId(teacher.id);
      const cls = classSelections[teacher.id] ?? '';
      if (cls && cls !== (teacher.assignedClass ?? '')) {
        await apiFetch(`/api/teachers/${teacher.id}/assign-class`, {
          method: 'PUT',
          body: JSON.stringify({ assignedClass: cls }),
        });
        updateLocalClass(teacher.id, cls);
      }
      await apiFetch(`/api/teachers/${teacher.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'Approved' }),
      });
      updateLocalStatus(teacher.id, 'Approved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve teacher');
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = async (id: number, status: 'Pending' | 'Rejected') => {
    try {
      setBusyId(id);
      await apiFetch(`/api/teachers/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      updateLocalStatus(id, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  };

  const deleteTeacher = async (teacher: TeacherRegistration) => {
    if (!confirm(`Permanently delete ${teacher.fullName}'s account? This cannot be undone.`)) return;
    try {
      setBusyId(teacher.id);
      await apiFetch(`/api/teachers/${teacher.id}`, { method: 'DELETE' });
      setTeachers((prev) => prev.filter((t) => t.id !== teacher.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete teacher');
    } finally {
      setBusyId(null);
    }
  };

  const pending = teachers.filter((t) => t.status === 'Pending');
  const approved = teachers.filter((t) => t.status === 'Approved');
  const rejected = teachers.filter((t) => t.status === 'Rejected');
  const ordered = [...pending, ...approved, ...rejected];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Teachers</h1>
        {!loading && (
          <p className="text-sm text-gray-500 mt-1">
            {pending.length} pending &middot; {approved.length} approved &middot; {rejected.length} rejected
          </p>
        )}
      </div>

      {loading && <p className="text-sm text-gray-500">Loading teachers...</p>}

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-4 text-xs underline">Dismiss</button>
        </div>
      )}

      {!loading && ordered.length === 0 && (
        <p className="text-sm text-gray-500">No teacher registrations yet.</p>
      )}

      <div className="space-y-4">
        {ordered.map((teacher) => {
          const busy = busyId === teacher.id;
          const selectedClass = classSelections[teacher.id] ?? '';
          const classChanged = selectedClass !== (teacher.assignedClass ?? '');

          return (
            <div key={teacher.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header row: avatar + name + status badge */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {(teacher.fullName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{teacher.fullName || 'Unnamed teacher'}</p>
                    <p className="text-xs text-gray-500">{teacher.email ?? '—'}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[teacher.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {teacher.status}
                </span>
              </div>

              {/* Info strip */}
              <div className="px-5 py-3 grid grid-cols-3 gap-4 text-sm bg-gray-50">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Phone</p>
                  <p className="text-gray-700">{teacher.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Medical Aid</p>
                  <p className="text-gray-700">{teacher.medicalAidInfo || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">ID / Passport</p>
                  <p className="text-gray-700">{teacher.documentNumber || 'Not provided'}</p>
                </div>
              </div>

              {/* Action row */}
              <div className="px-5 py-4 flex flex-wrap items-center gap-3">
                {/* Class assignment */}
                <select
                  value={selectedClass}
                  onChange={(e) => setClassSelections((prev) => ({ ...prev, [teacher.id]: e.target.value }))}
                  disabled={busy}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] disabled:opacity-50"
                >
                  <option value="">No class assigned</option>
                  {CLASS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>

                {/* Only show Save Class if selection changed and teacher is already Approved */}
                {classChanged && teacher.status === 'Approved' && (
                  <button
                    onClick={() => void saveClass(teacher.id)}
                    disabled={busy || !selectedClass}
                    className="px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                  >
                    Save Class
                  </button>
                )}

                <div className="h-6 w-px bg-gray-200 mx-1" />

                {/* Status actions — context aware */}
                {teacher.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => void approve(teacher)}
                      disabled={busy}
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => void setStatus(teacher.id, 'Rejected')}
                      disabled={busy}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                    >
                      ✗ Reject
                    </button>
                  </>
                )}

                {teacher.status === 'Approved' && (
                  <button
                    onClick={() => void setStatus(teacher.id, 'Pending')}
                    disabled={busy}
                    className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                  >
                    ↩ Revoke Approval
                  </button>
                )}

                {teacher.status === 'Rejected' && (
                  <button
                    onClick={() => void setStatus(teacher.id, 'Pending')}
                    disabled={busy}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                  >
                    ↩ Reconsider
                  </button>
                )}

                {/* Delete — always far right, clearly destructive */}
                <div className="ml-auto flex items-center gap-2">
                  <Link
                    href={`/director/teachers/${teacher.id}`}
                    className="px-3 py-2 rounded-lg border border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white text-xs font-semibold transition-colors"
                  >
                    👤 View Profile
                  </Link>
                  <button
                    onClick={() => void deleteTeacher(teacher)}
                    disabled={busy}
                    className="px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold disabled:opacity-50 transition-colors"
                  >
                    {busy ? 'Please wait...' : '🗑 Delete Account'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
