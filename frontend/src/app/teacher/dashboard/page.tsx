'use client';

import { useAuth } from '@/contexts/AuthContext';

const myClasses = [
  { name: 'Busy Bee', count: 12, time: 'Sat 9:00 AM' },
  { name: 'Sunbeam', count: 10, time: 'Sat 10:30 AM' },
];

const recentProgress = [
  { child: 'Amara D.', update: 'Completed "My God" unit 1', date: '2024-01-15' },
  { child: 'Lila N.', update: 'Uploaded proof for Builder badge', date: '2024-01-14' },
  { child: 'James P.', update: 'Marked "My Family" complete', date: '2024-01-13' },
];

const upcomingEvents = [
  { name: 'Parents Evening', date: 'Jan 22, 2024', location: 'Church Hall' },
  { name: 'Investiture Ceremony', date: 'Feb 3, 2024', location: 'Main Auditorium' },
];

export default function TeacherDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name ?? 'Teacher'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 rounded-xl p-5 text-blue-700">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">My Classes</p>
          <p className="text-3xl font-bold mt-1">2</p>
        </div>
        <div className="bg-green-50 rounded-xl p-5 text-green-700">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Total Children</p>
          <p className="text-3xl font-bold mt-1">22</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-5 text-yellow-700">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Pending Updates</p>
          <p className="text-3xl font-bold mt-1">5</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* My Classes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">My Classes</h2>
          <div className="space-y-3">
            {myClasses.map((c) => (
              <div key={c.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-[#1e3a5f]">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.time}</p>
                </div>
                <span className="bg-[#1e3a5f] text-white text-xs font-bold px-3 py-1 rounded-full">
                  {c.count} children
                </span>
              </div>
            ))}
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcomingEvents.map((e) => (
              <div key={e.name} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="text-sm font-semibold text-[#1e3a5f]">{e.name}</p>
                  <p className="text-xs text-gray-500">{e.date} · {e.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
