'use client';

import { useEffect, useState } from 'react';
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

const classOptions = ['Little Lamb', 'Early Bird', 'Busy Bee', 'Sunbeam', 'Builder', 'Helping Hand'];

export default function DirectorTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiFetch('/api/teachers');
      setTeachers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeachers();
  }, []);

  const updateLocal = (id: number, patch: Partial<TeacherRegistration>) => {
    setTeachers((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const saveClass = async (teacher: TeacherRegistration) => {
    if (!teacher.assignedClass) return;
    try {
      setSavingId(teacher.id);
      await apiFetch(`/api/teachers/${teacher.id}/assign-class`, {
        method: 'PUT',
        body: JSON.stringify({ assignedClass: teacher.assignedClass }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign class');
    } finally {
      setSavingId(null);
    }
  };

  const updateStatus = async (teacher: TeacherRegistration, status: 'Pending' | 'Approved' | 'Rejected') => {
    try {
      setSavingId(teacher.id);
      await apiFetch(`/api/teachers/${teacher.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      updateLocal(teacher.id, { status });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Teachers</h1>
      <p className="text-sm text-gray-600 mb-6">Review teacher registrations and assign each teacher to one class.</p>

      {loading && <p className="text-sm text-gray-500">Loading teachers...</p>}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {!loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Teacher</th>
                  <th className="px-4 py-3 text-left font-semibold">Contact</th>
                  <th className="px-4 py-3 text-left font-semibold">Medical Aid</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Assigned Class</th>
                  <th className="px-4 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="border-t border-gray-100 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{teacher.fullName || 'Unnamed teacher'}</p>
                      <p className="text-xs text-gray-500">{teacher.email || 'No email'}</p>
                      <p className="text-xs text-gray-500">
                        {teacher.documentType || 'ID'}: {teacher.documentNumber || 'Not provided'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{teacher.phone || 'Not provided'}</td>
                    <td className="px-4 py-3 text-gray-700">{teacher.medicalAidInfo || 'Not provided'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        teacher.status === 'Approved'
                          ? 'bg-green-100 text-green-700'
                          : teacher.status === 'Rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {teacher.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={teacher.assignedClass || ''}
                        onChange={(e) => updateLocal(teacher.id, { assignedClass: e.target.value })}
                        className="w-44 border border-gray-300 rounded-lg px-2 py-2 text-sm"
                      >
                        <option value="">Select class...</option>
                        {classOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => void saveClass(teacher)}
                          disabled={savingId === teacher.id || !teacher.assignedClass}
                          className="px-3 py-2 rounded-lg bg-[#1e3a5f] text-white text-xs font-semibold disabled:opacity-60"
                        >
                          Save Class
                        </button>
                        <button
                          onClick={() => void updateStatus(teacher, 'Approved')}
                          disabled={savingId === teacher.id}
                          className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => void updateStatus(teacher, 'Rejected')}
                          disabled={savingId === teacher.id}
                          className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {teachers.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>No teacher registrations yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
