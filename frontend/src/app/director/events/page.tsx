'use client';

import { useState } from 'react';

interface Event {
  id: string;
  name: string;
  date: string;
  costPerChild: number;
  flatCost: number;
  extras: string;
  attending: number;
}

const initialEvents: Event[] = [
  { id: '1', name: 'Parents Evening', date: '2024-01-22', costPerChild: 0, flatCost: 500, extras: 'Refreshments', attending: 35 },
  { id: '2', name: 'Investiture Ceremony', date: '2024-02-03', costPerChild: 50, flatCost: 1000, extras: 'Certificates, Badges', attending: 48 },
  { id: '3', name: 'Camp Out', date: '2024-03-15', costPerChild: 200, flatCost: 2000, extras: 'Camping gear', attending: 30 },
];

export default function DirectorEventsPage() {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', costPerChild: '', flatCost: '', extras: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent: Event = {
      id: Date.now().toString(),
      name: form.name,
      date: form.date,
      costPerChild: Number(form.costPerChild),
      flatCost: Number(form.flatCost),
      extras: form.extras,
      attending: 0,
    };
    setEvents((prev) => [...prev, newEvent]);
    setForm({ name: '', date: '', costPerChild: '', flatCost: '', extras: '' });
    setShowForm(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Events Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c]"
        >
          {showForm ? 'Cancel' : '+ New Event'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Create New Event</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Child (R)</label>
              <input
                type="number"
                min="0"
                value={form.costPerChild}
                onChange={(e) => setForm((f) => ({ ...f, costPerChild: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Flat Cost (R)</label>
              <input
                type="number"
                min="0"
                value={form.flatCost}
                onChange={(e) => setForm((f) => ({ ...f, flatCost: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Extras</label>
              <input
                type="text"
                value={form.extras}
                onChange={(e) => setForm((f) => ({ ...f, extras: e.target.value }))}
                placeholder="e.g. Refreshments, Certificates"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="bg-[#1e3a5f] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c]">
                Create Event
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Event</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-right">Attending</th>
                <th className="px-6 py-3 text-right">Revenue</th>
                <th className="px-6 py-3 text-right">Expenses</th>
                <th className="px-6 py-3 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {events.map((ev) => {
                const revenue = ev.costPerChild * ev.attending;
                const expenses = ev.flatCost;
                const outstanding = Math.max(0, expenses - revenue);
                return (
                  <tr key={ev.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">
                      <div>{ev.name}</div>
                      {ev.extras && <div className="text-xs text-gray-400">{ev.extras}</div>}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{ev.date}</td>
                    <td className="px-6 py-4 text-right font-semibold text-[#1e3a5f]">{ev.attending}</td>
                    <td className="px-6 py-4 text-right text-green-600 font-semibold">R{revenue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-red-500 font-semibold">R{expenses.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-semibold ${outstanding > 0 ? 'text-red-500' : 'text-green-600'}`}>
                        R{outstanding.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
