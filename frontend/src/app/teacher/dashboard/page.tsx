'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { deriveComplianceIssues, type ApiChild } from '@/lib/compliance';

const recentProgress = [
  { child: 'Amara D.', update: 'Completed "My God" unit 1', date: '2024-01-15' },
  { child: 'Lila N.', update: 'Uploaded proof for Builder badge', date: '2024-01-14' },
  { child: 'James P.', update: 'Marked "My Family" complete', date: '2024-01-13' },
];

interface TeacherDashboardEvent {
  id: number;
  name: string;
  date: string;
  endDate?: string | null;
  status?: 'Active' | 'Postponed' | 'Cancelled' | string;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [children, setChildren] = useState<ApiChild[]>([]);
  const [events, setEvents] = useState<TeacherDashboardEvent[]>([]);
  const [assignedClass, setAssignedClass] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const classData = await apiFetch('/api/teachers/my-class') as { assignedClass?: string | null };
        setAssignedClass(classData.assignedClass ?? '');
      } catch {
        setAssignedClass('');
      }

      try {
        const data = await apiFetch('/api/children') as ApiChild[];
        setChildren(data);
      } catch {
        setChildren([]);
      }

      try {
        const eventData = await apiFetch('/api/events') as TeacherDashboardEvent[];
        setEvents(Array.isArray(eventData) ? eventData : []);
      } catch {
        setEvents([]);
      }
    };

    void load();
  }, []);

  const teacherClassNames = assignedClass ? [assignedClass] : [];
  const classChildren = children.filter((child) => teacherClassNames.includes(child.class));
  const classAlerts = children
    .filter((child) => teacherClassNames.includes(child.class))
    .map((child) => ({
      ...child,
      issues: deriveComplianceIssues(child),
    }))
    .filter((child) => child.issues.length > 0);

  const formatEventDate = (start: string, end?: string | null) => {
    const startDate = new Date(start);
    if (Number.isNaN(startDate.getTime())) return 'Date TBC';

    const startLabel = startDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!end) return startLabel;

    const endDate = new Date(end);
    if (Number.isNaN(endDate.getTime())) return startLabel;

    const endLabel = endDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
    return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
  };

  return (
    <div className="px-3 py-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name ?? 'Teacher'}</p>
      </div>

      {classAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-amber-900 uppercase tracking-wide">Class Compliance Alerts</h2>
            <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
              {classAlerts.length} learner{classAlerts.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="space-y-3">
            {classAlerts.map((child) => (
              <div key={child.id} className="bg-white rounded-lg border border-amber-100 p-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{child.name}</p>
                    <p className="text-xs text-gray-400">{child.class}</p>
                  </div>
                  <Link href={`/teacher/children/${child.id}`} className="text-xs text-[#1e3a5f] font-semibold hover:underline whitespace-nowrap">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 rounded-xl p-5 text-blue-700">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">My Classes</p>
          <p className="text-3xl font-bold mt-1">{assignedClass ? 1 : 0}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-5 text-green-700">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Total Children</p>
          <p className="text-3xl font-bold mt-1">{classChildren.length}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-5 text-yellow-700">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Pending Updates</p>
          <p className="text-3xl font-bold mt-1">{classAlerts.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* My Classes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">My Classes</h2>
          {!assignedClass ? (
            <p className="text-sm text-gray-500">No class assigned yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-[#1e3a5f]">{assignedClass}</p>
                  <p className="text-xs text-gray-400">Assigned by Director</p>
                </div>
                <span className="bg-[#1e3a5f] text-white text-xs font-bold px-3 py-1 rounded-full">
                  {classChildren.length} children
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Recent Progress Updates</h2>
          <div className="space-y-3">
            {recentProgress.map((p) => (
              <div key={p.child + p.date} className="py-2 border-b border-gray-50 last:border-0">
                <p className="text-sm font-medium text-gray-800">{p.child}</p>
                <p className="text-xs text-gray-500">{p.update}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:col-span-2">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Upcoming Events</h2>
          {events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
              <p className="text-sm font-medium text-gray-500">No events added yet.</p>
              <p className="text-xs text-gray-400 mt-1">Once directors create events, they will show here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {events.map((e) => (
                <div key={e.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="text-sm font-semibold text-[#1e3a5f]">{e.name}</p>
                    <p className="text-xs text-gray-500">{formatEventDate(e.date, e.endDate)}</p>
                    {e.status && e.status !== 'Active' && (
                      <p className="text-[11px] font-semibold text-amber-700 mt-0.5">Status: {e.status}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
