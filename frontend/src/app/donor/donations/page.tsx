'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Event {
  id: number;
  name: string;
  eventCode?: string | null;
  status?: string;
  date?: string;
  endDate?: string | null;
  description?: string | null;
  costPerChild?: number | null;
  flatCost?: number | null;
  extraExpenses?: number | null;
}

interface PaymentItem {
  id: number;
  eventId?: number | null;
  childId?: number | null;
  amount: number;
  type: string;
  status: string;
}

interface ChildItem {
  id: number;
  status?: string;
}

const PRESET_AMOUNTS = [50, 100, 200, 500];

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function getOrdinalSuffix(day: number) {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th';
  const last = day % 10;
  if (last === 1) return 'st';
  if (last === 2) return 'nd';
  if (last === 3) return 'rd';
  return 'th';
}

function formatReadableDate(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.getDate();
  const suffix = getOrdinalSuffix(day);
  const monthYear = date.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  return `${day}${suffix} ${monthYear}`;
}

function formatReadableDateRange(startDate?: string, endDate?: string | null) {
  if (!startDate) return '';
  const start = formatReadableDate(startDate);
  if (!start) return '';
  if (!endDate) return start;
  const end = formatReadableDate(endDate);
  return end ? `${start} - ${end}` : start;
}

export default function DonorDonationsPage() {
  const { user, token } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [approvedChildrenCount, setApprovedChildrenCount] = useState(0);
  const [activeChildrenCount, setActiveChildrenCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [eventId, setEventId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [note, setNote] = useState('');

  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5009';
  const currentEvent = events.find((ev) => ev.status === 'Active') ?? events[0] ?? null;
  const selectedEvent = events.find((ev) => String(ev.id) === eventId) ?? null;

  const computeFunding = (ev: Event | null) => {
    if (!ev) {
      return { totalEventCost: 0, raisedAmount: 0, kidsGoing: 0, outstandingAmount: 0, fundingProgress: 0 };
    }

    const completed = payments.filter(
      (p) =>
        p.eventId === ev.id &&
        p.status === 'Completed' &&
        (p.type === 'Donation' || p.type === 'Event')
    );

    const raised = completed.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const kidsFromPayments = new Set(
      completed
        .map((p) => p.childId)
        .filter((childId): childId is number => typeof childId === 'number' && childId > 0)
    ).size;

    const kids = kidsFromPayments > 0
      ? kidsFromPayments
      : (approvedChildrenCount > 0 ? approvedChildrenCount : activeChildrenCount);

    const total = (Number(ev.costPerChild ?? 0) * kids) + Number(ev.flatCost ?? 0) + Number(ev.extraExpenses ?? 0);
    const outstanding = Math.max(total - raised, 0);
    const progress = total > 0 ? Math.min((raised / total) * 100, 100) : 0;

    return {
      totalEventCost: total,
      raisedAmount: raised,
      kidsGoing: kids,
      outstandingAmount: outstanding,
      fundingProgress: progress,
    };
  };

  const currentFunding = computeFunding(currentEvent);
  const selectedFunding = computeFunding(selectedEvent);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;

      const demoEvents = JSON.parse(localStorage.getItem('demo-events') ?? '[]');
      const cachedList = Array.isArray(demoEvents) ? demoEvents : [];
      const visibleCached = cachedList.filter((ev: Event) => ev.status !== 'Cancelled');
      if (visibleCached.length > 0) {
        setEvents(visibleCached);
      }

      if (token === 'mock-token') {
        const demoPayments = JSON.parse(localStorage.getItem('demo-payments') ?? '[]');
        setPayments(Array.isArray(demoPayments) ? demoPayments : []);
        const demoChildren = JSON.parse(localStorage.getItem('demo-children') ?? '[]');
        const childrenList = Array.isArray(demoChildren) ? demoChildren : [];
        setApprovedChildrenCount(childrenList.filter((c: ChildItem) => c.status === 'Approved').length);
        setActiveChildrenCount(childrenList.filter((c: ChildItem) => c.status !== 'Rejected').length);
        return;
      }

      try {
        const [evRes, payRes, childRes] = await Promise.allSettled([
          fetchWithTimeout(`${base}/api/events`, { headers: { Authorization: `Bearer ${token}` } }),
          fetchWithTimeout(`${base}/api/payments`, { headers: { Authorization: `Bearer ${token}` } }),
          fetchWithTimeout(`${base}/api/children`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (evRes.status === 'fulfilled' && evRes.value.ok) {
          const all = await evRes.value.json();
          setEvents((Array.isArray(all) ? all : []).filter((ev: Event) => ev.status !== 'Cancelled'));
        }

        if (payRes.status === 'fulfilled' && payRes.value.ok) {
          const payData = await payRes.value.json();
          setPayments(Array.isArray(payData) ? payData : []);
        }

        if (childRes.status === 'fulfilled' && childRes.value.ok) {
          const childData = await childRes.value.json();
          const list = Array.isArray(childData) ? childData : [];
          setApprovedChildrenCount(list.filter((c: ChildItem) => c.status === 'Approved').length);
          setActiveChildrenCount(list.filter((c: ChildItem) => c.status !== 'Rejected').length);
        }
      } catch {
        setEvents(visibleCached);
      }
    };
    fetchData();
  }, [token, base]);

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt < 10) { setError('Please enter a valid amount (minimum R10).'); return; }

    setSubmitting(true);
    try {
      const selectedEvent = events.find(ev => String(ev.id) === eventId);
      const itemName = selectedEvent ? `Donation: ${selectedEvent.name}` : 'General Donation – Bassonia Adventurer Club';

      const res = await fetch(`${base}/api/payments/checkout/payfast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          childId: null,
          eventId: eventId ? parseInt(eventId) : null,
          amount: amt,
          type: 'Donation',
          itemName,
          isAnonymous,
          notes: note.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? 'Failed to initiate donation');
      }

      const { checkoutUrl } = await res.json();

      // Save note to localStorage so director can see it
      if (note.trim()) {
        const existing = JSON.parse(localStorage.getItem('donor-special-requests') ?? '[]');
        existing.unshift({
          donorId: user?.id,
          donorName: isAnonymous ? 'Anonymous' : (user?.name ?? 'Unknown'),
          amount: amt,
          purpose: selectedEvent ? selectedEvent.name : 'General Donation',
          note: note.trim(),
          date: new Date().toISOString(),
        });
        localStorage.setItem('donor-special-requests', JSON.stringify(existing.slice(0, 50)));
      }

      window.location.href = checkoutUrl;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-[#1e3a5f]">Make a Donation</h1>

        <div className="bg-[#f8fbff] rounded-2xl border border-[#d8e6f8] p-5">
          <p className="text-xs font-semibold tracking-wide text-[#1e3a5f]/70 uppercase">Current Event</p>
          {currentEvent ? (
            <div className="mt-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-[#1e3a5f]">{currentEvent.name}</h2>
                {currentEvent.eventCode && (
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {currentEvent.eventCode}
                  </span>
                )}
              </div>
              {currentEvent.date && (
                <p className="text-sm text-gray-600 mt-1">
                  {formatReadableDateRange(currentEvent.date, currentEvent.endDate)}
                </p>
              )}
              {currentEvent.description && (
                <p className="text-sm text-gray-600 mt-2">{currentEvent.description}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                <div className="bg-white border border-gray-100 rounded-lg p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Total Event Cost</p>
                  <p className="text-sm font-bold text-[#1e3a5f] mt-1">R{currentFunding.totalEventCost.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-lg p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Raised So Far</p>
                  <p className="text-sm font-bold text-green-700 mt-1">R{currentFunding.raisedAmount.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-lg p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Kids Going</p>
                  <p className="text-sm font-bold text-[#1e3a5f] mt-1">{currentFunding.kidsGoing}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-lg p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Outstanding Funds</p>
                  <p className="text-sm font-bold text-amber-700 mt-1">R{currentFunding.outstandingAmount.toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="h-2 bg-white rounded-full overflow-hidden border border-[#d8e6f8]">
                  <div className="h-full bg-[#1e3a5f]" style={{ width: `${currentFunding.fundingProgress}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{currentFunding.fundingProgress.toFixed(0)}% funded</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-2">No active event at the moment. You can still make a general donation.</p>
          )}
        </div>

        {/* Donation Form */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <form onSubmit={handleDonate} className="space-y-5">
            {/* Event selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Donate Towards</label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] bg-white"
              >
                <option value="">General Donation</option>
                {events.map((ev) => (
                  <option key={ev.id} value={String(ev.id)}>{ev.eventCode ? `${ev.name} - ${ev.eventCode}` : ev.name}</option>
                ))}
              </select>
              {selectedEvent && (
                <div className="mt-2 rounded-lg border border-[#d8e6f8] bg-[#f8fbff] p-3">
                  <p className="text-xs text-gray-600">
                    Selected event: <span className="font-semibold text-[#1e3a5f]">{selectedEvent.name}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Outstanding for this event: R{selectedFunding.outstandingAmount.toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setAmount(selectedFunding.outstandingAmount.toFixed(0))}
                      disabled={selectedFunding.outstandingAmount <= 0}
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-yellow-300 text-[#1e3a5f] hover:bg-yellow-200 disabled:opacity-50"
                    >
                      {selectedFunding.outstandingAmount > 0
                        ? `Donate Outstanding (R${selectedFunding.outstandingAmount.toLocaleString()})`
                        : 'Event Fully Funded'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEventId('');
                        setAmount('');
                      }}
                      className="px-3 py-2 rounded-lg text-xs font-semibold border border-[#1e3a5f]/25 text-[#1e3a5f] hover:bg-white"
                    >
                      Switch To General Donation
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Preset amounts */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount (R)</label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {PRESET_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(String(val))}
                    className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      amount === String(val)
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                        : 'border-gray-300 text-gray-600 hover:border-[#1e3a5f]'
                    }`}
                  >
                    R{val}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="10"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Or enter custom amount"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>

            {/* Note / Special Request */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note / Special Request <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="e.g. Please use this towards the camp bursary fund, or dedicate this to a specific child..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] resize-none"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{note.length}/500</p>
            </div>

            {/* Anonymous toggle */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Donate Anonymously</p>
                <p className="text-xs text-gray-400 mt-0.5">Your name will not be shown publicly</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isAnonymous}
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:ring-offset-1 ${
                  isAnonymous ? 'bg-[#1e3a5f]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    isAnonymous ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting || !amount}
              className="w-full bg-yellow-400 text-[#1e3a5f] py-3 rounded-xl font-bold text-base hover:bg-yellow-300 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Redirecting to PayFast...' : `Donate${amount ? ` R${parseFloat(amount).toLocaleString()}` : ''}`}
            </button>

            <p className="text-xs text-center text-gray-400">
              You will be redirected to PayFast for secure payment. A receipt with an authenticity code will be generated upon completion.
              {isAnonymous && ' Your name will appear as Anonymous on club records.'}
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
