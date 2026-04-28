'use client';

interface Payment {
  id: string;
  type: 'Registration' | 'Event' | 'Donation';
  amount: number;
  date: string;
  status: 'Paid' | 'Pending';
  child?: string;
  description: string;
}

const myPayments: Payment[] = [
  { id: '1', type: 'Registration', amount: 150, date: '2024-01-05', status: 'Paid', child: 'Amara', description: 'Annual Registration Fee' },
  { id: '2', type: 'Registration', amount: 150, date: '2024-01-05', status: 'Paid', child: 'Ethan', description: 'Annual Registration Fee' },
  { id: '3', type: 'Event', amount: 50, date: '2024-01-20', status: 'Pending', child: 'Amara', description: 'Investiture Ceremony' },
  { id: '4', type: 'Event', amount: 200, date: '2024-03-01', status: 'Pending', child: 'Amara', description: 'Camp Out' },
  { id: '5', type: 'Donation', amount: 100, date: '2024-01-10', status: 'Paid', description: 'General Donation' },
];

const typeColors: Record<string, string> = {
  Registration: 'bg-blue-100 text-blue-700',
  Event: 'bg-purple-100 text-purple-700',
  Donation: 'bg-green-100 text-green-700',
};

export default function ParentPaymentsPage() {
  const totalPaid = myPayments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = myPayments.filter(p => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Payments</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-5 text-green-700">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Total Paid</p>
          <p className="text-2xl font-bold mt-1">R{totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-5 text-yellow-700">
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">Pending Amount</p>
          <p className="text-2xl font-bold mt-1">R{totalPending.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Description</th>
                <th className="px-6 py-3 text-left">Child</th>
                <th className="px-6 py-3 text-left">Type</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {myPayments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{p.description}</td>
                  <td className="px-6 py-4 text-gray-500">{p.child ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${typeColors[p.type]}`}>
                      {p.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{p.date}</td>
                  <td className="px-6 py-4 text-right font-bold text-[#1e3a5f]">R{p.amount}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      p.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
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
