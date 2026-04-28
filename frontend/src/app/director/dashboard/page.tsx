'use client';

import { useAuth } from '@/contexts/AuthContext';

const stats = [
  { label: 'Total Students', value: '48', icon: '👧', color: 'bg-blue-50 text-blue-700' },
  { label: 'Total Income', value: 'R12,450', icon: '💰', color: 'bg-green-50 text-green-700' },
  { label: 'Outstanding Fees', value: 'R2,300', icon: '⚠️', color: 'bg-yellow-50 text-yellow-700' },
  { label: 'Upcoming Events', value: '3', icon: '📅', color: 'bg-purple-50 text-purple-700' },
];

const recentRegistrations = [
  { name: 'Amara Dlamini', class: 'Little Lamb', date: '2024-01-15', status: 'Pending' },
  { name: 'Ethan Botha', class: 'Busy Bee', date: '2024-01-14', status: 'Approved' },
  { name: 'Lila Nkosi', class: 'Sunbeam', date: '2024-01-13', status: 'Approved' },
  { name: 'James Patel', class: 'Builder', date: '2024-01-12', status: 'Rejected' },
  { name: 'Sofia van der Berg', class: 'Early Bird', date: '2024-01-11', status: 'Approved' },
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
};

export default function DirectorDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Director Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name ?? 'Director'}</p>
      </div>

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
          <h2 className="text-base font-semibold text-gray-700 mb-4">Recent Registrations</h2>
          <div className="space-y-3">
            {recentRegistrations.map((r) => (
              <div key={r.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.class} · {r.date}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[r.status]}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
