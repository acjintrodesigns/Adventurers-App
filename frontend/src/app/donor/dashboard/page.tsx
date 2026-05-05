'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Donation {
  id: number;
  amount: number;
  type: string;
  status: string;
  reference: string;
  eventName?: string | null;
  receiptCode?: string | null;
  createdAt: string;
}

interface EventItem {
  id: number;
  name: string;
  eventCode?: string | null;
  status?: string;
  date?: string;
  endDate?: string | null;
}

function formatDateRange(startDate?: string, endDate?: string | null) {
  if (!startDate) return 'Date to be confirmed';
  const start = new Date(startDate).toLocaleDateString();
  if (!endDate) return start;
  const end = new Date(endDate).toLocaleDateString();
  return `${start} to ${end}`;
}

export default function DonorDashboardPage() {
  const { user, token } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5009';
        const res = await fetch(`${base}/api/payments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setDonations(data.filter((d: Donation) => d.type === 'Donation'));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchDonations();
    else setLoading(false);
  }, [token]);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!token) {
        setEventsLoading(false);
        return;
      }

      if (token === 'mock-token') {
        const demoEvents = JSON.parse(localStorage.getItem('demo-events') ?? '[]');
        const list = Array.isArray(demoEvents) ? demoEvents : [];
        setEvents(
          list
            .filter((ev: EventItem) => ev.status !== 'Cancelled')
            .sort((a: EventItem, b: EventItem) => new Date(a.date ?? '').getTime() - new Date(b.date ?? '').getTime())
            .slice(0, 5)
        );
        setEventsLoading(false);
        return;
      }

      try {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5009';
        const res = await fetch(`${base}/api/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setEvents(
            list
              .filter((ev: EventItem) => ev.status !== 'Cancelled')
              .sort((a: EventItem, b: EventItem) => new Date(a.date ?? '').getTime() - new Date(b.date ?? '').getTime())
              .slice(0, 5)
          );
        }
      } catch {
        // ignore
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEvents();
  }, [token]);

  const totalDonated = donations
    .filter((d) => d.status === 'Completed')
    .reduce((sum, d) => sum + d.amount, 0);

  const recent = donations.slice(0, 5);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a5f8f] text-white rounded-2xl p-6">
          <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(' ')[0] ?? 'Donor'}!</h1>
          <p className="text-blue-200 text-sm mt-1">Thank you for supporting the Bassonia Adventurer Club.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
            <p className="text-3xl font-bold text-green-600">R{totalDonated.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Total Donated</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
            <p className="text-3xl font-bold text-[#1e3a5f]">{donations.filter(d => d.status === 'Completed').length}</p>
            <p className="text-sm text-gray-500 mt-1">Completed Donations</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
            <p className="text-3xl font-bold text-yellow-500">{donations.filter(d => d.status === 'Pending').length}</p>
            <p className="text-sm text-gray-500 mt-1">Pending</p>
          </div>
        </div>

        {/* Donate Now CTA */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-[#1e3a5f]">Ready to give again?</p>
            <p className="text-sm text-gray-500">Donate to a specific event or make a general donation.</p>
          </div>
          <Link
            href="/donor/donations"
            className="shrink-0 bg-yellow-400 text-[#1e3a5f] font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-300 transition-colors text-sm"
          >
            Donate Now
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-[#1e3a5f]">Events</h2>
            <Link href="/donor/donations" className="text-xs text-[#1e3a5f] underline">Support event</Link>
          </div>

          {eventsLoading ? (
            <p className="text-sm text-gray-400">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-400">No active events right now.</p>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <div key={ev.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-gray-800">{ev.name}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      ev.status === 'Postponed' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {ev.status ?? 'Active'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    {ev.eventCode && <span className="font-semibold text-blue-700">{ev.eventCode}</span>}
                    <span>{formatDateRange(ev.date, ev.endDate)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Donations */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-[#1e3a5f]">Recent Donations</h2>
            <Link href="/donor/my-donations" className="text-xs text-[#1e3a5f] underline">View all</Link>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-gray-400">No donations yet. <Link href="/donor/donations" className="underline text-[#1e3a5f]">Make your first donation</Link>.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-700">{d.eventName ?? 'General Donation'}</p>
                    <p className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">R{d.amount.toLocaleString()}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      d.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      d.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {d.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
