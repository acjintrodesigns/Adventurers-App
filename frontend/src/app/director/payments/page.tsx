'use client';

interface Payment {
  id: string;
  name: string;
  type: 'Registration' | 'Event' | 'Donation';
  amount: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  child?: string;
}

const payments: Payment[] = [
  { id: '1', name: 'Sipho Dlamini', type: 'Registration', amount: 150, date: '2024-01-05', status: 'Paid', child: 'Amara' },
  { id: '2', name: 'Johann Botha', type: 'Registration', amount: 150, date: '2024-01-05', status: 'Paid', child: 'Ethan' },
  { id: '3', name: 'Thandi Nkosi', type: 'Event', amount: 50, date: '2024-01-20', status: 'Pending', child: 'Lila' },
  { id: '4', name: 'Ravi Patel', type: 'Registration', amount: 150, date: '2023-12-01', status: 'Overdue', child: 'James' },
  { id: '5', name: 'Mia van der Berg', type: 'Donation', amount: 500, date: '2024-01-10', status: 'Paid' },
  { id: '6', name: 'Mark Coetzee', type: 'Event', amount: 200, date: '2024-01-18', status: 'Paid', child: 'Cara' },
];

const typeColors: Record<string, string> = {
  Registration: 'bg-blue-100 text-blue-700',
  Event: 'bg-purple-100 text-purple-700',
  Donation: 'bg-green-100 text-green-700',
};

const statusColors: Record<string, string> = {
  Paid: 'bg-green-100 text-green-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Overdue: 'bg-red-100 text-red-700',
};

export default function DirectorPaymentsPage() {
  const totalIncome = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
  const outstanding = payments.filter(p => p.status !== 'Paid').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Payments</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-5 text-green-700">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Total Collected</p>
          <p className="text-2xl font-bold mt-1">R{totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-5 text-red-700">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Outstanding</p>
          <p className="text-2xl font-bold mt-1">R{outstanding.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-5 text-blue-700">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Total Records</p>
          <p className="text-2xl font-bold mt-1">{payments.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Parent / Donor</th>
                <th className="px-6 py-3 text-left">Child</th>
                <th className="px-6 py-3 text-left">Type</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{p.name}</td>
                  <td className="px-6 py-4 text-gray-500">{p.child ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${typeColors[p.type]}`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{p.date}</td>
                  <td className="px-6 py-4 text-right font-bold text-[#1e3a5f]">R{p.amount}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
