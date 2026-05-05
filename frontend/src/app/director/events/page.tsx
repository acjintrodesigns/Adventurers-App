'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface EventItem {
  id: number;
  name: string;
  eventCode?: string | null;
  status?: 'Active' | 'Postponed' | 'Cancelled' | string;
  statusReason?: string | null;
  date: string;
  endDate?: string | null;
  costPerChild?: number | null;
  flatCost?: number | null;
  extraExpenses?: number | null;
  description?: string | null;
  isCamp?: boolean;
}

function buildPrefix(name: string) {
  const tokens = name.toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  if (tokens.length === 0) return 'EV';
  if (tokens.length === 1) {
    const one = tokens[0];
    return one.length >= 2 ? one.slice(0, 2) : `${one}X`.slice(0, 2);
  }
  return tokens.slice(0, 4).map((t) => t[0]).join('');
}

function buildNextCode(name: string, date: string, existing: EventItem[]) {
  const year = new Date(date).getFullYear();
  const prefix = buildPrefix(name);
  const maxSeq = existing.reduce((max, ev) => {
    if (!ev.eventCode) return max;
    const match = ev.eventCode.match(/^[A-Z0-9]{2,4}(\d{3})-(\d{4})$/);
    if (!match) return max;
    const codeYear = Number(match[2]);
    const seq = Number(match[1]);
    return codeYear === year ? Math.max(max, seq) : max;
  }, 0);
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}-${year}`;
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.1 2.1 0 1 1 2.971 2.97L8.25 18.04 4 19.2l1.16-4.25 11.702-11.463Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 5.85 18 9.35" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l1 12a1 1 0 0 0 1 .9h6a1 1 0 0 0 1-.9L17 7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 11v5M14 11v5" />
    </svg>
  );
}

function PostponeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5l3 2" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 6 6m0-6-6 6" />
    </svg>
  );
}

export default function DirectorEventsPage() {
  const { token } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);
  const [statusUpdatingEventId, setStatusUpdatingEventId] = useState<number | null>(null);
  const [statusActionType, setStatusActionType] = useState<'postpone' | 'cancel' | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    date: '',
    endDate: '',
    costPerChild: '',
    flatCost: '',
    extraExpenses: '',
    description: '',
    isCamp: false,
  });

  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5009';

  const isEditing = editingEventId !== null;

  const resetForm = () => {
    setForm({
      name: '',
      date: '',
      endDate: '',
      costPerChild: '',
      flatCost: '',
      extraExpenses: '',
      description: '',
      isCamp: false,
    });
    setEditingEventId(null);
    setShowForm(false);
  };

  const openEdit = (ev: EventItem) => {
    setEditingEventId(ev.id);
    setShowForm(true);
    setForm({
      name: ev.name ?? '',
      date: ev.date ? new Date(ev.date).toISOString().slice(0, 10) : '',
      endDate: ev.endDate ? new Date(ev.endDate).toISOString().slice(0, 10) : '',
      costPerChild: ev.costPerChild != null ? String(ev.costPerChild) : '',
      flatCost: ev.flatCost != null ? String(ev.flatCost) : '',
      extraExpenses: ev.extraExpenses != null ? String(ev.extraExpenses) : '',
      description: ev.description ?? '',
      isCamp: ev.isCamp ?? false,
    });
    setError('');
    setSuccess('');
  };

  const loadEvents = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (token === 'mock-token') {
      const demoEvents = JSON.parse(localStorage.getItem('demo-events') ?? '[]');
      setEvents(Array.isArray(demoEvents) ? demoEvents : []);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${base}/api/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load events.');
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Your session is missing. Please log out and log in again.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: form.name.trim(),
        date: form.date,
        endDate: form.endDate || null,
        costPerChild: form.costPerChild ? Number(form.costPerChild) : null,
        flatCost: form.flatCost ? Number(form.flatCost) : null,
        extraExpenses: form.extraExpenses ? Number(form.extraExpenses) : null,
        description: form.description.trim() || null,
        isCamp: form.isCamp,
      };

      if (payload.endDate && payload.endDate < payload.date) {
        throw new Error('To Date cannot be before Start Date.');
      }

      if (token === 'mock-token') {
        let updated: EventItem[];
        if (isEditing) {
          updated = events.map((ev) =>
            ev.id === editingEventId
              ? {
                  ...ev,
                  name: payload.name,
                  date: payload.date,
                  endDate: payload.endDate,
                  costPerChild: payload.costPerChild,
                  flatCost: payload.flatCost,
                  extraExpenses: payload.extraExpenses,
                  description: payload.description,
                  isCamp: payload.isCamp,
                }
              : ev
          );
        } else {
          const nextCode = buildNextCode(payload.name, payload.date, events);
          const created: EventItem = {
            id: Date.now(),
            name: payload.name,
            eventCode: nextCode,
            status: 'Active',
            statusReason: null,
            date: payload.date,
            endDate: payload.endDate,
            costPerChild: payload.costPerChild,
            flatCost: payload.flatCost,
            extraExpenses: payload.extraExpenses,
            description: payload.description,
            isCamp: payload.isCamp,
          };
          updated = [created, ...events];
          setSuccess(`Event created with code ${nextCode}`);
        }

        setEvents(updated);
        localStorage.setItem('demo-events', JSON.stringify(updated));
        if (isEditing) setSuccess('Event updated successfully.');
        resetForm();
        return;
      }

      const res = await fetch(isEditing ? `${base}/api/events/${editingEventId}` : `${base}/api/events`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Failed to create event.');
      }

      const saved = await res.json();
      if (isEditing) {
        setEvents((prev) => prev.map((ev) => (ev.id === saved.id ? saved : ev)));
        setSuccess('Event updated successfully.');
      } else {
        setEvents((prev) => [saved, ...prev]);
        setSuccess(`Event created with code ${saved?.eventCode ?? ''}`.trim());
      }
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create event.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ev: EventItem) => {
    if (!token) {
      setError('Your session is missing. Please log out and log in again.');
      return;
    }

    const confirmed = confirm(`Delete event "${ev.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingEventId(ev.id);
    setError('');
    setSuccess('');
    try {
      if (token === 'mock-token') {
        const updated = events.filter((e) => e.id !== ev.id);
        setEvents(updated);
        localStorage.setItem('demo-events', JSON.stringify(updated));
        setSuccess('Event deleted successfully.');
        return;
      }

      const res = await fetch(`${base}/api/events/${ev.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Failed to delete event.');
      }

      setEvents((prev) => prev.filter((e) => e.id !== ev.id));
      setSuccess('Event deleted successfully.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete event.');
    } finally {
      setDeletingEventId(null);
    }
  };

  const openStatusModal = (ev: EventItem, action: 'postpone' | 'cancel') => {
    setStatusUpdatingEventId(ev.id);
    setStatusActionType(action);
    setStatusReason('');
    setError('');
    setSuccess('');
  };

  const closeStatusModal = () => {
    setStatusUpdatingEventId(null);
    setStatusActionType(null);
    setStatusReason('');
  };

  const submitStatusAction = async () => {
    if (!token || !statusUpdatingEventId || !statusActionType) {
      setError('Your session is missing. Please log out and log in again.');
      return;
    }

    const reason = statusReason.trim();
    if (!reason) {
      setError(`Reason is required to ${statusActionType} an event.`);
      return;
    }

    setError('');
    setSuccess('');

    try {
      if (token === 'mock-token') {
        const statusValue = statusActionType === 'postpone' ? 'Postponed' : 'Cancelled';
        const updated = events.map((ev) =>
          ev.id === statusUpdatingEventId
            ? { ...ev, status: statusValue, statusReason: reason }
            : ev
        );
        setEvents(updated);
        localStorage.setItem('demo-events', JSON.stringify(updated));
        setSuccess(`Event ${statusActionType === 'postpone' ? 'postponed' : 'cancelled'} successfully.`);
        closeStatusModal();
        return;
      }

      const res = await fetch(`${base}/api/events/${statusUpdatingEventId}/${statusActionType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `Failed to ${statusActionType} event.`);
      }

      const updatedEvent = await res.json();
      setEvents((prev) => prev.map((ev) => (ev.id === updatedEvent.id ? updatedEvent : ev)));
      setSuccess(`Event ${statusActionType === 'postpone' ? 'postponed' : 'cancelled'} successfully.`);
      closeStatusModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${statusActionType} event.`);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Events Management</h1>
        <button
          onClick={() => {
            if (showForm && isEditing) resetForm();
            else setShowForm(!showForm);
          }}
          className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c]"
        >
          {showForm ? 'Cancel' : '+ New Event'}
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">{isEditing ? 'Edit Event' : 'Create New Event'}</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date (optional)</label>
              <input
                type="date"
                value={form.endDate}
                min={form.date || undefined}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Extra Expenses (R)</label>
              <input
                type="number"
                min="0"
                value={form.extraExpenses}
                onChange={(e) => setForm((f) => ({ ...f, extraExpenses: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <input
                id="isCamp"
                type="checkbox"
                checked={form.isCamp}
                onChange={(e) => setForm((f) => ({ ...f, isCamp: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
              />
              <label htmlFor="isCamp" className="text-sm font-medium text-gray-700">
                This is a camp event
                <span className="ml-1 text-xs text-gray-400">(children with 5+ active demerits cannot pay for camp events)</span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#1e3a5f] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c] disabled:opacity-60"
              >
                {saving ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Event')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Event</th>
                <th className="px-6 py-3 text-left">Code</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-right">Cost/Child</th>
                <th className="px-6 py-3 text-right">Flat Cost</th>
                <th className="px-6 py-3 text-right">Extra</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td className="px-6 py-4 text-gray-400" colSpan={8}>Loading...</td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-gray-400" colSpan={8}>No events yet.</td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        {ev.name}
                        {ev.isCamp && (
                          <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Camp</span>
                        )}
                      </div>
                      {ev.description && <div className="text-xs text-gray-400">{ev.description}</div>}
                      {ev.statusReason && <div className="text-xs text-amber-700 mt-1">Reason: {ev.statusReason}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {ev.eventCode ?? 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        ev.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                        ev.status === 'Postponed' ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {ev.status ?? 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(ev.date).toLocaleDateString()}
                      {ev.endDate && (
                        <span> to {new Date(ev.endDate).toLocaleDateString()}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-[#1e3a5f]">R{(ev.costPerChild ?? 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-semibold text-[#1e3a5f]">R{(ev.flatCost ?? 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-semibold text-[#1e3a5f]">R{(ev.extraExpenses ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end items-center gap-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEdit(ev)}
                          title="Edit event"
                          aria-label="Edit event"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ev)}
                          disabled={deletingEventId === ev.id}
                          title="Delete event"
                          aria-label="Delete event"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:text-red-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        >
                          <DeleteIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => openStatusModal(ev, 'postpone')}
                          disabled={ev.status === 'Cancelled'}
                          title="Postpone event"
                          aria-label="Postpone event"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-amber-700 hover:bg-amber-50 disabled:opacity-25 disabled:text-amber-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        >
                          <PostponeIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => openStatusModal(ev, 'cancel')}
                          disabled={ev.status === 'Cancelled'}
                          title="Cancel event"
                          aria-label="Cancel event"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-700 hover:bg-rose-50 disabled:opacity-25 disabled:text-rose-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        >
                          <CancelIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {statusUpdatingEventId && statusActionType && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-100 p-5">
            <h3 className="text-base font-semibold text-gray-800 mb-2">
              {statusActionType === 'postpone' ? 'Postpone Event' : 'Cancel Event'}
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              Please provide a reason (required), for example: Bad weather so we can&apos;t camp out.
            </p>
            <textarea
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              placeholder="Enter reason..."
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={closeStatusModal}
                className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={submitStatusAction}
                className="text-sm bg-[#1e3a5f] text-white px-4 py-2 rounded-lg hover:bg-[#2a4f7c]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
