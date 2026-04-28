'use client';

import { useAuth } from '@/contexts/AuthContext';

const children = [
  { name: 'Amara Dlamini', class: 'Busy Bee', age: 7, avatar: '👧' },
  { name: 'Ethan Dlamini', class: 'Little Lamb', age: 6, avatar: '👦' },
];

const events = [
  { name: 'Parents Evening', date: 'Jan 22, 2024', fee: 'Free' },
  { name: 'Investiture Ceremony', date: 'Feb 3, 2024', fee: 'R50/child' },
  { name: 'Camp Out', date: 'Mar 15, 2024', fee: 'R200/child' },
];

const payments = [
  { desc: 'Registration Fee – Amara', date: '2024-01-05', amount: 'R150', status: 'Paid' },
  { desc: 'Registration Fee – Ethan', date: '2024-01-05', amount: 'R150', status: 'Paid' },
  { desc: 'Investiture Event – Amara', date: '2024-01-20', amount: 'R50', status: 'Pending' },
];

export default function ParentDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Parent Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name ?? 'Parent'}</p>
      </div>

      {/* Children Cards */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-700 mb-3">My Children</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {children.map((c) => (
            <div key={c.name} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-3xl">
                {c.avatar}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{c.name}</p>
                <p className="text-sm text-gray-500">Class: {c.class}</p>
                <p className="text-sm text-gray-500">Age: {c.age}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Upcoming Events</h2>
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
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Recent Payments</h2>
          <div className="space-y-3">
            {payments.map((p) => (
              <div key={p.desc} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.desc}</p>
                  <p className="text-xs text-gray-400">{p.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#1e3a5f]">{p.amount}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    p.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
