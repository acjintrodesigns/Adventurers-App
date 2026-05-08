'use client';

import { useEffect, useMemo, useState } from 'react';
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

// ── helpers ──────────────────────────────────────────────────────────────────

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

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function eventCoversDay(ev: EventItem, day: Date): boolean {
  const start = new Date(ev.date);
  start.setHours(0, 0, 0, 0);
  const end = ev.endDate ? new Date(ev.endDate) : new Date(ev.date);
  end.setHours(23, 59, 59, 999);
  const d = new Date(day);
  d.setHours(12, 0, 0, 0);
  return d >= start && d <= end;
}

function eventsForDay(evList: EventItem[], day: Date) {
  return evList.filter((ev) => eventCoversDay(ev, day));
}

function getMonthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7;
  const weeks: Date[][] = [];
  const current = new Date(year, month, 1 - startDay);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function getWeekDays(anchor: Date): Date[] {
  const dow = (anchor.getDay() + 6) % 7;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function eventChipClass(status?: string | null) {
  if (status === 'Cancelled') return 'bg-red-100 text-red-700 line-through';
  if (status === 'Postponed') return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-800';
}

function eventDotClass(status?: string | null) {
  if (status === 'Cancelled') return 'bg-red-400';
  if (status === 'Postponed') return 'bg-amber-400';
  return 'bg-blue-500';
}

// ── icons ─────────────────────────────────────────────────────────────────────

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

// ── calendar sub-components ──────────────────────────────────────────────────

function MonthView({ events, anchor, onDayClick }: {
  events: EventItem[];
  anchor: Date;
  onDayClick: (day: Date) => void;
}) {
  const today = new Date();
  const grid = useMemo(() => getMonthGrid(anchor.getFullYear(), anchor.getMonth()), [anchor]);
  return (
    <div className="w-full">
      <div className="grid grid-cols-7 border-b border-gray-100 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.flat().map((day, i) => {
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = sameDay(day, today);
          const dayEvents = eventsForDay(events, day);
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visible.length;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onDayClick(day)}
              className={`min-h-[80px] p-1.5 border border-gray-50 text-left transition-colors hover:bg-blue-50 focus:outline-none focus:bg-blue-50 ${inMonth ? 'bg-white' : 'bg-gray-50'}`}
            >
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold mb-1 ${isToday ? 'bg-[#1e3a5f] text-white' : inMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                {day.getDate()}
              </span>
              <div className="space-y-0.5">
                {visible.map((ev) => (
                  <div key={ev.id} className={`text-[10px] leading-tight font-medium px-1 py-0.5 rounded truncate ${eventChipClass(ev.status)}`}>
                    {ev.name}
                  </div>
                ))}
                {overflow > 0 && <div className="text-[10px] text-gray-400 pl-1">+{overflow} more</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ events, anchor, onDayClick }: {
  events: EventItem[];
  anchor: Date;
  onDayClick: (day: Date) => void;
}) {
  const today = new Date();
  const days = useMemo(() => getWeekDays(anchor), [anchor]);
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day, i) => {
        const isToday = sameDay(day, today);
        const dayEvents = eventsForDay(events, day);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onDayClick(day)}
            className={`min-h-[120px] rounded-xl p-2 text-left transition-colors hover:bg-blue-50 focus:outline-none border ${isToday ? 'border-[#1e3a5f] bg-[#f0f6ff]' : 'border-gray-100 bg-white'}`}
          >
            <div className="text-xs font-semibold text-gray-400 uppercase mb-1">{DAY_LABELS[i]}</div>
            <div className={`text-lg font-bold mb-2 ${isToday ? 'text-[#1e3a5f]' : 'text-gray-700'}`}>{day.getDate()}</div>
            <div className="space-y-1">
              {dayEvents.map((ev) => (
                <div key={ev.id} className={`text-[10px] font-medium px-1.5 py-1 rounded-md leading-tight ${eventChipClass(ev.status)}`}>
                  {ev.name}{ev.isCamp && <span className="ml-1">⛺</span>}
                </div>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function YearView({ events, year, onMonthClick }: {
  events: EventItem[];
  year: number;
  onMonthClick: (month: number) => void;
}) {
  const today = new Date();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {MONTHS.map((monthName, m) => {
        const grid = getMonthGrid(year, m);
        return (
          <button
            key={m}
            type="button"
            onClick={() => onMonthClick(m)}
            className="bg-white border border-gray-100 rounded-xl p-3 hover:border-[#1e3a5f] hover:shadow-sm transition-all text-left focus:outline-none"
          >
            <p className="text-xs font-semibold text-gray-600 mb-2">{monthName}</p>
            <div className="grid grid-cols-7 gap-px">
              {DAY_LABELS.map((d) => (
                <div key={d} className="text-[8px] text-center text-gray-300 font-semibold">{d[0]}</div>
              ))}
              {grid.flat().map((day, i) => {
                const inMonth = day.getMonth() === m;
                const isToday = sameDay(day, today);
                const dayEvs = eventsForDay(events, day);
                const hasDots = dayEvs.length > 0 && inMonth;
                const dotStatuses = dayEvs.map((e) => e.status);
                return (
                  <div key={i} className="relative flex flex-col items-center">
                    <span className={`text-[8px] w-4 h-4 flex items-center justify-center rounded-full ${isToday && inMonth ? 'bg-[#1e3a5f] text-white font-bold' : inMonth ? 'text-gray-600' : 'text-gray-200'}`}>
                      {day.getDate()}
                    </span>
                    {hasDots && (
                      <div className="flex gap-px mt-px">
                        {dotStatuses.slice(0, 3).map((s, si) => (
                          <span key={si} className={`w-1 h-1 rounded-full ${eventDotClass(s)}`} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DayDetail({ day, events, onClose, isDirector, onEdit, onDelete, onPostpone, onCancel, deletingId }: {
  day: Date;
  events: EventItem[];
  onClose: () => void;
  isDirector: boolean;
  onEdit: (ev: EventItem) => void;
  onDelete: (ev: EventItem) => void;
  onPostpone: (ev: EventItem) => void;
  onCancel: (ev: EventItem) => void;
  deletingId: number | null;
}) {
  const dayEvents = eventsForDay(events, day);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">
            {day.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {dayEvents.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No events on this day.</p>
        ) : (
          <div className="space-y-3">
            {dayEvents.map((ev) => (
              <div key={ev.id} className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{ev.name}</p>
                    {ev.eventCode && <p className="text-xs text-blue-600 font-mono mt-0.5">{ev.eventCode}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ev.status === 'Cancelled' ? 'bg-red-100 text-red-700' : ev.status === 'Postponed' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {ev.status ?? 'Active'}
                      </span>
                      {ev.isCamp && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">⛺ Camp</span>}
                    </div>
                    {ev.description && <p className="text-xs text-gray-500 mt-1">{ev.description}</p>}
                    {ev.statusReason && <p className="text-xs text-amber-700 mt-1">Reason: {ev.statusReason}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(ev.date).toLocaleDateString()}{ev.endDate && ` → ${new Date(ev.endDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  {isDirector && (
                    <div className="flex gap-1 shrink-0">
                      <button type="button" onClick={() => { onEdit(ev); onClose(); }} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-200" title="Edit"><EditIcon /></button>
                      <button type="button" onClick={() => onDelete(ev)} disabled={deletingId === ev.id} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-100 disabled:opacity-30" title="Delete"><DeleteIcon /></button>
                      <button type="button" onClick={() => onPostpone(ev)} disabled={ev.status === 'Cancelled'} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-amber-700 hover:bg-amber-100 disabled:opacity-25" title="Postpone"><PostponeIcon /></button>
                      <button type="button" onClick={() => onCancel(ev)} disabled={ev.status === 'Cancelled'} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-700 hover:bg-rose-100 disabled:opacity-25" title="Cancel"><CancelIcon /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── main page ────────────────────────────────────────────────────────────────

type CalView = 'month' | 'week' | 'year';

export default function DirectorEventsPage() {
  const { token, user } = useAuth();
  const isDirector = user?.role === 'Director';

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

  const [calView, setCalView] = useState<CalView>('month');
  const [calAnchor, setCalAnchor] = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const [form, setForm] = useState({
    name: '', date: '', endDate: '', costPerChild: '', flatCost: '', extraExpenses: '', description: '', isCamp: false,
  });

  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5009';
  const isEditing = editingEventId !== null;

  const resetForm = () => {
    setForm({ name: '', date: '', endDate: '', costPerChild: '', flatCost: '', extraExpenses: '', description: '', isCamp: false });
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
    if (!token) { setLoading(false); return; }
    if (token === 'mock-token') {
      const demoEvents = JSON.parse(localStorage.getItem('demo-events') ?? '[]');
      setEvents(Array.isArray(demoEvents) ? demoEvents : []);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${base}/api/events`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to load events.');
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setError('Your session is missing. Please log out and log in again.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const payload = {
        name: form.name.trim(), date: form.date, endDate: form.endDate || null,
        costPerChild: form.costPerChild ? Number(form.costPerChild) : null,
        flatCost: form.flatCost ? Number(form.flatCost) : null,
        extraExpenses: form.extraExpenses ? Number(form.extraExpenses) : null,
        description: form.description.trim() || null, isCamp: form.isCamp,
      };
      if (payload.endDate && payload.endDate < payload.date) throw new Error('To Date cannot be before Start Date.');
      if (token === 'mock-token') {
        let updated: EventItem[];
        if (isEditing) {
          updated = events.map((ev) => ev.id === editingEventId ? { ...ev, ...payload } : ev);
          setSuccess('Event updated successfully.');
        } else {
          const nextCode = buildNextCode(payload.name, payload.date, events);
          const created: EventItem = { id: Date.now(), eventCode: nextCode, status: 'Active', statusReason: null, ...payload };
          updated = [created, ...events];
          setSuccess(`Event created with code ${nextCode}`);
        }
        setEvents(updated);
        localStorage.setItem('demo-events', JSON.stringify(updated));
        resetForm();
        return;
      }
      const res = await fetch(isEditing ? `${base}/api/events/${editingEventId}` : `${base}/api/events`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text()) || 'Failed to save event.');
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
      setError(err instanceof Error ? err.message : 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ev: EventItem) => {
    if (!token) { setError('Session missing.'); return; }
    if (!confirm(`Delete event "${ev.name}"? This cannot be undone.`)) return;
    setDeletingEventId(ev.id); setError(''); setSuccess('');
    try {
      if (token === 'mock-token') {
        const updated = events.filter((e) => e.id !== ev.id);
        setEvents(updated);
        localStorage.setItem('demo-events', JSON.stringify(updated));
        setSuccess('Event deleted.');
        return;
      }
      const res = await fetch(`${base}/api/events/${ev.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error((await res.text()) || 'Failed to delete event.');
      setEvents((prev) => prev.filter((e) => e.id !== ev.id));
      setSuccess('Event deleted.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete event.');
    } finally {
      setDeletingEventId(null);
    }
  };

  const openStatusModal = (ev: EventItem, action: 'postpone' | 'cancel') => {
    setStatusUpdatingEventId(ev.id); setStatusActionType(action); setStatusReason(''); setError(''); setSuccess('');
  };
  const closeStatusModal = () => { setStatusUpdatingEventId(null); setStatusActionType(null); setStatusReason(''); };

  const submitStatusAction = async () => {
    if (!token || !statusUpdatingEventId || !statusActionType) { setError('Session missing.'); return; }
    const reason = statusReason.trim();
    if (!reason) { setError(`Reason is required to ${statusActionType} an event.`); return; }
    setError(''); setSuccess('');
    try {
      if (token === 'mock-token') {
        const statusValue = statusActionType === 'postpone' ? 'Postponed' : 'Cancelled';
        const updated = events.map((ev) => ev.id === statusUpdatingEventId ? { ...ev, status: statusValue, statusReason: reason } : ev);
        setEvents(updated);
        localStorage.setItem('demo-events', JSON.stringify(updated));
        setSuccess(`Event ${statusActionType === 'postpone' ? 'postponed' : 'cancelled'}.`);
        closeStatusModal();
        return;
      }
      const res = await fetch(`${base}/api/events/${statusUpdatingEventId}/${statusActionType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error((await res.text()) || `Failed to ${statusActionType} event.`);
      const updatedEvent = await res.json();
      setEvents((prev) => prev.map((ev) => (ev.id === updatedEvent.id ? updatedEvent : ev)));
      setSuccess(`Event ${statusActionType === 'postpone' ? 'postponed' : 'cancelled'}.`);
      closeStatusModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${statusActionType} event.`);
    }
  };

  // ── calendar nav ─────────────────────────────────────────────────────────────
  const calTitle = useMemo(() => {
    if (calView === 'year') return String(calAnchor.getFullYear());
    if (calView === 'month') return `${MONTHS[calAnchor.getMonth()]} ${calAnchor.getFullYear()}`;
    const days = getWeekDays(calAnchor);
    const first = days[0];
    const last = days[6];
    if (first.getMonth() === last.getMonth()) return `${first.getDate()} – ${last.getDate()} ${MONTHS[first.getMonth()]} ${first.getFullYear()}`;
    return `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]} ${first.getFullYear()}`;
  }, [calView, calAnchor]);

  const navPrev = () => {
    const d = new Date(calAnchor);
    if (calView === 'year') d.setFullYear(d.getFullYear() - 1);
    else if (calView === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCalAnchor(d);
  };
  const navNext = () => {
    const d = new Date(calAnchor);
    if (calView === 'year') d.setFullYear(d.getFullYear() + 1);
    else if (calView === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCalAnchor(d);
  };
  const goToday = () => { const d = new Date(); d.setDate(1); setCalAnchor(d); };
  const handleMonthClick = (month: number) => { setCalAnchor(new Date(calAnchor.getFullYear(), month, 1)); setCalView('month'); };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Events</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => { if (showForm && isEditing) resetForm(); else setShowForm(!showForm); }} className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c]">
            {showForm ? 'Cancel' : '+ New Event'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* event form — director only */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">{isEditing ? 'Edit Event' : 'Create New Event'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
              <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date (optional)</label>
              <input type="date" value={form.endDate} min={form.date || undefined} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Child (R)</label>
              <input type="number" min="0" value={form.costPerChild} onChange={(e) => setForm((f) => ({ ...f, costPerChild: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Flat Cost (R)</label>
              <input type="number" min="0" value={form.flatCost} onChange={(e) => setForm((f) => ({ ...f, flatCost: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Extra Expenses (R)</label>
              <input type="number" min="0" value={form.extraExpenses} onChange={(e) => setForm((f) => ({ ...f, extraExpenses: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <input id="isCamp" type="checkbox" checked={form.isCamp} onChange={(e) => setForm((f) => ({ ...f, isCamp: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]" />
              <label htmlFor="isCamp" className="text-sm font-medium text-gray-700">
                This is a camp event
                <span className="ml-1 text-xs text-gray-400">(children with 5+ active demerits cannot pay for camp events)</span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="bg-[#1e3a5f] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4f7c] disabled:opacity-60">
                {saving ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Event')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── EVENTS LIST (ABOVE CALENDAR) ── */}
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
                  {isDirector && <th className="px-6 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td className="px-6 py-4 text-gray-400" colSpan={isDirector ? 8 : 7}>Loading...</td></tr>
                ) : events.length === 0 ? (
                  <tr><td className="px-6 py-4 text-gray-400" colSpan={isDirector ? 8 : 7}>No events yet.</td></tr>
                ) : (
                  events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-800">
                        <div className="flex items-center gap-2">
                          {ev.name}
                          {ev.isCamp && <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Camp</span>}
                        </div>
                        {ev.description && <div className="text-xs text-gray-400">{ev.description}</div>}
                        {ev.statusReason && <div className="text-xs text-amber-700 mt-1">Reason: {ev.statusReason}</div>}
                      </td>
                      <td className="px-6 py-4"><span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{ev.eventCode ?? 'Pending'}</span></td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ev.status === 'Cancelled' ? 'bg-red-100 text-red-700' : ev.status === 'Postponed' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {ev.status ?? 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(ev.date).toLocaleDateString()}{ev.endDate && <span> to {new Date(ev.endDate).toLocaleDateString()}</span>}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-[#1e3a5f]">R{(ev.costPerChild ?? 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-semibold text-[#1e3a5f]">R{(ev.flatCost ?? 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-semibold text-[#1e3a5f]">R{(ev.extraExpenses ?? 0).toLocaleString()}</td>
                      {isDirector && (
                        <td className="px-4 py-4">
                          <div className="flex justify-end items-center gap-1 whitespace-nowrap">
                            <button type="button" onClick={() => openEdit(ev)} title="Edit" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"><EditIcon /></button>
                            <button type="button" onClick={() => handleDelete(ev)} disabled={deletingEventId === ev.id} title="Delete" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"><DeleteIcon /></button>
                            <button type="button" onClick={() => openStatusModal(ev, 'postpone')} disabled={ev.status === 'Cancelled'} title="Postpone" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-amber-700 hover:bg-amber-50 disabled:opacity-25 disabled:cursor-not-allowed"><PostponeIcon /></button>
                            <button type="button" onClick={() => openStatusModal(ev, 'cancel')} disabled={ev.status === 'Cancelled'} title="Cancel" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-700 hover:bg-rose-50 disabled:opacity-25 disabled:cursor-not-allowed"><CancelIcon /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* ── CALENDAR (BELOW LIST) ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mt-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button type="button" onClick={navPrev} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">‹</button>
            <button type="button" onClick={goToday} className="px-3 h-8 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">Today</button>
            <button type="button" onClick={navNext} className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">›</button>
            <span className="text-sm font-semibold text-gray-700 ml-1">{calTitle}</span>
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
            {(['week', 'month', 'year'] as CalView[]).map((v) => (
              <button key={v} type="button" onClick={() => setCalView(v)} className={`px-3 py-1.5 capitalize transition-colors ${calView === v ? 'bg-[#1e3a5f] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{v}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading events...</div>
        ) : (
          <>
            {calView === 'month' && <MonthView events={events} anchor={calAnchor} onDayClick={(d) => setSelectedDay(d)} />}
            {calView === 'week' && <WeekView events={events} anchor={calAnchor} onDayClick={(d) => setSelectedDay(d)} />}
            {calView === 'year' && <YearView events={events} year={calAnchor.getFullYear()} onMonthClick={handleMonthClick} />}
          </>
        )}

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 flex-wrap">
          <span className="text-xs text-gray-400 font-semibold uppercase">Legend</span>
          <span className="flex items-center gap-1 text-xs text-gray-600"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Active</span>
          <span className="flex items-center gap-1 text-xs text-gray-600"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Postponed</span>
          <span className="flex items-center gap-1 text-xs text-gray-600"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Cancelled</span>
        </div>
      </div>

      {/* day detail modal */}
      {selectedDay && (
        <DayDetail
          day={selectedDay}
          events={events}
          onClose={() => setSelectedDay(null)}
          isDirector={isDirector}
          onEdit={openEdit}
          onDelete={handleDelete}
          onPostpone={(ev) => { setSelectedDay(null); openStatusModal(ev, 'postpone'); }}
          onCancel={(ev) => { setSelectedDay(null); openStatusModal(ev, 'cancel'); }}
          deletingId={deletingEventId}
        />
      )}

      {/* postpone/cancel reason modal */}
      {statusUpdatingEventId && statusActionType && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-100 p-5">
            <h3 className="text-base font-semibold text-gray-800 mb-2">{statusActionType === 'postpone' ? 'Postpone Event' : 'Cancel Event'}</h3>
            <p className="text-sm text-gray-500 mb-3">Please provide a reason (required), for example: Bad weather so we can&apos;t camp out.</p>
            <textarea value={statusReason} onChange={(e) => setStatusReason(e.target.value)} rows={4} maxLength={500} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]" placeholder="Enter reason..." />
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={closeStatusModal} className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">Back</button>
              <button type="button" onClick={submitStatusAction} className="text-sm bg-[#1e3a5f] text-white px-4 py-2 rounded-lg hover:bg-[#2a4f7c]">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
